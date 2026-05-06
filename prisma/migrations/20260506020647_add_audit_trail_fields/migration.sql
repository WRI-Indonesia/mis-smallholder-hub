-- Migration: add_audit_trail_fields
-- Adds createdAt, createdBy, modifiedAt, modifiedBy to all 22 tables.
-- All new columns are nullable or have a DEFAULT to be safe with existing data.
-- modifiedAt uses DEFAULT NOW() so existing rows get a valid timestamp.
-- No DROP COLUMN or DROP TABLE statements.

-- ─── tbl-user ────────────────────────────────────────────────────────────────
-- Rename updatedAt → modifiedAt, add createdBy / modifiedBy
ALTER TABLE "tbl-user" RENAME COLUMN "updatedAt" TO "modified_at";
ALTER TABLE "tbl-user" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "tbl-user" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "tbl-user" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── tbl-farmer-group ────────────────────────────────────────────────────────
ALTER TABLE "tbl-farmer-group" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-farmer-group" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "tbl-farmer-group" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-farmer-group" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── tbl-farmer-group-detail ─────────────────────────────────────────────────
ALTER TABLE "tbl-farmer-group-detail" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-farmer-group-detail" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "tbl-farmer-group-detail" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-farmer-group-detail" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── tbl-farmer ──────────────────────────────────────────────────────────────
ALTER TABLE "tbl-farmer" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-farmer" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "tbl-farmer" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-farmer" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── tbl-land-parcel ─────────────────────────────────────────────────────────
ALTER TABLE "tbl-land-parcel" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-land-parcel" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "tbl-land-parcel" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-land-parcel" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── tbl-agronomy-production ─────────────────────────────────────────────────
ALTER TABLE "tbl-agronomy-production" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-agronomy-production" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "tbl-agronomy-production" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-agronomy-production" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── tbl-agronomy-maintenance ────────────────────────────────────────────────
ALTER TABLE "tbl-agronomy-maintenance" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-agronomy-maintenance" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "tbl-agronomy-maintenance" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-agronomy-maintenance" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── tbl-training-activity ───────────────────────────────────────────────────
ALTER TABLE "tbl-training-activity" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-training-activity" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "tbl-training-activity" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-training-activity" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── tbl-training-participant ────────────────────────────────────────────────
ALTER TABLE "tbl-training-participant" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-training-participant" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "tbl-training-participant" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-training-participant" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── tbl-certification ───────────────────────────────────────────────────────
ALTER TABLE "tbl-certification" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-certification" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "tbl-certification" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-certification" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── tbl-audit-activity ──────────────────────────────────────────────────────
ALTER TABLE "tbl-audit-activity" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-audit-activity" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "tbl-audit-activity" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-audit-activity" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── tbl-hse-worker ──────────────────────────────────────────────────────────
ALTER TABLE "tbl-hse-worker" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-hse-worker" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "tbl-hse-worker" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-hse-worker" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── tbl-hse-detail ──────────────────────────────────────────────────────────
ALTER TABLE "tbl-hse-detail" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-hse-detail" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "tbl-hse-detail" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tbl-hse-detail" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── ref-batch ───────────────────────────────────────────────────────────────
ALTER TABLE "ref-batch" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-batch" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "ref-batch" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-batch" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── ref-commodity ───────────────────────────────────────────────────────────
ALTER TABLE "ref-commodity" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-commodity" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "ref-commodity" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-commodity" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── ref-farmer-group-type ───────────────────────────────────────────────────
ALTER TABLE "ref-farmer-group-type" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-farmer-group-type" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "ref-farmer-group-type" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-farmer-group-type" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── ref-maintenance-type ────────────────────────────────────────────────────
ALTER TABLE "ref-maintenance-type" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-maintenance-type" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "ref-maintenance-type" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-maintenance-type" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── ref-training-package ────────────────────────────────────────────────────
ALTER TABLE "ref-training-package" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-training-package" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "ref-training-package" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-training-package" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── ref-training-evidence ───────────────────────────────────────────────────
ALTER TABLE "ref-training-evidence" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-training-evidence" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "ref-training-evidence" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-training-evidence" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── ref-certification ───────────────────────────────────────────────────────
ALTER TABLE "ref-certification" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-certification" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "ref-certification" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-certification" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── ref-audit ───────────────────────────────────────────────────────────────
ALTER TABLE "ref-audit" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-audit" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "ref-audit" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-audit" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── ref-audit-evidence ──────────────────────────────────────────────────────
ALTER TABLE "ref-audit-evidence" ADD COLUMN IF NOT EXISTS "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-audit-evidence" ADD COLUMN IF NOT EXISTS "created_by"  TEXT;
ALTER TABLE "ref-audit-evidence" ADD COLUMN IF NOT EXISTS "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ref-audit-evidence" ADD COLUMN IF NOT EXISTS "modified_by" TEXT;

-- ─── Foreign key constraints for createdBy / modifiedBy ──────────────────────
-- tbl-farmer-group
ALTER TABLE "tbl-farmer-group"
  ADD CONSTRAINT "tbl-farmer-group_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "tbl-farmer-group_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- tbl-farmer-group-detail
ALTER TABLE "tbl-farmer-group-detail"
  ADD CONSTRAINT "tbl-farmer-group-detail_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "tbl-farmer-group-detail_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- tbl-farmer
ALTER TABLE "tbl-farmer"
  ADD CONSTRAINT "tbl-farmer_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "tbl-farmer_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- tbl-land-parcel
ALTER TABLE "tbl-land-parcel"
  ADD CONSTRAINT "tbl-land-parcel_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "tbl-land-parcel_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- tbl-agronomy-production
ALTER TABLE "tbl-agronomy-production"
  ADD CONSTRAINT "tbl-agronomy-production_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "tbl-agronomy-production_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- tbl-agronomy-maintenance
ALTER TABLE "tbl-agronomy-maintenance"
  ADD CONSTRAINT "tbl-agronomy-maintenance_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "tbl-agronomy-maintenance_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- tbl-training-activity
ALTER TABLE "tbl-training-activity"
  ADD CONSTRAINT "tbl-training-activity_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "tbl-training-activity_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- tbl-training-participant
ALTER TABLE "tbl-training-participant"
  ADD CONSTRAINT "tbl-training-participant_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "tbl-training-participant_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- tbl-certification
ALTER TABLE "tbl-certification"
  ADD CONSTRAINT "tbl-certification_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "tbl-certification_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- tbl-audit-activity
ALTER TABLE "tbl-audit-activity"
  ADD CONSTRAINT "tbl-audit-activity_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "tbl-audit-activity_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- tbl-hse-worker
ALTER TABLE "tbl-hse-worker"
  ADD CONSTRAINT "tbl-hse-worker_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "tbl-hse-worker_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- tbl-hse-detail
ALTER TABLE "tbl-hse-detail"
  ADD CONSTRAINT "tbl-hse-detail_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "tbl-hse-detail_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ref-batch
ALTER TABLE "ref-batch"
  ADD CONSTRAINT "ref-batch_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ref-batch_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ref-commodity
ALTER TABLE "ref-commodity"
  ADD CONSTRAINT "ref-commodity_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ref-commodity_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ref-farmer-group-type
ALTER TABLE "ref-farmer-group-type"
  ADD CONSTRAINT "ref-farmer-group-type_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ref-farmer-group-type_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ref-maintenance-type
ALTER TABLE "ref-maintenance-type"
  ADD CONSTRAINT "ref-maintenance-type_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ref-maintenance-type_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ref-training-package
ALTER TABLE "ref-training-package"
  ADD CONSTRAINT "ref-training-package_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ref-training-package_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ref-training-evidence
ALTER TABLE "ref-training-evidence"
  ADD CONSTRAINT "ref-training-evidence_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ref-training-evidence_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ref-certification
ALTER TABLE "ref-certification"
  ADD CONSTRAINT "ref-certification_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ref-certification_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ref-audit
ALTER TABLE "ref-audit"
  ADD CONSTRAINT "ref-audit_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ref-audit_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ref-audit-evidence
ALTER TABLE "ref-audit-evidence"
  ADD CONSTRAINT "ref-audit-evidence_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ref-audit-evidence_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "tbl-user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
