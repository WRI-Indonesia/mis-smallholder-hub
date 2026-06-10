import { describe, it, expect } from "vitest";

// 1. Helper function for Excel Date Parsing
function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === "number") {
    const utc_days = Math.floor(val - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
  }
  if (typeof val === "string") {
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) return new Date(parsed);
    const parts = val.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length <= 2 && parts[2].length === 4) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        return new Date(y, m, d);
      }
      if (parts[0].length === 4) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return new Date(y, m, d);
      }
    }
  }
  return null;
}

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
  row: Record<string, any>,
  mapping: Record<string, string>,
  duplicatesInFile: Set<string>,
  existingFarmerIds: string[]
) {
  const errors: string[] = [];
  const normalized: any = {};

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

describe("Bulk Upload — Date Parsing Helpers", () => {
  it("parses valid Date object", () => {
    const d = new Date("2026-06-09");
    expect(parseExcelDate(d)).toEqual(d);
  });

  it("parses Excel serial number date", () => {
    const serial = 43831; // Jan 1st 2020
    const d = parseExcelDate(serial);
    expect(d?.getFullYear()).toBe(2020);
    expect(d?.getMonth()).toBe(0); // January
    expect(d?.getDate()).toBe(1);
  });

  it("parses format YYYY-MM-DD", () => {
    const d = parseExcelDate("1995-12-31");
    expect(d?.getFullYear()).toBe(1995);
    expect(d?.getMonth()).toBe(11);
    expect(d?.getDate()).toBe(31);
  });

  it("parses format DD/MM/YYYY", () => {
    const d = parseExcelDate("15/05/1990");
    expect(d?.getFullYear()).toBe(1990);
    expect(d?.getMonth()).toBe(4);
    expect(d?.getDate()).toBe(15);
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
      Nama: "Siti Aminah",
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
