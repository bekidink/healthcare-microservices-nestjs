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

## Current status: Milestone 6 — Pharmacy

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
| imaging, inpatient, emergency, finance, supply, communication, analytics, interoperability, ai | ⏳ not started | See the roadmap below |

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

Everything past Milestone 6 in the Implementation Breakdown doc (Phases
7–19) is intentionally **not** scaffolded yet — adding empty shells for all
of them now would just be dead weight to maintain until their turn in the
roadmap.

## Roadmap (from the Implementation Breakdown doc)

1. Infrastructure + Gateway + Identity ✅
2. Facility + Patient/MPI ✅
3. Scheduling + Queue ✅
4. Clinical + Encounter ✅
5. Orders + Laboratory ✅
6. **Pharmacy** ✅ ← you are here
7. Finance + Payment ← next
8. Events + Notification + Audit (hardening — the outbox/audit primitives already exist per-service from Milestone 1 onward)
9. Inpatient + Emergency
10. Supply + Insurance + Referral
11. FHIR + Interoperability + external integrations
12. Analytics + AI

**First production vertical slice** (the acceptance test once milestones 1–7 land):
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
pnpm dev                                                    # runs gateway + identity + facility + patient + scheduling + clinical + lab + pharmacy via turbo
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

Each backend service's own Swagger path is a single flat segment matching its own name (`identity`, `facility`, `patient`, `scheduling`, `clinical`, `lab`, `pharmacy`), not the `nestjs/swagger` default of `docs` — that's what lets the gateway proxy them publicly on the Render deploy (see below); nothing else changes locally, just the path.

## Deploying to Render (free tier)

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

## Known gaps

- **Object storage (MinIO/S3)**: not provisioned. Both `minio/minio` on
  Docker Hub and `quay.io/minio/minio` now require registry auth to pull —
  neither is reachable anonymously as of this writing. Add it back (or an
  alternative S3-compatible image) once a phase that actually needs file
  storage lands (Patient documents, Lab/Imaging results).
- **Cross-service permission enforcement**: the gateway resolves and
  attaches `x-auth-user-id`/`x-auth-session-id` headers after verifying the
  caller's access token, and each service's write endpoints read
  `x-auth-user-id` via an `ActorId` decorator to populate audit records —
  but no service downstream of the gateway currently *requires* a valid
  token or checks a specific permission before executing a write. This is a
  known, deliberate gap (documented inline in each service's
  `common/actor.decorator.ts`), planned as a consistent hardening pass
  across all services (roadmap step 8) rather than duplicated ad hoc as
  each new service is added.
- **MPI matching**: see the Patient/MPI section above — the matching
  heuristic is a placeholder, not production-grade duplicate detection.
- **Reminder delivery**: `apps/scheduling`'s `Reminder` model records intent
  only (channel + scheduledFor + `listDue()`/`markSent()`) — there is no
  Notification service yet to actually send an SMS/email/push, so nothing
  is delivered until roadmap step 8 (Notification) lands.

## Core microservice rules (from the Implementation Breakdown doc)

- Each service owns its database and Prisma schema; never query another service's database directly.
- REST for synchronous calls; Kafka/events (via the outbox) for asynchronous propagation.
- Every sensitive action is authorized and audited — synchronously, in the same transaction as the state change.
- Never silently merge duplicate patients, overwrite signed clinical records, or overwrite corrected lab results.
- Pharmacy stock changes must create ledger movements.
- Payment callbacks must be verified and idempotent.
- AI uses controlled tools/domain services only — never direct production DB mutation.
