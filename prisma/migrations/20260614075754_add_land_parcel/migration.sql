-- CreateTable
CREATE TABLE "tbl_land_parcel" (
    "id" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "parcel_id" TEXT NOT NULL,
    "geometry" JSONB,
    "area" DOUBLE PRECISION,
    "land_status" TEXT,
    "crop_type" TEXT,
    "planting_year" INTEGER,
    "notes" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_land_parcel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_land_parcel_farmer_id_idx" ON "tbl_land_parcel"("farmer_id");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_is_active_idx" ON "tbl_land_parcel"("is_active");

-- CreateIndex
CREATE INDEX "tbl_land_parcel_parcel_id_idx" ON "tbl_land_parcel"("parcel_id");

-- AddForeignKey
ALTER TABLE "tbl_land_parcel" ADD CONSTRAINT "tbl_land_parcel_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "tbl_farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
