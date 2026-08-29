import type { Prisma } from "@prisma/client";
import { DEFAULT_PARCEL_MAPPER, isOpenStdbStage, LAND_STDB_OPEN_STAGES } from "@/lib/land-parcel-satellite-format";
import type { LandParcelDetailRowInput } from "@/validations/land-parcel-detail.schema";

/**
 * Inti penyimpanan import detail lahan (#296) — dipakai server action
 * `bulkSaveLandParcelDetails` DAN skrip import lokal, agar hasil di DB selalu
 * berasal dari satu implementasi. Menerima klien transaksi Prisma; guard izin,
 * scope, dan Zod adalah tanggung jawab pemanggil.
 *
 * Semantik UPSERT (unggah ulang tidak menggandakan):
 * - dokumen: kunci (parcelUid, type, number) aktif → perbarui; selain itu buat;
 * - status penguasaan tanpa jenis → dokumen OTHER tanpa nomor;
 * - STDB: unik (farmerId, number) → buat bila belum ada; tautan (parcelUid, stdbId) unik;
 * - UL Parcel Code: unik (source, code) → kode nonaktif/milik lahan sama dipakai ulang;
 *   kode AKTIF milik lahan lain DILEWATI (tidak dipindah diam-diam). `source` =
 *   PEMETA berkas ini (Meridia/WRI/Swadaya, keputusan owner 2026-08-28), dikirim
 *   pemanggil; kode yang sama dari pemeta berbeda hidup berdampingan;
 * - Nama Kelompok Tani: isi LandParcel.subGroupLv2 baris aktif HANYA bila kosong.
 *
 * Bentuk (#300): 3 tahap per batch — PREFETCH (5 `findMany`), PLAN (murni,
 * `planLandParcelDetailRows`, teruji tanpa DB), EXECUTE (`createMany` untuk
 * baris baru, `update` hanya untuk yang datanya benar-benar berubah). Dulu
 * ±7 query serial per baris dalam satu transaksi (timeout 600 dtk).
 */
export interface ParcelDetailSaveSummary {
  rows: number;
  documentsCreated: number;
  documentsUpdated: number;
  /** Dokumen yang sudah ada dengan data identik — tidak ada query. */
  documentsUnchanged: number;
  stdbsCreated: number;
  /** Baris PERSIAPAN_DATA dari sel "belum ada"/"n/a" (#306) — bagian dari stdbsCreated. */
  stdbsPendingCreated: number;
  /**
   * Sel "belum ada" yang DILEWATI karena petaninya sudah punya STDB aktif —
   * di berkas sumber ada 29 petani seperti itu dari 103 (ukur 2026-08-29).
   */
  stdbsPendingSkipped: number;
  stdbLinksCreated: number;
  externalIdsCreated: number;
  externalIdsUpdated: number;
  /** Kode sudah menempel di lahan yang sama — tidak ada query. */
  externalIdsUnchanged: number;
  /** Kode aktif milik lahan lain — tidak dipindah (selaras `createLandParcelExternalId`). */
  externalIdsSkipped: number;
  /** LandParcel.subGroupLv2 yang terisi (hanya yang sebelumnya kosong). */
  subGroupsFilled: number;
}

export function emptyParcelDetailSummary(rows: number): ParcelDetailSaveSummary {
  return {
    rows,
    documentsCreated: 0,
    documentsUpdated: 0,
    documentsUnchanged: 0,
    stdbsCreated: 0,
    stdbsPendingCreated: 0,
    stdbsPendingSkipped: 0,
    stdbLinksCreated: 0,
    externalIdsCreated: 0,
    externalIdsUpdated: 0,
    externalIdsUnchanged: 0,
    externalIdsSkipped: 0,
    subGroupsFilled: 0,
  };
}

/** Gabungkan ringkasan per chunk ke ringkasan total (pemanggil yang memecah batch). */
export function mergeParcelDetailSummary(into: ParcelDetailSaveSummary, part: ParcelDetailSaveSummary): void {
  for (const k of Object.keys(part) as (keyof ParcelDetailSaveSummary)[]) {
    if (k !== "rows") into[k] += part[k];
  }
}

// ─── Keadaan DB yang relevan untuk satu batch (hasil PREFETCH) ───

const SEP = "\u0000";
export const docKey = (parcelUid: string, type: string, number: string | null) => `${parcelUid}${SEP}${type}${SEP}${number ?? ""}`;
export const stdbKey = (farmerId: string, number: string) => `${farmerId}${SEP}${number}`;
/**
 * Kunci "berkas STDB terbuka" milik seorang petani (#306). Sengaja beda bentuk
 * dari `stdbKey` (tanpa nomor) karena DB hanya mengizinkan SATU baris terbuka
 * per petani — partial unique index `uniq_land_stdb_farmer_open`.
 */
export const openStdbKey = (farmerId: string) => `${farmerId}${SEP}<terbuka>`;
export const linkKey = (parcelUid: string, stdbId: string) => `${parcelUid}${SEP}${stdbId}`;

export interface DocumentFields {
  typeRaw: string | null;
  holderName: string | null;
  statedArea: number | null;
  custodyNote: string | null;
}

export interface ParcelDetailExistingState {
  /** docKey → dokumen aktif (id + field yang bisa berubah). */
  documents: Map<string, { id: string } & DocumentFields>;
  /** stdbKey → STDB BERNOMOR (aktif atau tidak). Baris tanpa nomor tidak masuk peta ini. */
  stdbs: Map<string, { id: string; isActive: boolean }>;
  /** openStdbKey → berkas STDB terbuka milik petani (#306); paling banyak satu. */
  openStdbs: Map<string, { id: string; isActive: boolean }>;
  /** farmerId yang sudah punya STDB AKTIF apa pun — penentu apakah baris "belum ada" layak dibuat. */
  farmersWithActiveStdb: Set<string>;
  /** linkKey → tautan lahan↔STDB. */
  links: Map<string, { id: string; isActive: boolean }>;
  /** code (sumber parcel_code) → pemegang saat ini. */
  externalIds: Map<string, { parcelUid: string; isActive: boolean }>;
}

export function emptyExistingState(): ParcelDetailExistingState {
  return {
    documents: new Map(),
    stdbs: new Map(),
    openStdbs: new Map(),
    farmersWithActiveStdb: new Set(),
    links: new Map(),
    externalIds: new Map(),
  };
}

// ─── Rencana eksekusi (hasil PLAN, murni) ───

export interface ParcelDetailPlan {
  documentCreates: Array<{ parcelUid: string; type: string; number: string | null } & DocumentFields>;
  documentUpdates: Array<{ id: string; data: Partial<DocumentFields> }>;
  stdbCreates: Array<{ farmerId: string; number: string | null; issuedYear: number | null; stage: string }>;
  stdbReactivateIds: string[];
  /** Tautan ke STDB yang sudah punya id. */
  linkCreates: Array<{ parcelUid: string; stdbId: string }>;
  /** Tautan ke STDB yang baru dibuat di batch ini — id diketahui setelah createMany. */
  linkCreatesPendingStdb: Array<{ parcelUid: string; stdbKey: string }>;
  linkReactivateIds: string[];
  externalIdCreates: Array<{ parcelUid: string; code: string }>;
  /** Kode yang sudah ada tapi harus diarahkan/diaktifkan ke lahan ini. */
  externalIdUpdates: Array<{ code: string; parcelUid: string }>;
  /** parcelUid → nama KT (isi bila kosong; dihitung server lewat updateMany). */
  subGroupFills: Map<string, string>;
  summary: ParcelDetailSaveSummary;
}

const sameDoc = (a: DocumentFields, b: Partial<DocumentFields>) =>
  (Object.keys(b) as (keyof DocumentFields)[]).every((k) => a[k] === b[k]);

/**
 * Susun rencana dari baris + keadaan DB. Murni: tidak menyentuh Prisma.
 * Baris ganda dalam batch (kunci sama) digabung — yang terakhir menang untuk
 * field, tapi dihitung sekali.
 */
export function planLandParcelDetailRows(rows: LandParcelDetailRowInput[], existing: ParcelDetailExistingState): ParcelDetailPlan {
  const summary = emptyParcelDetailSummary(rows.length);
  const plan: ParcelDetailPlan = {
    documentCreates: [],
    documentUpdates: [],
    stdbCreates: [],
    stdbReactivateIds: [],
    linkCreates: [],
    linkCreatesPendingStdb: [],
    linkReactivateIds: [],
    externalIdCreates: [],
    externalIdUpdates: [],
    subGroupFills: new Map(),
    summary,
  };
  // Indeks per batch agar baris ganda tidak menggandakan create.
  const pendingDocCreate = new Map<string, ParcelDetailPlan["documentCreates"][number]>();
  const pendingDocUpdate = new Map<string, ParcelDetailPlan["documentUpdates"][number]>();
  const pendingStdb = new Set<string>();
  const reactivatedStdb = new Set<string>();
  const skippedPendingFarmers = new Set<string>();
  // Dihitung DULU (bukan sambil jalan) supaya keputusan "lewati baris
  // pra-terbit" tidak bergantung urutan baris di berkas: satu petani bisa
  // punya baris "n/a" di atas baris bernomornya.
  const farmersWithNumberedStdbInBatch = new Set(rows.filter((r) => r.stdb?.number).map((r) => r.farmerDbId));
  const pendingLinks = new Set<string>();
  const reactivatedLinks = new Set<string>();
  const pendingCodes = new Map<string, "create" | "update" | "skip" | "unchanged">();

  for (const r of rows) {
    // --- Dokumen kepemilikan (atau status penguasaan tanpa jenis → OTHER tanpa nomor) ---
    // `patch` = field yang boleh menimpa dokumen yang sudah ada: baris status
    // penguasaan saja tidak boleh mengosongkan holderName/statedArea dokumen OTHER.
    const doc = r.document
      ? (() => {
          const fields = { typeRaw: r.document.typeRaw, holderName: r.document.holderName, statedArea: r.document.statedArea, custodyNote: r.custodyNote };
          return { type: r.document.type, number: r.document.number, fields, patch: fields as Partial<DocumentFields> };
        })()
      : r.custodyNote
        ? { type: "OTHER", number: null, fields: { typeRaw: r.custodyNote, holderName: null, statedArea: null, custodyNote: r.custodyNote }, patch: { typeRaw: r.custodyNote, custodyNote: r.custodyNote } as Partial<DocumentFields> }
        : null;
    if (doc) {
      const key = docKey(r.parcelUid, doc.type, doc.number);
      const inDb = existing.documents.get(key);
      const pendingCreate = pendingDocCreate.get(key);
      if (pendingCreate) {
        Object.assign(pendingCreate, doc.patch); // baris ganda: field terakhir menang
      } else if (inDb) {
        if (sameDoc(inDb, doc.patch) && !pendingDocUpdate.has(key)) {
          summary.documentsUnchanged++;
        } else {
          const prev = pendingDocUpdate.get(key);
          if (prev) Object.assign(prev.data, doc.patch);
          else {
            const upd = { id: inDb.id, data: { ...doc.patch } };
            pendingDocUpdate.set(key, upd);
            plan.documentUpdates.push(upd);
            summary.documentsUpdated++;
          }
        }
      } else {
        const create = { parcelUid: r.parcelUid, type: doc.type, number: doc.number, ...doc.fields };
        pendingDocCreate.set(key, create);
        plan.documentCreates.push(create);
        summary.documentsCreated++;
      }
    }

    // --- STDB (per petani) + tautan ke lahan ---
    if (r.stdb) {
      // Baris pra-terbit (sel "belum ada"/"n/a", #306) memakai slot "berkas
      // terbuka" milik petani, bukan kunci nomor — DB hanya mengizinkan satu.
      const pending = r.stdb.number == null;
      const sk = pending ? openStdbKey(r.farmerDbId) : stdbKey(r.farmerDbId, r.stdb.number!);
      const inDb = pending ? existing.openStdbs.get(sk) : existing.stdbs.get(sk);
      // Petani yang SUDAH punya STDB aktif tidak diberi baris "sedang diurus":
      // di berkas sumber, 29 dari 103 petani ber-sel "n/a" ternyata juga punya
      // nomor resmi di baris lain (ukur 2026-08-29). Membuat berkas pengajuan
      // untuk mereka akan menggelembungkan funnel dengan data yang tak pernah
      // dinyatakan siapa pun.
      const skipPending =
        pending &&
        !inDb &&
        (existing.farmersWithActiveStdb.has(r.farmerDbId) || farmersWithNumberedStdbInBatch.has(r.farmerDbId));
      if (skipPending) {
        if (!skippedPendingFarmers.has(r.farmerDbId)) {
          skippedPendingFarmers.add(r.farmerDbId);
          summary.stdbsPendingSkipped++;
        }
      } else if (inDb) {
        if (!inDb.isActive && !reactivatedStdb.has(sk)) {
          reactivatedStdb.add(sk);
          plan.stdbReactivateIds.push(inDb.id);
        }
        const lk = linkKey(r.parcelUid, inDb.id);
        const link = existing.links.get(lk);
        if (!link) {
          if (!pendingLinks.has(lk)) {
            pendingLinks.add(lk);
            plan.linkCreates.push({ parcelUid: r.parcelUid, stdbId: inDb.id });
            summary.stdbLinksCreated++;
          }
        } else if (!link.isActive && !reactivatedLinks.has(lk)) {
          reactivatedLinks.add(lk);
          plan.linkReactivateIds.push(link.id);
          summary.stdbLinksCreated++;
        }
      } else {
        if (!pendingStdb.has(sk)) {
          pendingStdb.add(sk);
          plan.stdbCreates.push({ farmerId: r.farmerDbId, number: r.stdb.number, issuedYear: r.stdb.issuedYear, stage: r.stdb.stage });
          summary.stdbsCreated++;
          if (pending) summary.stdbsPendingCreated++;
        }
        const lk = `${r.parcelUid}${SEP}${sk}`;
        if (!pendingLinks.has(lk)) {
          pendingLinks.add(lk);
          plan.linkCreatesPendingStdb.push({ parcelUid: r.parcelUid, stdbKey: sk });
          summary.stdbLinksCreated++;
        }
      }
    }

    // --- UL Parcel Code ---
    if (r.externalCode) {
      const code = r.externalCode;
      if (!pendingCodes.has(code)) {
        const holder = existing.externalIds.get(code);
        if (holder && holder.isActive && holder.parcelUid !== r.parcelUid) {
          // Kode masih aktif di lahan lain (mungkin di luar scope pengunggah): jangan dipindah diam-diam.
          pendingCodes.set(code, "skip");
          summary.externalIdsSkipped++;
        } else if (holder && holder.isActive) {
          pendingCodes.set(code, "unchanged");
          summary.externalIdsUnchanged++;
        } else if (holder) {
          pendingCodes.set(code, "update");
          plan.externalIdUpdates.push({ code, parcelUid: r.parcelUid });
          summary.externalIdsUpdated++;
        } else {
          pendingCodes.set(code, "create");
          plan.externalIdCreates.push({ parcelUid: r.parcelUid, code });
          summary.externalIdsCreated++;
        }
      }
    }

    // --- Kelompok Tani: isi bila kosong (dieksekusi lewat satu updateMany) ---
    if (r.subGroupLv2) plan.subGroupFills.set(r.parcelUid, r.subGroupLv2);
  }

  return plan;
}

// ─── PREFETCH ───

export async function fetchParcelDetailExistingState(
  tx: Prisma.TransactionClient,
  rows: LandParcelDetailRowInput[],
  source: string = DEFAULT_PARCEL_MAPPER,
): Promise<ParcelDetailExistingState> {
  const state = emptyExistingState();
  const uids = [...new Set(rows.map((r) => r.parcelUid))];
  const farmerIds = [...new Set(rows.filter((r) => r.stdb).map((r) => r.farmerDbId))];
  const stdbNumbers = [...new Set(rows.flatMap((r) => (r.stdb?.number ? [r.stdb.number] : [])))];
  const codes = [...new Set(rows.flatMap((r) => (r.externalCode ? [r.externalCode] : [])))];

  const [documents, stdbs, externalIds] = await Promise.all([
    tx.landParcelDocument.findMany({
      where: { parcelUid: { in: uids }, isActive: true },
      select: { id: true, parcelUid: true, type: true, number: true, typeRaw: true, holderName: true, statedArea: true, custodyNote: true },
    }),
    // Ambil SEMUA STDB petani yang tersentuh batch ini, bukan hanya yang
    // nomornya muncul di berkas (#306): baris pra-terbit perlu tahu apakah
    // petaninya sudah punya berkas terbuka, dan apakah ia sudah punya STDB
    // aktif sama sekali.
    farmerIds.length
      ? tx.landStdb.findMany({
          where: { farmerId: { in: farmerIds }, OR: [{ number: { in: stdbNumbers } }, { isActive: true }] },
          select: { id: true, farmerId: true, number: true, stage: true, isActive: true },
        })
      : Promise.resolve([]),
    codes.length
      ? tx.landParcelExternalId.findMany({
          where: { source, code: { in: codes } },
          select: { code: true, parcelUid: true, isActive: true },
        })
      : Promise.resolve([]),
  ]);
  for (const d of documents) state.documents.set(docKey(d.parcelUid, d.type, d.number), { id: d.id, typeRaw: d.typeRaw, holderName: d.holderName, statedArea: d.statedArea, custodyNote: d.custodyNote });
  for (const s of stdbs) {
    if (s.number) state.stdbs.set(stdbKey(s.farmerId, s.number), { id: s.id, isActive: s.isActive });
    // Baris tanpa nomor tidak boleh ikut peta bernomor (#306) — kuncinya beda.
    if (s.isActive && isOpenStdbStage(s.stage)) state.openStdbs.set(openStdbKey(s.farmerId), { id: s.id, isActive: true });
    if (s.isActive) state.farmersWithActiveStdb.add(s.farmerId);
  }
  for (const e of externalIds) state.externalIds.set(e.code, { parcelUid: e.parcelUid, isActive: e.isActive });

  if (stdbs.length) {
    const links = await tx.landParcelStdb.findMany({
      where: { parcelUid: { in: uids }, stdbId: { in: stdbs.map((s) => s.id) } },
      select: { id: true, parcelUid: true, stdbId: true, isActive: true },
    });
    for (const l of links) state.links.set(linkKey(l.parcelUid, l.stdbId), { id: l.id, isActive: l.isActive });
  }
  return state;
}

// ─── EXECUTE ───

async function executeParcelDetailPlan(tx: Prisma.TransactionClient, plan: ParcelDetailPlan, userId: string | null, source: string): Promise<void> {
  const { summary } = plan;

  if (plan.documentCreates.length) {
    await tx.landParcelDocument.createMany({
      data: plan.documentCreates.map((d) => ({ ...d, type: d.type as Prisma.LandParcelDocumentCreateManyInput["type"], createdBy: userId })),
    });
  }
  for (const u of plan.documentUpdates) {
    await tx.landParcelDocument.update({ where: { id: u.id }, data: { ...u.data, modifiedBy: userId } });
  }

  if (plan.stdbReactivateIds.length) {
    await tx.landStdb.updateMany({ where: { id: { in: plan.stdbReactivateIds } }, data: { isActive: true, modifiedBy: userId } });
  }
  const linkCreates = [...plan.linkCreates];
  if (plan.stdbCreates.length) {
    await tx.landStdb.createMany({
      data: plan.stdbCreates.map((s) => ({
        ...s,
        stage: s.stage as Prisma.LandStdbCreateManyInput["stage"],
        stageChangedAt: new Date(),
        createdBy: userId,
      })),
    });
    // Ambil id STDB yang baru dibuat untuk tautan yang menunggu. Baris
    // pra-terbit tak punya nomor untuk dicocokkan, jadi ia dicari lewat slot
    // "berkas terbuka" petani — yang memang hanya boleh satu (#306).
    const created = await tx.landStdb.findMany({
      where: {
        farmerId: { in: [...new Set(plan.stdbCreates.map((s) => s.farmerId))] },
        OR: [
          { number: { in: plan.stdbCreates.flatMap((s) => (s.number ? [s.number] : [])) } },
          { number: null, isActive: true, stage: { in: [...LAND_STDB_OPEN_STAGES] } },
        ],
      },
      select: { id: true, farmerId: true, number: true },
    });
    const idByKey = new Map(
      created.map((s) => [s.number ? stdbKey(s.farmerId, s.number) : openStdbKey(s.farmerId), s.id]),
    );
    for (const l of plan.linkCreatesPendingStdb) {
      const stdbId = idByKey.get(l.stdbKey);
      if (!stdbId) throw new Error(`STDB yang baru dibuat tidak ditemukan kembali (${l.stdbKey.replace(SEP, " / ")})`);
      linkCreates.push({ parcelUid: l.parcelUid, stdbId });
    }
  }
  if (linkCreates.length) {
    await tx.landParcelStdb.createMany({ data: linkCreates.map((l) => ({ ...l, createdBy: userId })) });
  }
  if (plan.linkReactivateIds.length) {
    // #299: tautan STDB↔lahan kini mencatat siapa mengaktifkannya kembali.
    await tx.landParcelStdb.updateMany({ where: { id: { in: plan.linkReactivateIds } }, data: { isActive: true, modifiedBy: userId } });
  }

  if (plan.externalIdCreates.length) {
    await tx.landParcelExternalId.createMany({
      data: plan.externalIdCreates.map((e) => ({ ...e, source, createdBy: userId })),
    });
  }
  for (const u of plan.externalIdUpdates) {
    await tx.landParcelExternalId.update({
      where: { source_code: { source, code: u.code } },
      data: { parcelUid: u.parcelUid, isActive: true, modifiedBy: userId },
    });
  }

  // Kelompok Tani: satu updateMany per nama KT (nama berbeda → data berbeda).
  const uidsByName = new Map<string, string[]>();
  for (const [uid, name] of plan.subGroupFills) uidsByName.set(name, [...(uidsByName.get(name) ?? []), uid]);
  for (const [name, uids] of uidsByName) {
    const res = await tx.landParcel.updateMany({
      where: { parcelUid: { in: uids }, isActive: true, OR: [{ subGroupLv2: null }, { subGroupLv2: "" }] },
      data: { subGroupLv2: name, modifiedBy: userId },
    });
    summary.subGroupsFilled += res.count;
  }
}

/**
 * Terapkan satu batch baris (prefetch → plan → execute) di dalam transaksi
 * pemanggil; ringkasan hasil digabungkan ke `summary`.
 */
export async function applyLandParcelDetailRows(
  tx: Prisma.TransactionClient,
  rows: LandParcelDetailRowInput[],
  userId: string | null,
  summary: ParcelDetailSaveSummary,
  source: string = DEFAULT_PARCEL_MAPPER,
): Promise<void> {
  if (rows.length === 0) return;
  const existing = await fetchParcelDetailExistingState(tx, rows, source);
  const plan = planLandParcelDetailRows(rows, existing);
  await executeParcelDetailPlan(tx, plan, userId, source);
  mergeParcelDetailSummary(summary, plan.summary);
}
