-- Add email tracking fields to AppSettings
ALTER TABLE "AppSettings" ADD COLUMN "deadlineReminderSentAt" TIMESTAMP(3);
ALTER TABLE "AppSettings" ADD COLUMN "entriesLockedSentAt" TIMESTAMP(3);

-- Add daily recap tracking to Checkpoint
ALTER TABLE "Checkpoint" ADD COLUMN "dailyRecapSentAt" TIMESTAMP(3);
