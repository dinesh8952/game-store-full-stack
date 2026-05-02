-- Add UserStatus enum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Add status column defaulting to PENDING
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'PENDING';

-- Migrate existing data before dropping old columns
UPDATE "User" SET "status" = 'APPROVED' WHERE "isApproved" = true;
UPDATE "User" SET "status" = 'REJECTED' WHERE "isRejected" = true AND "isApproved" = false;

-- Drop old indexes
DROP INDEX IF EXISTS "User_isApproved_idx";
DROP INDEX IF EXISTS "User_isRejected_idx";

-- Drop old columns
ALTER TABLE "User" DROP COLUMN "isApproved";
ALTER TABLE "User" DROP COLUMN "isRejected";

-- Add new status index
CREATE INDEX "User_status_idx" ON "User"("status");

-- Add missing indexes from schema update
CREATE INDEX IF NOT EXISTS "Game_genre_idx" ON "Game"("genre");
CREATE INDEX IF NOT EXISTS "GamePlay_userId_gameId_idx" ON "GamePlay"("userId", "gameId");
