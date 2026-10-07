-- CreateTable
CREATE TABLE "wards" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "wardId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "admittingProviderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'admitted',
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),
    "dischargeNotes" TEXT,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "fromBedId" TEXT NOT NULL,
    "toBedId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_visits" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "chiefComplaint" TEXT NOT NULL,
    "triageLevel" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "arrivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),

    CONSTRAINT "emergency_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "contextId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wards_facilityId_idx" ON "wards"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "beds_wardId_bedNumber_key" ON "beds"("wardId", "bedNumber");

-- CreateIndex
CREATE INDEX "admissions_patientId_idx" ON "admissions"("patientId");

-- CreateIndex
CREATE INDEX "admissions_wardId_status_idx" ON "admissions"("wardId", "status");

-- CreateIndex
CREATE INDEX "transfers_admissionId_idx" ON "transfers"("admissionId");

-- CreateIndex
CREATE INDEX "emergency_visits_facilityId_status_idx" ON "emergency_visits"("facilityId", "status");

-- CreateIndex
CREATE INDEX "emergency_visits_patientId_idx" ON "emergency_visits"("patientId");

-- CreateIndex
CREATE INDEX "audit_events_contextId_resourceType_resourceId_createdAt_idx" ON "audit_events"("contextId", "resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "outbox_events_status_createdAt_idx" ON "outbox_events"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_fromBedId_fkey" FOREIGN KEY ("fromBedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_toBedId_fkey" FOREIGN KEY ("toBedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
