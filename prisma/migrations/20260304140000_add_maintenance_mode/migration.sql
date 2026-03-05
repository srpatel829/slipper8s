-- Add maintenance mode flag and final results tracking to AppSettings
ALTER TABLE "AppSettings" ADD COLUMN "maintenanceMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AppSettings" ADD COLUMN "finalResultsSentAt" TIMESTAMP(3);
