import { describe, it, expect } from "vitest";
import { trainingActivitySchema, updateTrainingActivitySchema } from "@/validations/training-activity.schema";

describe("Training Activity Schema - Create Validation", () => {
  it("accepts valid training activity input", () => {
    const data = {
      packageId: "pkg-1",
      farmerGroupId: "group-1",
      trainingDate: new Date("2026-06-10"),
      location: "Balai Pertemuan Tani",
    };
    const r = trainingActivitySchema.safeParse(data);
    expect(r.success).toBe(true);
  });

  it("rejects empty packageId", () => {
    const data = {
      packageId: "",
      farmerGroupId: "group-1",
      trainingDate: new Date("2026-06-10"),
    };
    const r = trainingActivitySchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.packageId).toBeDefined();
  });

  it("rejects empty farmerGroupId", () => {
    const data = {
      packageId: "pkg-1",
      farmerGroupId: "",
      trainingDate: new Date("2026-06-10"),
    };
    const r = trainingActivitySchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.farmerGroupId).toBeDefined();
  });

  it("rejects empty/invalid trainingDate", () => {
    const data = {
      packageId: "pkg-1",
      farmerGroupId: "group-1",
      trainingDate: "",
    };
    const r = trainingActivitySchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.trainingDate).toBeDefined();
  });

  it("coerces valid date string to Date", () => {
    const data = {
      packageId: "pkg-1",
      farmerGroupId: "group-1",
      trainingDate: "2026-06-10",
    };
    const r = trainingActivitySchema.safeParse(data);
    expect(r.success).toBe(true);
    expect(r.data?.trainingDate).toBeInstanceOf(Date);
  });
});

describe("Training Activity Schema - Update Validation", () => {
  it("accepts valid update containing id", () => {
    const data = {
      id: "activity-cuid-123",
      packageId: "pkg-1",
      farmerGroupId: "group-1",
      trainingDate: new Date("2026-06-10"),
    };
    const r = updateTrainingActivitySchema.safeParse(data);
    expect(r.success).toBe(true);
  });

  it("rejects update without id", () => {
    const data = {
      packageId: "pkg-1",
      farmerGroupId: "group-1",
      trainingDate: new Date("2026-06-10"),
    };
    const r = updateTrainingActivitySchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.id).toBeDefined();
  });
});

describe("Training Activity Query Filter Resolution", () => {
  type AccessContext =
    | { mode: "ALL" }
    | { mode: "BY_FARMER_GROUP"; ids: string[] }
    | { mode: "BY_DISTRICT"; ids: string[] };

  function buildTrainingWhereClause(
    access: AccessContext,
    search?: string,
    farmerGroupId?: string
  ) {
    const accessFilter =
      access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } :
      access.mode === "BY_DISTRICT" ? { farmerGroup: { districtId: { in: access.ids } } } :
      {};

    return {
      ...accessFilter,
      isActive: true,
      ...(farmerGroupId ? { farmerGroupId } : {}),
      ...(search
        ? {
            OR: [
              { location: { contains: search, mode: "insensitive" as const } },
              { package: { name: { contains: search, mode: "insensitive" as const } } },
              { farmerGroup: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };
  }

  it("builds correct filter for mode ALL", () => {
    const where = buildTrainingWhereClause({ mode: "ALL" });
    expect(where.isActive).toBe(true);
    expect(where.farmerGroupId).toBeUndefined();
    expect((where as Record<string, unknown>).farmerGroup).toBeUndefined();
  });

  it("builds correct filter for mode BY_FARMER_GROUP", () => {
    const where = buildTrainingWhereClause({ mode: "BY_FARMER_GROUP", ids: ["fg-1", "fg-2"] });
    expect(where.isActive).toBe(true);
    expect(where.farmerGroupId).toEqual({ in: ["fg-1", "fg-2"] });
    expect((where as Record<string, unknown>).farmerGroup).toBeUndefined();
  });

  it("builds correct filter for mode BY_DISTRICT", () => {
    const where = buildTrainingWhereClause({ mode: "BY_DISTRICT", ids: ["dist-1", "dist-2"] });
    expect(where.isActive).toBe(true);
    expect((where as Record<string, unknown>).farmerGroup).toEqual({ districtId: { in: ["dist-1", "dist-2"] } });
    expect(where.farmerGroupId).toBeUndefined();
  });

  it("applies search query and farmerGroupId together with access filters", () => {
    const where = buildTrainingWhereClause(
      { mode: "BY_DISTRICT", ids: ["dist-1"] },
      "Riau",
      "fg-3"
    );
    expect(where.isActive).toBe(true);
    expect(where.farmerGroupId).toBe("fg-3");
    expect((where as Record<string, unknown>).farmerGroup).toEqual({ districtId: { in: ["dist-1"] } });
    expect(where.OR).toHaveLength(3);
  });
});

describe("Training Activity Evidence Rules", () => {
  it("validates that trainingActivitySchema accepts optional evidenceKey and evidenceName", () => {
    const data = {
      packageId: "pkg-1",
      farmerGroupId: "group-1",
      trainingDate: new Date("2026-06-10"),
      evidenceKey: "training/act-1/12345-notulen.pdf",
      evidenceName: "notulen.pdf",
    };
    const r = trainingActivitySchema.safeParse(data);
    expect(r.success).toBe(true);
    expect(r.data?.evidenceKey).toBe("training/act-1/12345-notulen.pdf");
    expect(r.data?.evidenceName).toBe("notulen.pdf");
  });
});

describe("Training Participant File Import Validation Matcher", () => {
  interface FarmerMock {
    id: string;
    name: string;
    farmerId: string;
    trainingParticipants?: Array<{
      activity: {
        id: string;
        packageId: string;
        trainingDate: Date | string;
        package: {
          name: string;
        };
      };
    }>;
  }

  // Simplified matching logic for tests matching the client-side implementation
  function matchAndValidateParticipant(
    rawId: string,
    groupFarmers: FarmerMock[],
    currentParticipantFarmerIds: string[],
    packageId: string,
    activityId: string
  ) {
    const matchedGroupFarmer = groupFarmers.find(
      (f) => f.farmerId.toLowerCase() === rawId.toLowerCase().trim()
    );

    let status: "VALID" | "WARNING" | "ERROR" = "VALID";
    let errorReason = "";
    let resolvedId = "";
    let name = "—";

    if (!matchedGroupFarmer) {
      status = "ERROR";
      errorReason = "ID Petani tidak ditemukan di kelompok tani ini";
    } else {
      name = matchedGroupFarmer.name;
      resolvedId = matchedGroupFarmer.id;
      if (currentParticipantFarmerIds.includes(matchedGroupFarmer.id)) {
        status = "ERROR";
        errorReason = "Petani sudah terdaftar sebagai peserta";
      } else {
        const previousParticipation = matchedGroupFarmer.trainingParticipants?.find(
          (p) => p.activity.packageId === packageId && p.activity.id !== activityId
        );
        if (previousParticipation) {
          status = "WARNING";
          errorReason = `Sudah pernah mengikuti training ${previousParticipation.activity.package.name}`;
        }
      }
    }

    return {
      farmerId: rawId,
      name,
      status,
      errorReason,
      resolvedId: resolvedId || undefined,
    };
  }

  const mockGroupFarmers: FarmerMock[] = [
    {
      id: "farmer-1",
      name: "Abdul Rahman",
      farmerId: "APSS.01",
      trainingParticipants: [],
    },
    {
      id: "farmer-2",
      name: "Abdul Syahid",
      farmerId: "APSS.02",
      trainingParticipants: [
        {
          activity: {
            id: "act-old",
            packageId: "pkg-1",
            trainingDate: "2026-05-10",
            package: { name: "Paket 1" },
          },
        },
      ],
    },
  ];

  it("yields ERROR status if farmerId does not exist in the group", () => {
    const res = matchAndValidateParticipant("APSS.99", mockGroupFarmers, [], "pkg-1", "act-current");
    expect(res.status).toBe("ERROR");
    expect(res.errorReason).toContain("tidak ditemukan");
  });

  it("yields ERROR status if farmer is already a participant of the current activity", () => {
    const res = matchAndValidateParticipant("APSS.01", mockGroupFarmers, ["farmer-1"], "pkg-1", "act-current");
    expect(res.status).toBe("ERROR");
    expect(res.errorReason).toContain("sudah terdaftar");
  });

  it("yields WARNING status if farmer has attended the same package in a different activity", () => {
    const res = matchAndValidateParticipant("APSS.02", mockGroupFarmers, [], "pkg-1", "act-current");
    expect(res.status).toBe("WARNING");
    expect(res.errorReason).toContain("Sudah pernah mengikuti training");
  });

  it("yields VALID status if farmer exists and meets all criteria", () => {
    const res = matchAndValidateParticipant("APSS.01", mockGroupFarmers, [], "pkg-1", "act-current");
    expect(res.status).toBe("VALID");
    expect(res.errorReason).toBe("");
    expect(res.resolvedId).toBe("farmer-1");
  });
});
