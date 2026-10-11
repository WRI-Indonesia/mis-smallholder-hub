"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext } from "@/lib/access-context";
import { farmerGroupAccessFilter } from "@/lib/access-scope";
import { groupScopeSql } from "@/lib/access-scope-sql";
import { currentPeriod } from "@/lib/data-completeness";
import type {
  ProductionAvailabilityFarmerRow,
  ProductionAvailabilityGroupParcelRow,
  ProductionAvailabilityGroupRow,
  ProductionAvailabilityParcelsResult,
  ProductionAvailabilityView,
  ProductionCellStats,
  ProductionParcelCell,
} from "@/types/production-availability";

const MENU_KEY = "data-analyst-availability-production";

/** Baris agregat SQL satu (pemilik, periode). COUNT dicast `::int` — tanpa cast Postgres mengirim bigint. */
interface CellRow {
  owner_id: string;
  period: string;
  parcels_reporting: number;
  records: number;
  linked_records: number;
  kg: number;
  zero_records: number;
  estimate_records: number;
  no_parcel_records: number;
}

const toCell = (r: CellRow): ProductionCellStats => ({
  period: r.period,
  parcelsReporting: r.parcels_reporting,
  records: r.records,
  linkedRecords: r.linked_records,
  kg: r.kg,
  zeroRecords: r.zero_records,
  estimateRecords: r.estimate_records,
  noParcelRecords: r.no_parcel_records,
});

/**
 * POPULASI RECORD satu definisi untuk semua tingkat & Sheet 2 (review #416):
 * record aktif **atas nama petani** (`pr.farmer_id`) — Lembaga = petani-petaninya,
 * petani = record-nya sendiri, lahan = record petani itu per `parcel_id`. Record
 * yang menunjuk lahan petani lain tetap dihitung pada petani yang mencatatnya
 * (tampil sebagai baris lahan "lain"), sehingga induk dan anak selalu berjumlah
 * sama dan tautan ke Master Data Produksi (filter petani) selalu berisi.
 *
 * Agregat per (pemilik, periode) yang sama untuk tingkat Lembaga dan petani.
 * `parcels_reporting` = lahan AKTIF non-PSR berbeda yang ditunjuk record
 * (LEFT JOIN: record ke lahan nonaktif/hilang tidak dihitung lahan melapor,
 * tetapi tetap masuk `records`/`kg`). Label Estimasi = `notes` memuat "estimasi"
 * (definisi `loadEstimateRecordIds`, DA-02).
 */
const CELL_AGGREGATES = Prisma.sql`
  COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_psr = false)::int AS parcels_reporting,
  COUNT(*)::int AS records,
  COUNT(pr.parcel_id)::int AS linked_records,
  COALESCE(SUM(pr.yield_kg), 0)::float8 AS kg,
  COUNT(*) FILTER (WHERE pr.yield_kg = 0)::int AS zero_records,
  COUNT(*) FILTER (WHERE pr.notes ILIKE '%estimasi%')::int AS estimate_records,
  COUNT(*) FILTER (WHERE pr.parcel_id IS NULL)::int AS no_parcel_records`;

/** Rentang periode satu tahun sebagai klausa — memakai indeks `period`. */
const yearRange = (year: number) => Prisma.sql`pr.period >= ${`${year}-01`} AND pr.period <= ${`${year}-12`}`;

/**
 * Kalender cakupan produksi semua Lembaga dalam scope (K2, K3, K7): satu baris
 * per Lembaga dengan sel SEMUA periode (rentang penuh — tahun dipilih di client,
 * ringkasan kolom kanan butuh rentang penuh) + penyebut lahan non-PSR.
 * Dua kueri agregat + satu daftar Lembaga; ukuran hasil ≈ Lembaga × periode
 * (puluhan × puluhan), tidak ikut tumbuh dengan jumlah record.
 */
export async function getProductionAvailabilityView(): Promise<ProductionAvailabilityView> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses ketersediaan data produksi");
  }
  const access = await getAccessContext();
  const groupWhere = { isActive: true, ...farmerGroupAccessFilter(access) };
  // Scope SQL mentah dari helper bersama (review #416: satu definisi untuk semua kueri mentah).
  const rawScope = Prisma.sql`g.is_active AND ${groupScopeSql("g", access)}`;

  const [groups, denominators, cells] = await Promise.all([
    prisma.farmerGroup.findMany({
      where: groupWhere,
      select: {
        id: true,
        name: true,
        code: true,
        abrv: true,
        category: true,
        districtId: true,
        district: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.$queryRaw<{ group_id: string; total_farmers: number; total_parcels: number; non_psr_parcels: number }[]>(Prisma.sql`
      SELECT g.id AS group_id,
        COUNT(DISTINCT f.id)::int AS total_farmers,
        COUNT(lp.id)::int AS total_parcels,
        COUNT(lp.id) FILTER (WHERE lp.is_psr = false)::int AS non_psr_parcels
      FROM tbl_farmer_group g
      JOIN tbl_farmer f ON f.farmer_group_id = g.id AND f.is_active
      LEFT JOIN tbl_land_parcel lp ON lp.farmer_id = f.id AND lp.is_active
      WHERE ${rawScope}
      GROUP BY g.id`),
    prisma.$queryRaw<CellRow[]>(Prisma.sql`
      SELECT g.id AS owner_id, pr.period, ${CELL_AGGREGATES}
      FROM tbl_production_record pr
      JOIN tbl_farmer f ON f.id = pr.farmer_id AND f.is_active
      JOIN tbl_farmer_group g ON g.id = f.farmer_group_id
      LEFT JOIN tbl_land_parcel lp ON lp.id = pr.parcel_id AND lp.is_active
      WHERE pr.is_active AND ${rawScope}
      GROUP BY g.id, pr.period`),
  ]);

  const denomById = new Map(denominators.map((d) => [d.group_id, d]));
  const cellsById = new Map<string, ProductionCellStats[]>();
  for (const r of cells) {
    const list = cellsById.get(r.owner_id) ?? [];
    list.push(toCell(r));
    cellsById.set(r.owner_id, list);
  }

  const rows: ProductionAvailabilityGroupRow[] = groups.map((g) => {
    const d = denomById.get(g.id);
    return {
      id: g.id,
      name: g.name,
      code: g.code,
      abrv: g.abrv,
      category: g.category,
      districtId: g.districtId,
      districtName: g.district.name,
      totalFarmers: d?.total_farmers ?? 0,
      totalParcels: d?.total_parcels ?? 0,
      nonPsrParcels: d?.non_psr_parcels ?? 0,
      cells: (cellsById.get(g.id) ?? []).sort((a, b) => a.period.localeCompare(b.period)),
    };
  });

  return { generatedAt: new Date().toISOString(), referencePeriod: currentPeriod(), groups: rows };
}

/**
 * Baris petani satu Lembaga untuk satu tahun (anak Lembaga, dimuat saat dibuka —
 * K2). Semua petani aktif ikut, termasuk yang tanpa record (bolongnya justru
 * yang dicari). Lembaga di luar scope → daftar kosong, bukan error.
 */
export async function getProductionAvailabilityFarmers(groupId: string, year: number): Promise<ProductionAvailabilityFarmerRow[]> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses ketersediaan data produksi");
  }
  if (!Number.isInteger(year)) return [];
  const access = await getAccessContext();
  const group = await prisma.farmerGroup.findFirst({
    // AND, bukan spread: di mode BY_FARMER_GROUP filter scope = `{ id: { in } }` dan spread
    // menimpa `id: groupId` → Lembaga mana pun "lolos" lalu data Lembaga di luar scope ikut
    // termuat (review pra-rilis v1.7.0, dijaga production-availability-guard.test.ts).
    where: { AND: [{ id: groupId, isActive: true }, farmerGroupAccessFilter(access)] },
    select: { id: true },
  });
  if (!group) return [];

  const [farmers, cells] = await Promise.all([
    prisma.farmer.findMany({
      where: { farmerGroupId: groupId, isActive: true },
      select: {
        id: true,
        name: true,
        farmerId: true,
        landParcels: { where: { isActive: true }, select: { isPsr: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.$queryRaw<CellRow[]>(Prisma.sql`
      SELECT f.id AS owner_id, pr.period, ${CELL_AGGREGATES}
      FROM tbl_production_record pr
      JOIN tbl_farmer f ON f.id = pr.farmer_id AND f.is_active
      LEFT JOIN tbl_land_parcel lp ON lp.id = pr.parcel_id AND lp.is_active
      WHERE pr.is_active AND f.farmer_group_id = ${groupId} AND ${yearRange(year)}
      GROUP BY f.id, pr.period`),
  ]);

  const cellsById = new Map<string, ProductionCellStats[]>();
  for (const r of cells) {
    const list = cellsById.get(r.owner_id) ?? [];
    list.push(toCell(r));
    cellsById.set(r.owner_id, list);
  }
  return farmers.map((f) => ({
    id: f.id,
    name: f.name,
    farmerCode: f.farmerId,
    totalParcels: f.landParcels.length,
    nonPsrParcels: f.landParcels.filter((p) => !p.isPsr).length,
    cells: (cellsById.get(f.id) ?? []).sort((a, b) => a.period.localeCompare(b.period)),
  }));
}

/**
 * Semua lahan aktif satu Lembaga × bulan satu tahun — hanya untuk Sheet 2 ekspor
 * Excel (K6), bukan untuk layar (layar memuat per petani saat dibuka). Populasi
 * sama dengan Sheet 1: record atas nama petani Lembaga ini; record yang menunjuk
 * lahan di luar daftar aktif (petani lain / revisi lama) jadi baris tambahan
 * bertanda. Record tanpa persil tidak ikut (ada di Sheet 1 per Lembaga).
 */
export async function getProductionAvailabilityGroupParcels(groupId: string, year: number): Promise<ProductionAvailabilityGroupParcelRow[]> {
  // Hanya untuk ekspor → wajib EXPORT di server, bukan sekadar tombol tersembunyi
  // (review pra-rilis v1.7.0: VIEW saja bisa menarik seluruh lahan × bulan lewat aksi ini).
  if (!(await hasPermission(MENU_KEY, "EXPORT"))) {
    throw new Error("Tidak memiliki izin untuk mengekspor ketersediaan data produksi");
  }
  if (!Number.isInteger(year)) return [];
  const access = await getAccessContext();
  const group = await prisma.farmerGroup.findFirst({
    // AND, bukan spread: di mode BY_FARMER_GROUP filter scope = `{ id: { in } }` dan spread
    // menimpa `id: groupId` → Lembaga mana pun "lolos" lalu data Lembaga di luar scope ikut
    // termuat (review pra-rilis v1.7.0, dijaga production-availability-guard.test.ts).
    where: { AND: [{ id: groupId, isActive: true }, farmerGroupAccessFilter(access)] },
    select: { id: true },
  });
  if (!group) return [];

  const [parcels, cells] = await Promise.all([
    prisma.landParcel.findMany({
      where: { isActive: true, farmer: { isActive: true, farmerGroupId: groupId } },
      select: { id: true, parcelId: true, isPsr: true, area: true, farmerId: true, farmer: { select: { name: true, farmerId: true } } },
      orderBy: [{ farmer: { name: "asc" } }, { parcelId: "asc" }],
    }),
    prisma.$queryRaw<{ parcel_id: string; farmer_id: string; period: string; records: number; kg: number; zero_records: number; estimate_records: number }[]>(Prisma.sql`
      SELECT pr.parcel_id, pr.farmer_id, pr.period,
        COUNT(*)::int AS records,
        COALESCE(SUM(pr.yield_kg), 0)::float8 AS kg,
        COUNT(*) FILTER (WHERE pr.yield_kg = 0)::int AS zero_records,
        COUNT(*) FILTER (WHERE pr.notes ILIKE '%estimasi%')::int AS estimate_records
      FROM tbl_production_record pr
      JOIN tbl_farmer f ON f.id = pr.farmer_id AND f.is_active
      WHERE pr.is_active AND pr.parcel_id IS NOT NULL AND f.farmer_group_id = ${groupId} AND ${yearRange(year)}
      GROUP BY pr.parcel_id, pr.farmer_id, pr.period`),
  ]);
  // Kunci baris = (lahan, petani pencatat): lahan yang dicatat dua petani jadi dua baris.
  const rowKey = (parcelId: string, farmerId: string) => `${parcelId}|${farmerId}`;
  const byRow = new Map<string, ProductionParcelCell[]>();
  for (const r of cells) {
    const k = rowKey(r.parcel_id, r.farmer_id);
    const list = byRow.get(k) ?? [];
    list.push({ period: r.period, records: r.records, kg: r.kg, zeroRecords: r.zero_records, estimateRecords: r.estimate_records });
    byRow.set(k, list);
  }
  const sortCells = (list: ProductionParcelCell[] | undefined) => (list ?? []).sort((a, b) => a.period.localeCompare(b.period));
  const ownRows: ProductionAvailabilityGroupParcelRow[] = parcels.map((p) => ({
    id: p.id,
    parcelCode: p.parcelId,
    isPsr: p.isPsr,
    area: p.area,
    isOwn: true,
    farmerName: p.farmer.name,
    farmerCode: p.farmer.farmerId,
    cells: sortCells(byRow.get(rowKey(p.id, p.farmerId))),
  }));
  // Baris tambahan: (lahan, petani) dari record yang tidak cocok dengan daftar lahan aktif-pemiliknya.
  const ownKeys = new Set(parcels.map((p) => rowKey(p.id, p.farmerId)));
  const extraKeys = [...byRow.keys()].filter((k) => !ownKeys.has(k));
  if (extraKeys.length === 0) return ownRows;
  const extraParcelIds = [...new Set(extraKeys.map((k) => k.split("|")[0]))];
  const extraFarmerIds = [...new Set(extraKeys.map((k) => k.split("|")[1]))];
  const [extraParcels, extraFarmers] = await Promise.all([
    prisma.landParcel.findMany({ where: { id: { in: extraParcelIds } }, select: { id: true, parcelId: true, isPsr: true, area: true, isActive: true } }),
    prisma.farmer.findMany({ where: { id: { in: extraFarmerIds } }, select: { id: true, name: true, farmerId: true } }),
  ]);
  const parcelById = new Map(extraParcels.map((p) => [p.id, p]));
  const farmerById = new Map(extraFarmers.map((f) => [f.id, f]));
  const extraRows: ProductionAvailabilityGroupParcelRow[] = extraKeys.map((k) => {
    const [parcelId, farmerId] = k.split("|");
    const p = parcelById.get(parcelId);
    const f = farmerById.get(farmerId);
    return {
      id: parcelId,
      parcelCode: p ? (p.isActive ? p.parcelId : `${p.parcelId} (nonaktif)`) : "(lahan tidak ditemukan)",
      isPsr: p?.isPsr ?? false,
      area: p?.area ?? null,
      isOwn: false,
      farmerName: f?.name ?? "",
      farmerCode: f?.farmerId ?? "",
      cells: sortCells(byRow.get(k)),
    };
  });
  return [...ownRows, ...extraRows];
}

/**
 * Baris lahan satu petani untuk satu tahun (anak petani). Populasi = record atas
 * nama petani ini (sama dengan baris petaninya); lahan yang ditunjuk tetapi bukan
 * lahan aktifnya ikut sebagai baris "lain". Record tanpa ID Lahan dikembalikan
 * terpisah (`noParcel`) untuk baris semu "Tanpa persil" (K5-c).
 */
export async function getProductionAvailabilityParcels(farmerId: string, year: number): Promise<ProductionAvailabilityParcelsResult> {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses ketersediaan data produksi");
  }
  const empty: ProductionAvailabilityParcelsResult = { parcels: [], noParcel: [] };
  if (!Number.isInteger(year)) return empty;
  const access = await getAccessContext();
  const farmer = await prisma.farmer.findFirst({
    where: { id: farmerId, isActive: true, farmerGroup: { isActive: true, ...farmerGroupAccessFilter(access) } },
    select: {
      id: true,
      landParcels: {
        where: { isActive: true },
        select: { id: true, parcelId: true, isPsr: true, area: true },
        orderBy: { parcelId: "asc" },
      },
    },
  });
  if (!farmer) return empty;

  const records = await prisma.productionRecord.findMany({
    where: {
      isActive: true,
      period: { gte: `${year}-01`, lte: `${year}-12` },
      farmerId,
    },
    select: {
      parcelId: true,
      period: true,
      yieldKg: true,
      notes: true,
      parcel: { select: { id: true, parcelId: true, isPsr: true, area: true, isActive: true } },
    },
  });

  type Acc = Map<string, ProductionParcelCell>;
  const byParcel = new Map<string, Acc>();
  const noParcel: Acc = new Map();
  const bump = (acc: Acc, r: { period: string; yieldKg: number; notes: string | null }) => {
    const c = acc.get(r.period) ?? { period: r.period, records: 0, kg: 0, zeroRecords: 0, estimateRecords: 0 };
    c.records += 1;
    c.kg += r.yieldKg;
    if (r.yieldKg === 0) c.zeroRecords += 1;
    if (r.notes && /estimasi/i.test(r.notes)) c.estimateRecords += 1;
    acc.set(r.period, c);
  };
  // Lahan "lain": ditunjuk record petani ini tetapi bukan lahan aktifnya (milik
  // petani lain, atau revisi lama) — tetap ditampilkan agar record-nya tidak hilang.
  const extraParcels = new Map<string, { id: string; parcelCode: string; isPsr: boolean; area: number | null; isOwn: boolean }>();
  for (const r of records) {
    if (!r.parcelId) {
      bump(noParcel, r);
      continue;
    }
    const acc = byParcel.get(r.parcelId) ?? new Map();
    bump(acc, r);
    byParcel.set(r.parcelId, acc);
    if (r.parcel && !farmer.landParcels.some((p) => p.id === r.parcelId) && !extraParcels.has(r.parcelId)) {
      extraParcels.set(r.parcelId, {
        id: r.parcel.id,
        parcelCode: r.parcel.isActive ? r.parcel.parcelId : `${r.parcel.parcelId} (nonaktif)`,
        isPsr: r.parcel.isPsr,
        area: r.parcel.area,
        isOwn: false,
      });
    }
  }
  const sortCells = (acc: Acc) => [...acc.values()].sort((a, b) => a.period.localeCompare(b.period));
  return {
    parcels: [
      ...farmer.landParcels.map((p) => ({ id: p.id, parcelCode: p.parcelId, isPsr: p.isPsr, area: p.area, isOwn: true, cells: sortCells(byParcel.get(p.id) ?? new Map()) })),
      ...[...extraParcels.values()].map((p) => ({ ...p, cells: sortCells(byParcel.get(p.id) ?? new Map()) })),
    ],
    noParcel: sortCells(noParcel),
  };
}
