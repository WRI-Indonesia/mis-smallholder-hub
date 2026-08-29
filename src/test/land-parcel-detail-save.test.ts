import { describe, it, expect } from "vitest";
import {
  planLandParcelDetailRows,
  emptyExistingState,
  farmersWithNumberedStdbIn,
  emptyParcelDetailSummary,
  mergeParcelDetailSummary,
  docKey,
  stdbKey,
  openStdbKey,
  linkKey,
  type ParcelDetailExistingState,
} from "@/lib/land-parcel-detail-save";
import type { LandParcelDetailRowInput } from "@/validations/land-parcel-detail.schema";

/**
 * Planner import detail lahan (#300) — murni, tanpa Prisma. Menguji semantik
 * upsert yang dulu tersebar di 7 query/baris: dedup dalam batch, lewati yang
 * tidak berubah, STDB per petani M:N, UL Parcel Code aktif milik lahan lain
 * dilewati, status penguasaan tidak mengosongkan dokumen OTHER yang ada.
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

describe("planLandParcelDetailRows — dokumen", () => {
  it("DB kosong → semua create, dihitung sekali per kunci meski baris ganda; field terakhir menang", () => {
    const plan = planLandParcelDetailRows(
      [row({ document: shm("727") }), row({ document: shm("727", { holderName: "Abdul Rohman" }) }), row({ parcelUid: "uid-2", document: shm("727") })],
      emptyExistingState(),
    );
    expect(plan.documentCreates).toHaveLength(2);
    expect(plan.documentCreates[0].holderName).toBe("Abdul Rohman");
    expect(plan.summary.documentsCreated).toBe(2);
    expect(plan.documentUpdates).toEqual([]);
  });

  it("sudah ada & identik → tanpa query (unchanged); berbeda → satu update", () => {
    const existing = emptyExistingState();
    existing.documents.set(docKey("uid-1", "SHM", "727"), { id: "d1", typeRaw: "SHM", holderName: "Abdul", statedArea: 0.25, custodyNote: null });
    const same = planLandParcelDetailRows([row({ document: shm("727") })], existing);
    expect(same.summary).toMatchObject({ documentsUnchanged: 1, documentsUpdated: 0, documentsCreated: 0 });
    expect(same.documentUpdates).toEqual([]);

    const diff = planLandParcelDetailRows([row({ document: shm("727", { statedArea: 0.5 }) })], existing);
    expect(diff.documentUpdates).toEqual([{ id: "d1", data: { typeRaw: "SHM", holderName: "Abdul", statedArea: 0.5, custodyNote: null } }]);
    expect(diff.summary.documentsUpdated).toBe(1);
  });

  it("status penguasaan saja → dokumen OTHER tanpa nomor; bila sudah ada, hanya typeRaw+custodyNote yang ditimpa", () => {
    const fresh = planLandParcelDetailRows([row({ custodyNote: "Lahan sudah dijual" })], emptyExistingState());
    expect(fresh.documentCreates).toEqual([
      { parcelUid: "uid-1", type: "OTHER", number: null, typeRaw: "Lahan sudah dijual", holderName: null, statedArea: null, custodyNote: "Lahan sudah dijual" },
    ]);

    const existing = emptyExistingState();
    existing.documents.set(docKey("uid-1", "OTHER", null), { id: "d9", typeRaw: null, holderName: "Siti", statedArea: 1, custodyNote: null });
    const upd = planLandParcelDetailRows([row({ custodyNote: "Surat lahan di bank" })], existing);
    expect(upd.documentUpdates).toEqual([{ id: "d9", data: { typeRaw: "Surat lahan di bank", custodyNote: "Surat lahan di bank" } }]);
  });
});

describe("planLandParcelDetailRows — STDB per petani + tautan M:N", () => {
  it("STDB baru dipakai 3 lahan petani sama → 1 create STDB + 3 tautan menunggu id", () => {
    const stdb = { number: "1637/53/1401/6/2025", issuedYear: 2025, stage: "TERBIT" as const };
    const plan = planLandParcelDetailRows(
      [row({ parcelUid: "uid-1", stdb }), row({ parcelUid: "uid-2", stdb }), row({ parcelUid: "uid-3", stdb }), row({ parcelUid: "uid-1", stdb })],
      emptyExistingState(),
    );
    expect(plan.stdbCreates).toEqual([{ farmerId: "f1", ...stdb }]);
    expect(plan.linkCreatesPendingStdb.map((l) => l.parcelUid)).toEqual(["uid-1", "uid-2", "uid-3"]);
    expect(plan.summary).toMatchObject({ stdbsCreated: 1, stdbLinksCreated: 3 });
  });

  it("STDB sudah ada (nonaktif) → diaktifkan sekali; tautan ada-aktif → tidak ada apa-apa; tautan nonaktif → reaktivasi", () => {
    const existing: ParcelDetailExistingState = emptyExistingState();
    existing.stdbs.set(stdbKey("f1", "N-1"), { id: "s1", isActive: false });
    existing.links.set(linkKey("uid-1", "s1"), { id: "l1", isActive: true });
    existing.links.set(linkKey("uid-2", "s1"), { id: "l2", isActive: false });
    const stdb = { number: "N-1", issuedYear: null, stage: "TERBIT" as const };
    const plan = planLandParcelDetailRows([row({ parcelUid: "uid-1", stdb }), row({ parcelUid: "uid-2", stdb }), row({ parcelUid: "uid-3", stdb })], existing);
    expect(plan.stdbReactivateIds).toEqual(["s1"]);
    expect(plan.stdbCreates).toEqual([]);
    expect(plan.linkReactivateIds).toEqual(["l2"]);
    expect(plan.linkCreates).toEqual([{ parcelUid: "uid-3", stdbId: "s1" }]);
    expect(plan.summary).toMatchObject({ stdbsCreated: 0, stdbLinksCreated: 2 });
  });

  it("nomor sama pada petani berbeda = STDB berbeda (unik per petani)", () => {
    const stdb = { number: "N-1", issuedYear: null, stage: "TERBIT" as const };
    const plan = planLandParcelDetailRows([row({ farmerDbId: "f1", stdb }), row({ farmerDbId: "f2", parcelUid: "uid-9", stdb })], emptyExistingState());
    expect(plan.stdbCreates.map((s) => s.farmerId)).toEqual(["f1", "f2"]);
  });
});

describe("planLandParcelDetailRows — UL Parcel Code", () => {
  it("baru → create; milik lahan sama & aktif → unchanged; nonaktif → update (reaktivasi/pindah); aktif milik lahan lain → skip", () => {
    const existing = emptyExistingState();
    existing.externalIds.set("SAME", { parcelUid: "uid-1", isActive: true });
    existing.externalIds.set("INACTIVE", { parcelUid: "uid-old", isActive: false });
    existing.externalIds.set("TAKEN", { parcelUid: "uid-other", isActive: true });
    const plan = planLandParcelDetailRows(
      [row({ externalCode: "NEW" }), row({ externalCode: "SAME" }), row({ externalCode: "INACTIVE" }), row({ externalCode: "TAKEN" }), row({ externalCode: "NEW" })],
      existing,
    );
    expect(plan.externalIdCreates).toEqual([{ parcelUid: "uid-1", code: "NEW" }]);
    expect(plan.externalIdUpdates).toEqual([{ code: "INACTIVE", parcelUid: "uid-1" }]);
    expect(plan.summary).toMatchObject({ externalIdsCreated: 1, externalIdsUnchanged: 1, externalIdsUpdated: 1, externalIdsSkipped: 1 });
  });
});

describe("planLandParcelDetailRows — Kelompok Tani & ringkasan", () => {
  it("subGroupLv2 dikumpulkan per parcelUid (nama terakhir menang); hitungan terisi ditentukan updateMany di server", () => {
    const plan = planLandParcelDetailRows([row({ subGroupLv2: "KT A" }), row({ subGroupLv2: "KT B" }), row({ parcelUid: "uid-2", subGroupLv2: "KT A" })], emptyExistingState());
    expect([...plan.subGroupFills]).toEqual([["uid-1", "KT B"], ["uid-2", "KT A"]]);
    expect(plan.summary.subGroupsFilled).toBe(0);
  });

  it("mergeParcelDetailSummary menjumlahkan semua counter kecuali rows", () => {
    const total = emptyParcelDetailSummary(1000);
    const part = { ...emptyParcelDetailSummary(500), documentsCreated: 3, externalIdsSkipped: 2 };
    mergeParcelDetailSummary(total, part);
    mergeParcelDetailSummary(total, part);
    expect(total).toMatchObject({ rows: 1000, documentsCreated: 6, externalIdsSkipped: 4 });
  });

  it("baris tanpa detail apa pun tidak menghasilkan operasi", () => {
    const plan = planLandParcelDetailRows([row({})], emptyExistingState());
    expect(plan.documentCreates.length + plan.stdbCreates.length + plan.externalIdCreates.length + plan.subGroupFills.size).toBe(0);
  });
});

/**
 * Tahapan STDB pada jalur import (#306). Aturannya tidak bisa ditebak dari
 * kode: DB hanya mengizinkan SATU berkas terbuka per petani (partial unique
 * index `uniq_land_stdb_farmer_open`), dan sel "belum ada" pada petani yang
 * sudah punya STDB aktif SENGAJA dilewati — di berkas sumber 29 dari 103
 * petani ber-sel "n/a" ternyata juga punya nomor resmi di baris lain
 * (diukur 2026-08-29 dari MIS_{KAMPAR,ROHUL,PELALAWAN}_data-lahan.xlsx).
 */
describe("planLandParcelDetailRows — tahapan STDB pra-terbit (#306)", () => {
  const pending = { number: null, issuedYear: null, stage: "PERSIAPAN_DATA" as const };

  it("beberapa lahan petani sama ber-sel 'belum ada' → 1 berkas terbuka + tautan ke semuanya", () => {
    const plan = planLandParcelDetailRows(
      [row({ parcelUid: "uid-1", stdb: pending }), row({ parcelUid: "uid-2", stdb: pending }), row({ parcelUid: "uid-3", stdb: pending })],
      emptyExistingState(),
    );
    expect(plan.stdbCreates).toEqual([{ farmerId: "f1", number: null, issuedYear: null, stage: "PERSIAPAN_DATA" }]);
    expect(plan.linkCreatesPendingStdb.map((l) => l.parcelUid)).toEqual(["uid-1", "uid-2", "uid-3"]);
    expect(plan.summary).toMatchObject({ stdbsCreated: 1, stdbsPendingCreated: 1, stdbLinksCreated: 3 });
  });

  it("berkas terbuka sudah ada di DB → dipakai ulang, tidak dibuat baru", () => {
    const existing: ParcelDetailExistingState = emptyExistingState();
    existing.openStdbs.set(openStdbKey("f1"), { id: "s-open", isActive: true });
    existing.farmersWithActiveStdb.add("f1");
    const plan = planLandParcelDetailRows([row({ parcelUid: "uid-1", stdb: pending })], existing);
    expect(plan.stdbCreates).toEqual([]);
    expect(plan.linkCreates).toEqual([{ parcelUid: "uid-1", stdbId: "s-open" }]);
  });

  it("petani yang sudah punya STDB aktif di DB → sel 'belum ada' dilewati, dihitung sekali per petani", () => {
    const existing: ParcelDetailExistingState = emptyExistingState();
    existing.stdbs.set(stdbKey("f1", "N-1"), { id: "s1", isActive: true });
    existing.farmersWithActiveStdb.add("f1");
    const plan = planLandParcelDetailRows(
      [row({ parcelUid: "uid-1", stdb: pending }), row({ parcelUid: "uid-2", stdb: pending })],
      existing,
    );
    expect(plan.stdbCreates).toEqual([]);
    expect(plan.linkCreates).toEqual([]);
    expect(plan.summary).toMatchObject({ stdbsCreated: 0, stdbsPendingSkipped: 1 });
  });

  it("keputusan lewati TIDAK bergantung urutan baris: 'belum ada' di ATAS baris bernomor tetap dilewati", () => {
    const numbered = { number: "N-9", issuedYear: null, stage: "TERBIT" as const };
    const plan = planLandParcelDetailRows(
      [row({ parcelUid: "uid-1", stdb: pending }), row({ parcelUid: "uid-2", stdb: numbered })],
      emptyExistingState(),
    );
    expect(plan.stdbCreates).toEqual([{ farmerId: "f1", number: "N-9", issuedYear: null, stage: "TERBIT" }]);
    expect(plan.summary).toMatchObject({ stdbsPendingCreated: 0, stdbsPendingSkipped: 1 });
  });

  it("petani berbeda punya slot terbuka sendiri-sendiri", () => {
    const plan = planLandParcelDetailRows(
      [row({ farmerDbId: "f1", parcelUid: "uid-1", stdb: pending }), row({ farmerDbId: "f2", parcelUid: "uid-2", stdb: pending })],
      emptyExistingState(),
    );
    expect(plan.stdbCreates.map((s) => s.farmerId)).toEqual(["f1", "f2"]);
    expect(plan.summary.stdbsPendingCreated).toBe(2);
  });

  it("baris pra-terbit tidak mencemari peta STDB bernomor", () => {
    const existing: ParcelDetailExistingState = emptyExistingState();
    existing.stdbs.set(stdbKey("f1", "N-1"), { id: "s1", isActive: true });
    const plan = planLandParcelDetailRows(
      [row({ parcelUid: "uid-1", stdb: { number: "N-1", issuedYear: null, stage: "TERBIT" } })],
      existing,
    );
    // Slot terbuka tidak tersentuh; yang dipakai tetap STDB bernomor.
    expect(plan.stdbCreates).toEqual([]);
    expect(plan.linkCreates).toEqual([{ parcelUid: "uid-1", stdbId: "s1" }]);
  });
});

/**
 * Temuan review 2026-08-29 pada jalur import STDB.
 */
describe("planLandParcelDetailRows — batas chunk & pasangan aktif/nonaktif (#306)", () => {
  const pending = { number: null, issuedYear: null, stage: "PERSIAPAN_DATA" as const };
  const numbered = { number: "N-9", issuedYear: null, stage: "TERBIT" as const };

  it("set petani-bernomor se-BERKAS menang atas isi chunk", () => {
    // Chunk ini hanya berisi baris "n/a"; baris bernomor milik petani yang sama
    // ada di chunk lain. Tanpa set se-berkas, berkas PERSIAPAN_DATA tetap dibuat
    // dan funnel menggelembung justru karena batas chunk.
    const plan = planLandParcelDetailRows(
      [row({ parcelUid: "uid-1", stdb: pending })],
      emptyExistingState(),
      new Set(["f1"]),
    );
    expect(plan.stdbCreates).toEqual([]);
    expect(plan.summary).toMatchObject({ stdbsPendingCreated: 0, stdbsPendingSkipped: 1 });
  });

  it("tanpa set se-berkas, keputusannya jatuh ke isi chunk saja (perilaku cadangan)", () => {
    const plan = planLandParcelDetailRows(
      [row({ parcelUid: "uid-1", stdb: pending }), row({ parcelUid: "uid-2", stdb: numbered })],
      emptyExistingState(),
    );
    expect(plan.summary.stdbsPendingSkipped).toBe(1);
  });

  it("farmersWithNumberedStdbIn menghitung dari seluruh baris yang diberikan", () => {
    const rows = [
      row({ farmerDbId: "f1", stdb: pending }),
      row({ farmerDbId: "f2", stdb: numbered }),
      row({ farmerDbId: "f3", stdb: null }),
    ];
    expect([...farmersWithNumberedStdbIn(rows)]).toEqual(["f2"]);
  });
});

describe("fetchParcelDetailExistingState — pasangan STDB aktif/nonaktif", () => {
  it("baris AKTIF menang atas yang nonaktif pada kunci (farmerId, number) yang sama", () => {
    // Pasangan seperti ini sah di DB: partial unique index hanya menjaga baris
    // aktif. Memilih yang nonaktif membuat planner mendorongnya ke
    // stdbReactivateIds, dan UPDATE-nya menabrak uniq_land_stdb_farmer_number
    // sehingga satu chunk 500 baris gagal seluruhnya.
    const existing: ParcelDetailExistingState = emptyExistingState();
    existing.stdbs.set(stdbKey("f1", "N-1"), { id: "s-aktif", isActive: true });
    const plan = planLandParcelDetailRows(
      [row({ parcelUid: "uid-1", stdb: { number: "N-1", issuedYear: null, stage: "TERBIT" } })],
      existing,
    );
    expect(plan.stdbReactivateIds).toEqual([]);
    expect(plan.linkCreates).toEqual([{ parcelUid: "uid-1", stdbId: "s-aktif" }]);
  });
});
