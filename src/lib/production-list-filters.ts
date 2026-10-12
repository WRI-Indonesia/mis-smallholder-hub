import type { StatusFilterValue } from "@/components/shared/status-filter-select";

/**
 * Filter daftar Master Data › Produksi (#427). Halaman bisa dibuka dengan query
 * (tautan sel Kalender Ketersediaan Produksi: `?farmerGroupId=…&period=…[&search=…]`).
 * Query itu HANYA menjadi nilai awal filter client — data tetap dimuat penuh
 * seperti halaman tanpa query — sehingga saringan terlihat, bisa diubah ke arah
 * mana pun, dan di-Reset tanpa memuat ulang.
 */
export type ProductionListFilters = {
  district: string;
  group: string;
  period: string;
  hasParcel: string;
  status: StatusFilterValue;
  search: string;
};

/** Query URL yang dibaca page.tsx sebagai nilai awal filter. */
export interface ProductionListSearchParams {
  search?: string;
  farmerGroupId?: string;
  period?: string;
  hasParcel?: string;
  status?: string;
}

/** Tampilan bawaan = halaman TANPA query — dasar inisialisasi & tombol Reset. */
export const PRODUCTION_FILTER_DEFAULTS: ProductionListFilters = {
  district: "all",
  group: "all",
  period: "",
  hasParcel: "all",
  status: "active",
  search: "",
};

const HAS_PARCEL_VALUES = new Set(["all", "true", "false"]);
const STATUS_VALUES = new Set<string>(["all", "active", "inactive"]);
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Nilai awal filter client dari query. Nilai yang tak bisa DITAMPILKAN kontrolnya
 * jatuh ke bawaan agar tak ada saringan tersembunyi: Lembaga di luar opsi akun
 * ini (scope/nonaktif), Periode bukan `YYYY-MM` (input bulan tak bisa
 * menampilkannya), Lahan/Status tak dikenal. Distrik diturunkan dari Lembaga.
 */
export function productionFiltersFromSearchParams(
  params: ProductionListSearchParams,
  farmerGroups: readonly { id: string; districtId: string }[],
): ProductionListFilters {
  const d = PRODUCTION_FILTER_DEFAULTS;
  const match = params.farmerGroupId ? farmerGroups.find((g) => g.id === params.farmerGroupId) : undefined;
  return {
    district: match?.districtId ?? d.district,
    group: match?.id ?? d.group,
    period: params.period && PERIOD_RE.test(params.period) ? params.period : d.period,
    hasParcel: params.hasParcel && HAS_PARCEL_VALUES.has(params.hasParcel) ? params.hasParcel : d.hasParcel,
    status: params.status && STATUS_VALUES.has(params.status) ? (params.status as StatusFilterValue) : d.status,
    search: params.search ?? d.search,
  };
}
