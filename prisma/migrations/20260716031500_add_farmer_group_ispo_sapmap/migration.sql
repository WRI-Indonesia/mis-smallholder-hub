-- CreateEnum
CREATE TYPE "CertStatus" AS ENUM ('CERTIFIED', 'PLANNED');

-- AlterTable
ALTER TABLE "tbl_farmer_group" ADD COLUMN     "ispo_cert_year" INTEGER,
ADD COLUMN     "ispo_cert_status" "CertStatus",
ADD COLUMN     "sap_map_assurance_year" INTEGER,
ADD COLUMN     "sap_map_assurance_status" "CertStatus";
