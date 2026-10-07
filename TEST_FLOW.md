# End-to-end test flow

A copy-pasteable walkthrough of the "first production vertical slice" this
platform targets (see the roadmap in `README.md`): register a user, stand up
a facility structure, register a patient, generate bookable slots from a
provider's recurring schedule, book an appointment, and run it through the
full queue/state-machine lifecycle. Every request/response shape below was
read directly from the actual DTOs and controllers, not guessed — see the
file path noted next to each step if you want to check a field yourself.

All requests go through the gateway, so `BASE_URL` is the only thing that
changes between environments:

```bash
# Deployed (Render free tier):
BASE_URL="https://healthcare-app-vtwa.onrender.com"
# Local (pnpm dev or docker compose):
# BASE_URL="http://localhost:3000"
```

A note on auth before you start: the gateway verifies a bearer token if one
is present and forwards the resulting user id as `x-auth-user-id` (used only
to populate audit records), but no endpoint below actually *requires* a
valid token yet — that's a documented, deliberate gap (see "Known gaps" in
`README.md`). The `Authorization` header is included in step 2 onward for
realism, but omitting it won't break anything in this flow.

---

## 1. Register a user (Identity)

This user doubles as the **provider** in step 5 — Facility and Scheduling
never store a copy of the user, they just reference this id by value
(`apps/facility/src/departments/dto/create-provider-schedule.dto.ts`:
`providerId` is documented as "Identity-service User/ProviderProfile id").

```bash
curl -s "$BASE_URL/api/v1/auth/register" \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"dr.abebe@example.com","password":"Password123!","fullName":"Dr. Abebe Kebede"}' | tee /tmp/register.json

PROVIDER_ID=$(node -pe "require('/tmp/register.json').id")
echo "PROVIDER_ID=$PROVIDER_ID"
```

Expect `201` with `{"id": "...", "email": "...", "status": "pending_verification"}`.

## 2. Log in

```bash
curl -s "$BASE_URL/api/v1/auth/login" \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"dr.abebe@example.com","password":"Password123!"}' | tee /tmp/login.json

ACCESS_TOKEN=$(node -pe "require('/tmp/login.json').accessToken")
AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"
```

Expect `201` with `{"accessToken", "refreshToken", "expiresIn": 900}` (access
token is valid 15 minutes).

## 3. Create an organization and a facility (Facility)

```bash
curl -s "$BASE_URL/api/v1/organizations" \
  -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" \
  -d '{"legalName":"Black Lion General Hospital PLC","displayName":"Black Lion Hospital","type":"hospital"}' \
  | tee /tmp/org.json

ORG_ID=$(node -pe "require('/tmp/org.json').id")

# Note the path: this is NOT /api/v1/facilities — the controller mounts it
# under organizations/:organizationId/facilities, reached via the gateway's
# /api/v1/organizations route (apps/facility/src/facilities/facilities.controller.ts:15).
curl -s "$BASE_URL/api/v1/organizations/$ORG_ID/facilities" \
  -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" \
  -d '{"name":"Black Lion Hospital — Main Campus","type":"hospital"}' \
  | tee /tmp/facility.json

FACILITY_ID=$(node -pe "require('/tmp/facility.json').id")
```

`type` on the organization is one of `healthcare_network | hospital | clinic
| pharmacy_chain | diagnostic_center`; on the facility it's `hospital |
clinic | pharmacy | diagnostic_center`. Creating the facility also
auto-applies default capability flags for that type (see the Facility
section of `README.md`).

## 4. Create a department

```bash
curl -s "$BASE_URL/api/v1/facilities/$FACILITY_ID/departments" \
  -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" \
  -d '{"name":"Internal Medicine","type":"outpatient"}' \
  | tee /tmp/department.json

DEPARTMENT_ID=$(node -pe "require('/tmp/department.json').id")
```

`type` is one of `outpatient | inpatient | emergency | lab | radiology |
pharmacy | theatre | administration`.

## 5. Assign the provider and give them a recurring weekly schedule

```bash
curl -s "$BASE_URL/api/v1/departments/$DEPARTMENT_ID/providers" \
  -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" \
  -d "{\"providerId\":\"$PROVIDER_ID\",\"roleTitle\":\"Attending Physician\"}"

# dayOfWeek is a plain integer 0-6 (0 = Sunday), and start/endTime are bare
# "HH:mm" strings — NOT ISO timestamps. Pick a dayOfWeek that actually falls
# within the date range you'll use in step 8, or slot generation will find
# nothing to expand.
curl -s "$BASE_URL/api/v1/departments/$DEPARTMENT_ID/schedules" \
  -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" \
  -d "{\"providerId\":\"$PROVIDER_ID\",\"dayOfWeek\":2,\"startTime\":\"08:00\",\"endTime\":\"16:00\"}"
```

This `ProviderSchedule` row is the *recurring template* — no bookable slot
exists yet. Step 8 is what expands it into concrete, dated slots.

## 6. Create an appointment type (Scheduling)

```bash
curl -s "$BASE_URL/api/v1/appointment-types" \
  -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" \
  -d "{\"facilityId\":\"$FACILITY_ID\",\"name\":\"General Consultation\",\"code\":\"GEN_CONSULT\",\"defaultDurationMins\":30}" \
  | tee /tmp/apptype.json

APPOINTMENT_TYPE_ID=$(node -pe "require('/tmp/apptype.json').id")
```

## 7. Register a patient (Patient / MPI)

```bash
curl -s "$BASE_URL/api/v1/patients" \
  -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" \
  -d '{"firstName":"Sara","lastName":"Tesfaye","dateOfBirth":"1990-05-14","gender":"female","nationalId":"ETH-99991234"}' \
  | tee /tmp/patient.json

PATIENT_ID=$(node -pe "require('/tmp/patient.json').id")
```

Expect `possibleDuplicates: []` on a fresh database. Want to see the MPI
duplicate-detection path instead of the happy path? Re-run this exact same
request a second time — same `nationalId` scores an exact-match 95 and
auto-opens a `MergeCase` (`POST /api/v1/merge-cases/:id/confirm` is the only
endpoint that actually merges two patient records; see the Patient/MPI
section of `README.md`).

## 8. Expand the recurring schedule into bookable slots

```bash
# Pick a date range that includes at least one occurrence of the dayOfWeek
# from step 5 (dayOfWeek=2 = Tuesday). Adjust these dates to a real upcoming
# Tuesday when you run this.
curl -s "$BASE_URL/api/v1/schedule-slots/generate" \
  -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" \
  -d "{\"departmentId\":\"$DEPARTMENT_ID\",\"providerId\":\"$PROVIDER_ID\",\"dateFrom\":\"2026-10-06\",\"dateTo\":\"2026-10-10\",\"slotDurationMins\":30}"
```

Expect `{"createdCount": N, "skippedCount": 0}`. Re-running the identical
request is safe — it becomes `createdCount: 0, skippedCount: N` (unique
constraint on `providerId+date+startTime`, silently skipped, not an error).

```bash
curl -s "$BASE_URL/api/v1/schedule-slots?providerId=$PROVIDER_ID&status=open" | tee /tmp/slots.json
SLOT_ID=$(node -pe "require('/tmp/slots.json')[0].id")
```

## 9. Book the appointment

```bash
curl -s "$BASE_URL/api/v1/appointments" \
  -X POST -H "Content-Type: application/json" -H "$AUTH_HEADER" \
  -d "{\"patientId\":\"$PATIENT_ID\",\"slotId\":\"$SLOT_ID\",\"appointmentTypeId\":\"$APPOINTMENT_TYPE_ID\",\"reason\":\"Routine checkup\"}" \
  | tee /tmp/appointment.json

APPOINTMENT_ID=$(node -pe "require('/tmp/appointment.json').id")
```

Status starts at `requested`, and the slot is atomically marked `booked` —
try step 8's slot-list query again and it'll be gone from the `open` list.
Booking the same slot twice (re-run this exact command) correctly fails
with a `400`.

## 10. Walk the appointment through its state machine

```bash
curl -s "$BASE_URL/api/v1/appointments/$APPOINTMENT_ID/confirm" -X POST -H "$AUTH_HEADER"
curl -s "$BASE_URL/api/v1/appointments/$APPOINTMENT_ID/check-in" -X POST -H "$AUTH_HEADER"
```

`check-in` is the interesting one — it also opens a `QueueEntry` for this
facility/department, numbered sequentially for the day:

```bash
curl -s "$BASE_URL/api/v1/queue?facilityId=$FACILITY_ID&departmentId=$DEPARTMENT_ID"
```

Expect one entry, `status: "waiting"`, `queueNumber: 1`.

```bash
QUEUE_ENTRY_ID=$(curl -s "$BASE_URL/api/v1/queue?facilityId=$FACILITY_ID&departmentId=$DEPARTMENT_ID" | node -pe "require('/dev/stdin')[0].id")

curl -s "$BASE_URL/api/v1/queue/$QUEUE_ENTRY_ID/call" -X POST -H "$AUTH_HEADER"
curl -s "$BASE_URL/api/v1/appointments/$APPOINTMENT_ID/start" -X POST -H "$AUTH_HEADER"
curl -s "$BASE_URL/api/v1/appointments/$APPOINTMENT_ID/complete" -X POST -H "$AUTH_HEADER"

# Queue should now be empty — completed entries are filtered out.
curl -s "$BASE_URL/api/v1/queue?facilityId=$FACILITY_ID&departmentId=$DEPARTMENT_ID"
```

The full transition table (`apps/scheduling/src/appointments/appointments.service.ts`):

```
requested   -> confirmed, cancelled
confirmed   -> checked_in, cancelled, no_show
checked_in  -> in_service, cancelled, no_show
in_service  -> completed, cancelled
completed / cancelled / no_show -> (terminal)
```

Worth trying once, to see the guards actually hold: calling `/confirm` again
on a `completed` appointment, or `/check-in` on a `requested` one (skipping
`/confirm`), both correctly fail with `400`. Cancelling a `confirmed`
appointment (`POST /appointments/:id/cancel`, body `{"reason": "..."}`)
reopens its slot for rebooking; marking `/no-show` deliberately does **not**
reopen the slot, since the reserved time already passed.

---

## Quick reference

| Step | Method & path (via gateway) | Body |
|---|---|---|
| Register | `POST /api/v1/auth/register` | `{email, password, phone?}` |
| Login | `POST /api/v1/auth/login` | `{email, password}` |
| Create org | `POST /api/v1/organizations` | `{legalName, displayName, type}` |
| Create facility | `POST /api/v1/organizations/:orgId/facilities` | `{name, type, addressLine?, city?, region?, phone?, email?}` |
| Create department | `POST /api/v1/facilities/:facilityId/departments` | `{name, type}` |
| Assign provider | `POST /api/v1/departments/:id/providers` | `{providerId, roleTitle?}` |
| Add recurring schedule | `POST /api/v1/departments/:id/schedules` | `{providerId, dayOfWeek (0-6), startTime ("HH:mm"), endTime ("HH:mm")}` |
| Create appointment type | `POST /api/v1/appointment-types` | `{facilityId, name, code, defaultDurationMins?}` |
| Register patient | `POST /api/v1/patients` | `{firstName, lastName, dateOfBirth ("YYYY-MM-DD"), gender?, nationalId?, phone?}` |
| Generate slots | `POST /api/v1/schedule-slots/generate` | `{departmentId, providerId, dateFrom ("YYYY-MM-DD"), dateTo, slotDurationMins?}` |
| List open slots | `GET /api/v1/schedule-slots?providerId=&status=open` | — |
| Book appointment | `POST /api/v1/appointments` | `{patientId, slotId, appointmentTypeId?, reason?}` |
| Confirm / check-in / start / complete / no-show | `POST /api/v1/appointments/:id/{confirm,check-in,start,complete,no-show}` | none |
| Cancel | `POST /api/v1/appointments/:id/cancel` | `{reason?}` |
| List queue | `GET /api/v1/queue?facilityId=&departmentId=&date=` | — |
| Call next in queue | `POST /api/v1/queue/:id/call` | none |

## Troubleshooting

- **Kafka connection errors in the logs** — expected on the free Render
  deploy (no broker); every write still lands correctly, it's only the async
  Kafka propagation that's missing. See "Deploying to Render" in `README.md`.
- **`schedule-slots/generate` returns `createdCount: 0` with no
  `skippedCount` either** — your `dateFrom`/`dateTo` range doesn't include
  the `dayOfWeek` you set in step 5, so there was nothing to expand. Not an
  error, just an empty match.
- **A `404` on a route that looks like it should exist** — check the
  controller first; a few services deliberately don't have a bare list-all
  route (e.g. Patient only has `GET /patients/search` and `GET
  /patients/:id`, no bare `GET /patients`).
