import { describe, it, expect, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import {
  applyLandParcelDetailRows,
  fetchParcelDetailExistingState,
  emptyParcelDetailSummary,
  docKey,
  stdbKey,
  openStdbKey,
  linkKey,
} from "@/lib/land-parcel-detail-save";
import type { LandParcelDetailRowInput } from "@/validations/land-parcel-detail.schema";

/**
 * Tahap PREFETCH + EXECUTE import detail lahan (#300) dengan `tx` palsu —
 * jalur ±7.000 baris yang dipakai `bulkSaveLandParcelDetails` dan skrip lokal.
 * Planner murni diuji di land-parcel-detail-save.test.ts; di sini yang dikunci:
 * bentuk peta hasil prefetch, query yang dikirim (createMany/update/updateMany),
 * field audit createdBy/modifiedBy, reaktivasi isActive, dan penggabungan ringkasan.
 */
const row = (o: Partial<LandParcelDetailRowInput>): LandParcelDetailRowInput => ({
  parcelUid: "uid-1",
  farmerDbId: "f1",
  parcelId: "APSS.0001.A",
  document: null,
  custodyNote: null,
  stdb: null,
  externalCode: null,
  subGroupLv2: null,
  ...o,
});
const shm = (number: string, extra: Partial<NonNullable<LandParcelDetailRowInput["document"]>> = {}) => ({
  type: "SHM" as const,
  typeRaw: "SHM",
  number,
  holderName: "Abdul",
  statedArea: 0.25,
  custodyNote: null,
  ...extra,
});
const nkt = (o: Partial<NonNullable<LandParcelDetailRowInput["nkt"]>> = {}): NonNullable<LandParcelDetailRowInput["nkt"]> => ({
  status: "AFFECTED", categories: ["NKT_4"], affectedAreaHa: null, affectedLengthM: null, assessedAt: null, assessor: null, ...o,
});
const border = (o: Partial<NonNullable<LandParcelDetailRowInput["border"]>>) => ({ north: null, east: null, south: null, west: null, ...o });

/** Klien transaksi palsu: setiap model punya findMany/createMany/update/updateMany. */
function fakeTx() {
  const model = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  });
  const t = {
    landParcelDocument: model(),
    landStdb: model(),
    landParcelStdb: model(),
    landParcelExternalId: model(),
    landParcelBorder: model(),
    landParcelNkt: model(),
    landParcel: model(),
  };
  return { t, tx: t as unknown as Prisma.TransactionClient };
}

describe("fetchParcelDetailExistingState — bentuk keadaan DB per batch", () => {
  it("memetakan 5 findMany + tautan ke kunci planner; AKTIF menang, berkas terbuka & kode ganda terkumpul", async () => {
    const { t, tx } = fakeTx();
    t.landParcelDocument.findMany.mockResolvedValue([
      { id: "d1", parcelUid: "uid-1", type: "SHM", number: "727", typeRaw: "SHM", holderName: "Abdul", statedArea: 0.25, custodyNote: null },
      { id: "d2", parcelUid: "uid-1", type: "OTHER", number: null, typeRaw: "Di bank", holderName: null, statedArea: null, custodyNote: "Di bank" },
    ]);
    t.landStdb.findMany.mockResolvedValue([
      // Pasangan nonaktif+aktif dengan (farmerId, number) sama — yang aktif wajib menang meski datang belakangan.
      { id: "s-lama", farmerId: "f1", number: "N-1", stage: "TERBIT", isActive: false },
      { id: "s-aktif", farmerId: "f1", number: "N-1", stage: "TERBIT", isActive: true },
      // Berkas terbuka tanpa nomor (#306) → hanya peta openStdbs.
      { id: "s-buka", farmerId: "f2", number: null, stage: "PERSIAPAN_DATA", isActive: true },
    ]);
    t.landParcelExternalId.findMany.mockResolvedValue([
      { id: "e1", code: "UL-1", parcelUid: "uid-1", isActive: true },
      { id: "e2", code: "UL-1", parcelUid: "uid-9", isActive: false },
    ]);
    t.landParcelBorder.findMany.mockResolvedValue([{ id: "b1", parcelUid: "uid-1", north: "Jalan", east: null, south: null, west: null }]);
    t.landParcelNkt.findMany.mockResolvedValue([
      { id: "n1", parcelUid: "uid-1", status: "AFFECTED", categories: ["NKT_4"], affectedAreaHa: 0.1, affectedLengthM: null, assessedAt: new Date("2025-03-12T00:00:00Z"), assessor: "HJP" },
      { id: "n2", parcelUid: "uid-2", status: "NOT_AFFECTED", categories: [], affectedAreaHa: null, affectedLengthM: null, assessedAt: null, assessor: null },
    ]);
    t.landParcelStdb.findMany.mockResolvedValue([{ id: "l1", parcelUid: "uid-1", stdbId: "s-aktif", isActive: false }]);

    const rows = [
      row({ document: shm("727"), stdb: { number: "N-1", issuedYear: 2024, stage: "TERBIT" }, externalCode: "UL-1", border: border({ north: "Jalan" }), nkt: nkt() }),
      row({ parcelUid: "uid-2", farmerDbId: "f2", stdb: { number: null, issuedYear: null, stage: "PERSIAPAN_DATA" }, nkt: nkt({ status: "NOT_AFFECTED", categories: null }) }),
    ];
    const state = await fetchParcelDetailExistingState(tx, rows, "WRI");

    expect(state.documents.get(docKey("uid-1", "SHM", "727"))).toEqual({ id: "d1", typeRaw: "SHM", holderName: "Abdul", statedArea: 0.25, custodyNote: null });
    expect(state.documents.get(docKey("uid-1", "OTHER", null))?.id).toBe("d2");
    expect(state.stdbs.get(stdbKey("f1", "N-1"))).toEqual({ id: "s-aktif", isActive: true });
    expect(state.stdbs.size).toBe(1); // baris tanpa nomor tidak ikut peta bernomor
    expect(state.openStdbs.get(openStdbKey("f2"))).toEqual({ id: "s-buka", isActive: true });
    expect([...state.farmersWithActiveStdb].sort()).toEqual(["f1", "f2"]);
    expect(state.externalIds.get("UL-1")).toEqual([
      { id: "e1", parcelUid: "uid-1", isActive: true },
      { id: "e2", parcelUid: "uid-9", isActive: false },
    ]);
    expect(state.borders.get("uid-1")).toEqual({ id: "b1", north: "Jalan", east: null, south: null, west: null });
    expect(state.nkts.get("uid-1")).toEqual({ id: "n1", status: "AFFECTED", categories: ["NKT_4"], affectedAreaHa: 0.1, affectedLengthM: null, assessedAt: "2025-03-12", assessor: "HJP" });
    expect(state.nkts.get("uid-2")?.assessedAt).toBeNull();
    expect(state.links.get(linkKey("uid-1", "s-aktif"))).toEqual({ id: "l1", isActive: false });

    // Filter yang dikirim: dokumen aktif saja; kode per pemeta; STDB = nomor di berkas ATAU aktif.
    expect(t.landParcelDocument.findMany.mock.calls[0][0].where).toEqual({ parcelUid: { in: ["uid-1", "uid-2"] }, isActive: true });
    expect(t.landParcelExternalId.findMany.mock.calls[0][0].where).toEqual({ source: "WRI", code: { in: ["UL-1"] } });
    expect(t.landStdb.findMany.mock.calls[0][0].where).toEqual({ farmerId: { in: ["f1", "f2"] }, OR: [{ number: { in: ["N-1"] } }, { isActive: true }] });
    expect(t.landParcelStdb.findMany.mock.calls[0][0].where).toEqual({
      parcelUid: { in: ["uid-1", "uid-2"] },
      stdbId: { in: ["s-lama", "s-aktif", "s-buka"] },
    });
  });

  it("batch tanpa STDB/kode/sepadan/NKT → hanya query dokumen; tautan tidak diambil; pemeta bawaan", async () => {
    const { t, tx } = fakeTx();
    const state = await fetchParcelDetailExistingState(tx, [row({ document: shm("1") })]);
    expect(t.landParcelDocument.findMany).toHaveBeenCalledTimes(1);
    for (const m of [t.landStdb, t.landParcelExternalId, t.landParcelBorder, t.landParcelNkt, t.landParcelStdb]) {
      expect(m.findMany).not.toHaveBeenCalled();
    }
    expect(state.documents.size).toBe(0);
    expect(state.links.size).toBe(0);
  });
});

describe("applyLandParcelDetailRows — EXECUTE pada DB kosong", () => {
  it("baris kosong → tidak ada query sama sekali", async () => {
    const { t, tx } = fakeTx();
    const summary = emptyParcelDetailSummary(0);
    await applyLandParcelDetailRows(tx, [], "user-1", summary);
    expect(t.landParcelDocument.findMany).not.toHaveBeenCalled();
    expect(summary).toEqual(emptyParcelDetailSummary(0));
  });

  it("createMany dokumen/STDB/tautan/kode/sepadan/NKT ber-createdBy; tautan ke STDB baru diselesaikan lewat id hasil re-fetch", async () => {
    const { t, tx } = fakeTx();
    // Prefetch: belum ada STDB; setelah createMany, re-fetch mengembalikan baris bernomor + berkas terbuka.
    t.landStdb.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "s-new", farmerId: "f1", number: "N-1" },
        { id: "s-open", farmerId: "f2", number: null },
      ]);
    t.landParcel.updateMany.mockResolvedValue({ count: 1 });

    const rows = [
      row({
        document: shm("727"),
        stdb: { number: "N-1", issuedYear: 2024, stage: "TERBIT" },
        externalCode: "UL-1",
        border: border({ north: "Lahan Pak Budi" }),
        nkt: nkt({ assessedAt: "2025-03-12", assessor: "HJP" }),
        subGroupLv2: "KT Maju",
        blok: "17 L",
      }),
      row({ parcelUid: "uid-2", farmerDbId: "f2", stdb: { number: null, issuedYear: null, stage: "PERSIAPAN_DATA" }, subGroupLv2: "KT Maju" }),
    ];
    const summary = emptyParcelDetailSummary(rows.length);
    await applyLandParcelDetailRows(tx, rows, "user-1", summary, "WRI");

    expect(t.landParcelDocument.createMany.mock.calls[0][0].data).toEqual([
      { parcelUid: "uid-1", type: "SHM", number: "727", typeRaw: "SHM", holderName: "Abdul", statedArea: 0.25, custodyNote: null, createdBy: "user-1" },
    ]);
    expect(t.landParcelDocument.update).not.toHaveBeenCalled();

    const stdbData = t.landStdb.createMany.mock.calls[0][0].data;
    expect(stdbData).toHaveLength(2);
    expect(stdbData[0]).toMatchObject({ farmerId: "f1", number: "N-1", issuedYear: 2024, stage: "TERBIT", createdBy: "user-1" });
    expect(stdbData[0].stageChangedAt).toBeInstanceOf(Date);
    expect(stdbData[1]).toMatchObject({ farmerId: "f2", number: null, stage: "PERSIAPAN_DATA", createdBy: "user-1" });
    // Re-fetch mencari nomor yang baru dibuat ATAU berkas terbuka tanpa nomor.
    expect(t.landStdb.findMany.mock.calls[1][0].where).toEqual({
      farmerId: { in: ["f1", "f2"] },
      OR: [{ number: { in: ["N-1"] } }, { number: null, isActive: true, stage: { in: ["PERSIAPAN_DATA", "PENGAJUAN", "REVISI"] } }],
    });
    expect(t.landParcelStdb.createMany.mock.calls[0][0].data).toEqual([
      { parcelUid: "uid-1", stdbId: "s-new", createdBy: "user-1" },
      { parcelUid: "uid-2", stdbId: "s-open", createdBy: "user-1" },
    ]);
    expect(t.landStdb.updateMany).not.toHaveBeenCalled();
    expect(t.landParcelStdb.updateMany).not.toHaveBeenCalled();

    expect(t.landParcelExternalId.createMany.mock.calls[0][0].data).toEqual([{ parcelUid: "uid-1", code: "UL-1", source: "WRI", createdBy: "user-1" }]);
    expect(t.landParcelBorder.createMany.mock.calls[0][0].data).toEqual([
      { parcelUid: "uid-1", north: "Lahan Pak Budi", east: null, south: null, west: null, createdBy: "user-1" },
    ]);
    expect(t.landParcelNkt.createMany.mock.calls[0][0].data).toEqual([
      { parcelUid: "uid-1", status: "AFFECTED", categories: ["NKT_4"], affectedAreaHa: null, affectedLengthM: null, assessedAt: new Date("2025-03-12T00:00:00Z"), assessor: "HJP", createdBy: "user-1" },
    ]);

    // Blok & KT: satu updateMany per nilai, hanya baris aktif yang kolomnya kosong; dua lahan ber-KT sama digabung.
    const updates = t.landParcel.updateMany.mock.calls.map((c) => c[0]);
    expect(updates).toEqual([
      { where: { parcelUid: { in: ["uid-1"] }, isActive: true, OR: [{ blok: null }, { blok: "" }] }, data: { blok: "17 L", modifiedBy: "user-1" } },
      { where: { parcelUid: { in: ["uid-1", "uid-2"] }, isActive: true, OR: [{ subGroupLv2: null }, { subGroupLv2: "" }] }, data: { subGroupLv2: "KT Maju", modifiedBy: "user-1" } },
    ]);

    expect(summary).toMatchObject({
      rows: 2,
      documentsCreated: 1,
      stdbsCreated: 2,
      stdbsPendingCreated: 1,
      stdbLinksCreated: 2,
      externalIdsCreated: 1,
      bordersCreated: 1,
      nktCreated: 1,
      bloksFilled: 1, // dari count updateMany, bukan jumlah baris
      subGroupsFilled: 1,
    });
  });

  it("STDB baru tidak ditemukan kembali setelah createMany → lempar galat (transaksi pemanggil batal)", async () => {
    const { t, tx } = fakeTx();
    t.landStdb.findMany.mockResolvedValue([]);
    await expect(
      applyLandParcelDetailRows(tx, [row({ stdb: { number: "N-9", issuedYear: null, stage: "TERBIT" } })], "user-1", emptyParcelDetailSummary(1)),
    ).rejects.toThrow("STDB yang baru dibuat tidak ditemukan kembali (f1 / N-9)");
    expect(t.landParcelStdb.createMany).not.toHaveBeenCalled();
  });

  it("userId null (skrip lokal tanpa sesi) → createdBy null", async () => {
    const { t, tx } = fakeTx();
    await applyLandParcelDetailRows(tx, [row({ externalCode: "UL-2" })], null, emptyParcelDetailSummary(1));
    expect(t.landParcelExternalId.createMany.mock.calls[0][0].data).toEqual([{ parcelUid: "uid-1", code: "UL-2", source: "MERIDIA", createdBy: null }]);
  });
});

describe("applyLandParcelDetailRows — EXECUTE pada data yang sudah ada", () => {
  it("update hanya yang berubah + reaktivasi isActive STDB/tautan/kode, semua ber-modifiedBy; ringkasan digabung", async () => {
    const { t, tx } = fakeTx();
    t.landParcelDocument.findMany.mockResolvedValue([
      { id: "d1", parcelUid: "uid-1", type: "SHM", number: "727", typeRaw: "SHM", holderName: "Abdul", statedArea: 0.25, custodyNote: null },
    ]);
    t.landStdb.findMany.mockResolvedValue([{ id: "s1", farmerId: "f1", number: "N-1", stage: "TERBIT", isActive: false }]);
    t.landParcelStdb.findMany.mockResolvedValue([{ id: "l1", parcelUid: "uid-1", stdbId: "s1", isActive: false }]);
    t.landParcelExternalId.findMany.mockResolvedValue([{ id: "e1", code: "UL-1", parcelUid: "uid-1", isActive: false }]);
    t.landParcelBorder.findMany.mockResolvedValue([{ id: "b1", parcelUid: "uid-1", north: "A", east: "Sungai", south: null, west: null }]);
    t.landParcelNkt.findMany.mockResolvedValue([
      { id: "n1", parcelUid: "uid-1", status: "AFFECTED", categories: ["NKT_4"], affectedAreaHa: null, affectedLengthM: null, assessedAt: new Date("2025-01-01T00:00:00Z"), assessor: null },
      { id: "n2", parcelUid: "uid-2", status: "AFFECTED", categories: ["NKT_4"], affectedAreaHa: null, affectedLengthM: null, assessedAt: null, assessor: null },
    ]);

    const rows = [
      row({
        document: shm("727", { statedArea: 0.5 }),
        stdb: { number: "N-1", issuedYear: 2024, stage: "TERBIT" },
        externalCode: "UL-1",
        border: border({ north: "B", east: "Sungai" }),
        nkt: nkt({ assessedAt: "2026-02-03", assessor: "Tim" }),
      }),
      row({ parcelUid: "uid-2", nkt: nkt({ status: "NOT_AFFECTED", categories: null }) }),
    ];
    const summary = emptyParcelDetailSummary(rows.length);
    summary.documentsCreated = 5; // ringkasan chunk sebelumnya — harus dijumlah, bukan ditimpa
    await applyLandParcelDetailRows(tx, rows, "user-2", summary);

    expect(t.landParcelDocument.createMany).not.toHaveBeenCalled();
    expect(t.landParcelDocument.update).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: { typeRaw: "SHM", holderName: "Abdul", statedArea: 0.5, custodyNote: null, modifiedBy: "user-2" },
    });
    expect(t.landStdb.createMany).not.toHaveBeenCalled();
    expect(t.landStdb.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["s1"] } }, data: { isActive: true, modifiedBy: "user-2" } });
    expect(t.landParcelStdb.createMany).not.toHaveBeenCalled();
    expect(t.landParcelStdb.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["l1"] } }, data: { isActive: true, modifiedBy: "user-2" } });
    expect(t.landParcelExternalId.createMany).not.toHaveBeenCalled();
    expect(t.landParcelExternalId.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["e1"] } }, data: { isActive: true, modifiedBy: "user-2" } });
    // Sepadan: hanya sisi yang berubah.
    expect(t.landParcelBorder.update).toHaveBeenCalledWith({ where: { id: "b1" }, data: { north: "B", modifiedBy: "user-2" } });
    // NKT: tanggal dikonversi ke Date UTC; tanpa tanggal → kunci assessedAt tidak dikirim.
    expect(t.landParcelNkt.update).toHaveBeenNthCalledWith(1, {
      where: { id: "n1" },
      data: { assessor: "Tim", assessedAt: new Date("2026-02-03T00:00:00Z"), modifiedBy: "user-2" },
    });
    const n2 = t.landParcelNkt.update.mock.calls[1][0];
    expect(n2).toEqual({ where: { id: "n2" }, data: { status: "NOT_AFFECTED", modifiedBy: "user-2" } });
    expect("assessedAt" in n2.data).toBe(false);
    expect(t.landParcel.updateMany).not.toHaveBeenCalled();

    expect(summary).toMatchObject({
      documentsCreated: 5,
      documentsUpdated: 1,
      stdbsCreated: 0,
      stdbLinksCreated: 1,
      externalIdsUpdated: 1,
      bordersUpdated: 1,
      nktUpdated: 2,
    });
  });
});
