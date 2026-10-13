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

/**
 * Query URL yang dibaca page.tsx sebagai nilai awal filter. Kunci yang diulang
 * (`?search=a&search=b`) tiba dari Next sebagai array — dipakai nilai pertamanya,
 * sama dengan `URLSearchParams.get` di halaman lain (`useUrlFilters`).
 */
export interface ProductionListSearchParams {
  search?: string | string[];
  farmerGroupId?: string | string[];
  period?: string | string[];
  hasParcel?: string | string[];
  status?: string | string[];
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

/** Nilai pertama bila kunci diulang (array), seperti `URLSearchParams.get`. */
const single = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

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
  const farmerGroupId = single(params.farmerGroupId);
  const period = single(params.period);
  const hasParcel = single(params.hasParcel);
  const status = single(params.status);
  const match = farmerGroupId ? farmerGroups.find((g) => g.id === farmerGroupId) : undefined;
  return {
    district: match?.districtId ?? d.district,
    group: match?.id ?? d.group,
    period: period && PERIOD_RE.test(period) ? period : d.period,
    hasParcel: hasParcel && HAS_PARCEL_VALUES.has(hasParcel) ? hasParcel : d.hasParcel,
    status: status && STATUS_VALUES.has(status) ? (status as StatusFilterValue) : d.status,
    search: single(params.search) ?? d.search,
  };
}
