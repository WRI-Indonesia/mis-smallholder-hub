import { describe, it, expect, vi, afterEach } from "vitest";
import { buildExportRows } from "@/components/shared/data-table";

// TD-015 — perakit baris ekspor Excel `DataTable`.
//
// Bentuk lama mengembalikan hasil `getExportRow` apa adanya, lalu pemetikan
// nilai dilakukan `exportToExcel` memakai `column.key`. Transformer yang
// memakai nama kunci berbeda dari kolomnya karena itu menghasilkan **sel
// kosong tanpa satu pun tanda** — bukan error, bukan nilai salah, sekadar
// hilang. Pola ini sudah tiga kali menggigit (dua kali di #160, lalu empat
// kolom paket di Laporan Pelatihan yang terbit kosong).

type Row = {
  farmerId: string;
  name: string;
  gender: string;
  paket1Date: Date | null;
};

const columns: { key: keyof Row }[] = [
  { key: "farmerId" },
  { key: "name" },
  { key: "gender" },
  { key: "paket1Date" },
];

const rows: Row[] = [
  { farmerId: "MIS.14.08.001", name: "Abd. Hamid", gender: "M", paket1Date: new Date("2026-03-04") },
  { farmerId: "MIS.14.08.002", name: "Adnan", gender: "M", paket1Date: null },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildExportRows — tanpa transformer", () => {
  it("mengambil nilai mentah per kolom aktif", () => {
    const out = buildExportRows(columns, rows);
    expect(out[0].farmerId).toBe("MIS.14.08.001");
    expect(out[0].name).toBe("Abd. Hamid");
    expect(out[1].paket1Date).toBeNull();
  });

  it("memformat Date agar tidak terbit sebagai objek", () => {
    const out = buildExportRows(columns, rows);
    expect(typeof out[0].paket1Date).toBe("string");
    expect(out[0].paket1Date).toBe(new Date("2026-03-04").toLocaleDateString("id-ID"));
  });

  it("hanya memuat kolom aktif — kolom disembunyikan tidak ikut terbawa", () => {
    const out = buildExportRows([{ key: "name" }] as { key: keyof Row }[], rows);
    expect(Object.keys(out[0])).toEqual(["name"]);
  });
});

describe("buildExportRows — kolom non-data", () => {
  it("kolom `exportable: false` tidak ikut (kolom Aksi ber-key \"id\")", () => {
    // Kolom kontrol memakai `key: "id"` demi memenuhi `keyof T`. Tanpa
    // pengecualian, fallback nilai mentah justru menerbitkan kolom "Aksi"
    // berisi CUID — lebih buruk daripada kosong.
    const withAction = [
      { key: "farmerId" as const, exportable: false },
      { key: "name" as const },
    ];
    const out = buildExportRows(
      withAction.filter((c) => c.exportable !== false) as { key: keyof Row }[],
      rows,
    );
    expect(Object.keys(out[0])).toEqual(["name"]);
  });
});

describe("buildExportRows — fallback hanya untuk nilai primitif", () => {
  // Kolom turunan lazim MEMINJAM kunci yang tak berhubungan demi memenuhi
  // `keyof T` — di Snapshot BMP Detail, "Produktivitas" ber-`key: "id"` dan
  // "Lahan Ber-data" ber-`key: "availability"`, keduanya bernilai objek.
  // Fallback yang menulis nilai mentah apa adanya menghasilkan sel
  // "[object Object]": lebih buruk daripada kosong.
  type Derived = { name: string; totals: { produksiTon: number }; tags: string[] };
  const derivedCols: { key: keyof Derived }[] = [{ key: "name" }, { key: "totals" }, { key: "tags" }];
  const derivedRows: Derived[] = [{ name: "KT Maju", totals: { produksiTon: 12 }, tags: ["a", "b"] }];

  it("tidak pernah menuliskan objek atau array ke sel", () => {
    const out = buildExportRows(derivedCols, derivedRows, (row) => ({ name: row.name }));
    expect(out[0].name).toBe("KT Maju");
    expect(out[0].totals).toBeUndefined();
    expect(out[0].tags).toBeUndefined();
  });

  it("nilai turunan dari transformer tetap menang atas objek mentah", () => {
    const out = buildExportRows(derivedCols, derivedRows, (row) => ({
      name: row.name,
      totals: `${row.totals.produksiTon} ton`,
      tags: row.tags.join(", "),
    }));
    expect(out[0].totals).toBe("12 ton");
    expect(out[0].tags).toBe("a, b");
  });

  it("primitif tetap lolos fallback", () => {
    const out = buildExportRows(columns, rows);
    expect(out[0].farmerId).toBe("MIS.14.08.001");
    expect(out[1].paket1Date).toBeNull();
  });
});

describe("buildExportRows — dengan transformer", () => {
  it("memakai nilai transformer ketika kuncinya cocok", () => {
    const out = buildExportRows(columns, rows, (row) => ({
      farmerId: row.farmerId,
      name: row.name,
      gender: row.gender === "M" ? "Laki-laki" : "Perempuan",
      paket1Date: row.paket1Date ? "04/03/2026" : "—",
    }));
    expect(out[0].gender).toBe("Laki-laki");
    expect(out[0].paket1Date).toBe("04/03/2026");
    expect(out[1].paket1Date).toBe("—");
  });

  it("kunci yang SALAH NAMA tidak lagi menghasilkan sel kosong", () => {
    // Persis bentuk cacat Laporan Pelatihan: kolom `paket1Date`, transformer
    // mengembalikan `hasPaket1`. Sebelum perbaikan, kolomnya terbit kosong.
    const out = buildExportRows(columns, rows, (row) => ({
      farmerId: row.farmerId,
      name: row.name,
      gender: "Laki-laki",
      hasPaket1: "04/03/2026",
    }));
    expect(out[0].paket1Date).not.toBeUndefined();
    expect(out[0].paket1Date).toBe(new Date("2026-03-04").toLocaleDateString("id-ID"));
    // Yang cocok tetap dihormati.
    expect(out[0].gender).toBe("Laki-laki");
  });

  it("memperingatkan sekali per ekspor saat ada kunci tak terpenuhi, bukan per baris", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    buildExportRows(columns, rows, (row) => ({ farmerId: row.farmerId }));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("paket1Date");
    expect(String(warn.mock.calls[0][0])).toContain("name");
  });

  it("tidak memperingatkan ketika seluruh kunci kolom terpenuhi", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    buildExportRows(columns, rows, (row) => ({
      farmerId: row.farmerId,
      name: row.name,
      gender: row.gender,
      paket1Date: "—",
    }));
    expect(warn).not.toHaveBeenCalled();
  });

  it("meneruskan indeks baris — kolom nomor urut ikut terisi", () => {
    // `getSpecificTrainingExportRow(row, idx)` memakai indeks untuk kolom NO;
    // pemanggilan lama hanya mengirim `row`, sehingga NO terbit kosong.
    const numbered: { key: "no" | "name" }[] = [{ key: "no" }, { key: "name" }];
    const out = buildExportRows(numbered as never, rows as never, (row, index) => ({
      no: index + 1,
      name: (row as Row).name,
    }));
    expect(out.map((r) => r.no)).toEqual([1, 2]);
  });

  it("transformer boleh mengembalikan nilai falsy tanpa dianggap hilang", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = buildExportRows(columns, rows, () => ({
      farmerId: "",
      name: null,
      gender: 0,
      paket1Date: undefined,
    }));
    // `key in obj` — bukan truthiness — jadi "" / null / 0 / undefined dihormati
    // apa adanya, tidak diam-diam ditimpa nilai mentah.
    expect(out[0].farmerId).toBe("");
    expect(out[0].name).toBeNull();
    expect(out[0].gender).toBe(0);
    expect(out[0].paket1Date).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });
});
