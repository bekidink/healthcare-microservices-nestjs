-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "facilityId" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_tool_invocations" (
    "id" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "inputPayload" JSONB NOT NULL,
    "outputPayload" JSONB,
    "invokedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "invokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_tool_invocations_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "analytics_snapshots_snapshotType_facilityId_computedAt_idx" ON "analytics_snapshots"("snapshotType", "facilityId", "computedAt");

-- CreateIndex
CREATE INDEX "ai_tool_invocations_toolName_invokedAt_idx" ON "ai_tool_invocations"("toolName", "invokedAt");

-- CreateIndex
CREATE INDEX "ai_tool_invocations_invokedBy_invokedAt_idx" ON "ai_tool_invocations"("invokedBy", "invokedAt");

-- CreateIndex
CREATE INDEX "audit_events_contextId_resourceType_resourceId_createdAt_idx" ON "audit_events"("contextId", "resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "outbox_events_status_createdAt_idx" ON "outbox_events"("status", "createdAt");
