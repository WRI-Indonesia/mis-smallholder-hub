-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'OPERATOR', 'MANAGEMENT');

-- CreateTable
CREATE TABLE "tbl-user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tbl-user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reg-province" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "reg-province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reg-district" (
    "id" TEXT NOT NULL,
    "province_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "reg-district_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref-farmer-group-type" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ref-farmer-group-type_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "tbl-farmer-group" (
    "id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "code" TEXT,
    "abrv" TEXT,
    "name" TEXT NOT NULL,
    "location_lat" DOUBLE PRECISION,
    "location_long" DOUBLE PRECISION,

    CONSTRAINT "tbl-farmer-group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl-farmer-group-detail" (
    "id" TEXT NOT NULL,
    "farmer_group_id" TEXT NOT NULL,
    "ref_farmer_group_type" TEXT NOT NULL,
    "about" TEXT,

    CONSTRAINT "tbl-farmer-group-detail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl-user_email_key" ON "tbl-user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "reg-province_code_key" ON "reg-province"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reg-district_code_key" ON "reg-district"("code");

-- AddForeignKey
ALTER TABLE "reg-district" ADD CONSTRAINT "reg-district_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "reg-province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-farmer-group" ADD CONSTRAINT "tbl-farmer-group_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "reg-district"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-farmer-group-detail" ADD CONSTRAINT "tbl-farmer-group-detail_farmer_group_id_fkey" FOREIGN KEY ("farmer_group_id") REFERENCES "tbl-farmer-group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-farmer-group-detail" ADD CONSTRAINT "tbl-farmer-group-detail_ref_farmer_group_type_fkey" FOREIGN KEY ("ref_farmer_group_type") REFERENCES "ref-farmer-group-type"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
