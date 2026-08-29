import { describe, it, expect } from "vitest";
import {
  cleanCell,
  normalizeDocumentType,
  parseStdbNumber,
  parseStatedArea,
  autoMatchParcelDetailColumns,
  validateParcelDetailRows,
  type ParcelRef,
} from "@/lib/land-parcel-detail-import";

/**
 * Import detail lahan (#296/#297). Nilai contoh diambil dari data sumber
 * MIS_{KAMPAR,PELALAWAN,ROHUL}_data-lahan.xlsx (Decision Log 2026-08-27).
 */

describe("cleanCell — token kosong data sumber", () => {
  it.each(["", " ", "-", "0", "n/a", "N/A", "Belum dapat", "null"])("%j → kosong", (v) => {
    expect(cleanCell(v)).toBe("");
  });
  it("merapikan spasi ganda dan mempertahankan isi", () => {
    expect(cleanCell("  ASPEK RSB.0001.A.14.06.07.2007 ")).toBe("ASPEK RSB.0001.A.14.06.07.2007");
  });
  it("angka Excel jadi string", () => {
    expect(cleanCell(727)).toBe("727");
  });
});

describe("normalizeDocumentType — 19 ejaan jenis surat → enum", () => {
  it.each([
    ["SHM (Sertifikat Hak Milik)", "SHM"],
    ["SHM (Surat Hak Milik)", "SHM"],
    ["SHM", "SHM"],
    ["Sertifikat Hak Milik", "SHM"],
    ["SKT (Surat Keterangan Tanah)", "SKT"],
    ["SKT Desa", "SKT"],
    ["SKT", "SKT"],
    ["SKGR (Surat Keterangan Ganti Rugi)", "SKGR"],
    ["SKGK", "SKGK"],
    ["SK (Surat Keterangan)", "SK"],
    ["SKST (Surat Kesaksian Sempadan Tanah)", "SKST"],
    ["SKTC (Surat Keterangan Camat)", "SKTC"],
    ["SPPT(SURAT PERNYATAAN PEMILIK TANAH)", "SPPT"],
    ["SKRPT", "SKRPT"],
    ["SKKT", "SKKT"],
    ["SKTB (Surat Keterangan Tidak Bersengketa)", "SKTB"],
    ["Surat Keterangan Hibah", "HIBAH"],
    ["Surat Jual beli", "JUAL_BELI"],
  ])("%s → %s", (raw, type) => {
    const r = normalizeDocumentType(raw);
    expect(r.type).toBe(type);
    expect(r.typeRaw).toBe(raw);
    expect(r.custodyNote).toBeNull();
  });

  it("SK tidak menelan SKT/SKGR (akronim dicocokkan utuh)", () => {
    expect(normalizeDocumentType("SKT Desa").type).toBe("SKT");
    expect(normalizeDocumentType("SK Desa").type).toBe("SK");
  });

  it("status penguasaan bukan jenis surat → type null + custodyNote", () => {
    for (const raw of ["Lahan sudah dijual", "Surat lahan di bank"]) {
      const r = normalizeDocumentType(raw);
      expect(r.type).toBeNull();
      expect(r.custodyNote).toBe(raw);
    }
  });

  it("teks tak dikenal → OTHER dengan typeRaw", () => {
    expect(normalizeDocumentType("Akta Notaris 12")).toEqual({ type: "OTHER", typeRaw: "Akta Notaris 12", custodyNote: null });
  });

  it("kosong → semuanya null", () => {
    expect(normalizeDocumentType("")).toEqual({ type: null, typeRaw: null, custodyNote: null });
    expect(normalizeDocumentType(null)).toEqual({ type: null, typeRaw: null, custodyNote: null });
  });
});

describe("parseStdbNumber — nomor mentah + tahun terbit bila berpola", () => {
  it("format dominan …/bulan/tahun", () => {
    expect(parseStdbNumber("1637/53/1401/6/2025")).toEqual({ number: "1637/53/1401/6/2025", issuedYear: 2025, stage: "TERBIT" });
    expect(parseStdbNumber("176/53/1406/6/2025")).toEqual({ number: "176/53/1406/6/2025", issuedYear: 2025, stage: "TERBIT" });
  });
  it("nomor tanpa pola disimpan apa adanya, tahun null", () => {
    expect(parseStdbNumber("3475")).toEqual({ number: "3475", issuedYear: null, stage: "TERBIT" });
    expect(parseStdbNumber(3475)).toEqual({ number: "3475", issuedYear: null, stage: "TERBIT" });
  });
  it("token 'sedang diurus' → baris PERSIAPAN_DATA, bukan dibuang (#306)", () => {
    // 329 baris di berkas sumber (327 `n/a` Rohul + 2 `Belum dapat` Kampar)
    // hilang tanpa jejak sebelum #306 karena dianggap sel kosong.
    for (const token of ["n/a", "N/A", "Belum dapat", "belum ada", "tidak ada"]) {
      expect(parseStdbNumber(token), token).toEqual({ number: null, issuedYear: null, stage: "PERSIAPAN_DATA" });
    }
  });
  it("sel yang benar-benar kosong tetap → null (tak ada baris STDB)", () => {
    for (const token of ["", " ", "-", "0", "null"]) {
      expect(parseStdbNumber(token), JSON.stringify(token)).toBeNull();
    }
    expect(parseStdbNumber(null)).toBeNull();
  });
  it("segmen akhir 4 digit di luar rentang tahun tidak dianggap tahun", () => {
    expect(parseStdbNumber("12/34/9999")?.issuedYear).toBeNull();
  });
});

describe("parseStatedArea", () => {
  it("angka & koma desimal", () => {
    expect(parseStatedArea("0.25")).toEqual({ value: 0.25, error: null });
    expect(parseStatedArea("1,06")).toEqual({ value: 1.06, error: null });
    expect(parseStatedArea(2)).toEqual({ value: 2, error: null });
  });
  it("0 / kosong → null tanpa error (sumber memakai 0 sebagai 'tidak ada')", () => {
    expect(parseStatedArea("0")).toEqual({ value: null, error: null });
    expect(parseStatedArea("")).toEqual({ value: null, error: null });
  });
  it("teks bukan angka → error", () => {
    expect(parseStatedArea("dua").error).toMatch(/tidak valid/);
  });
});

describe("autoMatchParcelDetailColumns — header berkas sumber", () => {
  it("mengenali seluruh header MIS_<KAB>_data-lahan.xlsx", () => {
    const headers = [
      "ID Lahan", "Nama Petani", "ID Petani", "Lembaga Petani", "Luas (ha)", "Jenis Surat Tanah",
      "Nama tertera di Surat", "Nomor Surat", "Luas tertera di Surat (Ha)", "Nomor STDB", "parcel_code", "Nama Kelompok Tani",
    ];
    expect(autoMatchParcelDetailColumns(headers)).toEqual({
      parcelId: "ID Lahan",
      farmerId: "ID Petani",
      documentType: "Jenis Surat Tanah",
      documentNumber: "Nomor Surat",
      holderName: "Nama tertera di Surat",
      statedArea: "Luas tertera di Surat (Ha)",
      stdbNumber: "Nomor STDB",
      externalCode: "parcel_code",
      subGroupLv2: "Nama Kelompok Tani",
    });
  });
  it("header shapefile terpotong 10 karakter (parcel_cod) tetap dikenali", () => {
    expect(autoMatchParcelDetailColumns(["ID_Lahan", "parcel_cod"]).externalCode).toBe("parcel_cod");
  });
  it("alias label UI 'UL Parcel Code' (huruf campur) cocok — review pasca-v0.30.0", () => {
    expect(autoMatchParcelDetailColumns(["UL Parcel Code"]).externalCode).toBe("UL Parcel Code");
    expect(autoMatchParcelDetailColumns(["ul parcel code"]).externalCode).toBe("ul parcel code");
  });
});

describe("validateParcelDetailRows", () => {
  const parcels: ParcelRef[] = [
    { parcelUid: "uid-1a", parcelId: "APSS.0001.A", farmerCode: "APSS.0001", farmerName: "Abdul Rahman", farmerDbId: "f1" },
    { parcelUid: "uid-1b", parcelId: "APSS.0001.B", farmerCode: "APSS.0001", farmerName: "Abdul Rahman", farmerDbId: "f1" },
    { parcelUid: "uid-2a", parcelId: "APSS.0002.A", farmerCode: "APSS.0002", farmerName: "Awang Syah", farmerDbId: "f2" },
  ];
  const mapping = {
    parcelId: "ID Lahan", farmerId: "ID Petani", documentType: "Jenis", documentNumber: "No",
    holderName: "Nama", statedArea: "Luas", stdbNumber: "STDB", externalCode: "parcel_code",
  } as const;
  const row = (o: Record<string, unknown>) => ({ "ID Lahan": "", "ID Petani": "", Jenis: "", No: "", Nama: "", Luas: "", STDB: "", parcel_code: "", KT: "", ...o });

  it("baris lengkap → valid, data ternormalisasi menempel ke parcelUid", () => {
    const [r] = validateParcelDetailRows(
      [row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001", Jenis: "SHM (Sertifikat Hak Milik)", No: 727, Nama: "Abdul Rohman", Luas: "0.25", STDB: "1637/53/1401/6/2025", parcel_code: "ID080d781b4" })],
      mapping, parcels,
    );
    expect(r._isValid).toBe(true);
    expect(r._farmerName).toBe("Abdul Rahman");
    expect(r.data).toEqual({
      parcelUid: "uid-1a", farmerDbId: "f1", parcelId: "APSS.0001.A",
      document: { type: "SHM", typeRaw: "SHM (Sertifikat Hak Milik)", number: "727", holderName: "Abdul Rohman", statedArea: 0.25, custodyNote: null },
      custodyNote: null,
      stdb: { number: "1637/53/1401/6/2025", issuedYear: 2025, stage: "TERBIT" },
      externalCode: "ID080d781b4",
      subGroupLv2: null,
    });
  });

  it("Nama Kelompok Tani ikut terbawa; baris yang hanya berisi KT tetap valid", () => {
    const [r] = validateParcelDetailRows([row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001", KT: "Kelompok Tani Karya Maju" })], { ...mapping, subGroupLv2: "KT" }, parcels);
    expect(r._isValid).toBe(true);
    expect(r.data?.subGroupLv2).toBe("Kelompok Tani Karya Maju");
    expect(r._dbSubGroupLv2).toBeNull();
  });

  it("pratinjau menandai KT yang sudah ada di DB (server tidak akan menimpa)", () => {
    const withKt: ParcelRef[] = [{ ...parcels[0], subGroupLv2: "KT Lama" }];
    const [r] = validateParcelDetailRows([row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001", KT: "KT Baru" })], { ...mapping, subGroupLv2: "KT" }, withKt);
    expect(r._dbSubGroupLv2).toBe("KT Lama");
    expect(r.data?.subGroupLv2).toBe("KT Baru");
  });

  it("pencocokan ID tidak peduli kapitalisasi", () => {
    const [r] = validateParcelDetailRows([row({ "ID Lahan": "apss.0001.a", "ID Petani": "apss.0001", parcel_code: "X" })], mapping, parcels);
    expect(r._isValid).toBe(true);
  });

  it("ID Lahan terdaftar tapi bukan milik petani yang ditulis → error pasangan", () => {
    const [r] = validateParcelDetailRows([row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0002", parcel_code: "X" })], mapping, parcels);
    expect(r._isValid).toBe(false);
    expect(r._errors[0]).toMatch(/tidak terdaftar untuk petani/);
  });

  it("ID Petani tak dikenal → error akses/database", () => {
    const [r] = validateParcelDetailRows([row({ "ID Lahan": "APSS.0001.A", "ID Petani": "ZZZ.9", parcel_code: "X" })], mapping, parcels);
    expect(r._errors[0]).toMatch(/tidak ditemukan dalam database atau akses/);
  });

  it("ID Lahan sama dengan ID Petani berbeda di file → KEDUA baris error (bug sumber, tidak dipilih diam-diam)", () => {
    const rs = validateParcelDetailRows(
      [
        row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001", parcel_code: "X" }),
        row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0002", parcel_code: "X" }),
      ],
      mapping, parcels,
    );
    expect(rs.map((r) => r._isValid)).toEqual([false, false]);
    expect(rs[0]._errors.join()).toMatch(/ID Petani berbeda/);
  });

  it("satu STDB untuk beberapa lahan petani yang SAMA → valid (STDB per petani)", () => {
    const rs = validateParcelDetailRows(
      [
        row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001", STDB: "1637/53/1401/6/2025" }),
        row({ "ID Lahan": "APSS.0001.B", "ID Petani": "APSS.0001", STDB: "1637/53/1401/6/2025" }),
      ],
      mapping, parcels,
    );
    expect(rs.map((r) => r._isValid)).toEqual([true, true]);
  });

  it("satu STDB dipakai petani BERBEDA → semua barisnya error", () => {
    const rs = validateParcelDetailRows(
      [
        row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001", STDB: "1105/53/1401/10/2024" }),
        row({ "ID Lahan": "APSS.0002.A", "ID Petani": "APSS.0002", STDB: "1105/53/1401/10/2024" }),
      ],
      mapping, parcels,
    );
    expect(rs.map((r) => r._isValid)).toEqual([false, false]);
    expect(rs[1]._errors.join()).toMatch(/STDB terbit per petani/);
  });

  it("status penguasaan tanpa jenis → valid, disimpan sebagai custodyNote (document null)", () => {
    const [r] = validateParcelDetailRows([row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001", Jenis: "Lahan sudah dijual" })], mapping, parcels);
    expect(r._isValid).toBe(true);
    expect(r.data?.document).toBeNull();
    expect(r.data?.custodyNote).toBe("Lahan sudah dijual");
  });

  it("nomor/nama/luas terisi tanpa jenis surat → valid sebagai OTHER (jenis tak diketahui, data tidak dibuang)", () => {
    const [r] = validateParcelDetailRows([row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001", No: "694", Nama: "Syarifudin" })], mapping, parcels);
    expect(r._isValid).toBe(true);
    expect(r.data?.document).toEqual({ type: "OTHER", typeRaw: null, number: "694", holderName: "Syarifudin", statedArea: null, custodyNote: null });
  });

  it("baris tanpa detail apa pun → error 'tidak ada data'", () => {
    const [r] = validateParcelDetailRows([row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001" })], mapping, parcels);
    expect(r._isValid).toBe(false);
    expect(r._errors[0]).toMatch(/Tidak ada data detail/);
  });

  it("luas tertera 0 / nomor 'n/a' dianggap kosong (bukan error)", () => {
    const [r] = validateParcelDetailRows(
      [row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001", Jenis: "SHM", No: "0", Nama: "0", Luas: "0", STDB: "n/a", parcel_code: "ID000d50ef1" })],
      mapping, parcels,
    );
    expect(r._isValid).toBe(true);
    expect(r.data?.document).toEqual({ type: "SHM", typeRaw: "SHM", number: null, holderName: null, statedArea: null, custodyNote: null });
    expect(r.data?.stdb).toBeNull();
  });

  it("UL Parcel Code yang sama di dua lahan berbeda → kedua baris error (kode unik per lahan)", () => {
    const rs = validateParcelDetailRows(
      [
        row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001", parcel_code: "ID0001" }),
        row({ "ID Lahan": "APSS.0001.B", "ID Petani": "APSS.0001", parcel_code: "id0001" }),
      ],
      mapping, parcels,
    );
    expect(rs.every((r) => !r._isValid)).toBe(true);
    expect(rs[0]._errors.join(" ")).toContain("dipakai lebih dari satu lahan");
  });

  it("kode sama di baris ganda lahan yang SAMA tidak dianggap bentrok", () => {
    const rs = validateParcelDetailRows(
      [
        row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001", parcel_code: "ID0001" }),
        row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001", parcel_code: "ID0001", Jenis: "SKT", No: "5" }),
      ],
      mapping, parcels,
    );
    expect(rs.every((r) => r._isValid)).toBe(true);
  });

  it("pasangan (ID Petani, ID Lahan) yang cocok ke >1 lahan dalam scope (Lembaga berbeda, TD-024) → error, bukan dipilih diam-diam", () => {
    const twoGroups: ParcelRef[] = [
      ...parcels,
      { parcelUid: "uid-x", parcelId: "APSS.0001.A", farmerCode: "APSS.0001", farmerName: "Orang Lain", farmerDbId: "f9" },
    ];
    const [r] = validateParcelDetailRows([row({ "ID Lahan": "APSS.0001.A", "ID Petani": "APSS.0001", parcel_code: "X" })], mapping, twoGroups);
    expect(r._isValid).toBe(false);
    expect(r._errors.join(" ")).toContain("lebih dari satu lahan");
  });

  it("nomor baris = indeks + 2 (baris 1 Excel adalah header)", () => {
    const rs = validateParcelDetailRows([row({}), row({})], mapping, parcels);
    expect(rs.map((r) => r._rowNum)).toEqual([2, 3]);
  });
});
