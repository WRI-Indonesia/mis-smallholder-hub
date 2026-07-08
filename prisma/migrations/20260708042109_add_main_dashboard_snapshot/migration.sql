-- CreateTable
CREATE TABLE "tbl_snapshot_main_dashboard" (
    "id" TEXT NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "district_id" TEXT,
    "joined_year" INTEGER,
    "data" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_snapshot_main_dashboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_snapshot_main_dashboard_snapshot_date_idx" ON "tbl_snapshot_main_dashboard"("snapshot_date");

-- CreateIndex
CREATE INDEX "tbl_snapshot_main_dashboard_created_by_idx" ON "tbl_snapshot_main_dashboard"("created_by");

-- CreateIndex
CREATE INDEX "tbl_snapshot_main_dashboard_is_active_idx" ON "tbl_snapshot_main_dashboard"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_snapshot_main_dashboard_snapshot_date_district_id_joine_key" ON "tbl_snapshot_main_dashboard"("snapshot_date", "district_id", "joined_year");

-- AddForeignKey
ALTER TABLE "tbl_snapshot_main_dashboard" ADD CONSTRAINT "tbl_snapshot_main_dashboard_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "reg_district"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_snapshot_main_dashboard" ADD CONSTRAINT "tbl_snapshot_main_dashboard_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "tbl_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
