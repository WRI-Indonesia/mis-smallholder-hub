// BERKAS TURUNAN — JANGAN DISUNTING TANGAN.
// Dihasilkan: npm run build:schema  (scripts/schema-scan.ts ← prisma/schema/*.prisma)
// Dijaga: src/test/data-schema.test.ts — artefak basi = test gagal.
import type { SchemaMap } from "@/types/data-schema";

export const DATA_SCHEMA: SchemaMap = {
  "entities": [
    {
      "name": "AdministrativeBoundary",
      "clientName": "administrativeBoundary",
      "tableName": "tbl_administrative_boundary",
      "domain": "administrative-boundary",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "level",
          "type": "AdminBoundaryLevel",
          "kind": "enum",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "name",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "code",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "parentName",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "parent_name",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "districtId",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "district_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "district",
          "type": "District",
          "kind": "relation",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "districtId"
          ]
        },
        {
          "name": "geojson",
          "type": "Json",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "geojson",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "source",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "source",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 13,
      "compoundUnique": [],
      "indexes": [
        [
          "level",
          "isActive"
        ],
        [
          "districtId"
        ]
      ]
    },
    {
      "name": "BmpDashboardSnapshot",
      "clientName": "bmpDashboardSnapshot",
      "tableName": "tbl_snapshot_bmp_dashboard",
      "domain": "dashboard-snapshot",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "snapshotDate",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "snapshot_date",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "districtId",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "district_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "district",
          "type": "District",
          "kind": "relation",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "districtId"
          ]
        },
        {
          "name": "data",
          "type": "Json",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdByUser",
          "type": "User",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": "BmpDashboardSnapshots",
          "relationFields": [
            "createdBy"
          ]
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 9,
      "compoundUnique": [
        [
          "snapshotDate",
          "districtId"
        ]
      ],
      "indexes": [
        [
          "snapshotDate"
        ],
        [
          "createdBy"
        ],
        [
          "isActive"
        ]
      ]
    },
    {
      "name": "District",
      "clientName": "district",
      "tableName": "reg_district",
      "domain": "geography",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "provinceId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "province_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "province",
          "type": "Province",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "provinceId"
          ]
        },
        {
          "name": "code",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": true,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "name",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "subdistricts",
          "type": "Subdistrict",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "users",
          "type": "UserDistrict",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmerGroups",
          "type": "FarmerGroup",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "dashboardSnapshots",
          "type": "MainDashboardSnapshot",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "bmpDashboardSnapshots",
          "type": "BmpDashboardSnapshot",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "administrativeBoundaries",
          "type": "AdministrativeBoundary",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 9,
      "compoundUnique": [],
      "indexes": []
    },
    {
      "name": "Farmer",
      "clientName": "farmer",
      "tableName": "tbl_farmer",
      "domain": "farmer",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmerGroupId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "farmer_group_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmerGroup",
          "type": "FarmerGroup",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "farmerGroupId"
          ]
        },
        {
          "name": "gender",
          "type": "Gender",
          "kind": "enum",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "name",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "name",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmerId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "farmer_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "nik",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "nik",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "address",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "address",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "birthPlace",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "birth_place",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "birthDate",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "birth_date",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "joinedYear",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "joined_year",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "trainingParticipants",
          "type": "TrainingParticipant",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "landParcels",
          "type": "LandParcel",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "productionRecords",
          "type": "ProductionRecord",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 15,
      "compoundUnique": [
        [
          "farmerGroupId",
          "farmerId"
        ]
      ],
      "indexes": [
        [
          "farmerGroupId"
        ],
        [
          "isActive"
        ],
        [
          "farmerId"
        ]
      ]
    },
    {
      "name": "FarmerGroup",
      "clientName": "farmerGroup",
      "tableName": "tbl_farmer_group",
      "domain": "farmer-group",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "districtId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "district_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "district",
          "type": "District",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "districtId"
          ]
        },
        {
          "name": "code",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "abrv",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "abrv3id",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "abrv_3id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "name",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "category",
          "type": "FarmerGroupCategory",
          "kind": "enum",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "groupType",
          "type": "FarmerGroupType",
          "kind": "enum",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "group_type",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "joinYear",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "join_year",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "establishedYear",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "established_year",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "rspoCertYear",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "rspo_cert_year",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "rspoCertStatus",
          "type": "RspoCertStatus",
          "kind": "enum",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "rspo_cert_status",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "ispoCertYear",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "ispo_cert_year",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "ispoCertStatus",
          "type": "CertStatus",
          "kind": "enum",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "ispo_cert_status",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "sapMapAssuranceYear",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "sap_map_assurance_year",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "sapMapAssuranceStatus",
          "type": "CertStatus",
          "kind": "enum",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "sap_map_assurance_status",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "locationLat",
          "type": "Float",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "location_lat",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "locationLong",
          "type": "Float",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "location_long",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "users",
          "type": "UserFarmerGroup",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmers",
          "type": "Farmer",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "activities",
          "type": "TrainingActivity",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "referenceBenchmark",
          "type": "ReferenceBenchmark",
          "kind": "relation",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "boundaries",
          "type": "FarmerGroupBoundary",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 23,
      "compoundUnique": [],
      "indexes": [
        [
          "districtId"
        ],
        [
          "isActive"
        ],
        [
          "code"
        ]
      ]
    },
    {
      "name": "FarmerGroupBoundary",
      "clientName": "farmerGroupBoundary",
      "tableName": "tbl_farmer_group_boundary",
      "domain": "farmer-group-boundary",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmerGroupId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "farmer_group_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmerGroup",
          "type": "FarmerGroup",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "farmerGroupId"
          ]
        },
        {
          "name": "geojson",
          "type": "Json",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "geojson",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "source",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "source",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 9,
      "compoundUnique": [],
      "indexes": [
        [
          "farmerGroupId"
        ],
        [
          "isActive"
        ]
      ]
    },
    {
      "name": "LandParcel",
      "clientName": "landParcel",
      "tableName": "tbl_land_parcel",
      "domain": "land-parcel",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmerId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "farmer_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmer",
          "type": "Farmer",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "farmerId"
          ]
        },
        {
          "name": "parcelId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "parcel_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "blok",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "blok",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "geometry",
          "type": "Json",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "geometry",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "area",
          "type": "Float",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "area",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "landStatus",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "land_status",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "cropType",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "crop_type",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "species",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "species",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isPsr",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_psr",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "plantingYear",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "planting_year",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "notes",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "notes",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "subGroupLv2",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "sub_group_lv2",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "revision",
          "type": "Int",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "revision",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "productionRecords",
          "type": "ProductionRecord",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "trees",
          "type": "Tree",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 19,
      "compoundUnique": [],
      "indexes": [
        [
          "farmerId"
        ],
        [
          "isActive"
        ],
        [
          "parcelId"
        ]
      ]
    },
    {
      "name": "MainDashboardSnapshot",
      "clientName": "mainDashboardSnapshot",
      "tableName": "tbl_snapshot_main_dashboard",
      "domain": "dashboard-snapshot",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "snapshotDate",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "snapshot_date",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "districtId",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "district_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "joinedYear",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "joined_year",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "district",
          "type": "District",
          "kind": "relation",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "districtId"
          ]
        },
        {
          "name": "data",
          "type": "Json",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdByUser",
          "type": "User",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": "MainDashboardSnapshots",
          "relationFields": [
            "createdBy"
          ]
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 10,
      "compoundUnique": [
        [
          "snapshotDate",
          "districtId",
          "joinedYear"
        ]
      ],
      "indexes": [
        [
          "snapshotDate"
        ],
        [
          "createdBy"
        ],
        [
          "isActive"
        ]
      ]
    },
    {
      "name": "MenuItem",
      "clientName": "menuItem",
      "tableName": "tbl_menu_item",
      "domain": "menu",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "key",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": true,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "parentKey",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "parent_key",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "title",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "url",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "icon",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "order",
          "type": "Int",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isVisible",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_visible",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "parent",
          "type": "MenuItem",
          "kind": "relation",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": "MenuHierarchy",
          "relationFields": [
            "parentKey"
          ]
        },
        {
          "name": "children",
          "type": "MenuItem",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": "MenuHierarchy",
          "relationFields": []
        },
        {
          "name": "rolePermissions",
          "type": "RolePermission",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "userOverrides",
          "type": "UserPermissionOverride",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 13,
      "compoundUnique": [],
      "indexes": []
    },
    {
      "name": "ProductionRecord",
      "clientName": "productionRecord",
      "tableName": "tbl_production_record",
      "domain": "production",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmerId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "farmer_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmer",
          "type": "Farmer",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "farmerId"
          ]
        },
        {
          "name": "parcelId",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "parcel_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "parcel",
          "type": "LandParcel",
          "kind": "relation",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "parcelId"
          ]
        },
        {
          "name": "period",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "harvestDate",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "harvest_date",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "harvestNumber",
          "type": "Int",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "harvest_number",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "yieldKg",
          "type": "Float",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "yield_kg",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "notes",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 13,
      "compoundUnique": [
        [
          "farmerId",
          "parcelId",
          "period",
          "harvestNumber"
        ]
      ],
      "indexes": [
        [
          "farmerId"
        ],
        [
          "parcelId"
        ],
        [
          "period"
        ],
        [
          "isActive"
        ]
      ]
    },
    {
      "name": "Province",
      "clientName": "province",
      "tableName": "reg_province",
      "domain": "geography",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "code",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": true,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "name",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "districts",
          "type": "District",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "users",
          "type": "UserProvince",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 8,
      "compoundUnique": [],
      "indexes": []
    },
    {
      "name": "ReferenceBenchmark",
      "clientName": "referenceBenchmark",
      "tableName": "tbl_reference_benchmark",
      "domain": "reference-benchmark",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmerGroupId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": true,
          "dbName": "farmer_group_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmerGroup",
          "type": "FarmerGroup",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "farmerGroupId"
          ]
        },
        {
          "name": "farmerCount",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "farmer_count",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "parcelCount",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "parcel_count",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "areaHa",
          "type": "Float",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "area_ha",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "trainingP1",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "training_p1",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "trainingP2Mk",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "training_p2_mk",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "trainingP2K3",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "training_p2_k3",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "trainingP34",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "training_p34",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "productionFarmerCount",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "production_farmer_count",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "notes",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 16,
      "compoundUnique": [],
      "indexes": [
        [
          "isActive"
        ]
      ]
    },
    {
      "name": "RolePermission",
      "clientName": "rolePermission",
      "tableName": "rbac_role_permission",
      "domain": "rbac",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "role",
          "type": "Role",
          "kind": "enum",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "menuKey",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "menu_key",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "menu",
          "type": "MenuItem",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "menuKey"
          ]
        },
        {
          "name": "permission",
          "type": "PermissionLevel",
          "kind": "enum",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 9,
      "compoundUnique": [
        [
          "role",
          "menuKey",
          "permission"
        ]
      ],
      "indexes": []
    },
    {
      "name": "Subdistrict",
      "clientName": "subdistrict",
      "tableName": "reg_subdistrict",
      "domain": "geography",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "districtId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "district_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "district",
          "type": "District",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "districtId"
          ]
        },
        {
          "name": "code",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": true,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "name",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "villages",
          "type": "Village",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 9,
      "compoundUnique": [],
      "indexes": []
    },
    {
      "name": "TrainingActivity",
      "clientName": "trainingActivity",
      "tableName": "tbl_training_activity",
      "domain": "training",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "packageId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "ref_training_package_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "package",
          "type": "TrainingPackage",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "packageId"
          ]
        },
        {
          "name": "farmerGroupId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "farmer_group_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmerGroup",
          "type": "FarmerGroup",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "farmerGroupId"
          ]
        },
        {
          "name": "location",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "location",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "trainingDate",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "training_date",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "notes",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "notes",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "evidenceKey",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "evidence_key",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "evidenceName",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "evidence_name",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "participants",
          "type": "TrainingParticipant",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 13,
      "compoundUnique": [],
      "indexes": [
        [
          "packageId"
        ],
        [
          "farmerGroupId"
        ],
        [
          "isActive"
        ]
      ]
    },
    {
      "name": "TrainingPackage",
      "clientName": "trainingPackage",
      "tableName": "ref_training_package",
      "domain": "training",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "code",
          "type": "TrainingCategory",
          "kind": "enum",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": true,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "name",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "desc",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "activities",
          "type": "TrainingActivity",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 9,
      "compoundUnique": [],
      "indexes": []
    },
    {
      "name": "TrainingParticipant",
      "clientName": "trainingParticipant",
      "tableName": "tbl_training_participant",
      "domain": "training",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "activityId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "training_activity_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "activity",
          "type": "TrainingActivity",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "activityId"
          ]
        },
        {
          "name": "farmerId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "farmer_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmer",
          "type": "Farmer",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "farmerId"
          ]
        },
        {
          "name": "preTestScore",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "pre_test_score",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "postTestScore",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "post_test_score",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 10,
      "compoundUnique": [
        [
          "activityId",
          "farmerId"
        ]
      ],
      "indexes": [
        [
          "activityId"
        ],
        [
          "farmerId"
        ],
        [
          "isActive"
        ]
      ]
    },
    {
      "name": "Tree",
      "clientName": "tree",
      "tableName": "tbl_tree",
      "domain": "tree",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "landParcelId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "land_parcel_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "landParcel",
          "type": "LandParcel",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "landParcelId"
          ]
        },
        {
          "name": "parcelId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "parcel_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "treeId",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "tree_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "sequenceNo",
          "type": "Int",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "sequence_no",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "longitude",
          "type": "Float",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "longitude",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "latitude",
          "type": "Float",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "latitude",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "category",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "category",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "vigor",
          "type": "Float",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "vigor",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "source",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "source",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modelVersion",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "model_version",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "surveyedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "surveyed_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "sourceFile",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "source_file",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "revision",
          "type": "Int",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "revision",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 19,
      "compoundUnique": [],
      "indexes": [
        [
          "landParcelId",
          "isActive"
        ],
        [
          "parcelId"
        ],
        [
          "isActive"
        ]
      ]
    },
    {
      "name": "User",
      "clientName": "user",
      "tableName": "tbl_user",
      "domain": "user",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "name",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "email",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": true,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "password",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "role",
          "type": "Role",
          "kind": "enum",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "provinces",
          "type": "UserProvince",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "districts",
          "type": "UserDistrict",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmerGroups",
          "type": "UserFarmerGroup",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "permissionOverrides",
          "type": "UserPermissionOverride",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "dashboardSnapshots",
          "type": "MainDashboardSnapshot",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": "MainDashboardSnapshots",
          "relationFields": []
        },
        {
          "name": "bmpDashboardSnapshots",
          "type": "BmpDashboardSnapshot",
          "kind": "relation",
          "isRequired": true,
          "isList": true,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": "BmpDashboardSnapshots",
          "relationFields": []
        }
      ],
      "scalarCount": 10,
      "compoundUnique": [],
      "indexes": []
    },
    {
      "name": "UserDistrict",
      "clientName": "userDistrict",
      "tableName": "rbac_user_district",
      "domain": "rbac",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "userId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "user_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "user",
          "type": "User",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "userId"
          ]
        },
        {
          "name": "districtId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "district_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "district",
          "type": "District",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "districtId"
          ]
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 7,
      "compoundUnique": [
        [
          "userId",
          "districtId"
        ]
      ],
      "indexes": []
    },
    {
      "name": "UserFarmerGroup",
      "clientName": "userFarmerGroup",
      "tableName": "rbac_user_farmer_group",
      "domain": "rbac",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "userId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "user_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "user",
          "type": "User",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "userId"
          ]
        },
        {
          "name": "farmerGroupId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "farmer_group_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "farmerGroup",
          "type": "FarmerGroup",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "farmerGroupId"
          ]
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 7,
      "compoundUnique": [
        [
          "userId",
          "farmerGroupId"
        ]
      ],
      "indexes": []
    },
    {
      "name": "UserPermissionOverride",
      "clientName": "userPermissionOverride",
      "tableName": "rbac_user_permission_override",
      "domain": "rbac",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "userId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "user_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "user",
          "type": "User",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "userId"
          ]
        },
        {
          "name": "menuKey",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "menu_key",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "menu",
          "type": "MenuItem",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "menuKey"
          ]
        },
        {
          "name": "permission",
          "type": "PermissionLevel",
          "kind": "enum",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "granted",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 10,
      "compoundUnique": [
        [
          "userId",
          "menuKey",
          "permission"
        ]
      ],
      "indexes": []
    },
    {
      "name": "UserProvince",
      "clientName": "userProvince",
      "tableName": "rbac_user_province",
      "domain": "rbac",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "userId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "user_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "user",
          "type": "User",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "userId"
          ]
        },
        {
          "name": "provinceId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "province_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "province",
          "type": "Province",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "provinceId"
          ]
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 7,
      "compoundUnique": [
        [
          "userId",
          "provinceId"
        ]
      ],
      "indexes": []
    },
    {
      "name": "Village",
      "clientName": "village",
      "tableName": "reg_village",
      "domain": "geography",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": true,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "subdistrictId",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "subdistrict_id",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "subdistrict",
          "type": "Subdistrict",
          "kind": "relation",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": [
            "subdistrictId"
          ]
        },
        {
          "name": "code",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": true,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "name",
          "type": "String",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": null,
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "isActive",
          "type": "Boolean",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "is_active",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "createdBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "created_by",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedAt",
          "type": "DateTime",
          "kind": "scalar",
          "isRequired": true,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_at",
          "relationName": null,
          "relationFields": []
        },
        {
          "name": "modifiedBy",
          "type": "String",
          "kind": "scalar",
          "isRequired": false,
          "isList": false,
          "isId": false,
          "isUnique": false,
          "dbName": "modified_by",
          "relationName": null,
          "relationFields": []
        }
      ],
      "scalarCount": 9,
      "compoundUnique": [],
      "indexes": []
    }
  ],
  "relations": [
    {
      "key": "AdministrativeBoundary↔District",
      "from": "District",
      "to": "AdministrativeBoundary",
      "kind": "1:n",
      "fromField": "administrativeBoundaries",
      "toField": "district",
      "isSelf": false
    },
    {
      "key": "BmpDashboardSnapshot↔District",
      "from": "District",
      "to": "BmpDashboardSnapshot",
      "kind": "1:n",
      "fromField": "bmpDashboardSnapshots",
      "toField": "district",
      "isSelf": false
    },
    {
      "key": "District↔FarmerGroup",
      "from": "District",
      "to": "FarmerGroup",
      "kind": "1:n",
      "fromField": "farmerGroups",
      "toField": "district",
      "isSelf": false
    },
    {
      "key": "District↔MainDashboardSnapshot",
      "from": "District",
      "to": "MainDashboardSnapshot",
      "kind": "1:n",
      "fromField": "dashboardSnapshots",
      "toField": "district",
      "isSelf": false
    },
    {
      "key": "District↔Subdistrict",
      "from": "District",
      "to": "Subdistrict",
      "kind": "1:n",
      "fromField": "subdistricts",
      "toField": "district",
      "isSelf": false
    },
    {
      "key": "District↔UserDistrict",
      "from": "District",
      "to": "UserDistrict",
      "kind": "1:n",
      "fromField": "users",
      "toField": "district",
      "isSelf": false
    },
    {
      "key": "Farmer↔LandParcel",
      "from": "Farmer",
      "to": "LandParcel",
      "kind": "1:n",
      "fromField": "landParcels",
      "toField": "farmer",
      "isSelf": false
    },
    {
      "key": "Farmer↔ProductionRecord",
      "from": "Farmer",
      "to": "ProductionRecord",
      "kind": "1:n",
      "fromField": "productionRecords",
      "toField": "farmer",
      "isSelf": false
    },
    {
      "key": "Farmer↔TrainingParticipant",
      "from": "Farmer",
      "to": "TrainingParticipant",
      "kind": "1:n",
      "fromField": "trainingParticipants",
      "toField": "farmer",
      "isSelf": false
    },
    {
      "key": "Farmer↔FarmerGroup",
      "from": "FarmerGroup",
      "to": "Farmer",
      "kind": "1:n",
      "fromField": "farmers",
      "toField": "farmerGroup",
      "isSelf": false
    },
    {
      "key": "FarmerGroup↔FarmerGroupBoundary",
      "from": "FarmerGroup",
      "to": "FarmerGroupBoundary",
      "kind": "1:n",
      "fromField": "boundaries",
      "toField": "farmerGroup",
      "isSelf": false
    },
    {
      "key": "FarmerGroup↔ReferenceBenchmark",
      "from": "FarmerGroup",
      "to": "ReferenceBenchmark",
      "kind": "1:1",
      "fromField": "referenceBenchmark",
      "toField": "farmerGroup",
      "isSelf": false
    },
    {
      "key": "FarmerGroup↔TrainingActivity",
      "from": "FarmerGroup",
      "to": "TrainingActivity",
      "kind": "1:n",
      "fromField": "activities",
      "toField": "farmerGroup",
      "isSelf": false
    },
    {
      "key": "FarmerGroup↔UserFarmerGroup",
      "from": "FarmerGroup",
      "to": "UserFarmerGroup",
      "kind": "1:n",
      "fromField": "users",
      "toField": "farmerGroup",
      "isSelf": false
    },
    {
      "key": "LandParcel↔ProductionRecord",
      "from": "LandParcel",
      "to": "ProductionRecord",
      "kind": "1:n",
      "fromField": "productionRecords",
      "toField": "parcel",
      "isSelf": false
    },
    {
      "key": "LandParcel↔Tree",
      "from": "LandParcel",
      "to": "Tree",
      "kind": "1:n",
      "fromField": "trees",
      "toField": "landParcel",
      "isSelf": false
    },
    {
      "key": "MenuHierarchy",
      "from": "MenuItem",
      "to": "MenuItem",
      "kind": "1:n",
      "fromField": "children",
      "toField": "parent",
      "isSelf": true
    },
    {
      "key": "MenuItem↔RolePermission",
      "from": "MenuItem",
      "to": "RolePermission",
      "kind": "1:n",
      "fromField": "rolePermissions",
      "toField": "menu",
      "isSelf": false
    },
    {
      "key": "MenuItem↔UserPermissionOverride",
      "from": "MenuItem",
      "to": "UserPermissionOverride",
      "kind": "1:n",
      "fromField": "userOverrides",
      "toField": "menu",
      "isSelf": false
    },
    {
      "key": "District↔Province",
      "from": "Province",
      "to": "District",
      "kind": "1:n",
      "fromField": "districts",
      "toField": "province",
      "isSelf": false
    },
    {
      "key": "Province↔UserProvince",
      "from": "Province",
      "to": "UserProvince",
      "kind": "1:n",
      "fromField": "users",
      "toField": "province",
      "isSelf": false
    },
    {
      "key": "Subdistrict↔Village",
      "from": "Subdistrict",
      "to": "Village",
      "kind": "1:n",
      "fromField": "villages",
      "toField": "subdistrict",
      "isSelf": false
    },
    {
      "key": "TrainingActivity↔TrainingParticipant",
      "from": "TrainingActivity",
      "to": "TrainingParticipant",
      "kind": "1:n",
      "fromField": "participants",
      "toField": "activity",
      "isSelf": false
    },
    {
      "key": "TrainingActivity↔TrainingPackage",
      "from": "TrainingPackage",
      "to": "TrainingActivity",
      "kind": "1:n",
      "fromField": "activities",
      "toField": "package",
      "isSelf": false
    },
    {
      "key": "BmpDashboardSnapshots",
      "from": "User",
      "to": "BmpDashboardSnapshot",
      "kind": "1:n",
      "fromField": "bmpDashboardSnapshots",
      "toField": "createdByUser",
      "isSelf": false
    },
    {
      "key": "MainDashboardSnapshots",
      "from": "User",
      "to": "MainDashboardSnapshot",
      "kind": "1:n",
      "fromField": "dashboardSnapshots",
      "toField": "createdByUser",
      "isSelf": false
    },
    {
      "key": "User↔UserDistrict",
      "from": "User",
      "to": "UserDistrict",
      "kind": "1:n",
      "fromField": "districts",
      "toField": "user",
      "isSelf": false
    },
    {
      "key": "User↔UserFarmerGroup",
      "from": "User",
      "to": "UserFarmerGroup",
      "kind": "1:n",
      "fromField": "farmerGroups",
      "toField": "user",
      "isSelf": false
    },
    {
      "key": "User↔UserPermissionOverride",
      "from": "User",
      "to": "UserPermissionOverride",
      "kind": "1:n",
      "fromField": "permissionOverrides",
      "toField": "user",
      "isSelf": false
    },
    {
      "key": "User↔UserProvince",
      "from": "User",
      "to": "UserProvince",
      "kind": "1:n",
      "fromField": "provinces",
      "toField": "user",
      "isSelf": false
    }
  ],
  "enums": [
    {
      "name": "ActivityStatus",
      "values": [
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "REJECTED"
      ],
      "domain": "config"
    },
    {
      "name": "AdminBoundaryLevel",
      "values": [
        "KABUPATEN",
        "KECAMATAN",
        "DESA"
      ],
      "domain": "config"
    },
    {
      "name": "CertStatus",
      "values": [
        "CERTIFIED",
        "PLANNED"
      ],
      "domain": "config"
    },
    {
      "name": "FarmerGroupCategory",
      "values": [
        "EX_PLASMA",
        "SWADAYA"
      ],
      "domain": "config"
    },
    {
      "name": "FarmerGroupType",
      "values": [
        "ASOSIASI",
        "KOPERASI"
      ],
      "domain": "config"
    },
    {
      "name": "Gender",
      "values": [
        "M",
        "F"
      ],
      "domain": "farmer"
    },
    {
      "name": "PermissionLevel",
      "values": [
        "CREATE",
        "VIEW",
        "EDIT",
        "DELETE",
        "EXPORT",
        "PRINT"
      ],
      "domain": "config"
    },
    {
      "name": "Role",
      "values": [
        "SUPERADMIN",
        "ADMIN",
        "OPERATOR",
        "MANAGEMENT",
        "DONOR"
      ],
      "domain": "config"
    },
    {
      "name": "RspoCertStatus",
      "values": [
        "CERTIFIED",
        "PLANNED"
      ],
      "domain": "config"
    },
    {
      "name": "TrainingCategory",
      "values": [
        "PAKET_1_BMP_PC_RSPO_NKT",
        "PAKET_2_MK",
        "PAKET_2_K3",
        "PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV",
        "OTHER"
      ],
      "domain": "config"
    }
  ]
};
