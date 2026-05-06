-- CreateTable
CREATE TABLE "tbl-agronomy-production" (
    "id" TEXT NOT NULL,
    "land_parcel_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "yield_kg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "tbl-agronomy-production_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref-maintenance-type" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,

    CONSTRAINT "ref-maintenance-type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl-agronomy-maintenance" (
    "id" TEXT NOT NULL,
    "land_parcel_id" TEXT NOT NULL,
    "ref_maintenance_type_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION,
    "note" TEXT,

    CONSTRAINT "tbl-agronomy-maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref-training-package" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,

    CONSTRAINT "ref-training-package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref-training-evidence" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "desc" TEXT,
    "uri" TEXT NOT NULL,

    CONSTRAINT "ref-training-evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl-training-activity" (
    "id" TEXT NOT NULL,
    "ref_training_package_id" TEXT NOT NULL,
    "farmer_group_id" TEXT,
    "location" TEXT,
    "training_date" TIMESTAMP(3) NOT NULL,
    "total_participant" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tbl-training-activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl-training-participant" (
    "id" TEXT NOT NULL,
    "training_activity_id" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,

    CONSTRAINT "tbl-training-participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref-certification" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,

    CONSTRAINT "ref-certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl-certification" (
    "id" TEXT NOT NULL,
    "ref_certification_id" TEXT NOT NULL,
    "farmer_group_id" TEXT NOT NULL,
    "certification_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tbl-certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref-audit" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,

    CONSTRAINT "ref-audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref-audit-evidence" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "desc" TEXT,
    "uri" TEXT NOT NULL,

    CONSTRAINT "ref-audit-evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl-audit-activity" (
    "id" TEXT NOT NULL,
    "tbl_certification_id" TEXT NOT NULL,
    "ref_audit_id" TEXT NOT NULL,
    "audit_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tbl-audit-activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl-hse-worker" (
    "id" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nik" TEXT,

    CONSTRAINT "tbl-hse-worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl-hse-detail" (
    "id" TEXT NOT NULL,
    "hse_worker_id" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "tbl-hse-detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ActivityEvidences" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ActivityEvidences_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AuditActivityEvidences" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AuditActivityEvidences_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ref-maintenance-type_code_key" ON "ref-maintenance-type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref-training-package_code_key" ON "ref-training-package"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref-certification_code_key" ON "ref-certification"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ref-audit_code_key" ON "ref-audit"("code");

-- CreateIndex
CREATE INDEX "_ActivityEvidences_B_index" ON "_ActivityEvidences"("B");

-- CreateIndex
CREATE INDEX "_AuditActivityEvidences_B_index" ON "_AuditActivityEvidences"("B");

-- AddForeignKey
ALTER TABLE "tbl-agronomy-production" ADD CONSTRAINT "tbl-agronomy-production_land_parcel_id_fkey" FOREIGN KEY ("land_parcel_id") REFERENCES "tbl-land-parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-agronomy-maintenance" ADD CONSTRAINT "tbl-agronomy-maintenance_land_parcel_id_fkey" FOREIGN KEY ("land_parcel_id") REFERENCES "tbl-land-parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-agronomy-maintenance" ADD CONSTRAINT "tbl-agronomy-maintenance_ref_maintenance_type_id_fkey" FOREIGN KEY ("ref_maintenance_type_id") REFERENCES "ref-maintenance-type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-training-activity" ADD CONSTRAINT "tbl-training-activity_ref_training_package_id_fkey" FOREIGN KEY ("ref_training_package_id") REFERENCES "ref-training-package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-training-participant" ADD CONSTRAINT "tbl-training-participant_training_activity_id_fkey" FOREIGN KEY ("training_activity_id") REFERENCES "tbl-training-activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-training-participant" ADD CONSTRAINT "tbl-training-participant_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "tbl-farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-certification" ADD CONSTRAINT "tbl-certification_ref_certification_id_fkey" FOREIGN KEY ("ref_certification_id") REFERENCES "ref-certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-audit-activity" ADD CONSTRAINT "tbl-audit-activity_tbl_certification_id_fkey" FOREIGN KEY ("tbl_certification_id") REFERENCES "tbl-certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-audit-activity" ADD CONSTRAINT "tbl-audit-activity_ref_audit_id_fkey" FOREIGN KEY ("ref_audit_id") REFERENCES "ref-audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-hse-worker" ADD CONSTRAINT "tbl-hse-worker_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "tbl-farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-hse-detail" ADD CONSTRAINT "tbl-hse-detail_hse_worker_id_fkey" FOREIGN KEY ("hse_worker_id") REFERENCES "tbl-hse-worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityEvidences" ADD CONSTRAINT "_ActivityEvidences_A_fkey" FOREIGN KEY ("A") REFERENCES "tbl-training-activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityEvidences" ADD CONSTRAINT "_ActivityEvidences_B_fkey" FOREIGN KEY ("B") REFERENCES "ref-training-evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuditActivityEvidences" ADD CONSTRAINT "_AuditActivityEvidences_A_fkey" FOREIGN KEY ("A") REFERENCES "tbl-audit-activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuditActivityEvidences" ADD CONSTRAINT "_AuditActivityEvidences_B_fkey" FOREIGN KEY ("B") REFERENCES "ref-audit-evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
