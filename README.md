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

## Current status: Milestone 2 — Facility + Patient/MPI

| Service | Status | Owns |
|---|---|---|
| `apps/gateway` | ✅ | Routing, auth-context middleware, rate limiting, request IDs, CORS, error shape, Swagger |
| `apps/identity` | ✅ | User, Role, Permission, Membership, UserSession, ProviderProfile, OtpCode + register/login/refresh/logout/OTP APIs |
| `apps/facility` | ✅ | Organization, Facility, FacilityConfiguration (capability flags), Department, Room, FacilityService, ProviderDepartment, ProviderSchedule |
| `apps/patient` | ✅ | Patient, PatientIdentifier, PatientContact, Consent, AccessGrant, MergeCase (human-reviewed duplicate detection/merge — see below) |
| scheduling, clinical, orders, pharmacy, lab, imaging, inpatient, emergency, finance, supply, communication, analytics, interoperability, ai | ⏳ not started | See the roadmap below |

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

Everything past Milestone 2 in the Implementation Breakdown doc (Phases
5–19) is intentionally **not** scaffolded yet — adding empty shells for all
of them now would just be dead weight to maintain until their turn in the
roadmap.

## Roadmap (from the Implementation Breakdown doc)

1. Infrastructure + Gateway + Identity ✅
2. Facility + Patient/MPI ✅ ← you are here
3. **Scheduling + Queue** ← next
4. Clinical + Encounter
5. Orders + Laboratory
6. Pharmacy
7. Finance + Payment
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
pnpm dev                                                    # runs gateway + identity + facility + patient via turbo
```

Or run everything, including the app services, inside Docker:

```bash
docker compose up --build
```

| Service | Direct URL | Via gateway |
|---|---|---|
| Gateway | `http://localhost:3000` | — |
| Identity | `http://localhost:3001` (`/docs` for Swagger) | `/api/v1/auth/*`, `/api/v1/users/*` |
| Facility | `http://localhost:3002` (`/docs`) | `/api/v1/organizations/*`, `/api/v1/facilities/*`, `/api/v1/departments/*` |
| Patient | `http://localhost:3003` (`/docs`) | `/api/v1/patients/*`, `/api/v1/merge-cases/*` |

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

## Core microservice rules (from the Implementation Breakdown doc)

- Each service owns its database and Prisma schema; never query another service's database directly.
- REST for synchronous calls; Kafka/events (via the outbox) for asynchronous propagation.
- Every sensitive action is authorized and audited — synchronously, in the same transaction as the state change.
- Never silently merge duplicate patients, overwrite signed clinical records, or overwrite corrected lab results.
- Pharmacy stock changes must create ledger movements.
- Payment callbacks must be verified and idempotent.
- AI uses controlled tools/domain services only — never direct production DB mutation.
