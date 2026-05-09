-- Migration: add_staff_activity
-- Issue #43 — Staff Activity: Daily Log, Approval, Calendar View & Export

-- ─── ActivityStatus enum ──────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE "ActivityStatus" AS ENUM (
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ─── tbl-staff-activity ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tbl-staff-activity" (
    "id"             TEXT NOT NULL,
    "staff_id"       TEXT NOT NULL,
    "activity_date"  DATE NOT NULL,
    "activity"       TEXT NOT NULL,
    "comment"        TEXT,
    "achievement"    TEXT,
    "status"         "ActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by_id" TEXT,
    "approved_at"    TIMESTAMP(3),
    "rejection_note" TEXT,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"     TEXT,
    "modified_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_by"    TEXT,

    CONSTRAINT "tbl-staff-activity_pkey" PRIMARY KEY ("id")
);

-- Unique: one record per staff per day
CREATE UNIQUE INDEX IF NOT EXISTS "tbl-staff-activity_staff_id_activity_date_key"
    ON "tbl-staff-activity"("staff_id", "activity_date");

ALTER TABLE "tbl-staff-activity"
    ADD CONSTRAINT "tbl-staff-activity_staff_id_fkey"
    FOREIGN KEY ("staff_id")
    REFERENCES "tbl-staff"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tbl-staff-activity"
    ADD CONSTRAINT "tbl-staff-activity_approved_by_id_fkey"
    FOREIGN KEY ("approved_by_id")
    REFERENCES "tbl-staff"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── tbl-staff-activity-photo ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tbl-staff-activity-photo" (
    "id"          TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "s3_key"      TEXT NOT NULL,
    "filename"    TEXT NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl-staff-activity-photo_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tbl-staff-activity-photo"
    ADD CONSTRAINT "tbl-staff-activity-photo_activity_id_fkey"
    FOREIGN KEY ("activity_id")
    REFERENCES "tbl-staff-activity"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
