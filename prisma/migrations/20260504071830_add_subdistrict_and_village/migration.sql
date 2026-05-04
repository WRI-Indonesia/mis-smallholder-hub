-- CreateTable
CREATE TABLE "reg-subdistrict" (
    "id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "reg-subdistrict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reg-village" (
    "id" TEXT NOT NULL,
    "subdistrict_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "reg-village_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reg-subdistrict_code_key" ON "reg-subdistrict"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reg-village_code_key" ON "reg-village"("code");

-- AddForeignKey
ALTER TABLE "reg-subdistrict" ADD CONSTRAINT "reg-subdistrict_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "reg-district"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reg-village" ADD CONSTRAINT "reg-village_subdistrict_id_fkey" FOREIGN KEY ("subdistrict_id") REFERENCES "reg-subdistrict"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
