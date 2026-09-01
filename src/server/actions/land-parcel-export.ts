"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import {
  buildParcelExportFeatures,
  parcelExportGroupWhere,
  type ParcelExportFilters,
  type ParcelExportProperties,
} from "@/lib/parcel-export-data";
import { parcelExportFilterSchema } from "@/validations/land-parcel-export.schema";
import type { ActionResult } from "@/types/action-result";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

/**
 * Unduh data spasial lahan (#313) — satu action bersama untuk dua lokasi
 * tombol. `source` = menu tempat tombolnya berada, menentukan permission
 * EXPORT mana yang di-guard (pola getParcelPassport yang digate per menu).
 */
export type ParcelExportSource = "map-parcel" | "master-data-parcels";
const EXPORT_SOURCES: ParcelExportSource[] = ["map-parcel", "master-data-parcels"];

export interface ParcelExportPayload {
  fc: FeatureCollection<Polygon | MultiPolygon, ParcelExportProperties>;
  /** Jumlah fitur yang diekspor. */
  count: number;
  /** Lahan aktif dalam scope yang dilewati karena geometrinya tak valid. */
  skipped: number;
  /** Label konteks filter untuk nama file: kode Lembaga atau nama Distrik. */
  label: string | null;
}

/**
 * Data ekspor lahan sesuai filter, ber-guard 3 lapis: permission EXPORT pada
 * menu sumber, scope akses via `AND` (anti scope-leak BUG-007), dan hanya
 * revisi aktif (`isActive: true`). Distrik ATAU Lembaga Petani wajib —
 * tidak ada mode "all" lintas-wilayah (keputusan lingkup #313).
 */
export async function getParcelExportData(
  filters: ParcelExportFilters,
  source: ParcelExportSource
): Promise<ActionResult<ParcelExportPayload>> {
  if (!EXPORT_SOURCES.includes(source)) {
    return { success: false, error: "Sumber ekspor tidak dikenal" };
  }
  if (!(await hasPermission(source, "EXPORT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengekspor data ini" };
  }

  const parsed = parcelExportFilterSchema.safeParse(filters);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return {
      success: false,
      error: first ?? parsed.error.issues[0]?.message ?? "Filter tidak valid",
    };
  }
  const { provinceId, districtId, farmerGroupId } = parsed.data;

  const access = await getAccessContext();
  const groupWhere = parcelExportGroupWhere(
    { provinceId, districtId, farmerGroupId },
    farmerGroupAccessFilter(access)
  );

  const [rows, group, district] = await Promise.all([
    prisma.landParcel.findMany({
      where: {
        isActive: true,
        geometry: { not: Prisma.DbNull },
        farmer: { isActive: true, farmerGroup: groupWhere },
      },
      select: {
        parcelId: true,
        blok: true,
        geometry: true,
        area: true,
        landStatus: true,
        cropType: true,
        species: true,
        isPsr: true,
        plantingYear: true,
        subGroupLv2: true,
        revision: true,
        farmer: {
          select: {
            farmerId: true,
            name: true,
            nik: true,
            farmerGroup: {
              select: { code: true, name: true, district: { select: { name: true } } },
            },
          },
        },
        // Legalitas via identitas stabil — dokumen/STDB/UL code/program aktif,
        // satu query tanpa N+1 (pola Report Lahan #296/#305).
        identity: {
          select: {
            documents: {
              where: { isActive: true },
              select: { type: true, number: true, holderName: true, statedArea: true },
            },
            stdbLinks: {
              where: { isActive: true, stdb: { isActive: true } },
              select: { stdb: { select: { number: true, stage: true } } },
            },
            externalIds: { where: { isActive: true }, select: { source: true, code: true } },
            programs: { where: { isActive: true }, select: { programType: true, status: true } },
          },
        },
      },
      orderBy: { parcelId: "asc" },
    }),
    // Label nama file — Lembaga tetap difilter scope akses (jangan bocorkan
    // kode lembaga di luar cakupan); Distrik aman karena tabel referensi.
    farmerGroupId
      ? prisma.farmerGroup.findFirst({
          where: { id: farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
          select: { code: true, name: true },
        })
      : Promise.resolve(null),
    districtId
      ? prisma.district.findUnique({ where: { id: districtId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  const { fc, count, skipped } = buildParcelExportFeatures(rows);
  const label = farmerGroupId
    ? (group?.code?.trim() || group?.name || null)
    : (district?.name ?? null);

  return { success: true, data: { fc, count, skipped, label } };
}
