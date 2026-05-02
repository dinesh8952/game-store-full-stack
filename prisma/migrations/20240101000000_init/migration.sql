CREATE TYPE "Genre" AS ENUM ('ACTION', 'ADVENTURE', 'PUZZLE', 'STRATEGY', 'SPORTS', 'RPG', 'SIMULATION', 'OTHER');

CREATE TABLE "User" (
    "id"              TEXT NOT NULL,
    "email"           TEXT NOT NULL,
    "passwordHash"    TEXT NOT NULL,
    "isSuperAdmin"    BOOLEAN NOT NULL DEFAULT false,
    "isApproved"      BOOLEAN NOT NULL DEFAULT false,
    "isRejected"      BOOLEAN NOT NULL DEFAULT false,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_isApproved_idx" ON "User"("isApproved");
CREATE INDEX "User_isRejected_idx" ON "User"("isRejected");

-- userId is the primary key — no separate id column needed
CREATE TABLE "UserProfile" (
    "userId"    TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName"  TEXT NOT NULL,
    "phone"     TEXT NOT NULL,
    "address"   TEXT NOT NULL,
    "city"      TEXT NOT NULL,
    "state"     TEXT NOT NULL,
    "country"   TEXT NOT NULL,
    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "Game" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT NOT NULL,
    "genre"        "Genre" NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "maxPlayers"   INTEGER NOT NULL,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "playCount"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Game_isActive_idx" ON "Game"("isActive");

CREATE TABLE "GamePlay" (
    "id"       TEXT NOT NULL,
    "userId"   TEXT NOT NULL,
    "gameId"   TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GamePlay_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GamePlay_gameId_idx" ON "GamePlay"("gameId");
CREATE INDEX "GamePlay_userId_idx" ON "GamePlay"("userId");

-- ON DELETE CASCADE — deleting user removes their profile automatically
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GamePlay" ADD CONSTRAINT "GamePlay_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GamePlay" ADD CONSTRAINT "GamePlay_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
