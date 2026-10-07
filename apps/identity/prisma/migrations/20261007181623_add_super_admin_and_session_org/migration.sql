-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "activeOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
