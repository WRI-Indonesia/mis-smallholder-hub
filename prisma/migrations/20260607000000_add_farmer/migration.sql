-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F');

-- CreateTable
CREATE TABLE "tbl_farmer" (
    "id" TEXT NOT NULL,
    "farmer_group_id" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "name" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "nik" TEXT,
    "address" TEXT,
    "birth_place" TEXT,
    "birth_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_farmer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_farmer_farmer_group_id_idx" ON "tbl_farmer"("farmer_group_id");

-- CreateIndex
CREATE INDEX "tbl_farmer_is_active_idx" ON "tbl_farmer"("is_active");

-- CreateIndex
CREATE INDEX "tbl_farmer_farmer_id_idx" ON "tbl_farmer"("farmer_id");

-- AddForeignKey
ALTER TABLE "tbl_farmer" ADD CONSTRAINT "tbl_farmer_farmer_group_id_fkey" FOREIGN KEY ("farmer_group_id") REFERENCES "tbl_farmer_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
