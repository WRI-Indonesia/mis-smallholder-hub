-- CreateEnum
CREATE TYPE "AdminBoundaryLevel" AS ENUM ('KABUPATEN', 'KECAMATAN', 'DESA');

-- CreateTable
CREATE TABLE "tbl_administrative_boundary" (
    "id" TEXT NOT NULL,
    "level" "AdminBoundaryLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parent_name" TEXT,
    "district_id" TEXT,
    "geom" geometry(MultiPolygon, 4326),
    "geojson" JSONB NOT NULL,
    "source" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_administrative_boundary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_administrative_boundary_level_is_active_idx" ON "tbl_administrative_boundary"("level", "is_active");

-- CreateIndex
CREATE INDEX "tbl_administrative_boundary_district_id_idx" ON "tbl_administrative_boundary"("district_id");

-- CreateIndex (spatial): GiST — manual, di luar kemampuan deklarasi Prisma pada kolom Unsupported.
CREATE INDEX "tbl_administrative_boundary_geom_idx" ON "tbl_administrative_boundary" USING GIST ("geom");

-- AddForeignKey
ALTER TABLE "tbl_administrative_boundary" ADD CONSTRAINT "tbl_administrative_boundary_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "reg_district"("id") ON DELETE SET NULL ON UPDATE CASCADE;
