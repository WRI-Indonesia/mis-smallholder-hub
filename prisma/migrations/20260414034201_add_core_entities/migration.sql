-- CreateTable
CREATE TABLE "ref-batch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,

    CONSTRAINT "ref-batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref-commodity" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,

    CONSTRAINT "ref-commodity_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "tbl-farmer" (
    "id" TEXT NOT NULL,
    "farmer_group_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "wri_farmer_id" TEXT,
    "ui_farmer_id" TEXT,
    "name" TEXT NOT NULL,
    "nik" VARCHAR(16) NOT NULL,
    "gender" TEXT NOT NULL,
    "birthdate" TIMESTAMP(3) NOT NULL,
    "status" TEXT,

    CONSTRAINT "tbl-farmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl-land-parcel" (
    "id" TEXT NOT NULL,
    "farmer_id" TEXT NOT NULL,
    "commodity_code" TEXT,
    "wri_land_parcel_id" TEXT,
    "parcel_code" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "polygon" geometry(Polygon, 4326),
    "centerPoint" geometry(Point, 4326),
    "polygon_size_ha" DOUBLE PRECISION,
    "legal_id" TEXT,
    "legal_size_ha" DOUBLE PRECISION,
    "status" TEXT,

    CONSTRAINT "tbl-land-parcel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ref-batch_code_key" ON "ref-batch"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl-farmer_nik_key" ON "tbl-farmer"("nik");

-- AddForeignKey
ALTER TABLE "tbl-farmer" ADD CONSTRAINT "tbl-farmer_farmer_group_id_fkey" FOREIGN KEY ("farmer_group_id") REFERENCES "tbl-farmer-group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-farmer" ADD CONSTRAINT "tbl-farmer_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ref-batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-land-parcel" ADD CONSTRAINT "tbl-land-parcel_farmer_id_fkey" FOREIGN KEY ("farmer_id") REFERENCES "tbl-farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-land-parcel" ADD CONSTRAINT "tbl-land-parcel_commodity_code_fkey" FOREIGN KEY ("commodity_code") REFERENCES "ref-commodity"("code") ON DELETE SET NULL ON UPDATE CASCADE;
