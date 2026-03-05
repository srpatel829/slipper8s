-- Add maintenance mode flag to AppSettings
ALTER TABLE "AppSettings" ADD COLUMN "maintenanceMode" BOOLEAN NOT NULL DEFAULT false;
