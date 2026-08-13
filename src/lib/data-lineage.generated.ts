// BERKAS TURUNAN — JANGAN DISUNTING TANGAN.
// Dihasilkan: npm run build:lineage  (scripts/lineage-scan.ts)
// Dijaga: src/test/data-lineage.test.ts — artefak basi = test gagal.
import type { DataLineage, LineageAccess, UnmappedRoute } from "@/types/data-lineage";

/** Menu → entitas Prisma yang disentuhnya, hasil pindai kode. */
export const DATA_LINEAGE: DataLineage = [
  {
    "menuKey": "bulk-upload-farmers",
    "route": "(admin)/admin/bulk-upload/farmers",
    "models": {
      "farmer": "RW",
      "farmerGroup": "R"
    },
    "modules": [
      "src/server/actions/bulk-upload.ts"
    ]
  },
  {
    "menuKey": "bulk-upload-parcels",
    "route": "(admin)/admin/bulk-upload/parcels",
    "models": {
      "farmer": "R",
      "landParcel": "RW",
      "productionRecord": "W",
      "tree": "W"
    },
    "modules": [
      "src/server/actions/bulk-upload-parcel.ts"
    ]
  },
  {
    "menuKey": "bulk-upload-production",
    "route": "(admin)/admin/bulk-upload/production",
    "models": {
      "farmer": "R",
      "landParcel": "R",
      "productionRecord": "RW"
    },
    "modules": [
      "src/server/actions/bulk-upload-production.ts"
    ]
  },
  {
    "menuKey": "bulk-upload-trees",
    "route": "(admin)/admin/bulk-upload/trees",
    "models": {
      "landParcel": "R",
      "tree": "RW"
    },
    "modules": [
      "src/server/actions/bulk-upload-tree.ts"
    ]
  },
  {
    "menuKey": "dashboard-bmp",
    "route": "(admin)/admin/dashboard/bmp",
    "models": {
      "bmpDashboardSnapshot": "R"
    },
    "modules": [
      "src/server/actions/dashboard-bmp.ts"
    ]
  },
  {
    "menuKey": "dashboard-main",
    "route": "(admin)/admin/dashboard/main",
    "models": {
      "mainDashboardSnapshot": "R"
    },
    "modules": [
      "src/server/actions/dashboard.ts"
    ]
  },
  {
    "menuKey": "dashboard-metrics",
    "route": "(admin)/admin/dashboard/metrics",
    "models": {},
    "modules": []
  },
  {
    "menuKey": "dashboard-snapshot",
    "route": "(admin)/admin/tools/snapshot",
    "models": {
      "district": "R",
      "farmer": "R",
      "farmerGroup": "R",
      "mainDashboardSnapshot": "RW"
    },
    "modules": [
      "src/lib/dashboard-query.ts",
      "src/server/actions/snapshot.ts"
    ]
  },
  {
    "menuKey": "dashboard-snapshot-bmp",
    "route": "(admin)/admin/tools/snapshot-bmp",
    "models": {
      "bmpDashboardSnapshot": "RW",
      "farmer": "R",
      "farmerGroup": "R",
      "landParcel": "R",
      "productionRecord": "R"
    },
    "modules": [
      "src/server/actions/snapshot-bmp.ts"
    ]
  },
  {
    "menuKey": "dashboard-training",
    "route": "(admin)/admin/dashboard/training",
    "models": {
      "farmer": "R",
      "farmerGroup": "R",
      "trainingParticipant": "R"
    },
    "modules": [
      "src/server/actions/dashboard-training.ts"
    ]
  },
  {
    "menuKey": "data-analyst-benchmark-comparison",
    "route": "(admin)/admin/data-analyst/benchmark-comparison",
    "models": {
      "farmer": "R",
      "farmerGroup": "R",
      "landParcel": "R",
      "productionRecord": "R",
      "referenceBenchmark": "RW",
      "trainingParticipant": "R"
    },
    "modules": [
      "src/server/actions/benchmark-comparison.ts"
    ]
  },
  {
    "menuKey": "data-analyst-data-availability",
    "route": "(admin)/admin/data-analyst/data-availability",
    "models": {
      "farmerGroup": "R",
      "landParcel": "R",
      "trainingPackage": "R"
    },
    "modules": [
      "src/server/actions/data-availability.ts"
    ]
  },
  {
    "menuKey": "data-analyst-data-completeness",
    "route": "(admin)/admin/data-analyst/data-completeness",
    "models": {
      "district": "R",
      "farmerGroup": "R",
      "trainingPackage": "R"
    },
    "modules": [
      "src/server/actions/data-completeness.ts"
    ]
  },
  {
    "menuKey": "data-analyst-farmer-summary",
    "route": "(admin)/admin/data-analyst/farmer-summary",
    "models": {
      "district": "R",
      "farmer": "R",
      "farmerGroup": "R"
    },
    "modules": [
      "src/server/actions/data-analyst.ts"
    ]
  },
  {
    "menuKey": "help",
    "route": "(admin)/admin/help",
    "models": {},
    "modules": []
  },
  {
    "menuKey": "map-bmp",
    "route": "(admin)/admin/map/bmp",
    "models": {
      "district": "R",
      "farmer": "R",
      "farmerGroup": "R",
      "landParcel": "R",
      "productionRecord": "R",
      "province": "R"
    },
    "modules": [
      "src/lib/select-options.ts",
      "src/server/actions/land-parcel.ts",
      "src/server/actions/map.ts"
    ]
  },
  {
    "menuKey": "map-parcel",
    "route": "(admin)/admin/map/parcel",
    "models": {
      "district": "R",
      "farmer": "R",
      "farmerGroup": "R",
      "landParcel": "R",
      "productionRecord": "R",
      "province": "R",
      "trainingParticipant": "R"
    },
    "modules": [
      "src/lib/parcel-passport-query.ts",
      "src/lib/select-options.ts",
      "src/server/actions/land-parcel.ts",
      "src/server/actions/map.ts"
    ]
  },
  {
    "menuKey": "master-data-farmers",
    "route": "(admin)/admin/master-data/farmers",
    "models": {
      "district": "R",
      "farmer": "RW",
      "farmerGroup": "R",
      "landParcel": "R",
      "productionRecord": "R",
      "trainingPackage": "R",
      "trainingParticipant": "R",
      "tree": "R"
    },
    "modules": [
      "src/lib/parcel-passport-query.ts",
      "src/lib/select-options.ts",
      "src/server/actions/farmer-group.ts",
      "src/server/actions/farmer.ts",
      "src/server/actions/tree.ts"
    ]
  },
  {
    "menuKey": "master-data-groups",
    "route": "(admin)/admin/master-data/groups",
    "models": {
      "district": "R",
      "farmer": "R",
      "farmerGroup": "RW",
      "landParcel": "R",
      "trainingActivity": "R",
      "trainingPackage": "R"
    },
    "modules": [
      "src/server/actions/farmer-group.ts"
    ]
  },
  {
    "menuKey": "master-data-parcels",
    "route": "(admin)/admin/master-data/parcels",
    "models": {
      "district": "R",
      "farmer": "R",
      "farmerGroup": "R",
      "landParcel": "RW",
      "productionRecord": "RW",
      "trainingParticipant": "R",
      "tree": "RW"
    },
    "modules": [
      "src/lib/parcel-passport-query.ts",
      "src/lib/select-options.ts",
      "src/server/actions/farmer-group.ts",
      "src/server/actions/land-parcel.ts",
      "src/server/actions/production.ts",
      "src/server/actions/tree.ts"
    ]
  },
  {
    "menuKey": "master-data-production",
    "route": "(admin)/admin/master-data/production",
    "models": {
      "district": "R",
      "farmer": "R",
      "farmerGroup": "R",
      "landParcel": "R",
      "productionRecord": "RW",
      "user": "R"
    },
    "modules": [
      "src/lib/select-options.ts",
      "src/server/actions/farmer-group.ts",
      "src/server/actions/production.ts"
    ]
  },
  {
    "menuKey": "master-data-training",
    "route": "(admin)/admin/master-data/training",
    "models": {
      "district": "R",
      "farmer": "R",
      "farmerGroup": "R",
      "trainingActivity": "RW",
      "trainingPackage": "R",
      "trainingParticipant": "RW"
    },
    "modules": [
      "src/lib/select-options.ts",
      "src/server/actions/farmer-group.ts",
      "src/server/actions/training.ts"
    ]
  },
  {
    "menuKey": "report-farmer",
    "route": "(admin)/admin/report/farmer",
    "models": {
      "district": "R",
      "farmer": "R",
      "farmerGroup": "R",
      "landParcel": "R"
    },
    "modules": [
      "src/server/actions/report.ts"
    ]
  },
  {
    "menuKey": "report-kelompok-tani",
    "route": "(admin)/admin/report/kelompok-tani",
    "models": {
      "district": "R",
      "farmerGroup": "R",
      "landParcel": "R"
    },
    "modules": [
      "src/server/actions/report.ts"
    ]
  },
  {
    "menuKey": "report-kelompok-tani-detail",
    "route": "(admin)/admin/report/kelompok-tani-detail",
    "models": {
      "district": "R",
      "farmerGroup": "R",
      "landParcel": "R"
    },
    "modules": [
      "src/server/actions/report.ts"
    ]
  },
  {
    "menuKey": "report-land-parcel",
    "route": "(admin)/admin/report/land-parcel",
    "models": {
      "district": "R",
      "farmerGroup": "R",
      "landParcel": "R"
    },
    "modules": [
      "src/server/actions/report.ts"
    ]
  },
  {
    "menuKey": "report-production",
    "route": "(admin)/admin/report/production",
    "models": {
      "district": "R",
      "farmerGroup": "R",
      "landParcel": "R",
      "productionRecord": "R"
    },
    "modules": [
      "src/server/actions/report.ts"
    ]
  },
  {
    "menuKey": "report-training",
    "route": "(admin)/admin/report/training",
    "models": {
      "district": "R",
      "farmer": "R",
      "farmerGroup": "R",
      "landParcel": "R",
      "trainingActivity": "R"
    },
    "modules": [
      "src/server/actions/report.ts"
    ]
  },
  {
    "menuKey": "settings-menu",
    "route": "(admin)/admin/settings/menu",
    "models": {
      "menuItem": "RW"
    },
    "modules": [
      "src/server/actions/menu.ts"
    ]
  },
  {
    "menuKey": "settings-regions",
    "route": "(admin)/admin/settings/regions",
    "models": {
      "district": "RW",
      "province": "RW",
      "subdistrict": "RW",
      "village": "RW"
    },
    "modules": [
      "src/server/actions/region.ts"
    ]
  },
  {
    "menuKey": "settings-roles",
    "route": "(admin)/admin/settings/roles",
    "models": {
      "menuItem": "R",
      "rolePermission": "RW"
    },
    "modules": [
      "src/server/actions/menu.ts",
      "src/server/actions/role-permission.ts"
    ]
  },
  {
    "menuKey": "settings-users",
    "route": "(admin)/admin/settings/users",
    "models": {
      "district": "R",
      "farmerGroup": "R",
      "menuItem": "R",
      "province": "R",
      "rolePermission": "R",
      "user": "RW",
      "userDistrict": "W",
      "userFarmerGroup": "W",
      "userPermissionOverride": "RW",
      "userProvince": "W"
    },
    "modules": [
      "src/server/actions/user-data-access.ts",
      "src/server/actions/user-menu-access.ts",
      "src/server/actions/user.ts"
    ]
  }
];

/** Entitas yang dilewati SETIAP menu lewat guard RBAC & scope akses. */
export const INFRA_MODELS: Record<string, LineageAccess> = {
  "farmerGroup": "R",
  "menuItem": "R",
  "rolePermission": "R",
  "user": "R",
  "userPermissionOverride": "R"
};

/** Rute tanpa requirePermission (halaman induk) — sengaja tak terpetakan. */
export const UNMAPPED_ROUTES: UnmappedRoute[] = [
  {
    "route": "(admin)/admin",
    "reason": "tanpa-requirePermission"
  },
  {
    "route": "(admin)/admin/bulk-upload",
    "reason": "tanpa-requirePermission"
  },
  {
    "route": "(admin)/admin/dashboard",
    "reason": "tanpa-requirePermission"
  },
  {
    "route": "(admin)/admin/map",
    "reason": "tanpa-requirePermission"
  },
  {
    "route": "(admin)/admin/master-data",
    "reason": "tanpa-requirePermission"
  },
  {
    "route": "(admin)/admin/profile",
    "reason": "tanpa-requirePermission"
  },
  {
    "route": "(admin)/admin/report",
    "reason": "tanpa-requirePermission"
  },
  {
    "route": "(admin)/admin/tools",
    "reason": "tanpa-requirePermission"
  }
];
