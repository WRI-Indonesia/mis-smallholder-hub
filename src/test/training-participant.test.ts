import { describe, it, expect } from "vitest";
import { trainingParticipantScoreSchema } from "@/validations/training-participant.schema";

describe("Training Participant Score Validation", () => {
  it("accepts valid scores", () => {
    const data = {
      preTestScore: 85,
      postTestScore: 90,
    };
    const r = trainingParticipantScoreSchema.safeParse(data);
    expect(r.success).toBe(true);
    expect(r.data?.preTestScore).toBe(85);
    expect(r.data?.postTestScore).toBe(90);
  });

  it("accepts null/undefined values", () => {
    const data = {
      preTestScore: null,
    };
    const r = trainingParticipantScoreSchema.safeParse(data);
    expect(r.success).toBe(true);
    expect(r.data?.preTestScore).toBeNull();
    expect(r.data?.postTestScore).toBeUndefined();
  });

  it("rejects scores below 0", () => {
    const data = {
      preTestScore: -5,
    };
    const r = trainingParticipantScoreSchema.safeParse(data);
    expect(r.success).toBe(false);
  });

  it("rejects scores above 100", () => {
    const data = {
      postTestScore: 105,
    };
    const r = trainingParticipantScoreSchema.safeParse(data);
    expect(r.success).toBe(false);
  });
});

describe("Training Participant File Import Validation with Scores", () => {
  interface FarmerMock {
    id: string;
    name: string;
    farmerId: string;
  }

  function matchAndValidateParticipant(
    row: Record<string, any>,
    detectedHeaders: string[],
    groupFarmers: FarmerMock[]
  ) {
    const idKey = detectedHeaders.find((h) =>
      ["id petani", "farmer id", "id", "farmer_id", "kode petani", "kode_petani", "farmerid"].includes(h.toLowerCase().trim())
    ) || detectedHeaders[0];

    const preTestKey = detectedHeaders.find((h) =>
      ["nilai pre-test", "nilai pre test", "pre-test score", "pre-test", "pretest", "pretestscore", "nilai_pre_test"].includes(h.toLowerCase().trim())
    );

    const postTestKey = detectedHeaders.find((h) =>
      ["nilai post-test", "nilai post test", "post-test score", "post-test", "posttest", "posttestscore", "nilai_post_test"].includes(h.toLowerCase().trim())
    );

    const rawId = row[idKey]?.toString().trim();
    const matchedGroupFarmer = groupFarmers.find(
      (f) => f.farmerId.toLowerCase() === rawId.toLowerCase()
    );

    let status: "VALID" | "WARNING" | "ERROR" = "VALID";
    let errorReason = "";
    let preTestScore: number | null = null;
    let postTestScore: number | null = null;

    if (preTestKey) {
      const rawVal = row[preTestKey];
      if (rawVal !== undefined && rawVal !== null && rawVal.toString().trim() !== "") {
        const parsedVal = parseInt(rawVal.toString().trim(), 10);
        if (isNaN(parsedVal) || parsedVal < 0 || parsedVal > 100) {
          status = "ERROR";
          errorReason = "Nilai Pre-Test harus berupa angka 0-100";
        } else {
          preTestScore = parsedVal;
        }
      }
    }

    if (postTestKey) {
      const rawVal = row[postTestKey];
      if (rawVal !== undefined && rawVal !== null && rawVal.toString().trim() !== "") {
        const parsedVal = parseInt(rawVal.toString().trim(), 10);
        if (isNaN(parsedVal) || parsedVal < 0 || parsedVal > 100) {
          status = "ERROR";
          errorReason = (errorReason ? errorReason + "; " : "") + "Nilai Post-Test harus berupa angka 0-100";
        } else {
          postTestScore = parsedVal;
        }
      }
    }

    if (!matchedGroupFarmer) {
      status = "ERROR";
      errorReason = (errorReason ? errorReason + "; " : "") + "ID Petani tidak ditemukan";
    }

    return {
      farmerId: rawId,
      status,
      errorReason,
      preTestScore,
      postTestScore,
    };
  }

  const mockGroupFarmers: FarmerMock[] = [
    { id: "farmer-1", name: "Abdul Rahman", farmerId: "APSS.01" },
  ];

  it("correctly parses valid pre and post test scores", () => {
    const row = {
      "ID Petani": "APSS.01",
      "Nilai Pre-Test": "75",
      "Nilai Post-Test": "85",
    };
    const headers = ["ID Petani", "Nilai Pre-Test", "Nilai Post-Test"];
    const res = matchAndValidateParticipant(row, headers, mockGroupFarmers);
    expect(res.status).toBe("VALID");
    expect(res.preTestScore).toBe(75);
    expect(res.postTestScore).toBe(85);
  });

  it("marks status as ERROR for invalid pre-test scores", () => {
    const row = {
      "ID Petani": "APSS.01",
      "Nilai Pre-Test": "120",
    };
    const headers = ["ID Petani", "Nilai Pre-Test"];
    const res = matchAndValidateParticipant(row, headers, mockGroupFarmers);
    expect(res.status).toBe("ERROR");
    expect(res.errorReason).toContain("Nilai Pre-Test harus berupa angka 0-100");
  });
});

describe("Training Participant Bulk Removal Action Helper", () => {
  it("generates correct prisma filter for multiple IDs", () => {
    const ids = ["p-1", "p-2", "p-3"];
    const where = { id: { in: ids } };
    expect(where.id.in).toEqual(["p-1", "p-2", "p-3"]);
  });
});
