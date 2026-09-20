import { describe, it, expect } from "vitest";
import {
  autoMatchMarkerUploadColumns,
  markerFeaturesToRecords,
  parseCoordCell,
  parseMarkerCondition,
  parseMarkerType,
  parseSequenceCell,
  toUploadPayload,
  validateMarkerUploadRows,
  MARKER_UPLOAD_FIELDS,
  MARKER_UPLOAD_TEMPLATE_COLUMNS,
  MARKER_UPLOAD_TEMPLATE_EXAMPLE,
  type MarkerUploadMatch,
  type MarkerUploadParcelRef,
} from "@/lib/land-marker-upload";

/**
 * Parser unggahan patok (#329): Excel/CSV & shapefile Point dinormalisasi ke
 * record yang sama. Aturan yang dijaga: alias header lapangan/DBF, label
 * Indonesia → enum, deteksi lat/long tertukar sebelum kirim, ID Lahan ganda
 * lintas petani wajib ID Petani, dan No Patok duplikat dalam berkas ditolak.
 */

const ref = (o: Partial<MarkerUploadParcelRef> = {}): MarkerUploadParcelRef => ({
  id: "lp-1",
  parcelId: "LHN-1.A",
  farmerCode: "SH-1",
  farmerName: "Budi",
  hasGeometry: true,
  activeMarkerCount: 2,
  sequenceNos: [1, 2],
  ...o,
});

const match = (refs: MarkerUploadParcelRef[], global?: Record<string, number>): MarkerUploadMatch => {
  const parcelsById = new Map<string, MarkerUploadParcelRef[]>();
  for (const r of refs) parcelsById.set(r.parcelId, [...(parcelsById.get(r.parcelId) ?? []), r]);
  return { parcelsById, globalCounts: new Map(Object.entries(global ?? {})) };
};

const MAPPING = { parcelId: "ID Lahan", farmerCode: "ID Petani", code: "Kode Patok", sequenceNo: "No Patok", latitude: "Lintang", longitude: "Bujur", condition: "Kondisi", type: "Jenis", installedAt: "Tanggal Pemasangan", installedBy: "Dipasang oleh", notes: "Keterangan" } as const;

describe("autoMatchMarkerUploadColumns — alias header Excel & atribut DBF", () => {
  it("template resmi terpetakan seluruhnya", () => {
    const m = autoMatchMarkerUploadColumns(MARKER_UPLOAD_TEMPLATE_COLUMNS.map((c) => c.header));
    expect(Object.keys(m).sort()).toEqual(MARKER_UPLOAD_FIELDS.map((f) => f.key).sort());
  });

  it("nama atribut DBF/GPS umum: parcel_id, no_patok, lat/lon, cond, type, installed", () => {
    const m = autoMatchMarkerUploadColumns(["PARCEL_ID", "NO_PATOK", "LAT", "LON", "COND", "TYPE", "INSTALLED"]);
    expect(m).toMatchObject({ parcelId: "PARCEL_ID", sequenceNo: "NO_PATOK", latitude: "LAT", longitude: "LON", condition: "COND", type: "TYPE", installedAt: "INSTALLED" });
  });

  it("kolom nomor BARIS ('No', 'Nomor') TIDAK terpetakan ke No Patok — nomor baris akan menimpa koordinat patok bernomor sama (review 2026-09-14)", () => {
    const m = autoMatchMarkerUploadColumns(["No", "ID Lahan", "Lintang", "Bujur"]);
    expect(m.sequenceNo).toBeUndefined();
    expect(autoMatchMarkerUploadColumns(["Nomor", "ID Lahan"]).sequenceNo).toBeUndefined();
  });

  it("x/y diterima sebagai bujur/lintang", () => {
    expect(autoMatchMarkerUploadColumns(["id lahan", "x", "y"])).toMatchObject({ longitude: "x", latitude: "y" });
  });
});

describe("parseMarkerCondition / parseMarkerType — label Indonesia, enum, alias lapangan", () => {
  it("kondisi: label, enum, alias; kosong → null; tak dikenal → error", () => {
    expect(parseMarkerCondition("Ada").value).toBe("PRESENT");
    expect(parseMarkerCondition("PRESENT").value).toBe("PRESENT");
    expect(parseMarkerCondition("hilang").value).toBe("MISSING");
    expect(parseMarkerCondition("Belum dipasang").value).toBe("NOT_INSTALLED");
    expect(parseMarkerCondition("not installed").value).toBe("NOT_INSTALLED");
    expect(parseMarkerCondition("patah").value).toBe("DAMAGED");
    expect(parseMarkerCondition("")).toEqual({ value: null, error: null });
    expect(parseMarkerCondition("-")).toEqual({ value: null, error: null });
    expect(parseMarkerCondition("bagus sekali").error).toMatch(/Kondisi tidak dikenal/);
  });

  it("'tidak ada'/'belum ada' adalah jawaban sah (bukan token kosong seperti di importer STDB)", () => {
    expect(parseMarkerCondition("tidak ada").value).toBe("MISSING");
    expect(parseMarkerCondition("belum ada").value).toBe("NOT_INSTALLED");
  });

  it("bahan (dulu jenis): label, enum, alias; tak dikenal → error", () => {
    expect(parseMarkerType("Beton").value).toBe("CONCRETE");
    expect(parseMarkerType("semen").value).toBe("CONCRETE");
    expect(parseMarkerType("PIPE").value).toBe("PIPE");
    expect(parseMarkerType("tanda alam").value).toBe("NATURAL");
    expect(parseMarkerType("pohon").value).toBe("NATURAL");
    expect(parseMarkerType("").value).toBeNull();
    expect(parseMarkerType("plastik").error).toMatch(/Bahan tidak dikenal/);
  });
});

describe("parseCoordCell / parseSequenceCell", () => {
  it("angka, teks berkoma desimal, rentang", () => {
    expect(parseCoordCell(0.52, "Lintang", -90, 90)).toEqual({ value: 0.52, error: null });
    expect(parseCoordCell("0,523456", "Lintang", -90, 90).value).toBeCloseTo(0.523456, 6);
    expect(parseCoordCell("101.19", "Bujur", -180, 180).value).toBe(101.19);
    // "0" sah untuk koordinat (CSV mengirim string) — bukan token kosong seperti di importer detail.
    expect(parseCoordCell("0", "Lintang", -90, 90)).toEqual({ value: 0, error: null });
    expect(parseCoordCell("", "Lintang", -90, 90).error).toMatch(/wajib/);
    expect(parseCoordCell("abc", "Lintang", -90, 90).error).toMatch(/bukan angka/);
    expect(parseCoordCell(95, "Lintang", -90, 90).error).toMatch(/di luar rentang/);
  });

  it("No Patok: bilangan bulat positif; kosong → null (patok baru)", () => {
    expect(parseSequenceCell(3)).toEqual({ value: 3, error: null });
    expect(parseSequenceCell("7")).toEqual({ value: 7, error: null });
    expect(parseSequenceCell("")).toEqual({ value: null, error: null });
    expect(parseSequenceCell("2.5").error).toMatch(/bilangan bulat/);
    expect(parseSequenceCell(0).error).toMatch(/bilangan bulat/);
  });

  it("No Patok '0' sebagai TEKS (CSV) ditolak sama seperti 0 numerik — bukan diam-diam jadi patok baru (review 2026-09-15)", () => {
    expect(parseSequenceCell("0").error).toMatch(/bilangan bulat/);
    expect(parseSequenceCell(" 0 ").error).toMatch(/bilangan bulat/);
    expect(parseSequenceCell("-1").error).toMatch(/bilangan bulat/);
    expect(parseSequenceCell("-")).toEqual({ value: null, error: null });
    expect(parseSequenceCell("n/a")).toEqual({ value: null, error: null });
  });
});

describe("markerFeaturesToRecords — shapefile Point → record ber-header template", () => {
  it("koordinat dari geometri Point mengisi Lintang/Bujur (kunci PERTAMA — menang atas atribut DBF X/Y saat auto-match); atribut lain ikut", () => {
    const out = markerFeaturesToRecords([
      { index: 0, properties: { parcel_id: "LHN-1.A", no_patok: 1, cond: "Ada", X: 215432.1, Y: 57890.2 }, geometry: { type: "Point", coordinates: [101.19, 0.52] } },
    ]);
    expect(out.records).toEqual([{ Lintang: 0.52, Bujur: 101.19, parcel_id: "LHN-1.A", no_patok: 1, cond: "Ada", X: 215432.1, Y: 57890.2 }]);
    expect(Object.keys(out.records[0]).slice(0, 2)).toEqual(["Lintang", "Bujur"]);
    const headers = [...new Set(out.records.flatMap((r) => Object.keys(r)))];
    expect(autoMatchMarkerUploadColumns(headers)).toMatchObject({ latitude: "Lintang", longitude: "Bujur" });
    expect(out.rowNumbers).toEqual([1]);
    expect(out.skipped).toEqual([]);
  });

  it("atribut DBF bernama Lintang/Bujur (survei lama) TIDAK menimpa koordinat geometri (review 2026-09-15)", () => {
    const out = markerFeaturesToRecords([
      { index: 0, properties: { parcel_id: "LHN-1.A", LINTANG: 0.9, bujur: 100.1 }, geometry: { type: "Point", coordinates: [101.19, 0.52] } },
    ]);
    expect(out.records).toEqual([{ Lintang: 0.52, Bujur: 101.19, parcel_id: "LHN-1.A" }]);
  });

  it("geometri bukan Point → dilewati dengan alasan; tanpa geometri → record tetap (koordinat dari atribut bila ada)", () => {
    const out = markerFeaturesToRecords([
      { index: 0, properties: { parcel_id: "A" }, geometry: { type: "Polygon", coordinates: [] } },
      { index: 1, properties: { parcel_id: "B", lat: 0.5, lon: 101.1 }, geometry: null },
    ]);
    expect(out.skipped).toEqual([{ index: 0, reason: "Geometri Polygon, bukan Point" }]);
    expect(out.records).toEqual([{ parcel_id: "B", lat: 0.5, lon: 101.1 }]);
    expect(out.rowNumbers).toEqual([2]);
  });
});

describe("validateMarkerUploadRows — pencocokan lahan & aturan baris", () => {
  const row = (o: Record<string, unknown> = {}) => ({
    "ID Lahan": "LHN-1.A", "ID Petani": "", "Kode Patok": "", "No Patok": "", Lintang: 0.52, Bujur: 101.19, Kondisi: "Ada", Jenis: "", "Tanggal Pemasangan": "", "Dipasang oleh": "", Keterangan: "",
    ...o,
  });

  it("baris valid: No Patok ada di lahan → action update; kosong/baru → create", () => {
    const rows = validateMarkerUploadRows([row({ "No Patok": 2 }), row(), row({ "No Patok": 9 })], MAPPING, match([ref()]));
    expect(rows.map((r) => r.action)).toEqual(["update", "create", "create"]);
    expect(rows.every((r) => r.errors.length === 0 && r.row)).toBe(true);
    expect(rows[0].row).toMatchObject({ sequenceNo: 2, latitude: 0.52, longitude: 101.19, condition: "PRESENT", type: null });
  });

  it("nomor baris fisik dipakai bila diberikan; bawaan = indeks + 2 (header baris 1)", () => {
    expect(validateMarkerUploadRows([row()], MAPPING, match([ref()]))[0].rowNumber).toBe(2);
    expect(validateMarkerUploadRows([row()], MAPPING, match([ref()]), [17])[0].rowNumber).toBe(17);
  });

  it("lahan tak ditemukan / di luar scope → error, row null", () => {
    const [r] = validateMarkerUploadRows([row({ "ID Lahan": "LHN-X" })], MAPPING, match([ref()]));
    expect(r.errors).toContain("Lahan tidak ditemukan atau di luar akses Anda");
    expect(r.row).toBeNull();
    expect(r.landParcelId).toBeNull();
  });

  it("ID Lahan dipakai >1 petani (global) tanpa ID Petani → minta kolom ID Petani; dengan ID Petani → cocok ke petani itu", () => {
    const refs = [ref({ id: "lp-1", farmerCode: "SH-1" }), ref({ id: "lp-2", farmerCode: "SH-2", farmerName: "Cici" })];
    const m = match(refs, { "LHN-1.A": 2 });
    const [noCode] = validateMarkerUploadRows([row()], MAPPING, m);
    expect(noCode.errors[0]).toMatch(/isi kolom ID Petani/);
    const [withCode] = validateMarkerUploadRows([row({ "ID Petani": "SH-2" })], MAPPING, m);
    expect(withCode.errors).toEqual([]);
    expect(withCode.landParcelId).toBe("lp-2");
    expect(withCode.farmerName).toBe("Cici");
    const [wrongCode] = validateMarkerUploadRows([row({ "ID Petani": "SH-9" })], MAPPING, m);
    expect(wrongCode.errors[0]).toMatch(/tidak terdaftar pada ID Petani SH-9/);
  });

  it("kembaran di luar scope (jumlah global 2, kandidat dalam scope 1) tetap dianggap ambigu tanpa ID Petani — paritas server", () => {
    const [r] = validateMarkerUploadRows([row()], MAPPING, match([ref()], { "LHN-1.A": 2 }));
    expect(r.errors[0]).toMatch(/isi kolom ID Petani/);
  });

  it("lahan tanpa poligon → ditolak (guard jarak tak bisa diperiksa)", () => {
    const [r] = validateMarkerUploadRows([row()], MAPPING, match([ref({ hasGeometry: false })]));
    expect(r.errors[0]).toMatch(/belum punya poligon/);
  });

  it("lintang & bujur tertukar (|lat| > 12, |lon| ≤ 12) → ditandai sebelum kirim", () => {
    const [r] = validateMarkerUploadRows([row({ Lintang: 101.19, Bujur: 0.52 })], MAPPING, match([ref()]));
    expect(r.errors).toContain("Lintang dan Bujur tampak tertukar");
  });

  it("No Patok sama untuk lahan sama di dua baris → baris kedua ditolak menyebut baris pertama", () => {
    const rows = validateMarkerUploadRows([row({ "No Patok": 1 }), row({ "No Patok": 1 })], MAPPING, match([ref()]), [2, 3]);
    expect(rows[0].errors).toEqual([]);
    expect(rows[1].errors[0]).toMatch(/sudah ada di baris 2/);
  });

  it("kondisi/bahan/tanggal tak valid dan teks terlalu panjang → error per kolom, tidak menghentikan baris lain", () => {
    const rows = validateMarkerUploadRows(
      [row({ Kondisi: "bagus", Jenis: "plastik", "Tanggal Pemasangan": "31/02/2026", "Dipasang oleh": "x".repeat(201) }), row()],
      MAPPING,
      match([ref()]),
    );
    expect(rows[0].errors.length).toBe(4);
    expect(rows[0].errors.join(" ")).toMatch(/Kondisi tidak dikenal.*Bahan tidak dikenal.*Tanggal Pemasangan tidak valid.*200 karakter/);
    expect(rows[1].errors).toEqual([]);
  });

  it("tanggal dd/mm/yyyy → ISO; keterangan pakai pembersih teks bebas ('tidak ada' tetap tersimpan)", () => {
    const [r] = validateMarkerUploadRows([row({ "Tanggal Pemasangan": "01/09/2026", Keterangan: "tidak ada" })], MAPPING, match([ref()]));
    expect(r.row).toMatchObject({ installedAt: "2026-09-01", notes: "tidak ada" });
  });

  it("Kode Patok terisi → action update (patok fisik itu yang diperbarui/ditautkan); kode salah bentuk → error", () => {
    const [ok] = validateMarkerUploadRows([row({ "Kode Patok": "hjp-ptk-000012" })], MAPPING, match([ref()]));
    expect(ok.errors).toEqual([]);
    expect(ok.action).toBe("update");
    expect(ok.row?.code).toBe("HJP-PTK-000012");
    const [bad] = validateMarkerUploadRows([row({ "Kode Patok": "Patok-12" })], MAPPING, match([ref()]));
    expect(bad.errors[0]).toMatch(/Kode patok tidak valid/);
  });

  it("toUploadPayload hanya mengirim baris valid, bentuk sesuai skema server", () => {
    const rows = validateMarkerUploadRows([row({ "No Patok": 2 }), row({ "ID Lahan": "LHN-X" })], MAPPING, match([ref()]));
    const payload = toUploadPayload(rows);
    expect(payload).toEqual([
      { landParcelId: "lp-1", code: null, sequenceNo: 2, longitude: 101.19, latitude: 0.52, condition: "PRESENT", type: null, installedAt: null, installedBy: null, notes: null },
    ]);
  });
});

describe("template", () => {
  it("contoh baris mengisi semua kolom template dengan label yang bisa diparse balik", () => {
    expect(Object.keys(MARKER_UPLOAD_TEMPLATE_EXAMPLE).sort()).toEqual(MARKER_UPLOAD_FIELDS.map((f) => f.key).sort());
    expect(parseMarkerCondition(MARKER_UPLOAD_TEMPLATE_EXAMPLE.condition).value).toBe("PRESENT");
    expect(parseMarkerType(MARKER_UPLOAD_TEMPLATE_EXAMPLE.type).value).toBe("CONCRETE");
  });
});
