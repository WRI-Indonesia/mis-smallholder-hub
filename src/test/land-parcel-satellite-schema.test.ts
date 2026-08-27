import { describe, it, expect } from "vitest";
import {
  landParcelDocumentSchema,
  updateLandParcelDocumentSchema,
  landStdbSchema,
  landParcelExternalIdSchema,
  landParcelProgramSchema,
} from "@/validations/land-parcel-satellite.schema";

/** CRUD manual satelit lahan (#296 tahap 3c) — input form (string FormData) → nilai tersimpan. */
describe("land-parcel-satellite.schema", () => {
  it("dokumen: string kosong → null, angka koma diterima, tahun diparse", () => {
    const r = landParcelDocumentSchema.safeParse({
      landParcelId: "lp1", type: "SHM", number: "727", holderName: "", statedArea: "0,25", issuedYear: "2019", custodyNote: "", notes: "",
    });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ type: "SHM", number: "727", holderName: null, statedArea: 0.25, issuedYear: 2019, custodyNote: null, notes: null });
  });

  it("dokumen: jenis di luar enum / luas ≤ 0 / tahun di luar rentang ditolak per field", () => {
    const r = landParcelDocumentSchema.safeParse({ landParcelId: "lp1", type: "SERTIFIKAT", statedArea: "0", issuedYear: "1800" });
    expect(r.success).toBe(false);
    const f = r.error!.flatten().fieldErrors;
    expect(f.type).toBeDefined();
    expect(f.statedArea).toBeDefined();
    expect(f.issuedYear).toBeDefined();
  });

  it("update dokumen: butuh id, tanpa landParcelId (kepemilikan dicek server lewat parcel.farmer)", () => {
    expect(updateLandParcelDocumentSchema.safeParse({ id: "d1", type: "SKT" }).success).toBe(true);
    expect(updateLandParcelDocumentSchema.safeParse({ type: "SKT" }).success).toBe(false);
  });

  it("STDB: nomor wajib & di-trim", () => {
    expect(landStdbSchema.safeParse({ landParcelId: "lp1", number: "  " }).success).toBe(false);
    const r = landStdbSchema.safeParse({ landParcelId: "lp1", number: " 1637/53/1401/6/2025 " });
    expect(r.success && r.data.number).toBe("1637/53/1401/6/2025");
  });

  it("UL Parcel Code: source & code wajib; tanggal string → Date; kosong → null", () => {
    const r = landParcelExternalIdSchema.safeParse({ landParcelId: "lp1", source: "parcel_code", code: "ID080d781b4", mappedAt: "2025-06-01", notes: "" });
    expect(r.success).toBe(true);
    expect(r.data?.mappedAt).toBeInstanceOf(Date);
    expect(r.data?.notes).toBeNull();
    expect(landParcelExternalIdSchema.safeParse({ landParcelId: "lp1", source: "", code: "X" }).success).toBe(false);
  });

  it("program: tanggal selesai sebelum mulai ditolak di path endDate", () => {
    const bad = landParcelProgramSchema.safeParse({ landParcelId: "lp1", programType: "DEMPLOT_PBU", status: "ACTIVE", startDate: "2026-05-01", endDate: "2026-01-01" });
    expect(bad.success).toBe(false);
    expect(bad.error!.flatten().fieldErrors.endDate).toBeDefined();
    const ok = landParcelProgramSchema.safeParse({ landParcelId: "lp1", programType: "DEMPLOT_PBU", status: "PLANNED", startDate: "", endDate: "" });
    expect(ok.success && ok.data.startDate).toBeNull();
  });

  it("program: status/jenis di luar enum ditolak", () => {
    expect(landParcelProgramSchema.safeParse({ landParcelId: "lp1", programType: "PSR", status: "ACTIVE" }).success).toBe(false);
    expect(landParcelProgramSchema.safeParse({ landParcelId: "lp1", programType: "DEMPLOT_PBU", status: "DONE" }).success).toBe(false);
  });
});
