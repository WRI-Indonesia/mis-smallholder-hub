"use client";

import { useCallback, useMemo } from "react";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { hasActiveFilters } from "@/lib/filter-reset";
import {
  GROUP_CATEGORY_LABEL,
  UL_FILTER_LABEL,
  UNKNOWN_MILL_FILTER,
  matchesSupplyChainFilter,
  supplyChainFilterOptions,
  type GroupCategory,
  type SupplyChainFilter,
  type SupplyChainView,
  type UlFilter,
} from "@/lib/supply-chain-flow";

/** Parameter URL filter rantai pasok — sama di Dashboard dan Peta agar tautan silang membawa filter. */
export const SC_FILTER_PARAMS = ["distrik", "kategori", "lembaga", "agen", "ramp", "mill", "ul", "tahun"] as const;
export type ScFilterParam = (typeof SC_FILTER_PARAMS)[number];
type Patch = Partial<Record<ScFilterParam, string | null>>;
/**
 * Tampilan bawaan (#427): semua filter lepas & Tahun = tahun terbaru — semuanya =
 * kunci tidak ada di URL (`values.tahun` null saat tahun terbaru). Pembanding
 * tombol Reset sekaligus isi reset; Reset kini ikut mengembalikan Tahun.
 */
const SC_FILTER_DEFAULTS = Object.fromEntries(SC_FILTER_PARAMS.map((k) => [k, null])) as Record<ScFilterParam, null>;

/**
 * Satu sumber state filter untuk Dashboard & Peta Rantai Pasok: dibaca dari
 * query string (nilai tak dikenal diabaikan), menghasilkan record terfilter
 * dan pilihan dropdown bergaya faset. Distrik & kategori = atribut Lembaga →
 * menyaring himpunan dasar; Lembaga/Agen/RAMP/Mill/UL = irisan atas record.
 */
export function useSupplyChainFilters(view: SupplyChainView) {
  const { get, setMany } = useUrlFilters();
  const { groups, offtakers: offList, mills } = view.data;

  const offtakers = useMemo(() => new Map(offList.map((o) => [o.id, o])), [offList]);
  const millsById = useMemo(() => new Map(mills.map((m) => [m.id, m])), [mills]);
  const districtOptions = useMemo(() => [...new Set(groups.map((g) => g.districtName))].sort().map((d) => ({ id: d, name: d })), [groups]);

  const pick = (key: ScFilterParam, valid: (v: string) => boolean) => {
    const v = get(key);
    return v != null && valid(v) ? v : null;
  };
  const district = pick("distrik", (v) => districtOptions.some((d) => d.id === v));
  const category = pick("kategori", (v) => v in GROUP_CATEGORY_LABEL) as GroupCategory | null;
  const yearRaw = Number(get("tahun"));
  const year = view.years.includes(yearRaw) ? yearRaw : (view.years[0] ?? null);
  const groupCode = pick("lembaga", (v) => groups.some((g) => g.code === v));
  const collectorId = pick("agen", (v) => offtakers.has(v));
  const rampId = pick("ramp", (v) => offtakers.has(v));
  const millId = pick("mill", (v) => v === UNKNOWN_MILL_FILTER || millsById.has(v));
  const ul = pick("ul", (v) => v in UL_FILTER_LABEL) as UlFilter | null;
  const filter: SupplyChainFilter = useMemo(() => ({ groupCode, collectorId, rampId, millId, ul }), [groupCode, collectorId, rampId, millId, ul]);

  const baseRecords = useMemo(() => {
    const inScope = new Set(groups.filter((g) => (!district || g.districtName === district) && (!category || g.category === category)).map((g) => g.code));
    return view.data.records.filter((r) => r.year === year && inScope.has(r.groupCode));
  }, [view.data.records, groups, district, category, year]);
  const records = useMemo(() => baseRecords.filter((r) => matchesSupplyChainFilter(r, filter, offtakers)), [baseRecords, filter, offtakers]);
  const options = useMemo(() => supplyChainFilterOptions(baseRecords, filter, view.data), [baseRecords, filter, view.data]);

  const update = useCallback(
    (patch: Patch) => {
      // Lingkup dipersempit/diganti → pilihan rantai bisa jadi di luar lingkup; mulai bersih.
      // Lingkup dilepas (null, mis. chip filter dihapus) hanya melebarkan → rantai tetap sah.
      if (patch.distrik || patch.kategori) Object.assign(patch, { lembaga: null, agen: null, ramp: null, mill: null, ...patch });
      setMany(patch);
    },
    [setMany],
  );
  const reset = useCallback(() => setMany(SC_FILTER_DEFAULTS), [setMany]);

  const values: Record<ScFilterParam, string | null> = {
    distrik: district, kategori: category, lembaga: groupCode, agen: collectorId, ramp: rampId, mill: millId, ul,
    tahun: year != null && year !== view.years[0] ? String(year) : null,
  };
  const query = new URLSearchParams(Object.entries(values).filter((e): e is [string, string] => e[1] != null)).toString();
  // Termasuk Tahun ≠ terbaru (#427) — Reset tampil & mengembalikannya.
  const hasFilter = hasActiveFilters(values, SC_FILTER_DEFAULTS);
  // Penanda "Filter aktif" di panel Peta: hanya filter entitas — Tahun adalah
  // periode tampilan, bukan saringan (makna penanda sebelum #427).
  const hasEntityFilter = hasActiveFilters({ ...values, tahun: null }, SC_FILTER_DEFAULTS);

  return { district, category, year, filter, baseRecords, records, options, districtOptions, offtakers, millsById, update, reset, hasFilter, hasEntityFilter, query };
}

export type SupplyChainFilterState = ReturnType<typeof useSupplyChainFilters>;
