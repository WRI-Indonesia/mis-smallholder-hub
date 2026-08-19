-- CreateTable
CREATE TABLE "tbl_farmer_group_boundary" (
    "id" TEXT NOT NULL,
    "farmer_group_id" TEXT NOT NULL,
    "geom" geometry(MultiPolygon, 4326),
    "geojson" JSONB NOT NULL,
    "source" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_farmer_group_boundary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_farmer_group_boundary_farmer_group_id_idx" ON "tbl_farmer_group_boundary"("farmer_group_id");

-- CreateIndex
CREATE INDEX "tbl_farmer_group_boundary_is_active_idx" ON "tbl_farmer_group_boundary"("is_active");

-- CreateIndex (spatial): GiST untuk ST_Intersects/ST_Contains — di luar
-- kemampuan deklarasi Prisma pada kolom Unsupported, ditulis manual di sini.
CREATE INDEX "tbl_farmer_group_boundary_geom_idx" ON "tbl_farmer_group_boundary" USING GIST ("geom");

-- AddForeignKey
ALTER TABLE "tbl_farmer_group_boundary" ADD CONSTRAINT "tbl_farmer_group_boundary_farmer_group_id_fkey" FOREIGN KEY ("farmer_group_id") REFERENCES "tbl_farmer_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
