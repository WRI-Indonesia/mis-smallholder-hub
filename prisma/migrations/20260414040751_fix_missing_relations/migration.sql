-- AddForeignKey
ALTER TABLE "tbl-certification" ADD CONSTRAINT "tbl-certification_farmer_group_id_fkey" FOREIGN KEY ("farmer_group_id") REFERENCES "tbl-farmer-group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl-training-activity" ADD CONSTRAINT "tbl-training-activity_farmer_group_id_fkey" FOREIGN KEY ("farmer_group_id") REFERENCES "tbl-farmer-group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
