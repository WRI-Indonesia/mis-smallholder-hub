-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'OPERATOR', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('CREATE', 'VIEW', 'EDIT', 'DELETE');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FarmerGroupCategory" AS ENUM ('EX_PLASMA', 'SWADAYA');

-- CreateTable
CREATE TABLE "tbl_farmer_group" (
    "id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "code" TEXT,
    "abrv" TEXT,
    "abrv_3id" VARCHAR(50),
    "name" TEXT NOT NULL,
    "category" "FarmerGroupCategory" NOT NULL DEFAULT 'SWADAYA',
    "join_year" INTEGER,
    "location_lat" DOUBLE PRECISION,
    "location_long" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_farmer_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reg_province" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "reg_province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reg_district" (
    "id" TEXT NOT NULL,
    "province_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "reg_district_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reg_subdistrict" (
    "id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "reg_subdistrict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reg_village" (
    "id" TEXT NOT NULL,
    "subdistrict_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "reg_village_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_menu_item" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "parent_key" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_menu_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_role_permission" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "menu_key" TEXT NOT NULL,
    "permission" "PermissionLevel" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "rbac_role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_user_province" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "province_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "rbac_user_province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_user_district" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "rbac_user_district_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_user_farmer_group" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "farmer_group_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "rbac_user_farmer_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_user_permission_override" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "menu_key" TEXT NOT NULL,
    "permission" "PermissionLevel" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "rbac_user_permission_override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "modified_by" TEXT,

    CONSTRAINT "tbl_user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reg_province_code_key" ON "reg_province"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reg_district_code_key" ON "reg_district"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reg_subdistrict_code_key" ON "reg_subdistrict"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reg_village_code_key" ON "reg_village"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_menu_item_key_key" ON "tbl_menu_item"("key");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_role_permission_role_menu_key_permission_key" ON "rbac_role_permission"("role", "menu_key", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_user_province_user_id_province_id_key" ON "rbac_user_province"("user_id", "province_id");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_user_district_user_id_district_id_key" ON "rbac_user_district"("user_id", "district_id");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_user_farmer_group_user_id_farmer_group_id_key" ON "rbac_user_farmer_group"("user_id", "farmer_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_user_permission_override_user_id_menu_key_permission_key" ON "rbac_user_permission_override"("user_id", "menu_key", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_user_email_key" ON "tbl_user"("email");

-- AddForeignKey
ALTER TABLE "tbl_farmer_group" ADD CONSTRAINT "tbl_farmer_group_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "reg_district"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reg_district" ADD CONSTRAINT "reg_district_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "reg_province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reg_subdistrict" ADD CONSTRAINT "reg_subdistrict_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "reg_district"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reg_village" ADD CONSTRAINT "reg_village_subdistrict_id_fkey" FOREIGN KEY ("subdistrict_id") REFERENCES "reg_subdistrict"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_menu_item" ADD CONSTRAINT "tbl_menu_item_parent_key_fkey" FOREIGN KEY ("parent_key") REFERENCES "tbl_menu_item"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_role_permission" ADD CONSTRAINT "rbac_role_permission_menu_key_fkey" FOREIGN KEY ("menu_key") REFERENCES "tbl_menu_item"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_province" ADD CONSTRAINT "rbac_user_province_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_province" ADD CONSTRAINT "rbac_user_province_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "reg_province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_district" ADD CONSTRAINT "rbac_user_district_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_district" ADD CONSTRAINT "rbac_user_district_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "reg_district"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_farmer_group" ADD CONSTRAINT "rbac_user_farmer_group_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_farmer_group" ADD CONSTRAINT "rbac_user_farmer_group_farmer_group_id_fkey" FOREIGN KEY ("farmer_group_id") REFERENCES "tbl_farmer_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_permission_override" ADD CONSTRAINT "rbac_user_permission_override_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tbl_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_permission_override" ADD CONSTRAINT "rbac_user_permission_override_menu_key_fkey" FOREIGN KEY ("menu_key") REFERENCES "tbl_menu_item"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
