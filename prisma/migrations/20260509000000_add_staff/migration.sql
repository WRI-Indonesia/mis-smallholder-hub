-- Migration: add_staff
-- Issue #41 — Master Data Staff WRI
-- Creates ref-job-desk, tbl-staff, tbl-staff-district, tbl-staff-farmer-group

-- ─── ref-job-desk ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ref-job-desk" (
    "id"          TEXT NOT NULL,
    "code"        TEXT NOT NULL,
    "name"        TEXT NOT NULL,

    CONSTRAINT "ref-job-desk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ref-job-desk_code_key" ON "ref-job-desk"("code");

-- ─── tbl-staff ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tbl-staff" (
    "id"              TEXT NOT NULL,
    "staff_code"      TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "job_desk_id"     TEXT NOT NULL,
    "email_wri"       TEXT,
    "line_manager_id" TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"      TEXT,
    "modified_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_by"     TEXT,

    CONSTRAINT "tbl-staff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tbl-staff_staff_code_key" ON "tbl-staff"("staff_code");

ALTER TABLE "tbl-staff"
    ADD CONSTRAINT "tbl-staff_job_desk_id_fkey"
    FOREIGN KEY ("job_desk_id")
    REFERENCES "ref-job-desk"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tbl-staff"
    ADD CONSTRAINT "tbl-staff_line_manager_id_fkey"
    FOREIGN KEY ("line_manager_id")
    REFERENCES "tbl-staff"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tbl-staff"
    ADD CONSTRAINT "tbl-staff_created_by_fkey"
    FOREIGN KEY ("created_by")
    REFERENCES "tbl-user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tbl-staff"
    ADD CONSTRAINT "tbl-staff_modified_by_fkey"
    FOREIGN KEY ("modified_by")
    REFERENCES "tbl-user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── tbl-staff-district ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tbl-staff-district" (
    "id"          TEXT NOT NULL,
    "staff_id"    TEXT NOT NULL,
    "district_id" TEXT NOT NULL,

    CONSTRAINT "tbl-staff-district_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tbl-staff-district_staff_id_district_id_key"
    ON "tbl-staff-district"("staff_id", "district_id");

ALTER TABLE "tbl-staff-district"
    ADD CONSTRAINT "tbl-staff-district_staff_id_fkey"
    FOREIGN KEY ("staff_id")
    REFERENCES "tbl-staff"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tbl-staff-district"
    ADD CONSTRAINT "tbl-staff-district_district_id_fkey"
    FOREIGN KEY ("district_id")
    REFERENCES "reg-district"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── tbl-staff-farmer-group ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tbl-staff-farmer-group" (
    "id"              TEXT NOT NULL,
    "staff_id"        TEXT NOT NULL,
    "farmer_group_id" TEXT NOT NULL,

    CONSTRAINT "tbl-staff-farmer-group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tbl-staff-farmer-group_staff_id_farmer_group_id_key"
    ON "tbl-staff-farmer-group"("staff_id", "farmer_group_id");

ALTER TABLE "tbl-staff-farmer-group"
    ADD CONSTRAINT "tbl-staff-farmer-group_staff_id_fkey"
    FOREIGN KEY ("staff_id")
    REFERENCES "tbl-staff"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tbl-staff-farmer-group"
    ADD CONSTRAINT "tbl-staff-farmer-group_farmer_group_id_fkey"
    FOREIGN KEY ("farmer_group_id")
    REFERENCES "tbl-farmer-group"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
