import { describe, it, expect } from "vitest";
import {
  missingOptionalFields,
  farmerRowStatus,
  OPTIONAL_FARMER_FIELDS,
} from "@/lib/farmer-upload-status";

/**
 * Status validasi 3 tingkat bulk upload petani (#197): valid / tidak lengkap
 * (layak simpan tapi field opsional kosong) / error.
 */
const fullRow = {
  nik: "1405040604680002",
  birthPlace: "Siak",
  birthDate: new Date("1968-04-06"),
  address: "Kampung Baru",
  joinedYear: 2008,
};

describe("missingOptionalFields", () => {
  it("baris lengkap tidak punya field kosong", () => {
    expect(missingOptionalFields(fullRow)).toEqual([]);
  });

  it("mendeteksi field null/undefined/string kosong dengan label Indonesia", () => {
    expect(
      missingOptionalFields({ ...fullRow, nik: null, birthDate: null, joinedYear: undefined }),
    ).toEqual(["NIK", "Tanggal Lahir", "Tahun Bergabung"]);
    expect(missingOptionalFields({ ...fullRow, address: "" })).toEqual(["Alamat"]);
  });

  it("mencakup kelima field opsional saat semuanya kosong", () => {
    expect(
      missingOptionalFields({
        nik: null,
        birthPlace: null,
        birthDate: null,
        address: null,
        joinedYear: null,
      }),
    ).toEqual(OPTIONAL_FARMER_FIELDS.map((f) => f.label));
  });

  it("tidak menganggap nilai terisi valid sebagai kosong (0 bukan tahun sah, tapi bukan urusan helper ini)", () => {
    expect(missingOptionalFields({ ...fullRow, joinedYear: 0 })).toEqual([]);
  });
});

describe("farmerRowStatus", () => {
  it("error menang atas tidak lengkap", () => {
    expect(farmerRowStatus({ _isValid: false, _missingFields: ["NIK"] })).toBe("error");
    expect(farmerRowStatus({ _isValid: false, _missingFields: [] })).toBe("error");
  });

  it("lolos validasi + field kosong = incomplete", () => {
    expect(farmerRowStatus({ _isValid: true, _missingFields: ["Alamat"] })).toBe("incomplete");
  });

  it("lolos validasi + lengkap = valid", () => {
    expect(farmerRowStatus({ _isValid: true, _missingFields: [] })).toBe("valid");
  });
});
