-- CreateTable
CREATE TABLE "cache-dashboard-stats" (
    "id" TEXT NOT NULL,
    "district_id" TEXT,
    "total_groups" INTEGER NOT NULL DEFAULT 0,
    "total_farmers" INTEGER NOT NULL DEFAULT 0,
    "male_farmers" INTEGER NOT NULL DEFAULT 0,
    "female_farmers" INTEGER NOT NULL DEFAULT 0,
    "total_parcels" INTEGER NOT NULL DEFAULT 0,
    "total_area_ha" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "training_pkt" INTEGER NOT NULL DEFAULT 0,
    "training_bmpgap" INTEGER NOT NULL DEFAULT 0,
    "training_pre_sertifikasi" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cache-dashboard-stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cache-dashboard-group-stats" (
    "id" TEXT NOT NULL,
    "farmer_group_id" TEXT NOT NULL,
    "farmer_count" INTEGER NOT NULL DEFAULT 0,
    "male_farmers" INTEGER NOT NULL DEFAULT 0,
    "female_farmers" INTEGER NOT NULL DEFAULT 0,
    "parcel_count" INTEGER NOT NULL DEFAULT 0,
    "total_area_ha" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "training_pkt" INTEGER NOT NULL DEFAULT 0,
    "training_bmpgap" INTEGER NOT NULL DEFAULT 0,
    "training_pre_sertifikasi" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cache-dashboard-group-stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cache-dashboard-stats_district_id_key" ON "cache-dashboard-stats"("district_id");

-- CreateIndex
CREATE UNIQUE INDEX "cache-dashboard-group-stats_farmer_group_id_key" ON "cache-dashboard-group-stats"("farmer_group_id");

-- AddForeignKey
ALTER TABLE "cache-dashboard-stats" ADD CONSTRAINT "cache-dashboard-stats_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "reg-district"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cache-dashboard-group-stats" ADD CONSTRAINT "cache-dashboard-group-stats_farmer_group_id_fkey" FOREIGN KEY ("farmer_group_id") REFERENCES "tbl-farmer-group"("id") ON DELETE CASCADE ON UPDATE CASCADE;