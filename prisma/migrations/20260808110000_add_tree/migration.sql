-- #238: Tabel titik pohon sawit per lahan (hasil deteksi model + koreksi
-- manusia, diunggah via ZIP shapefile point). Pola revisi per-set: upload
-- ulang menonaktifkan seluruh set pohon lama lahan tsb (is_active = false)
-- dan menyisipkan set baru dengan revision + 1.
CREATE TABLE "tbl_tree" (
    "id" TEXT NOT NULL,
    "land_parcel_id" TEXT NOT NULL,
    "parcel_id" TEXT NOT NULL,
    "tree_id" INTEGER,
    "sequence_no" INTEGER,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "vigor" DOUBLE PRECISION,
    "source" TEXT,
    "model_version" TEXT,
    "surveyed_at" TIMESTAMP(3),
    "source_file" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_tree_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tbl_tree_land_parcel_id_is_active_idx" ON "tbl_tree"("land_parcel_id", "is_active");

CREATE INDEX "tbl_tree_parcel_id_idx" ON "tbl_tree"("parcel_id");

CREATE INDEX "tbl_tree_is_active_idx" ON "tbl_tree"("is_active");

ALTER TABLE "tbl_tree" ADD CONSTRAINT "tbl_tree_land_parcel_id_fkey" FOREIGN KEY ("land_parcel_id") REFERENCES "tbl_land_parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
