import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  FarmerModuleFlags,
  GroupModuleFlags,
  ParcelModuleFlags,
} from "@/types/data-completeness";

/**
 * Kehadiran modul (satelit lahan, STDB, Monev BMP, boundary, acuan) untuk
 * cakupan modul Ketersediaan Data (#352 A1) + flag check kualitas spasial
 * (putaran 2: persil di luar boundary ICS, luas poligon, koordinat Lembaga di
 * luar kabupaten). NOTE: tanpa cek permission — caller WAJIB guard
 * `hasPermission` + scope lewat `farmerWhere`/`groupWhere` DAN `scope` (untuk
 * kueri PostGIS mentah yang tidak bisa memakai objek where Prisma).
 *
 * Pola `withGeometry` DA-03: kueri id-set per satelit (GROUP BY di SQL, bukan
 * `distinct` Prisma yang mendedup di memori), TIDAK di-nest ke `findMany`
 * utama supaya payload petani/persil tidak membengkak. Scope digabung lewat
 * relasi `parcel.farmer` / `farmerGroup` — bukan spread `districtId` literal
 * (pitfall BUG-007).
 *
 * `isActive` difilter di semua satelit KECUALI `LandParcelNkt` dan
 * `LandParcelBorder` yang semantik hapusnya berbeda (hapus baris / kosongkan
 * kolom; lihat docs/database/models.md).
 */
export interface ModuleFlagSets {
  parcel: Record<"document" | "stdbIssued" | "externalId" | "nkt" | "border" | "marker" | "program", Set<string>>; // keyed parcelUid
  /** Tree menunjuk baris revisi LandParcel.id, bukan identitas. */
  parcelIdWithTree: Set<string>;
  /** Status NKT per parcelUid (hanya yang sudah dinilai). */
  nktStatus: Map<string, string>;
  /** Persil (LandParcel.id) yang poligonnya tidak beririsan dengan boundary ICS Lembaganya. */
  parcelIdOutsideBoundary: Set<string>;
  /** Luas poligon (ha) per LandParcel.id — hanya persil ber-geometry. */
  parcelGeometryAreaHa: Map<string, number>;
  farmer: Record<"stdb" | "bmpAssessment", Set<string>>; // keyed Farmer.id
  /** Petani ber-penilaian Monev (tahun mana pun) — pembeda "tak dicek" vs "lengkap". */
  farmerBmpAny: Set<string>;
  /** Petani yang salah satu penilaian Monev-nya tanpa rincian indikator. */
  farmerBmpNoDetails: Set<string>;
  group: Record<"boundary" | "benchmark" | "bmpGroupAssessment", Set<string>>; // keyed FarmerGroup.id
  /** Lembaga ber-boundary dengan `geom` terisi — hanya ini yang bisa dicek "di luar boundary". */
  groupBoundaryGeom: Set<string>;
  /** Lembaga yang koordinatnya di luar poligon kabupaten (hanya yang bisa dicek). */
  groupCoordinateOutside: Map<string, boolean>;
}

/** Scope untuk kueri PostGIS mentah — cermin dari `groupWhere` Prisma. */
export interface RawScope {
  /** undefined = semua Lembaga aktif. */
  groupIds?: string[];
  /** undefined = semua distrik. */
  districtIds?: string[];
}

export async function loadModuleFlagSets(args: {
  /** Filter petani dalam scope (mis. `{ isActive: true, farmerGroup: groupWhere }`). */
  farmerWhere: Prisma.FarmerWhereInput;
  /** Filter Lembaga dalam scope (mis. `{ id, isActive: true }` atau `{ isActive: true, ...groupScope }`). */
  groupWhere: Prisma.FarmerGroupWhereInput;
  /** Scope yang sama untuk kueri PostGIS mentah. */
  scope: RawScope;
  /** Tahun acuan Monev BMP "tahun berjalan". */
  referenceYear: number;
}): Promise<ModuleFlagSets> {
  const { farmerWhere, groupWhere, scope, referenceYear } = args;
  const parcelScope = { isActive: true, farmer: farmerWhere } satisfies Prisma.LandParcelIdentityWhereInput;

  // Klausa scope SQL mentah: id Lembaga & distrik sebagai array parameter
  // (NULL = tanpa batasan). Petani/Lembaga nonaktif dikeluarkan di join.
  const groupIds = scope.groupIds ?? null;
  const districtIds = scope.districtIds ?? null;
  const rawScope = Prisma.sql`g.is_active
    AND (${groupIds}::text[] IS NULL OR g.id = ANY(${groupIds}::text[]))
    AND (${districtIds}::text[] IS NULL OR g.district_id = ANY(${districtIds}::text[]))`;

  const [
    documents,
    stdbIssued,
    externalIds,
    nkt,
    borders,
    markers,
    programs,
    trees,
    farmerStdb,
    farmerBmp,
    farmerBmpAny,
    farmerBmpNoDetails,
    boundaries,
    benchmarks,
    groupBmp,
    boundaryGeom,
    outsideBoundary,
    geometryArea,
    coordinateOutside,
  ] = await Promise.all([
    prisma.landParcelDocument.groupBy({ by: ["parcelUid"], where: { isActive: true, parcel: parcelScope } }),
    prisma.landParcelStdb.groupBy({
      by: ["parcelUid"],
      where: { isActive: true, stdb: { isActive: true, stage: "TERBIT" }, parcel: parcelScope },
    }),
    prisma.landParcelExternalId.groupBy({ by: ["parcelUid"], where: { isActive: true, parcel: parcelScope } }),
    prisma.landParcelNkt.findMany({ where: { parcel: parcelScope }, select: { parcelUid: true, status: true } }),
    // Sepadan "lengkap" = keempat arah terisi (bukan sekadar baris ada).
    prisma.landParcelBorder.findMany({
      where: {
        parcel: parcelScope,
        north: { not: null },
        east: { not: null },
        south: { not: null },
        west: { not: null },
        NOT: [{ north: "" }, { east: "" }, { south: "" }, { west: "" }],
      },
      select: { parcelUid: true },
    }),
    prisma.landParcelMarker.groupBy({
      by: ["parcelUid"],
      where: { isActive: true, marker: { isActive: true }, parcel: parcelScope },
    }),
    prisma.landParcelProgram.groupBy({ by: ["parcelUid"], where: { isActive: true, parcel: parcelScope } }),
    prisma.tree.groupBy({
      by: ["landParcelId"],
      where: { isActive: true, landParcel: { isActive: true, farmer: farmerWhere } },
    }),
    prisma.landStdb.groupBy({ by: ["farmerId"], where: { isActive: true, farmer: farmerWhere } }),
    prisma.bmpAssessment.groupBy({
      by: ["farmerId"],
      where: { isActive: true, surveyYear: referenceYear, farmer: farmerWhere },
    }),
    prisma.bmpAssessment.groupBy({ by: ["farmerId"], where: { isActive: true, farmer: farmerWhere } }),
    prisma.bmpAssessment.groupBy({
      by: ["farmerId"],
      where: { isActive: true, farmer: farmerWhere, details: { none: {} } },
    }),
    prisma.farmerGroupBoundary.groupBy({
      by: ["farmerGroupId"],
      where: { isActive: true, farmerGroup: groupWhere },
    }),
    prisma.referenceBenchmark.findMany({
      where: { isActive: true, farmerGroup: groupWhere },
      select: { farmerGroupId: true },
    }),
    prisma.bmpGroupAssessment.groupBy({
      by: ["farmerGroupId"],
      where: { isActive: true, surveyYear: referenceYear, farmerGroup: groupWhere },
    }),
    // Lembaga ber-boundary yang `geom`-nya terisi (baris hanya-geojson tak bisa dicek).
    prisma.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT g.id
      FROM tbl_farmer_group g
      JOIN tbl_farmer_group_boundary b ON b.farmer_group_id = g.id AND b.is_active AND b.geom IS NOT NULL
      WHERE ${rawScope}`,
    // Persil ber-geometry yang TIDAK beririsan dengan satu pun boundary ICS
    // Lembaganya — hanya Lembaga yang punya boundary ber-geom (#266). GiST di kedua `geom`.
    prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM tbl_land_parcel p
      JOIN tbl_farmer f ON f.id = p.farmer_id AND f.is_active
      JOIN tbl_farmer_group g ON g.id = f.farmer_group_id
      WHERE p.is_active AND p.geom IS NOT NULL AND ${rawScope}
        AND EXISTS (
          SELECT 1 FROM tbl_farmer_group_boundary b
          WHERE b.farmer_group_id = g.id AND b.is_active AND b.geom IS NOT NULL
        )
        AND NOT EXISTS (
          SELECT 1 FROM tbl_farmer_group_boundary b
          WHERE b.farmer_group_id = g.id AND b.is_active AND b.geom IS NOT NULL AND ST_Intersects(b.geom, p.geom)
        )`,
    // Luas poligon (ha) dari kolom generated `geom` — pembanding kolom `area`.
    prisma.$queryRaw<{ id: string; ha: number }[]>`
      SELECT p.id, ST_Area(p.geom::geography) / 10000 AS ha
      FROM tbl_land_parcel p
      JOIN tbl_farmer f ON f.id = p.farmer_id AND f.is_active
      JOIN tbl_farmer_group g ON g.id = f.farmer_group_id
      WHERE p.is_active AND p.geom IS NOT NULL AND ${rawScope}`,
    // Koordinat Lembaga vs poligon kabupaten BIG (#266) — hanya yang bisa dicek.
    prisma.$queryRaw<{ id: string; outside: boolean }[]>`
      SELECT g.id, NOT ST_Intersects(b.geom, ST_SetSRID(ST_MakePoint(g.location_long, g.location_lat), 4326)) AS outside
      FROM tbl_farmer_group g
      JOIN tbl_administrative_boundary b
        ON b.district_id = g.district_id AND b.is_active AND b.level = 'KABUPATEN' AND b.geom IS NOT NULL
      WHERE g.location_lat IS NOT NULL AND g.location_long IS NOT NULL AND ${rawScope}`,
  ]);

  const ids = <T extends string>(rows: { [K in T]: string }[], key: T) => new Set(rows.map((r) => r[key]));

  return {
    parcel: {
      document: ids(documents, "parcelUid"),
      stdbIssued: ids(stdbIssued, "parcelUid"),
      externalId: ids(externalIds, "parcelUid"),
      nkt: ids(nkt, "parcelUid"),
      border: ids(borders, "parcelUid"),
      marker: ids(markers, "parcelUid"),
      program: ids(programs, "parcelUid"),
    },
    parcelIdWithTree: ids(trees, "landParcelId"),
    nktStatus: new Map(nkt.map((r) => [r.parcelUid, r.status as string])),
    parcelIdOutsideBoundary: ids(outsideBoundary, "id"),
    parcelGeometryAreaHa: new Map(geometryArea.map((r) => [r.id, Number(r.ha)])),
    farmer: {
      stdb: ids(farmerStdb, "farmerId"),
      bmpAssessment: ids(farmerBmp, "farmerId"),
    },
    farmerBmpAny: ids(farmerBmpAny, "farmerId"),
    farmerBmpNoDetails: ids(farmerBmpNoDetails, "farmerId"),
    group: {
      boundary: ids(boundaries, "farmerGroupId"),
      benchmark: ids(benchmarks, "farmerGroupId"),
      bmpGroupAssessment: ids(groupBmp, "farmerGroupId"),
    },
    groupBoundaryGeom: ids(boundaryGeom, "id"),
    groupCoordinateOutside: new Map(coordinateOutside.map((r) => [r.id, r.outside])),
  };
}

export function parcelModuleFlags(
  sets: ModuleFlagSets,
  parcel: { id: string; parcelUid: string },
  groupId: string
): ParcelModuleFlags {
  const p = sets.parcel;
  // Di luar boundary hanya bisa dicek bila Lembaga punya boundary ber-geom DAN persil ber-geometry.
  const boundaryCheckable = sets.groupBoundaryGeom.has(groupId) && sets.parcelGeometryAreaHa.has(parcel.id);
  return {
    document: p.document.has(parcel.parcelUid),
    stdbIssued: p.stdbIssued.has(parcel.parcelUid),
    externalId: p.externalId.has(parcel.parcelUid),
    nkt: p.nkt.has(parcel.parcelUid),
    border: p.border.has(parcel.parcelUid),
    marker: p.marker.has(parcel.parcelUid),
    tree: sets.parcelIdWithTree.has(parcel.id),
    program: p.program.has(parcel.parcelUid),
    nktStatus: sets.nktStatus.get(parcel.parcelUid) ?? null,
    outsideBoundary: boundaryCheckable ? sets.parcelIdOutsideBoundary.has(parcel.id) : null,
  };
}

/** Luas poligon (ha) untuk input persil; null bila persil tanpa geometry. */
export function parcelGeometryAreaHa(sets: ModuleFlagSets, parcelId: string): number | null {
  return sets.parcelGeometryAreaHa.get(parcelId) ?? null;
}

export function farmerModuleFlags(sets: ModuleFlagSets, farmerId: string): FarmerModuleFlags {
  return {
    stdb: sets.farmer.stdb.has(farmerId),
    bmpAssessment: sets.farmer.bmpAssessment.has(farmerId),
    bmpAssessmentNoDetails: sets.farmerBmpAny.has(farmerId) ? sets.farmerBmpNoDetails.has(farmerId) : undefined,
  };
}

export function groupModuleFlags(sets: ModuleFlagSets, group: { id: string }): GroupModuleFlags {
  return {
    boundary: sets.group.boundary.has(group.id),
    benchmark: sets.group.benchmark.has(group.id),
    bmpGroupAssessment: sets.group.bmpGroupAssessment.has(group.id),
    coordinateOutsideDistrict: sets.groupCoordinateOutside.get(group.id) ?? null,
  };
}

/**
 * Id record produksi berlabel "Estimasi" (impor rekap #TBR/#RSB) — informatif,
 * bukan anomali. Id-set terpisah supaya kueri utama tidak mengangkut kolom
 * `notes` (@db.Text) untuk SEMUA record produksi (tabel tumbuh paling cepat,
 * proyeksi 2028 ~85×) hanya demi satu boolean per record (review #352).
 */
export async function loadEstimateRecordIds(farmerWhere: Prisma.FarmerWhereInput): Promise<Set<string>> {
  const rows = await prisma.productionRecord.findMany({
    where: { isActive: true, farmer: farmerWhere, notes: { contains: "estimasi", mode: "insensitive" } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}
