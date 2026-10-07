import { describe, it, expect } from "vitest";
import { parseExcelDate } from "@/lib/excel-cell";

// 2. Mock target fields and rules
const TARGET_FIELDS = [
  { key: "farmerId", label: "ID Petani", required: true },
  { key: "name", label: "Nama Petani", required: true },
  { key: "gender", label: "Jenis Kelamin", required: true },
  { key: "nik", label: "NIK", required: false },
  { key: "joinedYear", label: "Tahun Bergabung", required: false },
];

const AUTO_MATCH_RULES: Record<string, string[]> = {
  farmerId: ["id petani", "farmer id", "id", "farmer_id", "kode petani"],
  name: ["nama", "name", "nama petani", "farmer name", "fullname"],
  gender: ["jenis kelamin", "gender", "sex", "lp", "l/p", "jk"],
  nik: ["nik", "no. ktp", "ktp", "national id"],
  joinedYear: ["tahun bergabung", "joined year", "joinedyear", "tahun_bergabung", "thn bergabung", "thn_bergabung"],
};

// 3. Auto column mapping logic
function autoMatch(detectedHeaders: string[]) {
  const matched: Record<string, string> = {};
  for (const f of TARGET_FIELDS) {
    const rules = AUTO_MATCH_RULES[f.key] || [];
    const bestMatch = detectedHeaders.find((h) =>
      rules.includes(h.toLowerCase().trim())
    );
    if (bestMatch) {
      matched[f.key] = bestMatch;
    }
  }
  return matched;
}

// 4. Row Validation logic
function validateRow(
  row: Record<string, string | number | null>,
  mapping: Record<string, string>,
  duplicatesInFile: Set<string>,
  existingFarmerIds: string[]
) {
  const errors: string[] = [];
  const normalized: Record<string, unknown> = {};

  // Name check
  const rawName = row[mapping["name"]]?.toString().trim();
  if (!rawName) {
    errors.push("Nama Petani wajib diisi");
  } else if (rawName.length < 2) {
    errors.push("Nama Petani minimal 2 karakter");
  }
  normalized.name = rawName || "";

  // Farmer ID check
  const rawFarmerId = row[mapping["farmerId"]]?.toString().trim();
  if (!rawFarmerId) {
    errors.push("ID Petani wajib diisi");
  } else if (rawFarmerId.length < 2) {
    errors.push("ID Petani minimal 2 karakter");
  } else {
    if (duplicatesInFile.has(rawFarmerId)) {
      errors.push(`ID Petani duplikat di dalam file: "${rawFarmerId}"`);
    }
    if (existingFarmerIds.includes(rawFarmerId)) {
      errors.push(`ID Petani "${rawFarmerId}" sudah terdaftar di database`);
    }
  }
  normalized.farmerId = rawFarmerId || "";

  // Gender check
  const rawGender = row[mapping["gender"]]?.toString().trim();
  if (!rawGender) {
    errors.push("Jenis Kelamin wajib diisi");
  } else {
    const gLower = rawGender.toLowerCase();
    if (["l", "m", "laki", "laki-laki", "pria", "male"].includes(gLower)) {
      normalized.gender = "M";
    } else if (["p", "f", "perempuan", "wanita", "female"].includes(gLower)) {
      normalized.gender = "F";
    } else {
      errors.push(`Jenis kelamin tidak valid: "${rawGender}"`);
    }
  }

  // NIK check
  const rawNik = row[mapping["nik"]]?.toString().trim();
  if (rawNik) {
    const cleanNik = rawNik.replace(/\D/g, "");
    if (cleanNik.length !== 16) {
      errors.push(`NIK harus 16 digit angka (Terdeteksi ${cleanNik.length} digit)`);
    }
    normalized.nik = cleanNik;
  } else {
    normalized.nik = null;
  }

  // Joined Year check
  const rawJoinedYear = row[mapping["joinedYear"]];
  if (rawJoinedYear !== undefined && rawJoinedYear !== null && rawJoinedYear !== "") {
    const parsedYear = parseInt(rawJoinedYear.toString().trim(), 10);
    if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
      errors.push(`Tahun bergabung tidak valid: "${rawJoinedYear}" (Gunakan tahun antara 1900-2100)`);
    } else {
      normalized.joinedYear = parsedYear;
    }
  } else {
    normalized.joinedYear = null;
  }

  return { isValid: errors.length === 0, errors, data: normalized };
}

// Parser tanggal yang benar-benar dipakai klien (dulu salinan pribadi logika lama — #400).
describe("Bulk Upload — Date Parsing Helpers", () => {
  const parts = (d: Date | null) => (d ? [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()] : null);

  it("parses valid Date object", () => {
    expect(parts(parseExcelDate(new Date("2026-06-09")))).toEqual([2026, 5, 9]);
  });

  it("parses Excel serial number date", () => {
    expect(parts(parseExcelDate(43831))).toEqual([2020, 0, 1]); // 1 Jan 2020
  });

  it("parses format YYYY-MM-DD", () => {
    expect(parts(parseExcelDate("1995-12-31"))).toEqual([1995, 11, 31]);
  });

  it("parses format DD/MM/YYYY — termasuk hari ≤ 12", () => {
    expect(parts(parseExcelDate("15/05/1990"))).toEqual([1990, 4, 15]);
    expect(parts(parseExcelDate("05/12/1990"))).toEqual([1990, 11, 5]);
  });

  it("returns null for invalid values", () => {
    expect(parseExcelDate("invalid date")).toBeNull();
    expect(parseExcelDate("")).toBeNull();
  });
});

describe("Bulk Upload — Auto Match Column Mapping", () => {
  it("matches columns correctly in Indonesian", () => {
    const headers = ["ID Petani", "Nama Petani", "Jenis Kelamin", "NIK"];
    const matched = autoMatch(headers);
    expect(matched.farmerId).toBe("ID Petani");
    expect(matched.name).toBe("Nama Petani");
    expect(matched.gender).toBe("Jenis Kelamin");
    expect(matched.nik).toBe("NIK");
  });

  it("matches columns correctly in English", () => {
    const headers = ["farmer id", "farmer name", "gender", "national id"];
    const matched = autoMatch(headers);
    expect(matched.farmerId).toBe("farmer id");
    expect(matched.name).toBe("farmer name");
    expect(matched.gender).toBe("gender");
    expect(matched.nik).toBe("national id");
  });
});

describe("Bulk Upload — Row Validations & Normalization", () => {
  const mapping = {
    farmerId: "ID",
    name: "Nama",
    gender: "L/P",
    nik: "KTP",
    joinedYear: "Tahun",
  };

  it("accepts a perfectly valid row", () => {
    const row = {
      ID: "FMR-999",
      Nama: "Budi Santoso",
      "L/P": "Laki-laki",
      KTP: "1234567890123456",
      Tahun: 2022,
    };
    const res = validateRow(row, mapping, new Set(), ["FMR-001"]);
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.data.gender).toBe("M");
    expect(res.data.nik).toBe("1234567890123456");
    expect(res.data.joinedYear).toBe(2022);
  });

  it("rejects invalid joinedYear format/range", () => {
    const row = {
      ID: "FMR-995",
      Nama: "Hendra",
      "L/P": "L",
      Tahun: 1850,
    };
    const res = validateRow(row, mapping, new Set(), []);
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain("Tahun bergabung tidak valid");
  });

  it("normalizes female gender", () => {
    const row = {
      ID: "FMR-998",
      Nama: "Contoh Petani Empat",
      "L/P": "perempuan",
    };
    const res = validateRow(row, mapping, new Set(), []);
    expect(res.isValid).toBe(true);
    expect(res.data.gender).toBe("F");
  });

  it("rejects short or empty name", () => {
    const row = {
      ID: "FMR-997",
      Nama: "S",
      "L/P": "P",
    };
    const res = validateRow(row, mapping, new Set(), []);
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain("Nama Petani minimal 2 karakter");
  });

  it("rejects invalid NIK digits", () => {
    const row = {
      ID: "FMR-996",
      Nama: "Gunawan",
      "L/P": "L",
      KTP: "12345", // too short
    };
    const res = validateRow(row, mapping, new Set(), []);
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain("NIK harus 16 digit");
  });

  it("flags duplicates within file", () => {
    const row = {
      ID: "FMR-DUP",
      Nama: "Agus",
      "L/P": "L",
    };
    const duplicates = new Set(["FMR-DUP"]);
    const res = validateRow(row, mapping, duplicates, []);
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain("ID Petani duplikat di dalam file");
  });

  it("flags duplicates against database records", () => {
    const row = {
      ID: "FMR-DB-EXIST",
      Nama: "Hendra",
      "L/P": "L",
    };
    const dbExist = ["FMR-DB-EXIST"];
    const res = validateRow(row, mapping, new Set(), dbExist);
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain("sudah terdaftar di database");
  });
});
