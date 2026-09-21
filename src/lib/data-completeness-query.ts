import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  FarmerModuleFlags,
  GroupModuleFlags,
  ParcelModuleFlags,
} from "@/types/data-completeness";

/**
 * Kehadiran modul (satelit lahan, STDB, Monev BMP, boundary, acuan) untuk
 * cakupan modul Ketersediaan Data (#352 A1). NOTE: tanpa cek permission —
 * caller WAJIB guard `hasPermission` + scope lewat `farmerWhere`/`groupWhere`.
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
  parcel: Record<Exclude<keyof ParcelModuleFlags, "tree">, Set<string>>; // keyed parcelUid
  /** Tree menunjuk baris revisi LandParcel.id, bukan identitas. */
  parcelIdWithTree: Set<string>;
  farmer: Record<keyof FarmerModuleFlags, Set<string>>; // keyed Farmer.id
  group: Record<"boundary" | "benchmark" | "bmpGroupAssessment", Set<string>>; // keyed FarmerGroup.id
}

export async function loadModuleFlagSets(args: {
  /** Filter petani dalam scope (mis. `{ isActive: true, farmerGroupId }`). */
  farmerWhere: Prisma.FarmerWhereInput;
  /** Filter Lembaga dalam scope (mis. `{ id }` atau `{ isActive: true, ...groupScope }`). */
  groupWhere: Prisma.FarmerGroupWhereInput;
  /** Tahun acuan Monev BMP "tahun berjalan". */
  referenceYear: number;
}): Promise<ModuleFlagSets> {
  const { farmerWhere, groupWhere, referenceYear } = args;
  const parcelScope = { isActive: true, farmer: farmerWhere } satisfies Prisma.LandParcelIdentityWhereInput;

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
    boundaries,
    benchmarks,
    groupBmp,
  ] = await Promise.all([
    prisma.landParcelDocument.groupBy({ by: ["parcelUid"], where: { isActive: true, parcel: parcelScope } }),
    prisma.landParcelStdb.groupBy({
      by: ["parcelUid"],
      where: { isActive: true, stdb: { isActive: true, stage: "TERBIT" }, parcel: parcelScope },
    }),
    prisma.landParcelExternalId.groupBy({ by: ["parcelUid"], where: { isActive: true, parcel: parcelScope } }),
    prisma.landParcelNkt.findMany({ where: { parcel: parcelScope }, select: { parcelUid: true } }),
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
    farmer: {
      stdb: ids(farmerStdb, "farmerId"),
      bmpAssessment: ids(farmerBmp, "farmerId"),
    },
    group: {
      boundary: ids(boundaries, "farmerGroupId"),
      benchmark: ids(benchmarks, "farmerGroupId"),
      bmpGroupAssessment: ids(groupBmp, "farmerGroupId"),
    },
  };
}

export function parcelModuleFlags(
  sets: ModuleFlagSets,
  parcel: { id: string; parcelUid: string }
): ParcelModuleFlags {
  const p = sets.parcel;
  return {
    document: p.document.has(parcel.parcelUid),
    stdbIssued: p.stdbIssued.has(parcel.parcelUid),
    externalId: p.externalId.has(parcel.parcelUid),
    nkt: p.nkt.has(parcel.parcelUid),
    border: p.border.has(parcel.parcelUid),
    marker: p.marker.has(parcel.parcelUid),
    tree: sets.parcelIdWithTree.has(parcel.id),
    program: p.program.has(parcel.parcelUid),
  };
}

export function farmerModuleFlags(sets: ModuleFlagSets, farmerId: string): FarmerModuleFlags {
  return {
    stdb: sets.farmer.stdb.has(farmerId),
    bmpAssessment: sets.farmer.bmpAssessment.has(farmerId),
  };
}

export function groupModuleFlags(
  sets: ModuleFlagSets,
  group: {
    id: string;
    rspoCertStatus: string | null;
    ispoCertStatus: string | null;
    sapMapAssuranceStatus: string | null;
  }
): GroupModuleFlags {
  return {
    boundary: sets.group.boundary.has(group.id),
    benchmark: sets.group.benchmark.has(group.id),
    bmpGroupAssessment: sets.group.bmpGroupAssessment.has(group.id),
    rspoCertStatus: group.rspoCertStatus,
    ispoCertStatus: group.ispoCertStatus,
    sapMapAssuranceStatus: group.sapMapAssuranceStatus,
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
