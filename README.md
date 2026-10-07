# Healthcare Management Ecosystem

Microservices platform per the Healthcare Management Ecosystem PRD and its
Microservices Implementation Breakdown. Built vertically — each milestone
adds real, working services for one slice of the patient journey rather than
stubbing the whole platform at once.

## Architecture

- **Monorepo**: pnpm workspaces + Turborepo (`apps/*` services, `packages/*` shared libs).
- **Per-service stack**: NestJS + Prisma + PostgreSQL (one logical database per service — see `infra/postgres/init-databases.sh`).
- **Async**: Kafka, via the transactional outbox pattern (`outbox_events` table per service + a polling publisher).
- **Cache/locks**: Redis.
- **API docs**: every service publishes its own Swagger UI at `/docs` (see `packages/shared/src/swagger/setup-swagger.ts`).
- **Object storage**: not provisioned yet — see Known gaps below.
- **Gateway**: routing, auth-context resolution, rate limiting, request IDs, API versioning (`/api/v1/...`), CORS, error normalization.

Core rule: **each service owns its database and Prisma schema; no service
ever queries another service's database directly.** Cross-service reads go
through that service's API or a Kafka-fed read model — never a raw SQL join
across service boundaries.

## Current status: Milestone 12 — Analytics + AI (all 12 milestones now scaffolded)

| Service | Status | Owns |
|---|---|---|
| `apps/gateway` | ✅ | Routing, auth-context middleware, rate limiting, request IDs, CORS, error shape, Swagger |
| `apps/identity` | ✅ | User, Role, Permission, Membership, UserSession, ProviderProfile, OtpCode + register/login/refresh/logout/OTP APIs |
| `apps/facility` | ✅ | Organization, Facility, FacilityConfiguration (capability flags), Department, Room, FacilityService, ProviderDepartment, ProviderSchedule |
| `apps/patient` | ✅ | Patient, PatientIdentifier, PatientContact, Consent, AccessGrant, MergeCase (human-reviewed duplicate detection/merge — see below) |
| `apps/scheduling` | ✅ | AppointmentType, ScheduleSlot, Appointment (state machine), QueueEntry, Reminder (see below) |
| `apps/clinical` | ✅ | Encounter, VitalSigns, ClinicalNote (immutable once signed), Diagnosis, ProblemListEntry (see below) |
| `apps/lab` | ✅ | LabOrder, LabOrderItem, Specimen, LabResult (corrected via an append-only chain, never overwritten — see below) |
| `apps/pharmacy` | ✅ | Prescription, PrescriptionItem, InventoryItem, StockLedgerEntry, Dispense (every stock change is a ledger movement — see below) |
| `apps/finance` | ✅ | Invoice, InvoiceLineItem, Payment (idempotent, verified payment callbacks — see below) |
| `apps/communication` | ✅ | NotificationMessage (simulated delivery) + a poller that finally sends what Scheduling's Reminder only ever recorded intent for — see below |
| `apps/inpatient` | ✅ | Ward, Bed, Admission, Transfer, EmergencyVisit (bed-availability-guarded admission/transfer/ER-admit — see below) |
| `apps/supply` | ✅ | SupplyItem, SupplyLedgerEntry (same ledger rule as Pharmacy), InsurancePolicy, Claim, Referral |
| `apps/interop` | ✅ | Read-only FHIR R4 subset (Patient/Encounter/Observation) translated live from Patient/Clinical — see below |
| `apps/analytics` | ✅ | AnalyticsSnapshot (computed reports) + AiToolInvocation (a controlled, read-only "AI tool" facade — see below) |

All 12 roadmap milestones now have real, working code — see the roadmap and "What's genuinely verified vs. not" section below for the honest state of each.

### Scheduling: Facility's recurring template vs. Scheduling's concrete slots

Facility owns `ProviderSchedule` — a recurring weekly availability template
(e.g. "Dr. X, Mondays, 08:00–16:00, Internal Medicine"). Scheduling owns
`ScheduleSlot` — concrete, bookable half-hour (configurable) windows on
actual calendar dates. `POST /schedule-slots/generate` is the bridge: it
makes a plain synchronous REST call to the Facility service
(`FacilityClientService`, per the core rule "REST for synchronous
operations" — never a query against `facility_db`), reads that provider's
recurring schedule, and expands it into concrete slots for a date range.
Already-generated slots are skipped on re-run (safe to call repeatedly).

Appointments follow the PRD's state machine exactly:
`REQUESTED → CONFIRMED → CHECKED_IN → IN_SERVICE → COMPLETED`, with
`CANCELLED` reachable from any pre-completion state and `NO_SHOW` from
`CONFIRMED`/`CHECKED_IN`. Booking marks the slot `booked`; cancelling
reopens it for someone else, a no-show does **not** (the reserved time
already passed). Checking in also opens a `QueueEntry` with the next
sequential number for that facility/department/day — the `/queue` endpoints
give reception a simple ordered, active-only view (waiting/called/
in_service), filtering out completed/skipped entries automatically.
`Reminder` only records *intent* to remind (channel + scheduledFor) — it
does not send anything; see Known gaps.

### Patient/MPI: how "never silently merge" is actually enforced

- `POST /patients` always creates the patient — it never blocks on a
  possible duplicate. It runs a matching heuristic (`PatientMatchingService`)
  against existing patients and returns every candidate found as
  `possibleDuplicates` in the response, regardless of score.
- A high-confidence match (score ≥ 80 — exact national-ID match, or matching
  normalized name + date of birth) additionally auto-opens a `MergeCase` in
  `open` status. Opening a case is just a flag; it changes nothing about
  either patient record.
- The **only** way two patients actually get merged is
  `POST /merge-cases/:id/confirm`, which requires a human-supplied
  `survivorPatientId` and records `decidedBy`/`decidedAt`/`decisionNotes`.
  It relocates identifiers/contacts/consents/access-grants onto the
  survivor and marks the other patient `status: merged` — that row is never
  deleted, preserving full history.
- The matching heuristic itself (`patient-matching.service.ts`) is
  intentionally simple (exact/normalized-field comparison, not phonetic or
  probabilistic matching) — a real deployment needs a proper MPI matching
  library before this goes near production data. This is flagged in a
  comment at the top of that file.

### Clinical: how an Encounter starts, and how "never overwrite signed clinical records" is actually enforced

- `POST /encounters` starts a visit two ways: pass an `appointmentId` and
  Clinical derives `patientId`/`providerId`/`facilityId`/`departmentId` from
  that appointment over a synchronous REST call to Scheduling
  (`SchedulingClientService` — never a query against `scheduling_db`), or
  skip it and pass `patientId`/`providerId`/`facilityId` directly for a
  walk-in with no prior appointment. Starting one from an appointment is
  rejected with a `400` unless that appointment is already `checked_in`,
  `in_service`, or `completed` — an encounter represents care actually being
  given, not a booking.
- Deliberately **not** auto-created by consuming Scheduling's
  `AppointmentCheckedIn` Kafka event — every cross-service reference in this
  codebase so far is an explicit synchronous call, and introducing a first
  Kafka *consumer* here would both break that consistency and silently stop
  working on the free Render deploy (no broker there at all). A provider
  explicitly starts the encounter when they're ready to see the patient.
- `ClinicalNote` (SOAP/progress/discharge) is freely editable
  (`PATCH /notes/:id`) right up until `POST /notes/:id/sign` — from that
  point `signedAt` is set and every mutating path (`ClinicalNotesService.
  assertEditable`) rejects further edits with a `400`, permanently. There is
  deliberately no "unsign" or force-edit endpoint. This is the same core PRD
  rule Patient/MPI enforces for merges, applied to clinical documentation.
- `Diagnosis` is per-encounter (what was diagnosed *this visit*);
  `ProblemListEntry` is patient-level and encounter-independent (the
  standing, cross-visit problem list used for continuity of care) — kept as
  two separate models rather than one, since conflating "this visit's
  diagnosis" with "this patient's ongoing problem" was a real, concrete
  modeling mistake worth avoiding on purpose.

### Lab: starting an order, and how "never overwrite a corrected lab result" is actually enforced

- `POST /lab-orders` follows the exact same dual-path pattern as Clinical's
  `POST /encounters`: pass an `encounterId` and Lab derives
  `patientId`/`providerId`/`facilityId` from that encounter over REST
  (`ClinicalClientService` — never a query against `clinical_db`), rejecting
  with a `400` unless the encounter is `in_progress` or `completed`; or skip
  it and supply those fields directly for a standalone order. An order can
  carry multiple test items (`LabOrderItem`) in one call, since a single
  panel usually orders several tests at once.
- One `Specimen` belongs to the whole `LabOrder`, not to a single item — a
  single blood draw commonly covers several ordered tests. Collecting the
  first specimen flips the order from `ordered` to `in_progress`; the order
  flips itself to `completed` the moment every item has a current result,
  checked right after each result is entered (`LabOrdersService.
  completeIfAllItemsResulted`) — nothing it polls for.
- **The core rule**: `LabResult` has no update endpoint — a value is fixed
  forever the moment it's entered. `POST /results/:id/correct` never edits
  that row; it inserts a *new* `LabResult` pointing back at the original via
  `correctsResultId`, and only flips the original's `status` to `corrected`
  as an administrative marker — its `value`/`unit`/`referenceRange` are
  never touched. Trying to correct a result that's already been corrected
  is rejected with a `400` naming the result that actually supersedes it,
  so corrections can't silently chain past each other. This is the same
  "never overwrite" pattern as Clinical's signed notes, applied to lab data
  specifically because the PRD calls it out as its own core rule.

### Pharmacy: starting a prescription, and how "stock changes must create ledger movements" is actually enforced

- `POST /prescriptions` is the same dual-path pattern again: pass an
  `encounterId` and Pharmacy derives `patientId`/`providerId`/`facilityId`
  from that encounter over REST (`ClinicalClientService`), rejecting with a
  `400` unless it's `in_progress` or `completed`; or supply those fields
  directly for a standalone prescription. One call can prescribe several
  medications (`PrescriptionItem`) at once.
- **The core rule**: `InventoryItem.quantityOnHand` has no direct-set
  endpoint anywhere in this service. Every single path that changes it —
  receiving a shipment (`POST /inventory-items/:id/receive`), a manual
  correction or recording waste (`POST /inventory-items/:id/adjust`), and
  dispensing (`POST /prescription-items/:id/dispense`) — routes through the
  one `InventoryService.applyMovement` method, which writes the new
  `quantityOnHand` and an append-only `StockLedgerEntry` (with the resulting
  balance captured at write time) in the same transaction. A dispense's
  stock decrement and its `PrescriptionItem` status update are themselves
  one transaction too, so a dispense can never partially apply.
- Dispensing validates two things before it touches any data: the inventory
  item being drawn from actually matches what was prescribed (rejects a
  `medicationCode` mismatch — a real safety check, not just a data
  constraint), and there's enough `quantityOnHand` to cover it (rejects
  going negative). A prescription auto-completes to `dispensed` once every
  item on it has been filled, checked the same way Lab's order-completion
  check works.

### Finance: starting an invoice, and how "payment callbacks must be verified and idempotent" is actually enforced

- `POST /invoices` follows the same dual-path pattern as every service since
  Clinical: an `encounterId` derives `patientId`/`facilityId` over REST
  (rejecting unless the encounter is `in_progress`/`completed`), or supply
  those fields directly for a standalone invoice. One call can list several
  `InvoiceLineItem`s.
- **The core rule**, enforced in `PaymentsService`'s `POST /payments/callback`
  (a simulated external payment-gateway webhook): the very first thing it
  does is look up any existing `Payment` by `externalReference` — if found,
  that row is returned as-is and nothing is re-applied, which is the actual
  idempotency guarantee (a webhook redelivered twice must not double-charge
  or double-count). As a second line of defense against a genuine race, the
  insert is wrapped in a transaction whose unique-constraint violation
  (`externalReference` is `@unique`) is caught and resolved by re-fetching
  the winning row instead of surfacing a 500. "Verified" means: the invoice
  must still be `open` — a stale callback for an already-`paid`/`void`
  invoice is rejected, never silently reopening it.

### Communication: finally sending what Scheduling's Reminder only ever recorded intent for

- Scheduling's `Reminder` model has said, in its own code since Milestone 3,
  that it only records *intent* to remind — nothing in this codebase ever
  actually sent anything. `apps/communication`'s `ReminderPollerService`
  closes that gap: every 15 seconds it calls Scheduling's
  `GET /reminders/due` (an endpoint that's existed since Milestone 3
  specifically anticipating this), "sends" each one (simulated — logged, not
  a real SMS/email/push integration, and the code says so explicitly), and
  calls `POST /reminders/:id/mark-sent` back on Scheduling.
- Double-sending across overlapping poll cycles is guarded by a
  check-before-create against `NotificationMessage`'s `sourceType`+`sourceId`
  — documented as best-effort (not a DB unique constraint, since Prisma
  can't express uniqueness cleanly over a pair of nullable columns), which
  is an honestly-scoped tradeoff rather than a hidden one.

### Inpatient: bed availability is the guard, not an afterthought

- Admitting, transferring, and admitting-from-the-ER all share one rule: a
  destination `Bed` must be `available` before anything else happens, or the
  request is rejected with a 400 naming the bed. A `Bed` has its own real
  state machine (`available → occupied → cleaning → available`, plus
  `out_of_service`) — discharging or transferring a patient out of a bed
  moves it to `cleaning`, never straight back to `available`; a separate
  `POST /beds/:id/mark-available` call closes that loop, modeling bed
  turnover as a real step instead of an instant reset.
- `EmergencyVisit` is independent of `Admission` until `POST
  /emergency-visits/:id/admit` converts one into the other — reusing the
  exact same bed-availability guard rather than duplicating it.
- `emergency_db` is provisioned by `infra/postgres/init-databases.sh` but
  deliberately unused — this one service covers both halves of the milestone
  in `inpatient_db`, the same bundling already used for Scheduling+Queue and
  Clinical+Encounter (and the same precedent `orders_db` already set,
  unused since Milestone 5 used `lab_db`).

### Supply: the same ledger rule as Pharmacy, reused on purpose

- `SupplyItem`/`SupplyLedgerEntry` are a deliberate copy of Pharmacy's
  `InventoryItem`/`StockLedgerEntry` pattern for non-drug consumables
  (gloves, syringes, bandages) — `quantityOnHand` still has no direct-set
  endpoint, only `receive`/`adjust`/`consume`, each routing through the same
  shape of `applyMovement` method. Reusing the pattern rather than inventing
  a new one for "basically the same kind of resource" is itself the design
  decision worth noting.
- `Claim` and `Referral` each get their own small `TRANSITIONS` map + guard,
  the same shape as Scheduling's `Appointment` state machine — `submitted →
  approved → paid` (or `denied`, terminal), `pending → accepted → completed`
  (or `declined`, terminal).

### Interop: a minimal, honestly-scoped read-only FHIR facade

- `GET /fhir/Patient/:id`, `GET /fhir/Encounter/:id`, and `GET
  /fhir/Observation?encounterId=` map this system's real data (via live REST
  calls to Patient and Clinical — never a database read) into FHIR R4-shaped
  JSON for exactly those 3 resource types. It says so plainly in its own
  code: this is **not** a conformant FHIR server, just enough of one to
  demonstrate the interoperability pattern the PRD calls for. Every lookup
  is logged to an `InteropAccessLog` row — the only state this service
  persists, since it makes no domain writes of its own.

### Analytics + AI: the "controlled tools only" rule, made concrete

- `POST /analytics/snapshots` computes and persists a real
  `inventory_levels` report (live from Pharmacy's `GET /inventory-items`) —
  scoped to exactly what's genuinely reachable through an existing
  endpoint today, rather than inventing additional snapshot types with
  nothing real behind them.
- The "AI" half is a small, fixed set of **read-only** tool endpoints
  (`POST /ai/tools/lookup-patient`, `POST /ai/tools/summarize-encounter`)
  that each proxy to another service's real REST API and log an
  `AiToolInvocation` row — success or failure — for every single call. This
  is the concrete form of the PRD's core rule: "AI uses controlled
  tools/domain services only — never direct production DB mutation." There
  is no mutating endpoint anywhere in `AiToolsController`.

All 12 roadmap milestones from the Implementation Breakdown doc now have
real, working code behind them — see "What's genuinely verified vs. not"
below for the honest difference between that and "identically
battle-tested," since milestones 7–12 were built in one faster pass without
the live Docker smoke-testing every prior milestone got.

## Roadmap (from the Implementation Breakdown doc)

1. Infrastructure + Gateway + Identity ✅
2. Facility + Patient/MPI ✅
3. Scheduling + Queue ✅
4. Clinical + Encounter ✅
5. Orders + Laboratory ✅
6. Pharmacy ✅
7. Finance + Payment ✅
8. Events + Notification + Audit (hardening) ✅ — `apps/communication` actually delivers (simulated) what Scheduling's Reminder only recorded intent for; "audit hardening" was deliberately scoped down to a shared, stateless `JwtVerifyGuard` applied to the 6 newest services only (see "Known gaps" — retrofitting it onto the first 7 services is a named follow-up, not done here)
9. Inpatient + Emergency ✅
10. Supply + Insurance + Referral ✅
11. FHIR + Interoperability + external integrations ✅
12. **Analytics + AI** ✅ ← you are here

All 12 milestones from the Implementation Breakdown doc now have real
code. See "What's genuinely verified vs. not" below before treating
milestones 7–12 as being at the same confidence level as 1–6.

**First production vertical slice** (the acceptance test, now that milestones 1–7 have landed):
Registration → MPI → Appointment → Check-in → Queue → Encounter → Lab Order →
Specimen → Lab Result → Prescription → Pharmacy Dispense → Invoice → Payment
→ Follow-up notification.

## Running locally

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis kafka                 # infra only
pnpm --filter @healthcare/identity prisma:migrate          # creates tables in identity_db
pnpm --filter @healthcare/identity prisma:seed             # seeds starter roles/permissions
pnpm --filter @healthcare/facility prisma:migrate           # creates tables in facility_db
pnpm --filter @healthcare/patient prisma:migrate            # creates tables in patient_db
pnpm --filter @healthcare/scheduling prisma:migrate         # creates tables in scheduling_db
pnpm --filter @healthcare/clinical prisma:migrate           # creates tables in clinical_db
pnpm --filter @healthcare/lab prisma:migrate                # creates tables in lab_db
pnpm --filter @healthcare/pharmacy prisma:migrate           # creates tables in pharmacy_db
pnpm --filter @healthcare/finance prisma:migrate            # creates tables in finance_db
pnpm --filter @healthcare/communication prisma:migrate      # creates tables in communication_db
pnpm --filter @healthcare/inpatient prisma:migrate          # creates tables in inpatient_db
pnpm --filter @healthcare/supply prisma:migrate             # creates tables in supply_db
pnpm --filter @healthcare/interop prisma:migrate            # creates tables in interoperability_db
pnpm --filter @healthcare/analytics prisma:migrate          # creates tables in analytics_db
pnpm dev                                                    # runs all 14 services via turbo
```

Or run everything, including the app services, inside Docker:

```bash
docker compose up --build
```

| Service | Direct URL | Via gateway |
|---|---|---|
| Gateway | `http://localhost:3000` (`/docs` for its own Swagger) | — |
| Identity | `http://localhost:3001` (`/identity` for Swagger) | `/api/v1/auth/*`, `/api/v1/users/*` |
| Facility | `http://localhost:3002` (`/facility`) | `/api/v1/organizations/*`, `/api/v1/facilities/*`, `/api/v1/departments/*` |
| Patient | `http://localhost:3003` (`/patient`) | `/api/v1/patients/*`, `/api/v1/merge-cases/*` |
| Scheduling | `http://localhost:3004` (`/scheduling`) | `/api/v1/appointment-types/*`, `/api/v1/schedule-slots/*`, `/api/v1/appointments/*`, `/api/v1/queue/*`, `/api/v1/reminders/*` |
| Clinical | `http://localhost:3005` (`/clinical`) | `/api/v1/encounters/*`, `/api/v1/notes/*`, `/api/v1/problems/*` |
| Lab | `http://localhost:3006` (`/lab`) | `/api/v1/lab-orders/*`, `/api/v1/lab-order-items/*`, `/api/v1/specimens/*`, `/api/v1/results/*` |
| Pharmacy | `http://localhost:3007` (`/pharmacy`) | `/api/v1/prescriptions/*`, `/api/v1/inventory-items/*`, `/api/v1/prescription-items/*` |
| Finance | `http://localhost:3008` (`/finance`) | `/api/v1/invoices/*`, `/api/v1/payments/*` |
| Communication | `http://localhost:3009` (`/communication`) | `/api/v1/notifications/*` |
| Inpatient | `http://localhost:3010` (`/inpatient`) | `/api/v1/wards/*`, `/api/v1/beds/*`, `/api/v1/admissions/*`, `/api/v1/emergency-visits/*` |
| Supply | `http://localhost:3011` (`/supply`) | `/api/v1/supply-items/*`, `/api/v1/insurance-policies/*`, `/api/v1/claims/*`, `/api/v1/referrals/*` |
| Interop | `http://localhost:3012` (`/interop`) | `/api/v1/fhir/*` |
| Analytics | `http://localhost:3013` (`/analytics`) | `/api/v1/analytics/*`, `/api/v1/ai/*` |

Each backend service's own Swagger path is a single flat segment matching its own name, not the `nestjs/swagger` default of `docs` — that's what lets the gateway proxy them publicly on the Render deploy (see below); nothing else changes locally, just the path.

## Deploying to Render (free tier)

**This deploy intentionally stops at Milestone 6 (Pharmacy) — it does not include finance, communication, inpatient, supply, interop, or analytics.** Milestones 1–6 were already measuring ~525MB of a 512MB free instance's RAM budget with 5 processes bundled together; adding all 6 newer services would mean 14 NestJS processes sharing one 512MB container, which would not boot, let alone run. Extending this free deploy further than Milestone 6 was a deliberate stop, not an oversight — see the RAM note further down. Milestones 7–12 are fully built and wired into `docker-compose.yml`/the gateway for local use, just not into this Render blueprint.

`render.yaml` at the repo root is a [Blueprint](https://render.com/docs/blueprint-spec) for a **$0 deploy**. Render has no free private-service instance type and only one free Postgres per account, which doesn't fit the "real" topology (one instance per service, Kafka as its own always-on broker) without a paid plan — so this blueprint takes a deliberately different shape just to stay free:

- All 8 backend processes (gateway + identity + facility + patient + scheduling + clinical + lab + pharmacy) run inside **one** free web service, as one Docker image, managed by [pm2-runtime](https://pm2.keymetrics.io/) (`infra/render/ecosystem.config.js`). Only `gateway` binds Render's public `$PORT`; the other 7 listen on fixed ports over `localhost` inside that same container — the same shape as running `pnpm dev` locally, just co-located instead of one Render private service each.
- One free Postgres instance hosts all 7 logical databases (`identity_db`, `facility_db`, `patient_db`, `scheduling_db`, `clinical_db`, `lab_db`, `pharmacy_db`), mirroring the `docker-compose.yml` trick used locally. `infra/render/migrate-all.js` creates the databases if missing and runs each service's own `prisma migrate deploy` against its own database (`infra/render/db-url.js` derives each per-service connection string from the one Render-injected `DATABASE_URL` by swapping the database name) — as the first step of `infra/render/entrypoint.sh`, the container's actual startup command, since the free plan doesn't support Render's `preDeployCommand` feature. It's written to be idempotent (no-op once already applied) since that means it now reruns on every container boot, including free-tier cold starts, rather than once per deploy.
- **Kafka is dropped entirely** — no way to run a real always-on broker for free. `KafkaService.onModuleInit` already treats a failed connect as best-effort (logs a warning, doesn't crash the service — see `packages/shared/src/kafka/kafka.service.ts`), and every write is still audited synchronously in the same DB transaction as the state change regardless of Kafka (`AuditEvent`) — only the async Kafka propagation dimension is missing on this deploy. `OutboxEvent` rows will retry on their poll cycle and eventually land in `FAILED` after `MAX_ATTEMPTS`.
- **Redis is dropped too** — nothing in the codebase actually uses `REDIS_URL` yet (grep confirms it's scaffolded but never wired), so there's nothing lost by not standing one up.

To deploy: push this repo to GitHub, then in the Render dashboard use **New → Blueprint** and point it at the repo.

### Swagger on this deploy

Only `gateway` has a public URL, so `https://<your-app>.onrender.com/docs` by itself only documents the gateway's own routes (just `/health` — the proxy routes aren't Nest controllers, so they don't show up there). The 7 backend services' real Swagger UIs are reachable through the gateway too, proxied at:

- `/docs/identity`, `/docs/facility`, `/docs/patient`, `/docs/scheduling`, `/docs/clinical`, `/docs/lab`, `/docs/pharmacy` (the HTML pages)
- `/docs/identity-json`, `/docs/facility-json`, `/docs/patient-json`, `/docs/scheduling-json`, `/docs/clinical-json`, `/docs/lab-json`, `/docs/pharmacy-json` (the raw OpenAPI documents, e.g. for importing into another tool)

This only works because each service's own `setupSwagger()` call (`apps/*/src/main.ts`) uses a single flat path segment matching its own name (`identity`, not the `nestjs/swagger` default `docs`) — `nestjs/swagger` embeds its static asset hrefs as `./{path}/{asset}`, which only resolves correctly when that segment is also the last segment of whatever external URL actually reaches the page. The proxy routes for this live in `apps/gateway/src/proxy/proxy.setup.ts`, right after the `/api/v1/*` routes.

Known limitations, worth being upfront about:
- **RAM is shared and capped** across all 8 processes (Render's free web service gets 512MB total). A local smoke test already measured the 5-process version idling at ~525MB combined right after boot — over budget before any real traffic even then — and `clinical`, `lab`, and now `pharmacy` have each added a further full NestJS process since. At this point this isn't a soft warning anymore: 8 NestJS processes will not reliably fit in 512MB, and the free single-container deploy should be treated as past its intended scope. The concrete fix is the paid, one-private-service-per-process topology (see below); the next time this project grows a service, that migration should happen first, not after.
- **Cold starts are slower**: free web services spin down after inactivity, and the next request has to boot all 8 processes together.
- One thing most likely to have drifted from Render's current schema by the time you read this: the free Postgres `plan: free` value/availability itself — Render's free database tier terms change more often than instance types do. Fix from the blueprint-import error message if it complains.

Two things to do once, after the first deploy:
- Update `CORS_ORIGINS` from the placeholder `*` to your real frontend origin(s).
- Seed identity's starter roles/permissions once via a Render shell against the deployed service: `cd apps/identity && pnpm exec ts-node prisma/seed.ts` (with `DATABASE_URL` pointed at `identity_db`, same as `infra/render/migrate-all.js` does).

When you're ready to move past a demo — real uptime, real Kafka, isolated databases per service — the natural next step is the paid Render topology (one Postgres per service, Kafka as its own private service + disk, each backend service as its own private service) or a different host better suited to a real microservices+Kafka stack (a VPS running `docker-compose.yml` as-is, or Railway/Fly.io). Ask and I'll build whichever you want.

## What's genuinely verified vs. not

Milestones 1–6 were each built, then migrated, `docker compose`-built, and
live-`curl`-tested end to end (real HTTP requests through the real gateway
against real containers) before being called done — that process is what
actually found and fixed the OpenSSL/`.dockerignore`/tsbuildinfo/Swagger-path
issues documented throughout this file's git history.

**Milestones 7–12 were built differently, at your explicit request** ("finish
all milestones and not check build on each steps"): six parallel agents each
wrote one service, then everything went through exactly one consolidated
pass — `pnpm install`, `prisma generate` + `prisma migrate dev` for all 6
new databases, and one full-repo `turbo run typecheck` (which did catch and
fix 2 real issues: a stale `@healthcare/shared` build missing the new
`JwtVerifyGuard` export, and a Prisma `Json`-field type error in Analytics).
What this means concretely: the code compiles and the schemas migrate
cleanly, but **none of finance/communication/inpatient/supply/interop/
analytics has been `docker compose`-built or exercised with a live request
yet** — no confirmation that the Dockerfiles actually build, that the
cross-service REST calls resolve correctly inside the compose network, or
that the business-rule guards (idempotent payment callbacks, bed-ledger
guards, etc.) behave correctly against a real running stack. Treat them as
"should work, written to the same patterns that did work for milestones
1–6" rather than "verified." The natural next step, whenever you want it, is
the same live-smoke-test pass the first 6 milestones got.

## Known gaps

- **Object storage (MinIO/S3)**: not provisioned. Both `minio/minio` on
  Docker Hub and `quay.io/minio/minio` now require registry auth to pull —
  neither is reachable anonymously as of this writing. Add it back (or an
  alternative S3-compatible image) once a phase that actually needs file
  storage lands (Patient documents, Lab/Imaging results).
- **Cross-service permission enforcement — partially closed, not fully**:
  the gateway resolves and attaches `x-auth-user-id`/`x-auth-session-id`
  headers after verifying the caller's access token, and every service's
  write endpoints read `x-auth-user-id` via an `ActorId` decorator to
  populate audit records. `packages/shared` now exports a stateless
  `JwtVerifyGuard`/`JwtVerifyModule` (signature+expiry check only, no
  session-revocation lookup) that **finance, communication, inpatient,
  supply, and analytics' AI-tools controller** apply to their non-GET
  routes. The original 7 services (identity, facility, patient, scheduling,
  clinical, lab, pharmacy) — and `interop`, which is read-only and has
  nothing to gate — do **not** use it yet. Retrofitting it onto those 7 is a
  named, deliberate follow-up, not done in this pass, since it would have
  been a mechanical sweep across already-working services without the
  live-verification loop that kind of change deserves.
- **MPI matching**: see the Patient/MPI section above — the matching
  heuristic is a placeholder, not production-grade duplicate detection.
- **Notification delivery is simulated**: `apps/communication` logs and
  marks messages `sent` immediately — there is no real SMS/email/push
  provider integration anywhere in this codebase. It does close the
  previously-documented "Reminder records intent only" gap at the *pipeline*
  level (a reminder really does flow from Scheduling through Communication
  and back to `mark-sent`), just not at the "a phone actually buzzed" level.
- **Recipient contact resolution**: Communication's reminder poller uses the
  appointment id as a stand-in recipient address, since Scheduling's
  `Reminder` model carries no real patient contact info. Real contact
  lookup (presumably via Patient's `PatientContact`) is a follow-up.

## Core microservice rules (from the Implementation Breakdown doc)

- Each service owns its database and Prisma schema; never query another service's database directly.
- REST for synchronous calls; Kafka/events (via the outbox) for asynchronous propagation.
- Every sensitive action is authorized and audited — synchronously, in the same transaction as the state change.
- Never silently merge duplicate patients, overwrite signed clinical records, or overwrite corrected lab results.
- Pharmacy stock changes must create ledger movements.
- Payment callbacks must be verified and idempotent.
- AI uses controlled tools/domain services only — never direct production DB mutation.
