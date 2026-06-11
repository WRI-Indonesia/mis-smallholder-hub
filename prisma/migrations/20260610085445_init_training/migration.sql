-- CreateEnum
CREATE TYPE "TrainingCategory" AS ENUM ('PAKET_1_BMP_PC_RSPO_NKT', 'PAKET_2_MK', 'PAKET_2_K3', 'PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV', 'OTHER');

-- AlterTable
ALTER TABLE "tbl_farmer" ADD COLUMN     "joined_year" INTEGER;

-- CreateTable
CREATE TABLE "ref_training_package" (
    "id" TEXT NOT NULL,
    "code" "TrainingCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "ref_training_package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_training_activity" (
    "id" TEXT NOT NULL,
    "ref_training_package_id" TEXT NOT NULL,
    "farmer_group_id" TEXT NOT NULL,
    "location" TEXT,
    "training_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_training_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_training_participant" (
    "id" TEXT NOT NULL,
    "training_activity_id" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_training_participant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ref_training_package_code_key" ON "ref_training_package"("code");

-- CreateIndex
CREATE INDEX "tbl_training_activity_ref_training_package_id_idx" ON "tbl_training_activity"("ref_training_package_id");

-- CreateIndex
CREATE INDEX "tbl_training_activity_farmer_group_id_idx" ON "tbl_training_activity"("farmer_group_id");

-- CreateIndex
CREATE INDEX "tbl_training_activity_is_active_idx" ON "tbl_training_activity"("is_active");

-- CreateIndex
CREATE INDEX "tbl_training_participant_training_activity_id_idx" ON "tbl_training_participant"("training_activity_id");

-- CreateIndex
CREATE INDEX "tbl_training_participant_farmer_id_idx" ON "tbl_training_participant"("farmer_id");

-- CreateIndex
CREATE INDEX "tbl_training_participant_is_active_idx" ON "tbl_training_participant"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_training_participant_training_activity_id_farmer_id_key" ON "tbl_training_participant"("training_activity_id", "farmer_id");

-- AddForeignKey
ALTER TABLE "tbl_training_activity" ADD CONSTRAINT "tbl_training_activity_ref_training_package_id_fkey" FOREIGN KEY ("ref_training_package_id") REFERENCES "ref_training_package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_training_activity" ADD CONSTRAINT "tbl_training_activity_farmer_group_id_fkey" FOREIGN KEY ("farmer_group_id") REFERENCES "tbl_farmer_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_training_participant" ADD CONSTRAINT "tbl_training_participant_training_activity_id_fkey" FOREIGN KEY ("training_activity_id") REFERENCES "tbl_training_activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_training_participant" ADD CONSTRAINT "tbl_training_participant_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "tbl_farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
