-- CreateTable
CREATE TABLE "supply_items" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "supply_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_ledger_entries" (
    "id" TEXT NOT NULL,
    "supplyItemId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "performedBy" TEXT NOT NULL,
    "notes" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_policies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "payerName" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "groupNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "effectiveDate" DATE NOT NULL,
    "expirationDate" DATE,

    CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amountClaimed" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decisionNotes" TEXT,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fromProviderId" TEXT NOT NULL,
    "toFacilityId" TEXT,
    "toProviderId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "supply_items_facilityId_idx" ON "supply_items"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "supply_items_facilityId_itemCode_key" ON "supply_items"("facilityId", "itemCode");

-- CreateIndex
CREATE INDEX "supply_ledger_entries_supplyItemId_performedAt_idx" ON "supply_ledger_entries"("supplyItemId", "performedAt");

-- CreateIndex
CREATE INDEX "insurance_policies_patientId_idx" ON "insurance_policies"("patientId");

-- CreateIndex
CREATE INDEX "claims_policyId_idx" ON "claims"("policyId");

-- CreateIndex
CREATE INDEX "claims_status_idx" ON "claims"("status");

-- CreateIndex
CREATE INDEX "referrals_patientId_idx" ON "referrals"("patientId");

-- CreateIndex
CREATE INDEX "audit_events_contextId_resourceType_resourceId_createdAt_idx" ON "audit_events"("contextId", "resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "outbox_events_status_createdAt_idx" ON "outbox_events"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "supply_ledger_entries" ADD CONSTRAINT "supply_ledger_entries_supplyItemId_fkey" FOREIGN KEY ("supplyItemId") REFERENCES "supply_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "insurance_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
