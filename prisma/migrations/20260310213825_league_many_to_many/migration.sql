-- AlterTable: Add new League fields
ALTER TABLE "League" ADD COLUMN     "description" TEXT,
ADD COLUMN     "maxEntries" INTEGER,
ADD COLUMN     "trackPayments" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: LeagueEntry join table
CREATE TABLE "LeagueEntry" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeagueEntry_leagueId_entryId_key" ON "LeagueEntry"("leagueId", "entryId");

-- AddForeignKey
ALTER TABLE "LeagueEntry" ADD CONSTRAINT "LeagueEntry_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueEntry" ADD CONSTRAINT "LeagueEntry_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: Copy existing Entry.leagueId relationships into LeagueEntry
INSERT INTO "LeagueEntry" ("id", "leagueId", "entryId")
SELECT gen_random_uuid()::text, "leagueId", "id"
FROM "Entry"
WHERE "leagueId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Entry" DROP CONSTRAINT "Entry_leagueId_fkey";

-- AlterTable: Drop leagueId from Entry
ALTER TABLE "Entry" DROP COLUMN "leagueId";
