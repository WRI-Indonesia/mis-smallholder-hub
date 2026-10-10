import { describe, expect, it } from "vitest";
import { fmtKm, fmtShare, fmtTon, pctOf } from "@/lib/supply-chain-format";
import { sortRows } from "@/app/(admin)/admin/dashboard/supply-chain/sort-head";

describe("supply-chain-format", () => {
  it("fmtTon: bulat, pemisah ribuan id-ID, satuan t", () => {
    expect(fmtTon(12631.4)).toBe("12.631 t");
    expect(fmtTon(0)).toBe("0 t");
  });
  it("pctOf: 1 desimal koma; total 0 → —", () => {
    expect(pctOf(1, 3)).toBe("33,3%");
    expect(pctOf(5, 0)).toBe("—");
  });
  it("fmtShare: porsi 0–1 dengan aturan pembulatan yang sama dengan pctOf", () => {
    expect(fmtShare(1 / 3)).toBe("33,3%");
    expect(fmtShare(0.85)).toBe("85%");
    expect(fmtShare(1 / 3)).toBe(pctOf(1, 3));
  });
  it("fmtKm: 1 desimal; null → —", () => {
    expect(fmtKm(82.06)).toBe("82,1 km");
    expect(fmtKm(null)).toBe("—");
  });
});

describe("sortRows (tabel Mill & Lembaga)", () => {
  type R = { name: string; ton: number | null };
  const rows: R[] = [{ name: "Ébène", ton: 5 }, { name: "Alpha", ton: null }, { name: "beta", ton: 20 }];
  const val = (r: R, k: "name" | "ton") => r[k];
  it("angka menurun; null selalu paling bawah apa pun arahnya", () => {
    expect(sortRows(rows, { key: "ton", dir: "desc" }, val).map((r) => r.name)).toEqual(["beta", "Ébène", "Alpha"]);
    expect(sortRows(rows, { key: "ton", dir: "asc" }, val).map((r) => r.name)).toEqual(["Ébène", "beta", "Alpha"]);
  });
  it("teks memakai kolasi id (huruf besar/kecil & aksen tidak memecah urutan); tidak memutasi masukan", () => {
    const before = rows.map((r) => r.name);
    expect(sortRows(rows, { key: "name", dir: "asc" }, val).map((r) => r.name)).toEqual(["Alpha", "beta", "Ébène"]);
    expect(rows.map((r) => r.name)).toEqual(before);
  });
});
