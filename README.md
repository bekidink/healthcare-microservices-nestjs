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
- **Object storage**: MinIO (S3-compatible), for documents/images once a service needs them.
- **Gateway**: routing, auth-context resolution, rate limiting, request IDs, API versioning (`/api/v1/...`), CORS, error normalization.

Core rule: **each service owns its database and Prisma schema; no service
ever queries another service's database directly.** Cross-service reads go
through that service's API or a Kafka-fed read model — never a raw SQL join
across service boundaries.

## Current status: Milestone 1 — Infrastructure + Gateway + Identity

| Service | Status | Owns |
|---|---|---|
| `apps/gateway` | ✅ scaffolded | Routing, auth-context middleware, rate limiting, request IDs, CORS, error shape |
| `apps/identity` | ✅ scaffolded | User, Role, Permission, Membership, UserSession, ProviderProfile, OtpCode + register/login/refresh/logout/OTP APIs |
| facility, patient, scheduling, clinical, orders, pharmacy, lab, imaging, inpatient, emergency, finance, supply, communication, analytics, interoperability, ai | ⏳ not started | See the roadmap below |

Everything else in the Implementation Breakdown doc (Phases 3–19) is
intentionally **not** scaffolded yet — adding empty shells for all of them
now would just be dead weight to maintain until their turn in the roadmap.

## Roadmap (from the Implementation Breakdown doc)

1. **Infrastructure + Gateway + Identity** ← you are here
2. Facility + Patient/MPI
3. Scheduling + Queue
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
docker compose up -d postgres redis kafka minio   # infra only
pnpm --filter @healthcare/identity prisma:migrate  # creates tables in identity_db
pnpm --filter @healthcare/identity prisma:seed     # seeds starter roles/permissions
pnpm dev                                           # runs gateway + identity via turbo
```

Or run everything, including the app services, inside Docker:

```bash
docker compose up --build
```

Gateway: `http://localhost:3000` (proxies `/api/v1/auth/*` and `/api/v1/users/*` to identity)
Identity (direct): `http://localhost:3001`
MinIO console: `http://localhost:9001` (healthcare / healthcare123)

## Core microservice rules (from the Implementation Breakdown doc)

- Each service owns its database and Prisma schema; never query another service's database directly.
- REST for synchronous calls; Kafka/events (via the outbox) for asynchronous propagation.
- Every sensitive action is authorized and audited — synchronously, in the same transaction as the state change.
- Never silently merge duplicate patients, overwrite signed clinical records, or overwrite corrected lab results.
- Pharmacy stock changes must create ledger movements.
- Payment callbacks must be verified and idempotent.
- AI uses controlled tools/domain services only — never direct production DB mutation.
