/*
  Warnings:

  - A unique constraint covering the columns `[farmer_id,parcel_id,period,harvest_number]` on the table `tbl_production_record` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "tbl_production_record_farmer_id_period_harvest_number_key";

-- CreateIndex
CREATE UNIQUE INDEX "tbl_production_record_farmer_id_parcel_id_period_harvest_nu_key" ON "tbl_production_record"("farmer_id", "parcel_id", "period", "harvest_number");
