/**
 * Prototipe Supply Chain (#379) — tipe tabel CSV + agregasi murni (tanpa I/O)
 * untuk Dashboard (Sankey Lembaga → Agen → RAMP → Mill) dan Peta Rantai Pasok.
 *
 * Sumber data = folder tabel CSV (satu berkas = satu tabel, mengikuti model
 * #380) yang dibangkitkan skrip lokal dari form survei 2025. Data ini
 * **declared supply base** (pengakuan petani/dealer), bukan bukti transaksi.
 */

export type OfftakerType = "AGEN" | "RAMP" | "KT" | "KOPERASI";
export type MillStatus = "PKS_PASTI" | "PKS_BELUM_PASTI" | "TIDAK_DIKETAHUI";
/** LAHAN = form per lahan (Siak); DEALER = form per dealer/agen (Rokan Hulu, Kampar). */
export type RecordLevel = "LAHAN" | "DEALER";
/** Jalur pertama TBS keluar dari petani — dasar warna garis Sankey & peta. */
export type SupplyChannel = "AGEN" | "RAMP" | "KT_KOPERASI" | "LANGSUNG";

export type GroupCategory = "EX_PLASMA" | "SWADAYA";
export const GROUP_CATEGORY_LABEL: Record<GroupCategory, string> = { SWADAYA: "Swadaya", EX_PLASMA: "Ex-Plasma" };

export interface ScGroup {
  code: string;
  name: string;
  abrv: string;
  category: GroupCategory;
  districtName: string;
  lat: number | null;
  lon: number | null;
}

export interface ScMill {
  id: string;
  umlId: string | null;
  name: string;
  company: string;
  district: string | null;
  lat: number | null;
  lon: number | null;
  rspoStatus: string | null;
  source: string;
  buyerPrograms: string[];
}

export interface ScOfftaker {
  id: string;
  name: string;
  type: OfftakerType;
  district: string;
  lat: number | null;
  lon: number | null;
  /** Diisi bila offtaker = Lembaga itu sendiri (penjualan kolektif koperasi). */
  farmerGroupCode: string | null;
}

export interface ScRecord {
  id: string;
  year: number;
  level: RecordLevel;
  groupCode: string;
  surveyId: string | null;
  offtakerId: string | null;
  nextOfftakerId: string | null;
  millText: string | null;
  millId: string | null;
  millStatus: MillStatus;
  millBasis: string;
  supplyTon: number | null;
  toUl: boolean;
  ulTon: number | null;
  flags: string[];
}

export interface ScSurvey {
  id: string;
  year: number;
  groupCode: string;
  farmerId: string | null;
  parcelId: string | null;
  parcelIdFile: string | null;
  ffbTon: number | null;
  areaClaimHa: number | null;
  plantingYear: number | null;
  landRight: string | null;
  lat: number | null;
  lon: number | null;
  flags: string[];
}

export interface SupplyChainData {
  groups: ScGroup[];
  mills: ScMill[];
  offtakers: ScOfftaker[];
  records: ScRecord[];
}

/** Payload halaman prototipe (Dashboard & Peta). `available=false` bila folder tabel tidak ada. */
export interface SupplyChainView {
  available: boolean;
  /**
   * Lokasi sumber tabel (folder lokal / bucket S3) untuk keadaan kosong — HANYA untuk
   * SUPERADMIN; peran lain `null` (path skrip & nama bucket bukan untuk pengguna, temuan QA v1.4.0).
   */
  tablesDir: string | null;
  data: SupplyChainData;
  years: number[];
}

/** Titik lahan per survei untuk Peta (Siak, form per lahan). */
export interface ScParcelPoint {
  surveyId: string;
  groupCode: string;
  parcelId: string | null;
  farmerName: string | null;
  lat: number;
  lon: number;
  /** POLIGON = ST_PointOnSurface lahan MIS (K8); SURVEI = koordinat di form. */
  pointSource: "POLIGON" | "SURVEI";
  ffbTon: number | null;
  flows: { millId: string | null; offtakerId: string | null; ton: number | null }[];
}

export interface SupplyChainMapView extends SupplyChainView {
  parcels: ScParcelPoint[];
}

export const CHANNEL_ORDER: SupplyChannel[] =["AGEN", "RAMP", "KT_KOPERASI", "LANGSUNG"];
export const CHANNEL_LABEL: Record<SupplyChannel, string> = {
  AGEN: "Lewat Agen",
  RAMP: "Langsung ke RAMP",
  KT_KOPERASI: "Lewat KT/Koperasi",
  LANGSUNG: "Langsung ke Mill",
};
export const OFFTAKER_TYPE_LABEL: Record<OfftakerType, string> = { AGEN: "Agen", RAMP: "RAMP", KT: "KT", KOPERASI: "Koperasi" };
export const MILL_STATUS_LABEL: Record<MillStatus, string> = {
  PKS_PASTI: "PKS pasti",
  PKS_BELUM_PASTI: "PKS belum pasti (nama PT)",
  TIDAK_DIKETAHUI: "Mill tidak diketahui",
};
/** Dasar pemilihan PKS (kolom `mill_basis`). */
export const MILL_BASIS_LABEL: Record<string, string> = {
  NAMA_PKS: "teks survei menyebut PKS",
  SATU_PKS_UML: "PT punya satu PKS di UML",
  PKS_TERDEKAT: "PKS milik PT yang terdekat dari Lembaga",
  KOORDINAT_SURVEI: "koordinat dari survei (tak ada di UML)",
  TANPA_KOORDINAT: "tak ada di UML, tanpa koordinat",
  BEBERAPA_PT: "beberapa PT dalam satu sel",
  KOSONG: "kolom Mill kosong",
};

const UNKNOWN_MILL = "M:?";

export function recordChannel(r: ScRecord, offtakers: Map<string, ScOfftaker>): SupplyChannel {
  const o = r.offtakerId ? offtakers.get(r.offtakerId) : undefined;
  if (!o) return "LANGSUNG";
  if (o.type === "AGEN") return "AGEN";
  if (o.type === "RAMP") return "RAMP";
  return "KT_KOPERASI";
}

/**
 * Pengumpul pertama (Agen · KT/Koperasi) dan RAMP sebuah record — di Sankey
 * keduanya satu bagian Offtaker, rantai pengumpul → RAMP = satu node.
 * Satu definisi untuk Sankey, filter, dan peta — offtaker pertama bertipe RAMP
 * berarti petani langsung ke RAMP (tanpa pengumpul).
 */
export function recordCollectorId(r: ScRecord, offtakers: Map<string, ScOfftaker>): string | null {
  const o1 = r.offtakerId ? offtakers.get(r.offtakerId) : undefined;
  return o1 && o1.type !== "RAMP" ? o1.id : null;
}

export function recordRampId(r: ScRecord, offtakers: Map<string, ScOfftaker>): string | null {
  const o1 = r.offtakerId ? offtakers.get(r.offtakerId) : undefined;
  if (o1?.type === "RAMP") return o1.id;
  // Offtaker kedua hanya dianggap RAMP bila memang bertipe RAMP (mis. bukan KUD/koperasi).
  const o2 = r.nextOfftakerId ? offtakers.get(r.nextOfftakerId) : undefined;
  return o2?.type === "RAMP" ? o2.id : null;
}

/** Nilai filter Mill untuk record tanpa Mill (kolom kosong / beberapa PT). */
export const UNKNOWN_MILL_FILTER = "tidak-diketahui";

export interface SupplyChainFilter {
  groupCode: string | null;
  collectorId: string | null;
  rampId: string | null;
  /** ID Mill, atau `UNKNOWN_MILL_FILTER`. */
  millId: string | null;
  /** UL = record ber-"Supply to UL = Yes" (form survei), NON_UL = sisanya. */
  ul: UlFilter | null;
}

export type UlFilter = "UL" | "NON_UL";
export const UL_FILTER_LABEL: Record<UlFilter, string> = { UL: "Ke Mill UL", NON_UL: "Bukan ke Mill UL" };

/** Filter yang punya dropdown faset (pilihan dihitung dari data). */
export type SupplyChainFilterKey = "groupCode" | "collectorId" | "rampId" | "millId";

export function matchesSupplyChainFilter(r: ScRecord, f: SupplyChainFilter, offtakers: Map<string, ScOfftaker>): boolean {
  if (f.groupCode && r.groupCode !== f.groupCode) return false;
  if (f.collectorId && recordCollectorId(r, offtakers) !== f.collectorId) return false;
  if (f.rampId && recordRampId(r, offtakers) !== f.rampId) return false;
  if (f.millId && (f.millId === UNKNOWN_MILL_FILTER ? r.millId != null : r.millId !== f.millId)) return false;
  if (f.ul && (r.toUl ? "UL" : "NON_UL") !== f.ul) return false;
  return true;
}

export interface FilterOption {
  id: string;
  name: string;
  /** Teks pencarian/sub (kode, tipe, perusahaan). */
  code?: string | null;
  ton: number;
}

/**
 * Pilihan dropdown per filter bergaya faset: dihitung dari record yang lolos
 * SEMUA filter lain (bukan filter itu sendiri), urut tonase — memilih Lembaga
 * menyempitkan daftar Agen/RAMP/Mill ke yang benar-benar terhubung.
 */
export function supplyChainFilterOptions(
  records: ScRecord[],
  filter: SupplyChainFilter,
  data: Pick<SupplyChainData, "groups" | "offtakers" | "mills">,
): Record<SupplyChainFilterKey, FilterOption[]> {
  const offtakers = new Map(data.offtakers.map((o) => [o.id, o]));
  const mills = new Map(data.mills.map((m) => [m.id, m]));
  const groups = new Map(data.groups.map((g) => [g.code, g]));
  const facet = (key: SupplyChainFilterKey, idOf: (r: ScRecord) => string | null, describe: (id: string) => Omit<FilterOption, "id" | "ton">) => {
    const others = { ...filter, [key]: null };
    const ton = new Map<string, number>();
    for (const r of records) {
      if (!matchesSupplyChainFilter(r, others, offtakers)) continue;
      const id = idOf(r);
      if (id) ton.set(id, (ton.get(id) ?? 0) + (r.supplyTon ?? 0));
    }
    return [...ton.entries()].map(([id, t]) => ({ id, ton: t, ...describe(id) })).sort((a, b) => b.ton - a.ton || a.name.localeCompare(b.name));
  };
  const offDesc = (id: string) => {
    const o = offtakers.get(id);
    return { name: o?.name ?? id, code: o ? `${id} · ${OFFTAKER_TYPE_LABEL[o.type]} · ${o.district}` : id };
  };
  return {
    groupCode: facet("groupCode", (r) => r.groupCode, (id) => ({ name: groups.get(id)?.abrv ?? id, code: groups.get(id)?.name ?? null })),
    collectorId: facet("collectorId", (r) => recordCollectorId(r, offtakers), offDesc),
    rampId: facet("rampId", (r) => recordRampId(r, offtakers), offDesc),
    millId: facet("millId", (r) => r.millId ?? UNKNOWN_MILL_FILTER, (id) => {
      const m = mills.get(id);
      return m ? { name: millLabel(m), code: m.company } : { name: "Mill tidak diketahui", code: null };
    }),
  };
}

/**
 * Tonase UL satu record: kolom tonase UL (atau seluruh supply bila hanya
 * ditandai "Yes"), **dibatasi supply baris itu** — TBS ke UL tak mungkin
 * melebihi TBS yang dijual. Menjaga KPI dari salah ketik desimal di form
 * (mis. 30,53 t tertulis 30525; baris tetap ber-flag UL_MELEBIHI_SUPPLY, K10).
 */
export const recordUlTon = (r: ScRecord) => {
  if (!r.toUl) return 0;
  const supply = r.supplyTon ?? 0;
  return Math.min(r.ulTon ?? supply, supply);
};

// ---------------------------------------------------------------------------
// Ringkasan
// ---------------------------------------------------------------------------

export interface SupplyChainSummary {
  totalTon: number;
  ulTon: number;
  tonByStatus: Record<MillStatus, number>;
  tonByChannel: Record<SupplyChannel, number>;
  groupCount: number;
  offtakerCount: number;
  millCount: number;
  recordCount: number;
  /** Record tanpa tonase (kosong, "Belum Tersedia", atau sel beberapa PT). */
  recordsWithoutTon: number;
}

export function summarizeSupplyChain(records: ScRecord[], offtakers: Map<string, ScOfftaker>): SupplyChainSummary {
  const tonByStatus: Record<MillStatus, number> = { PKS_PASTI: 0, PKS_BELUM_PASTI: 0, TIDAK_DIKETAHUI: 0 };
  const tonByChannel: Record<SupplyChannel, number> = { AGEN: 0, RAMP: 0, KT_KOPERASI: 0, LANGSUNG: 0 };
  const groups = new Set<string>();
  const offs = new Set<string>();
  const mills = new Set<string>();
  let totalTon = 0;
  let ulTon = 0;
  let recordsWithoutTon = 0;
  for (const r of records) {
    groups.add(r.groupCode);
    if (r.offtakerId) offs.add(r.offtakerId);
    if (r.nextOfftakerId) offs.add(r.nextOfftakerId);
    if (r.millId) mills.add(r.millId);
    const t = r.supplyTon ?? 0;
    if (!(t > 0)) recordsWithoutTon++;
    totalTon += t;
    ulTon += recordUlTon(r);
    tonByStatus[r.millStatus] += t;
    tonByChannel[recordChannel(r, offtakers)] += t;
  }
  return {
    totalTon, ulTon, tonByStatus, tonByChannel,
    groupCount: groups.size, offtakerCount: offs.size, millCount: mills.size,
    recordCount: records.length, recordsWithoutTon,
  };
}

export interface MillVolumeRow {
  millId: string | null;
  name: string;
  company: string | null;
  /** Kabupaten lokasi Mill (`millDistrict`); null bila tak diketahui. */
  district: string | null;
  status: MillStatus;
  basis: string;
  isUl: boolean;
  ton: number;
  ulTon: number;
  groupCount: number;
  offtakerCount: number;
}

/** Mill pemasok program UL (badge UL & ikon biru). */
export function isUlMill(m: Pick<ScMill, "buyerPrograms">): boolean {
  return m.buyerPrograms.includes("UL");
}

/** Kabupaten Mill dari UML tanpa awalan "Kabupaten"/"Kab." (data UML tak seragam); null bila kosong. */
export function millDistrict(m: Pick<ScMill, "district">): string | null {
  return m.district?.trim().replace(/^(Kabupaten\s+|Kab\.\s*|Kab\s+)/i, "").trim() || null;
}

/** Volume per Mill (Mill tidak diketahui digabung satu baris), urut tonase. */
export function millVolumes(records: ScRecord[], mills: Map<string, ScMill>): MillVolumeRow[] {
  const acc = new Map<string, MillVolumeRow & { groups: Set<string>; offs: Set<string> }>();
  for (const r of records) {
    const k = r.millId ?? UNKNOWN_MILL;
    let row = acc.get(k);
    if (!row) {
      const m = r.millId ? mills.get(r.millId) : undefined;
      row = {
        millId: r.millId, name: m ? millLabel(m) : "Mill tidak diketahui", company: m?.company ?? null,
        district: m ? millDistrict(m) : null,
        status: r.millId ? r.millStatus : "TIDAK_DIKETAHUI", basis: r.millBasis,
        isUl: !!m && isUlMill(m), ton: 0, ulTon: 0, groupCount: 0, offtakerCount: 0,
        groups: new Set(), offs: new Set(),
      };
      acc.set(k, row);
    }
    // Satu PKS bisa "pasti" di satu baris dan "belum pasti" di baris lain → tampilkan yang terkuat.
    if (r.millStatus === "PKS_PASTI") row.status = "PKS_PASTI";
    row.ton += r.supplyTon ?? 0;
    row.ulTon += recordUlTon(r);
    row.groups.add(r.groupCode);
    if (r.offtakerId) row.offs.add(r.offtakerId);
  }
  return [...acc.values()]
    .map(({ groups, offs, ...row }) => ({ ...row, groupCount: groups.size, offtakerCount: offs.size }))
    .sort((a, b) => b.ton - a.ton);
}

const KEEP_UPPER = new Set(["PT", "PTPN", "UL", "KUD", "CV", "UD", "II", "III", "IV", "V", "VI", "VII", "GAR", "BGA", "KSP", "PKS"]);

/** "SEI BUATAN" → "Sei Buatan"; singkatan & angka Romawi tetap kapital. */
export function titleCaseName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z0-9]+)\b/g, (w) => (KEEP_UPPER.has(w.toUpperCase()) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)));
}

function companyShort(company: string): string {
  const c = company
    .trim()
    .replace(/^PT\.?\s+/i, "")
    .replace(/\s+(TBK|PTE\.?\s*LTD|HOLDINGS|BERHAD|SDN\.?\s*BHD)\b.*$/i, "")
    .replace(/^PERKEBUNAN NUSANTARA\s+/i, "PTPN ");
  return /^unknown$/i.test(c) ? "" : titleCaseName(c);
}

/**
 * Nama Mill untuk pengguna: perusahaan dulu (cara survei & lapangan menyebut
 * Mill), nama PKS UML di belakang — "PTPN V · Sei Buatan", "Teguh Karsa
 * Wanalestari · Bunga Raya". Nama PKS yang sudah memuat nama PT cukup sekali.
 */
export function millLabel(m: Pick<ScMill, "name" | "company">): string {
  const company = companyShort(m.company);
  const mill = titleCaseName(m.name);
  if (!company) return mill;
  if (mill.toUpperCase().includes(company.toUpperCase())) return mill;
  if (company.toUpperCase().includes(mill.toUpperCase())) return company;
  return `${company} · ${mill}`;
}

// ---------------------------------------------------------------------------
// Sankey — 3 bagian: Lembaga → Offtaker (Agen · RAMP · KT/Koperasi) → Mill.
// Kolom indeks 2 sengaja tak dipakai lagi (owner 2026-10-06: agen, RAMP, KT
// satu bagian); rantai Agen → RAMP tampil sebagai SATU node gabungan.
// ---------------------------------------------------------------------------

export const SANKEY_COLUMNS = ["Lembaga", "Offtaker · Agen · RAMP · KT/Koperasi", "RAMP", "Mill"] as const;

export interface SankeyNode {
  id: string;
  column: 0 | 1 | 2 | 3;
  label: string;
  /** Subjudul pendek (tipe offtaker, status PKS, kode Lembaga). */
  sub: string;
  value: number;
  /** Jumlah entitas yang dilipat ke node "lainnya" (0 = node biasa). */
  folded: number;
  isUl: boolean;
  millStatus: MillStatus | null;
  groupCode: string | null;
}

export interface SankeyLink {
  source: string;
  target: string;
  channel: SupplyChannel;
  value: number;
}

export interface SankeyPath {
  nodes: string[];
  links: string[];
  channel: SupplyChannel;
  ton: number;
  toUlTon: number;
}

export interface SankeyGraph {
  nodes: SankeyNode[];
  links: SankeyLink[];
  /**
   * Jalur utuh (unik) Lembaga → … → Mill: id node & kunci pita yang dilewati.
   * Dipakai menyorot seluruh hulu-hilir saat satu node/pita disorot, dan
   * sebagai baris tab Jalur / Tabel Pohon (`ton` = tonase jalur itu, `toUlTon` =
   * bagian dari record bertanda "Supply to UL" — definisi node Ke Mill UL).
   */
  paths: SankeyPath[];
  totalTon: number;
  /** Record yang tidak ikut (tanpa tonase). */
  skippedRecords: number;
}

/**
 * RINGKAS = offtaker digabung per tipe (Agen, KT/Koperasi, RAMP) sehingga
 * diagram menjawab "Lembaga → lewat jalur apa → Mill mana" tanpa ratusan node;
 * RINCI = tiap agen/RAMP satu node (top-N + "… lain").
 */
export type SankeyMode = "RINGKAS" | "RINCI";

/** Kolom asal Sankey: per Lembaga, atau digabung per Distrik. */
export type SankeyOrigin = "LEMBAGA" | "DISTRIK";

/** Kolom tujuan Sankey: per Mill, atau digabung Ke Mill UL / Bukan ke Mill UL. */
export type SankeyDestination = "MILL" | "UL";

export interface SankeyOptions {
  mode?: SankeyMode;
  origin?: SankeyOrigin;
  destination?: SankeyDestination;
  /** Maks node per kolom 1–3 sebelum sisanya dilipat jadi "… lain". */
  maxPerColumn?: number;
}

export const sankeyLinkKey = (l: Pick<SankeyLink, "source" | "target" | "channel">) => `${l.source}→${l.target}→${l.channel}`;

/** Node gabungan mode Ringkas. */
const GROUP_NODE: Record<string, { label: string; unit: string }> = {
  "G:AGEN": { label: "Agen", unit: "agen" },
  "G:KTKOP": { label: "KT/Koperasi", unit: "KT/koperasi" },
  "G:RAMP": { label: "RAMP", unit: "RAMP" },
  "G:AGEN_RAMP": { label: "Agen → RAMP", unit: "rantai" },
  "G:KTKOP_RAMP": { label: "KT/Koperasi → RAMP", unit: "rantai" },
};

/** Node rantai mode Detail: `C:<pengumpul>><RAMP>`. */
const chainNodeId = (collector: string, ramp: string) => `C:${collector}>${ramp}`;
export const parseChainNodeId = (id: string): { collectorId: string; rampId: string } | null => {
  if (!id.startsWith("C:")) return null;
  const parts = id.slice(2).split(">");
  return parts.length === 2 && parts[0] && parts[1] ? { collectorId: parts[0], rampId: parts[1] } : null;
};

interface PathStep {
  id: string;
  column: 0 | 1 | 2 | 3;
}

export function buildSupplyChainSankey(data: SupplyChainData, records: ScRecord[], options: SankeyOptions = {}): SankeyGraph {
  const maxPerColumn = options.maxPerColumn ?? 12;
  const ringkas = (options.mode ?? "RINGKAS") === "RINGKAS";
  const byDistrict = options.origin === "DISTRIK";
  const byUl = options.destination === "UL";
  const groupMembers = new Map<string, Set<string>>();
  const member = (gid: string, oid: string) => {
    if (!groupMembers.has(gid)) groupMembers.set(gid, new Set());
    groupMembers.get(gid)!.add(oid);
    return gid;
  };
  const offtakers = new Map(data.offtakers.map((o) => [o.id, o]));
  const mills = new Map(data.mills.map((m) => [m.id, m]));
  const groups = new Map(data.groups.map((g) => [g.code, g]));

  const paths: { steps: PathStep[]; channel: SupplyChannel; ton: number; record: ScRecord }[] = [];
  let skippedRecords = 0;
  for (const r of records) {
    const ton = r.supplyTon ?? 0;
    if (!(ton > 0)) {
      skippedRecords++;
      continue;
    }
    const collector = recordCollectorId(r, offtakers);
    const ramp = recordRampId(r, offtakers);
    const district = groups.get(r.groupCode)?.districtName ?? "?";
    const steps: PathStep[] = [{ id: byDistrict ? member(`D:${district}`, r.groupCode) : `L:${r.groupCode}`, column: 0 }];
    // Satu bagian offtaker: pengumpul saja, RAMP saja, atau rantai pengumpul → RAMP sebagai satu node.
    const viaAgen = collector ? offtakers.get(collector)?.type === "AGEN" : false;
    let mid: string | null = null;
    if (collector && ramp) mid = ringkas ? member(viaAgen ? "G:AGEN_RAMP" : "G:KTKOP_RAMP", `${collector}>${ramp}`) : chainNodeId(collector, ramp);
    else if (collector) mid = ringkas ? member(viaAgen ? "G:AGEN" : "G:KTKOP", collector) : `O:${collector}`;
    else if (ramp) mid = ringkas ? member("G:RAMP", ramp) : `O:${ramp}`;
    if (mid) steps.push({ id: mid, column: 1 });
    // Mode UL: tujuan = status "Supply to UL" (definisi yang sama dengan filter UL); Mill kosong tetap terpisah.
    const dest = !r.millId ? UNKNOWN_MILL : byUl ? member(r.toUl ? "U:UL" : "U:NON_UL", r.millId) : `M:${r.millId}`;
    steps.push({ id: dest, column: 3 });
    paths.push({ steps, channel: recordChannel(r, offtakers), ton, record: r });
  }

  // Nilai per node sebelum pelipatan.
  const raw = new Map<string, number>();
  for (const p of paths) for (const s of p.steps) raw.set(s.id, (raw.get(s.id) ?? 0) + p.ton);

  // Pelipatan kolom 1–3: top-N per kolom, sisanya satu node "lain".
  const fold = new Map<string, string>();
  const foldedCount = new Map<string, number>();
  for (const col of [1, 2, 3] as const) {
    const ids = [...new Set(paths.flatMap((p) => p.steps.filter((s) => s.column === col).map((s) => s.id)))]
      .filter((id) => id !== UNKNOWN_MILL && !id.startsWith("G:") && !id.startsWith("U:"))
      .sort((a, b) => (raw.get(b) ?? 0) - (raw.get(a) ?? 0));
    const overflow = ids.slice(maxPerColumn);
    // Satu-satunya sisa tak perlu dilipat.
    if (overflow.length > 1) {
      const otherId = `X:${col}`;
      for (const id of overflow) fold.set(id, otherId);
      foldedCount.set(otherId, overflow.length);
    }
  }
  const mapId = (id: string) => fold.get(id) ?? id;

  const nodes = new Map<string, SankeyNode>();
  const links = new Map<string, SankeyLink>();
  const pathIndex = new Map<string, SankeyPath>();
  const ensureNode = (id: string, column: 0 | 1 | 2 | 3, record: ScRecord) => {
    let n = nodes.get(id);
    if (n) return n;
    if (id.startsWith("X:")) {
      n = { id, column, label: `${column === 1 ? "Offtaker" : "Mill"} lain`, sub: `${foldedCount.get(id)} entitas`, value: 0, folded: foldedCount.get(id) ?? 0, isUl: false, millStatus: null, groupCode: null };
    } else if (id.startsWith("U:")) {
      const n0 = groupMembers.get(id)?.size ?? 0;
      n = { id, column, label: UL_FILTER_LABEL[id.slice(2) as UlFilter], sub: `${n0} Mill`, value: 0, folded: n0, isUl: false, millStatus: null, groupCode: null };
    } else if (id.startsWith("D:")) {
      const n0 = groupMembers.get(id)?.size ?? 0;
      n = { id, column, label: id.slice(2), sub: `${n0} Lembaga`, value: 0, folded: n0, isUl: false, millStatus: null, groupCode: null };
    } else if (id.startsWith("G:")) {
      const g = GROUP_NODE[id];
      n = { id, column, label: g.label, sub: `${groupMembers.get(id)?.size ?? 0} ${g.unit}`, value: 0, folded: groupMembers.get(id)?.size ?? 0, isUl: false, millStatus: null, groupCode: null };
    } else if (id === UNKNOWN_MILL) {
      n = { id, column, label: "Mill tidak diketahui", sub: "kolom Mill kosong / beberapa PT", value: 0, folded: 0, isUl: false, millStatus: "TIDAK_DIKETAHUI", groupCode: null };
    } else if (id.startsWith("L:")) {
      const g = groups.get(id.slice(2));
      n = { id, column, label: g?.abrv ?? id.slice(2), sub: g?.districtName ?? "", value: 0, folded: 0, isUl: false, millStatus: null, groupCode: id.slice(2) };
    } else if (id.startsWith("C:")) {
      const { collectorId, rampId } = parseChainNodeId(id)!;
      const a = offtakers.get(collectorId);
      const b = offtakers.get(rampId);
      const label = `${a?.name ?? collectorId} → ${b?.name ?? rampId}`;
      n = { id, column, label, sub: `${a ? OFFTAKER_TYPE_LABEL[a.type] : "?"} → RAMP · ${a?.district ?? ""}`, value: 0, folded: 0, isUl: false, millStatus: null, groupCode: null };
    } else if (id.startsWith("O:")) {
      const o = offtakers.get(id.slice(2));
      const sub = o ? `${OFFTAKER_TYPE_LABEL[o.type]} · ${o.district}` : "";
      n = { id, column, label: o?.name ?? id.slice(2), sub, value: 0, folded: 0, isUl: false, millStatus: null, groupCode: null };
    } else {
      const m = mills.get(id.slice(2));
      n = {
        id, column, label: m ? millLabel(m) : id.slice(2), sub: MILL_STATUS_LABEL[record.millStatus],
        value: 0, folded: 0, isUl: !!m && isUlMill(m), millStatus: record.millStatus, groupCode: null,
      };
    }
    nodes.set(id, n);
    return n;
  };

  for (const p of paths) {
    const steps = p.steps.map((s) => ({ ...s, id: mapId(s.id) }));
    for (const s of steps) {
      const n = ensureNode(s.id, s.column, p.record);
      if (n.millStatus && p.record.millStatus === "PKS_PASTI" && s.column === 3) {
        n.millStatus = "PKS_PASTI";
        n.sub = MILL_STATUS_LABEL.PKS_PASTI;
      }
    }
    const linkKeys: string[] = [];
    for (let i = 0; i < steps.length - 1; i++) {
      const k = sankeyLinkKey({ source: steps[i].id, target: steps[i + 1].id, channel: p.channel });
      const l = links.get(k) ?? { source: steps[i].id, target: steps[i + 1].id, channel: p.channel, value: 0 };
      l.value += p.ton;
      links.set(k, l);
      linkKeys.push(k);
    }
    const pk = linkKeys.join("|");
    const path = pathIndex.get(pk) ?? { nodes: steps.map((x) => x.id), links: linkKeys, channel: p.channel, ton: 0, toUlTon: 0 };
    path.ton += p.ton;
    if (p.record.toUl) path.toUlTon += p.ton;
    pathIndex.set(pk, path);
  }
  // Nilai node = max(masuk, keluar) — kolom 0 hanya keluar, kolom 3 hanya masuk.
  const inSum = new Map<string, number>();
  const outSum = new Map<string, number>();
  for (const l of links.values()) {
    outSum.set(l.source, (outSum.get(l.source) ?? 0) + l.value);
    inSum.set(l.target, (inSum.get(l.target) ?? 0) + l.value);
  }
  for (const n of nodes.values()) n.value = Math.max(inSum.get(n.id) ?? 0, outSum.get(n.id) ?? 0);

  return {
    nodes: [...nodes.values()],
    links: [...links.values()],
    paths: [...pathIndex.values()],
    totalTon: paths.reduce((a, p) => a + p.ton, 0),
    skippedRecords,
  };
}

export interface LaidOutNode extends SankeyNode {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface LaidOutLink extends SankeyLink {
  width: number;
  /** Titik tengah pita di sisi sumber/target. */
  sy: number;
  ty: number;
  path: string;
}

export interface SankeyLayout {
  nodes: LaidOutNode[];
  links: LaidOutLink[];
  width: number;
  height: number;
}

/**
 * Tata letak Sankey deterministik: kolom tetap, urutan node per kolom diatur
 * barycenter (bobot tonase) beberapa sapuan maju-mundur untuk mengurangi
 * persilangan, tinggi node ∝ tonase dengan skala sama di semua kolom.
 */
export function layoutSankey(
  graph: SankeyGraph,
  { width, height, nodeWidth = 12, nodePadding = 10 }: { width: number; height: number; nodeWidth?: number; nodePadding?: number },
): SankeyLayout {
  const byCol: SankeyNode[][] = [[], [], [], []];
  for (const n of graph.nodes) byCol[n.column].push(n);
  const nonEmptyCols = byCol.map((c, i) => (c.length > 0 ? i : -1)).filter((i) => i >= 0);
  if (nonEmptyCols.length === 0) return { nodes: [], links: [], width, height };

  // Kolom kosong (mis. tak ada RAMP pada filter ini) tidak memakan tempat.
  const colX = new Map<number, number>();
  const step = nonEmptyCols.length > 1 ? (width - nodeWidth) / (nonEmptyCols.length - 1) : 0;
  nonEmptyCols.forEach((c, i) => colX.set(c, i * step));

  const ky = Math.min(
    ...nonEmptyCols.map((c) => {
      const total = byCol[c].reduce((a, n) => a + n.value, 0);
      return total > 0 ? (height - (byCol[c].length - 1) * nodePadding) / total : Infinity;
    }),
  );
  const scale = Number.isFinite(ky) && ky > 0 ? ky : 0;

  const pos = new Map<string, LaidOutNode>();
  const place = (col: number) => {
    const nodes = byCol[col];
    const total = nodes.reduce((a, n) => a + Math.max(n.value * scale, 1), 0) + (nodes.length - 1) * nodePadding;
    let y = Math.max((height - total) / 2, 0);
    for (const n of nodes) {
      const h = Math.max(n.value * scale, 1);
      pos.set(n.id, { ...n, x0: colX.get(col)!, x1: colX.get(col)! + nodeWidth, y0: y, y1: y + h });
      y += h + nodePadding;
    }
  };

  // Awal: urut tonase, node "lain" & Mill tak diketahui selalu paling bawah.
  const tail = (n: SankeyNode) => (n.id.startsWith("X:") || n.id === UNKNOWN_MILL ? 1 : 0);
  for (const c of nonEmptyCols) {
    byCol[c].sort((a, b) => tail(a) - tail(b) || b.value - a.value || a.label.localeCompare(b.label));
    place(c);
  }

  const center = (id: string) => {
    const p = pos.get(id)!;
    return (p.y0 + p.y1) / 2;
  };
  const barySort = (col: number, side: "in" | "out") => {
    const weight = new Map<string, { sum: number; w: number }>();
    for (const l of graph.links) {
      const self = side === "in" ? l.target : l.source;
      const other = side === "in" ? l.source : l.target;
      if (pos.get(self)?.column !== col) continue;
      const acc = weight.get(self) ?? { sum: 0, w: 0 };
      acc.sum += center(other) * l.value;
      acc.w += l.value;
      weight.set(self, acc);
    }
    const key = (n: SankeyNode) => {
      const acc = weight.get(n.id);
      return acc && acc.w > 0 ? acc.sum / acc.w : center(n.id);
    };
    byCol[col].sort((a, b) => tail(a) - tail(b) || key(a) - key(b));
    place(col);
  };
  for (let iter = 0; iter < 4; iter++) {
    for (const c of nonEmptyCols.slice(1)) barySort(c, "in");
    for (const c of nonEmptyCols.slice(0, -1).reverse()) barySort(c, "out");
  }

  // Tumpuk pita di tiap node: keluar diurut posisi target, masuk diurut posisi sumber.
  const outOffset = new Map<string, number>();
  const inOffset = new Map<string, number>();
  const sorted = [...graph.links].sort((a, b) => center(a.target) - center(b.target) || center(a.source) - center(b.source));
  const sy = new Map<SankeyLink, number>();
  for (const l of sorted) {
    const w = l.value * scale;
    const s = pos.get(l.source)!;
    const off = outOffset.get(l.source) ?? 0;
    sy.set(l, s.y0 + off + w / 2);
    outOffset.set(l.source, off + w);
  }
  const links: LaidOutLink[] = [];
  for (const l of [...graph.links].sort((a, b) => center(a.source) - center(b.source) || center(a.target) - center(b.target))) {
    const w = l.value * scale;
    const s = pos.get(l.source)!;
    const t = pos.get(l.target)!;
    const off = inOffset.get(l.target) ?? 0;
    const ty = t.y0 + off + w / 2;
    inOffset.set(l.target, off + w);
    const y0 = sy.get(l)!;
    const x0 = s.x1;
    const x1 = t.x0;
    const xm = (x0 + x1) / 2;
    links.push({ ...l, width: Math.max(w, 0.5), sy: y0, ty, path: `M${x0},${y0}C${xm},${y0} ${xm},${ty} ${x1},${ty}` });
  }

  return { nodes: [...pos.values()], links, width, height };
}

// ---------------------------------------------------------------------------
// Peta — segmen garis antar titik yang diketahui
// ---------------------------------------------------------------------------

export interface FlowPoint {
  key: string;
  kind: "LEMBAGA" | "OFFTAKER" | "MILL";
  lat: number;
  lon: number;
}

/** Kunci unik segmen (dipakai menyorot jaringan entitas terpilih). */
export const flowSegmentKey = (s: Pick<FlowSegment, "from" | "to" | "channel">) => `${s.from.key}|${s.to.key}|${s.channel}`;

export interface FlowSegment {
  from: FlowPoint;
  to: FlowPoint;
  channel: SupplyChannel;
  ton: number;
}

export interface UndrawnSummary {
  /** Mill tak diketahui (kosong / beberapa PT). */
  unknownMillTon: number;
  /** Mill dikenal tapi tanpa koordinat (tak ada di UML). */
  millWithoutPointTon: number;
  /** Lembaga tanpa titik lokasi di MIS — garisnya tak bisa dimulai. */
  groupWithoutPointTon: number;
  /** Tonase yang melewati offtaker tanpa titik — garis dilompatkan ke titik berikutnya. */
  skippedOfftakerTon: number;
  offtakersWithoutPoint: number;
}

/**
 * Garis alir Lembaga → offtaker → RAMP → Mill di peta. Titik yang tak punya
 * koordinat dilompati (garis langsung ke titik berikutnya) dan dicatat di
 * ringkasan "tidak tergambar"; record tanpa Mill bertitik tidak digambar.
 */
export function buildFlowSegments(
  data: SupplyChainData,
  records: ScRecord[],
  { viaOfftakers = true }: { viaOfftakers?: boolean } = {},
): { segments: FlowSegment[]; undrawn: UndrawnSummary } {
  const offtakers = new Map(data.offtakers.map((o) => [o.id, o]));
  const mills = new Map(data.mills.map((m) => [m.id, m]));
  const groups = new Map(data.groups.map((g) => [g.code, g]));
  const undrawn: UndrawnSummary = { unknownMillTon: 0, millWithoutPointTon: 0, groupWithoutPointTon: 0, skippedOfftakerTon: 0, offtakersWithoutPoint: 0 };
  const noPoint = new Set<string>();
  const acc = new Map<string, FlowSegment>();

  for (const r of records) {
    const ton = r.supplyTon ?? 0;
    if (!(ton > 0)) continue;
    const mill = r.millId ? mills.get(r.millId) : undefined;
    if (!mill) {
      undrawn.unknownMillTon += ton;
      continue;
    }
    if (mill.lat == null || mill.lon == null) {
      undrawn.millWithoutPointTon += ton;
      continue;
    }
    const g = groups.get(r.groupCode);
    if (!g || g.lat == null || g.lon == null) {
      undrawn.groupWithoutPointTon += ton;
      continue;
    }
    const pts: FlowPoint[] = [{ key: `L:${g.code}`, kind: "LEMBAGA", lat: g.lat, lon: g.lon }];
    let skipped = false;
    // Mode Ringkas: garis langsung Lembaga → Mill, titik offtaker tidak disinggahi.
    for (const oid of viaOfftakers ? [r.offtakerId, r.nextOfftakerId] : []) {
      const o = oid ? offtakers.get(oid) : undefined;
      if (!o) continue;
      // Koperasi = Lembaga itu sendiri → titiknya sama, tak perlu segmen nol.
      if (o.farmerGroupCode === g.code) continue;
      if (o.lat == null || o.lon == null) {
        skipped = true;
        noPoint.add(o.id);
        continue;
      }
      pts.push({ key: `O:${o.id}`, kind: "OFFTAKER", lat: o.lat, lon: o.lon });
    }
    if (skipped) undrawn.skippedOfftakerTon += ton;
    pts.push({ key: `M:${mill.id}`, kind: "MILL", lat: mill.lat, lon: mill.lon });
    const channel = recordChannel(r, offtakers);
    for (let i = 0; i < pts.length - 1; i++) {
      const k = `${pts[i].key}|${pts[i + 1].key}|${channel}`;
      const s = acc.get(k) ?? { from: pts[i], to: pts[i + 1], channel, ton: 0 };
      s.ton += ton;
      acc.set(k, s);
    }
  }
  undrawn.offtakersWithoutPoint = noPoint.size;
  return { segments: [...acc.values()].sort((a, b) => a.ton - b.ton), undrawn };
}
