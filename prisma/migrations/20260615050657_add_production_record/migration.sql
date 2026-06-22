-- CreateTable
CREATE TABLE "tbl_production_record" (
    "id" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "parcel_id" TEXT,
    "period" TEXT NOT NULL,
    "harvest_date" TIMESTAMP(3) NOT NULL,
    "harvest_number" INTEGER NOT NULL,
    "yield_kg" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_production_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_production_record_farmer_id_idx" ON "tbl_production_record"("farmer_id");

-- CreateIndex
CREATE INDEX "tbl_production_record_parcel_id_idx" ON "tbl_production_record"("parcel_id");

-- CreateIndex
CREATE INDEX "tbl_production_record_period_idx" ON "tbl_production_record"("period");

-- CreateIndex
CREATE INDEX "tbl_production_record_is_active_idx" ON "tbl_production_record"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_production_record_farmer_id_period_harvest_number_key" ON "tbl_production_record"("farmer_id", "period", "harvest_number");

-- AddForeignKey
ALTER TABLE "tbl_production_record" ADD CONSTRAINT "tbl_production_record_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "tbl_farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_production_record" ADD CONSTRAINT "tbl_production_record_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "tbl_land_parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
