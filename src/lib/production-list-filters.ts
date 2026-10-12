import type { StatusFilterValue } from "@/components/shared/status-filter-select";

/**
 * Filter daftar Master Data › Produksi (#427). Halaman bisa dibuka dengan query
 * (tautan sel Kalender Ketersediaan Produksi: `?farmerGroupId=…&period=…[&search=…]`)
 * yang sudah menyaring data di server — nilai awal filter client diturunkan dari
 * query yang sama agar saringan itu terlihat (dan bisa di-Reset), bukan diam-diam.
 */
export type ProductionListFilters = {
  district: string;
  group: string;
  period: string;
  hasParcel: string;
  status: StatusFilterValue;
  search: string;
};

/** Query URL yang dibaca page.tsx untuk menyaring data di server. */
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

/** `true` bila URL membawa saringan server (Reset harus membersihkan query). */
export function hasProductionQuery(params: ProductionListSearchParams): boolean {
  return Boolean(params.search || params.farmerGroupId || params.period || params.hasParcel || params.status);
}

/**
 * Nilai awal filter client dari query. Distrik diturunkan dari Lembaga (bila
 * Lembaga ada di opsi akun ini); nilai tak dikenal untuk Lahan/Status jatuh ke
 * bawaan. Periode & Cari diteruskan apa adanya karena server memakainya mentah.
 */
export function productionFiltersFromSearchParams(
  params: ProductionListSearchParams,
  farmerGroups: readonly { id: string; districtId: string }[],
): ProductionListFilters {
  const d = PRODUCTION_FILTER_DEFAULTS;
  const group = params.farmerGroupId || d.group;
  const district = farmerGroups.find((g) => g.id === group)?.districtId ?? d.district;
  return {
    district,
    group,
    period: params.period ?? d.period,
    hasParcel: params.hasParcel && HAS_PARCEL_VALUES.has(params.hasParcel) ? params.hasParcel : d.hasParcel,
    status: params.status && STATUS_VALUES.has(params.status) ? (params.status as StatusFilterValue) : d.status,
    search: params.search ?? d.search,
  };
}
