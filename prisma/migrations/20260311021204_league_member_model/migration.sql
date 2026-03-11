-- CreateTable: LeagueMember (user-level league membership)
CREATE TABLE "LeagueMember" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_leagueId_userId_key" ON "LeagueMember"("leagueId", "userId");

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: Create LeagueMember rows from existing LeagueEntry data
-- One row per unique (leagueId, userId), carrying paid status from first entry
INSERT INTO "LeagueMember" ("id", "leagueId", "userId", "paid", "joinedAt")
SELECT DISTINCT ON (le."leagueId", e."userId")
    gen_random_uuid()::text,
    le."leagueId",
    e."userId",
    le."paid",
    le."joinedAt"
FROM "LeagueEntry" le
JOIN "Entry" e ON le."entryId" = e."id"
ORDER BY le."leagueId", e."userId", le."joinedAt" ASC;

-- DataMigration: Ensure league admins are members (if not already from LeagueEntry)
INSERT INTO "LeagueMember" ("id", "leagueId", "userId", "paid", "joinedAt")
SELECT
    gen_random_uuid()::text,
    l."id",
    l."adminId",
    false,
    l."createdAt"
FROM "League" l
WHERE NOT EXISTS (
    SELECT 1 FROM "LeagueMember" lm
    WHERE lm."leagueId" = l."id" AND lm."userId" = l."adminId"
);

-- AlterTable: Drop paid from LeagueEntry (now tracked on LeagueMember)
ALTER TABLE "LeagueEntry" DROP COLUMN "paid";
