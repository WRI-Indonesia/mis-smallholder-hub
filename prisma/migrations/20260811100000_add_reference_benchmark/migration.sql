-- #243: Tabel angka acuan manual (benchmark GDrive / MD 1st SOW) per lembaga
-- petani untuk sub-menu Data Analyst → Komparasi Data Acuan. Satu baris per
-- lembaga (unique farmer_group_id), nilai terkini saja — edit menimpa nilai
-- lama, audit fields mencatat pengubah. Semua kolom metrik nullable karena
-- acuan boleh terisi sebagian.
CREATE TABLE "tbl_reference_benchmark" (
    "id" TEXT NOT NULL,
    "farmer_group_id" TEXT NOT NULL,
    "farmer_count" INTEGER,
    "parcel_count" INTEGER,
    "area_ha" DOUBLE PRECISION,
    "training_p1" INTEGER,
    "training_p2_mk" INTEGER,
    "training_p2_k3" INTEGER,
    "training_p34" INTEGER,
    "production_farmer_count" INTEGER,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_reference_benchmark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tbl_reference_benchmark_farmer_group_id_key" ON "tbl_reference_benchmark"("farmer_group_id");

CREATE INDEX "tbl_reference_benchmark_is_active_idx" ON "tbl_reference_benchmark"("is_active");

ALTER TABLE "tbl_reference_benchmark" ADD CONSTRAINT "tbl_reference_benchmark_farmer_group_id_fkey" FOREIGN KEY ("farmer_group_id") REFERENCES "tbl_farmer_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
