-- Migration: split_activity_planning_realization
-- Issue #43 — Split activity field into planning + realization

-- Rename existing 'activity' column to 'planning'
ALTER TABLE "tbl-staff-activity"
    RENAME COLUMN "activity" TO "planning";

-- Add new 'realization' column (nullable — can be filled later)
ALTER TABLE "tbl-staff-activity"
    ADD COLUMN IF NOT EXISTS "realization" TEXT;
