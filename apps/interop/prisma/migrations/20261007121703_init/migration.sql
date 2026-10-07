-- CreateTable
CREATE TABLE "interop_access_logs" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interop_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interop_access_logs_resourceType_resourceId_requestedAt_idx" ON "interop_access_logs"("resourceType", "resourceId", "requestedAt");
