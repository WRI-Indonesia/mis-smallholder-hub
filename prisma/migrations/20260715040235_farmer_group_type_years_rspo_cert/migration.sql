-- CreateEnum
CREATE TYPE "FarmerGroupType" AS ENUM ('ASOSIASI', 'KOPERASI');

-- CreateEnum
CREATE TYPE "RspoCertStatus" AS ENUM ('CERTIFIED', 'PLANNED');

-- AlterTable
ALTER TABLE "tbl_farmer_group" ADD COLUMN     "established_year" INTEGER,
ADD COLUMN     "group_type" "FarmerGroupType",
ADD COLUMN     "rspo_cert_status" "RspoCertStatus",
ADD COLUMN     "rspo_cert_year" INTEGER;
