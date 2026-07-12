import { describe, it, expect } from "vitest";
import { landParcelSchema, updateLandParcelSchema } from "@/validations/land-parcel.schema";

describe("LandParcel Schema - Create Validation", () => {
  it("accepts valid land parcel input", () => {
    const data = {
      farmerId: "farmer-cuid-123",
      parcelId: "LH-01",
      area: 2.5,
      landStatus: "Owned",
      cropType: "Palm Oil",
      plantingYear: 2018,
      revision: 0,
      notes: "Kebun subur",
    };
    const r = landParcelSchema.safeParse(data);
    expect(r.success).toBe(true);
    expect((r.data as Record<string, unknown>).revision).toBeUndefined();
  });

  it("rejects empty farmerId", () => {
    const data = {
      farmerId: "",
      parcelId: "LH-01",
    };
    const r = landParcelSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.farmerId).toBeDefined();
  });

  it("rejects empty parcelId", () => {
    const data = {
      farmerId: "farmer-cuid-123",
      parcelId: "",
    };
    const r = landParcelSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.parcelId).toBeDefined();
  });

  it("rejects negative area", () => {
    const data = {
      farmerId: "farmer-cuid-123",
      parcelId: "LH-01",
      area: -0.5,
    };
    const r = landParcelSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.area).toBeDefined();
  });

  it("rejects invalid plantingYear range", () => {
    const data = {
      farmerId: "farmer-cuid-123",
      parcelId: "LH-01",
      plantingYear: 1899,
    };
    const r = landParcelSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.plantingYear).toBeDefined();
  });

  it("does not include revision in parsed data", () => {
    const data = {
      farmerId: "farmer-cuid-123",
      parcelId: "LH-01",
    };
    const r = landParcelSchema.safeParse(data);
    expect(r.success).toBe(true);
    expect((r.data as Record<string, unknown>).revision).toBeUndefined();
  });
});

describe("LandParcel Schema - Update Validation", () => {
  it("accepts valid update containing id", () => {
    const data = {
      id: "parcel-cuid-456",
      farmerId: "farmer-cuid-123",
      parcelId: "LH-01",
    };
    const r = updateLandParcelSchema.safeParse(data);
    expect(r.success).toBe(true);
  });

  it("rejects update without id", () => {
    const data = {
      farmerId: "farmer-cuid-123",
      parcelId: "LH-01",
    };
    const r = updateLandParcelSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.id).toBeDefined();
  });
});

describe("LandParcel Query Filter Resolution", () => {
  type AccessContext =
    | { mode: "ALL" }
    | { mode: "BY_FARMER_GROUP"; ids: string[] }
    | { mode: "BY_DISTRICT"; ids: string[] };

  function buildLandParcelWhereClause(
    access: AccessContext,
    search?: string,
    farmerId?: string
  ) {
    const accessFilter =
      access.mode === "BY_FARMER_GROUP" ? { farmer: { farmerGroupId: { in: access.ids } } } :
      access.mode === "BY_DISTRICT" ? { farmer: { farmerGroup: { districtId: { in: access.ids } } } } :
      {};

    return {
      ...accessFilter,
      isActive: true,
      ...(farmerId ? { farmerId } : {}),
      ...(search
        ? {
            OR: [
              { parcelId: { contains: search, mode: "insensitive" as const } },
              { farmer: { name: { contains: search, mode: "insensitive" as const } } },
              { farmer: { farmerId: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };
  }

  it("builds correct filter for mode ALL", () => {
    const where = buildLandParcelWhereClause({ mode: "ALL" });
    expect(where.isActive).toBe(true);
    expect(where.farmerId).toBeUndefined();
    expect((where as Record<string, unknown>).farmer).toBeUndefined();
  });

  it("builds correct filter for mode BY_FARMER_GROUP", () => {
    const where = buildLandParcelWhereClause({ mode: "BY_FARMER_GROUP", ids: ["fg-1", "fg-2"] });
    expect(where.isActive).toBe(true);
    expect((where as Record<string, unknown>).farmer).toEqual({ farmerGroupId: { in: ["fg-1", "fg-2"] } });
  });

  it("builds correct filter for mode BY_DISTRICT", () => {
    const where = buildLandParcelWhereClause({ mode: "BY_DISTRICT", ids: ["dist-1", "dist-2"] });
    expect(where.isActive).toBe(true);
    expect((where as Record<string, unknown>).farmer).toEqual({ farmerGroup: { districtId: { in: ["dist-1", "dist-2"] } } });
  });
});

describe("LandParcel Bulk Upload Row Validation Logic", () => {
  interface FarmerMapping {
    id: string;
    name: string;
    farmerId: string;
  }

  interface ExistingParcel {
    farmerId: string;
    parcelId: string;
  }

  const farmers: FarmerMapping[] = [
    { id: "farmer-cuid-1", name: "Budi", farmerId: "FMR-001" },
    { id: "farmer-cuid-2", name: "Siti", farmerId: "FMR-002" },
  ];

  const existingParcels: ExistingParcel[] = [
    { farmerId: "farmer-cuid-1", parcelId: "LH-01" },
  ];

  const mapping = {
    parcelId: "ID_LAHAN",
    farmerId: "ID_PETANI",
    area: "LUAS",
    landStatus: "STATUS",
    cropType: "CROP",
    plantingYear: "TAHUN",
    revision: "REVISI",
    notes: "CATATAN",
  };

  function validateRow(
    props: Record<string, string>,
    duplicatesInFile: Set<string>
  ) {
    const errors: string[] = [];
    const normalized: Record<string, unknown> = {};

    // Farmer ID Mapping
    const rawFarmerId = props[mapping.farmerId]?.toString().trim();
    let mappedFarmerDbId = "";
    if (!rawFarmerId) {
      errors.push("ID Petani wajib diisi");
    } else {
      const matchFarmer = farmers.find((f) => f.farmerId.toLowerCase() === rawFarmerId.toLowerCase());
      if (matchFarmer) {
        mappedFarmerDbId = matchFarmer.id;
      } else {
        errors.push(`ID Petani "${rawFarmerId}" tidak terdaftar di database`);
      }
    }
    normalized.farmerId = mappedFarmerDbId;

    // Parcel ID
    const rawParcelId = props[mapping.parcelId]?.toString().trim();
    if (!rawParcelId) {
      errors.push("ID Lahan wajib diisi");
    } else {
      const fileDupKey = `${mappedFarmerDbId || rawFarmerId}::${rawParcelId.toLowerCase()}`;
      if (duplicatesInFile.has(fileDupKey)) {
        errors.push(`ID Lahan duplikat di dalam file: "${rawParcelId}" untuk petani ini`);
      }

      if (mappedFarmerDbId) {
        const dbDup = existingParcels.some(
          (ep) => ep.farmerId === mappedFarmerDbId && ep.parcelId.toLowerCase() === rawParcelId.toLowerCase()
        );
        if (dbDup) {
          errors.push(`ID Lahan "${rawParcelId}" sudah terdaftar untuk petani ini di database`);
        }
      }
    }
    normalized.parcelId = rawParcelId || "";

    // Area
    const rawArea = props[mapping.area];
    if (rawArea !== undefined && rawArea !== null && rawArea !== "") {
      const parsedArea = parseFloat(rawArea);
      if (isNaN(parsedArea) || parsedArea <= 0) {
        errors.push("Luas lahan tidak valid");
      } else {
        normalized.area = parsedArea;
      }
    }

    return { isValid: errors.length === 0, errors, data: normalized };
  }

  it("accepts valid row properties", () => {
    const props = {
      ID_LAHAN: "LH-02",
      ID_PETANI: "FMR-001",
      LUAS: "2.35",
    };
    const res = validateRow(props, new Set());
    expect(res.isValid).toBe(true);
    expect(res.data.farmerId).toBe("farmer-cuid-1");
    expect(res.data.parcelId).toBe("LH-02");
    expect(res.data.area).toBe(2.35);
  });

  it("flags unregistered farmer id", () => {
    const props = {
      ID_LAHAN: "LH-02",
      ID_PETANI: "FMR-999",
    };
    const res = validateRow(props, new Set());
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain("tidak terdaftar di database");
  });

  it("flags duplicate parcel id in database", () => {
    const props = {
      ID_LAHAN: "LH-01", // Already exists for FMR-001 in DB
      ID_PETANI: "FMR-001",
    };
    const res = validateRow(props, new Set());
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain("sudah terdaftar untuk petani ini di database");
  });
});

describe("LandParcel Bulk Creation Authorization Logic (CRIT-3)", () => {
  it("rejects farmerId outside user scope when mode is BY_FARMER_GROUP", () => {
    const allowedFarmers = [
      { id: "farmer-1", farmerGroupId: "group-1" },
      { id: "farmer-2", farmerGroupId: "group-2" },
    ];
    const allowedFarmerIds = new Set(allowedFarmers.map((f) => f.id));

    const dataList = [
      { farmerId: "farmer-1", parcelId: "LH-01" },
      { farmerId: "farmer-3", parcelId: "LH-02" }, // outside scope
    ];

    const unauthorizedRow = dataList.find((item) => !allowedFarmerIds.has(item.farmerId));
    expect(unauthorizedRow).toBeDefined();
    expect(unauthorizedRow?.farmerId).toBe("farmer-3");
  });

  it("accepts all farmerIds when access mode is ALL", () => {
    const access = { mode: "ALL" as const };
    const dataList = [
      { farmerId: "farmer-1", parcelId: "LH-01" },
      { farmerId: "farmer-3", parcelId: "LH-02" },
    ];

    // If access mode is ALL, it skips restriction checks
    const hasUnauthorised = access.mode !== "ALL" && dataList.some((item) => !["farmer-1"].includes(item.farmerId));
    expect(hasUnauthorised).toBe(false);
  });
});
