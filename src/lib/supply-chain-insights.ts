/**
 * Dashboard Rantai Pasok — agregasi lanjutan (owner 2026-10-10): jarak garis
 * lurus (K8 #379, dari koordinat tabel CSV, tanpa DB), volume per Lembaga
 * (padanan hulu tabel Volume per Mill), dan sorotan otomatis. Murni tanpa I/O
 * dan tanpa format angka — dipakai layar dan ekspor Excel.
 */

import { haversineMeters } from "@/lib/geo";
import {
  UNKNOWN_MILL_FILTER,
  isUlMill,
  millLabel,
  recordUlTon,
  recordWaypointOfftakers,
  type GroupCategory,
  type OfftakerType,
  type ScGroup,
  type ScMill,
  type ScOfftaker,
  type ScRecord,
  type SupplyChainData,
} from "@/lib/supply-chain-flow";

export const UNKNOWN_MILL_NAME = "Mill tidak diketahui";

interface Lookups {
  groups: Map<string, ScGroup>;
  offtakers: Map<string, ScOfftaker>;
  mills: Map<string, ScMill>;
}

const lookups = (data: Pick<SupplyChainData, "groups" | "offtakers" | "mills">): Lookups => ({
  groups: new Map(data.groups.map((g) => [g.code, g])),
  offtakers: new Map(data.offtakers.map((o) => [o.id, o])),
  mills: new Map(data.mills.map((m) => [m.id, m])),
});

// ---------------------------------------------------------------------------
// Jarak garis lurus
// ---------------------------------------------------------------------------

/**
 * Jarak garis lurus satu record (km) sepanjang garis Peta Rantai Pasok mode
 * Detail: Lembaga → offtaker (`recordWaypointOfftakers`) → Mill. Offtaker tanpa
 * koordinat dilompati; null bila Lembaga atau Mill tidak berkoordinat. Bukan
 * jarak tempuh jalan.
 */
export function recordDistanceKm(r: ScRecord, { groups, offtakers, mills }: Lookups): number | null {
  const g = groups.get(r.groupCode);
  const m = r.millId ? mills.get(r.millId) : undefined;
  if (!g || g.lat == null || g.lon == null || !m || m.lat == null || m.lon == null) return null;
  const pts: [number, number][] = [[g.lon, g.lat]];
  for (const o of recordWaypointOfftakers(r, offtakers)) {
    if (o.lat != null && o.lon != null) pts.push([o.lon, o.lat]);
  }
  pts.push([m.lon, m.lat]);
  let meters = 0;
  for (let i = 0; i < pts.length - 1; i++) meters += haversineMeters(pts[i], pts[i + 1]);
  return meters / 1000;
}

export interface DistanceStat {
  /** Rata-rata tertimbang tonase (km); null bila tak ada record berjarak. */
  avgKm: number | null;
  maxKm: number | null;
  /** Tonase yang jaraknya bisa dihitung — pembanding terhadap total. */
  tonWithDistance: number;
}

const emptyStat = (): DistanceStat => ({ avgKm: null, maxKm: null, tonWithDistance: 0 });

/** Statistik jarak per kunci (Mill, Lembaga, …) — rata-rata tertimbang tonase. */
export function distanceStats(records: ScRecord[], data: Pick<SupplyChainData, "groups" | "offtakers" | "mills">, keyOf: (r: ScRecord) => string | null): Map<string, DistanceStat> {
  const lk = lookups(data);
  const acc = new Map<string, DistanceStat & { tonKm: number }>();
  for (const r of records) {
    const ton = r.supplyTon ?? 0;
    const key = keyOf(r);
    if (!(ton > 0) || key == null) continue;
    const km = recordDistanceKm(r, lk);
    if (km == null) continue;
    const s = acc.get(key) ?? { ...emptyStat(), tonKm: 0 };
    s.tonKm += ton * km;
    s.tonWithDistance += ton;
    s.maxKm = Math.max(s.maxKm ?? 0, km);
    acc.set(key, s);
  }
  return new Map([...acc.entries()].map(([k, s]) => [k, { avgKm: s.tonWithDistance > 0 ? s.tonKm / s.tonWithDistance : null, maxKm: s.maxKm, tonWithDistance: s.tonWithDistance }]));
}

/** Kunci statistik jarak keseluruhan (`distanceStats(…, () => ALL_KEY)`). */
export const ALL_KEY = "*";
export const millKey = (r: ScRecord) => r.millId ?? UNKNOWN_MILL_FILTER;

// ---------------------------------------------------------------------------
// Volume per Lembaga
// ---------------------------------------------------------------------------

export interface GroupVolumeRow {
  code: string;
  abrv: string;
  name: string;
  district: string;
  category: GroupCategory;
  ton: number;
  ulTon: number;
  /** Tonase yang PKS-nya pasti (disebut atau dipetakan dari nama PT). */
  pastiTon: number;
  offtakerCount: number;
  millCount: number;
  /**
   * Offtaker pertama terbesar (kolom `offtakerId`); null bila semua TBS langsung ke Mill.
   * `isSelf` = koperasi Lembaga itu sendiri (penjualan kolektif) — bukan ketergantungan pada pihak luar.
   */
  mainOfftaker: { id: string; name: string; type: OfftakerType; ton: number; isSelf: boolean } | null;
  /**
   * Pembeli **luar** terbesar: offtaker pertama di jalur yang bukan koperasi Lembaga itu
   * sendiri (`recordWaypointOfftakers`), jadi rantai koperasi sendiri → RAMP terhitung ke
   * RAMP-nya. null bila semua TBS langsung ke Mill atau lewat koperasi sendiri langsung ke
   * Mill. Dasar ketergantungan (review 2026-10-10 putaran 2).
   */
  mainExternal: { id: string; name: string; type: OfftakerType; ton: number } | null;
  /** Mill terbesar, termasuk "Mill tidak diketahui" (millId null). */
  mainMill: { millId: string | null; name: string; isUl: boolean; ton: number } | null;
  avgKm: number | null;
  maxKm: number | null;
}

/** Volume per Lembaga, urut tonase — padanan hulu `millVolumes`. */
export function groupVolumes(records: ScRecord[], data: Pick<SupplyChainData, "groups" | "offtakers" | "mills">): GroupVolumeRow[] {
  const lk = lookups(data);
  const dist = distanceStats(records, data, (r) => r.groupCode);
  type Acc = Omit<GroupVolumeRow, "offtakerCount" | "millCount" | "mainOfftaker" | "mainExternal" | "mainMill" | "avgKm" | "maxKm"> & {
    offs: Map<string, number>;
    external: Map<string, number>;
    millsTon: Map<string, number>;
    millIds: Set<string>;
  };
  const acc = new Map<string, Acc>();
  for (const r of records) {
    let a = acc.get(r.groupCode);
    if (!a) {
      const g = lk.groups.get(r.groupCode);
      a = {
        code: r.groupCode, abrv: g?.abrv ?? r.groupCode, name: g?.name ?? r.groupCode, district: g?.districtName ?? "?", category: g?.category ?? "SWADAYA",
        ton: 0, ulTon: 0, pastiTon: 0, offs: new Map(), external: new Map(), millsTon: new Map(), millIds: new Set(),
      };
      acc.set(r.groupCode, a);
    }
    const ton = r.supplyTon ?? 0;
    a.ton += ton;
    a.ulTon += recordUlTon(r);
    if (r.millStatus === "PKS_PASTI") a.pastiTon += ton;
    if (r.offtakerId) a.offs.set(r.offtakerId, (a.offs.get(r.offtakerId) ?? 0) + ton);
    if (r.nextOfftakerId && !a.offs.has(r.nextOfftakerId)) a.offs.set(r.nextOfftakerId, 0);
    const ext = recordWaypointOfftakers(r, lk.offtakers)[0];
    if (ext) a.external.set(ext.id, (a.external.get(ext.id) ?? 0) + ton);
    const mk = r.millId ?? UNKNOWN_MILL_FILTER;
    a.millsTon.set(mk, (a.millsTon.get(mk) ?? 0) + ton);
    if (r.millId) a.millIds.add(r.millId);
  }
  const top = <K,>(m: Map<K, number>): [K, number] | null => {
    let best: [K, number] | null = null;
    for (const e of m) if (!best || e[1] > best[1]) best = e;
    return best;
  };
  return [...acc.values()]
    .map(({ offs, external, millsTon, millIds, ...row }) => {
      const o = top(offs);
      const off = o ? lk.offtakers.get(o[0]) : undefined;
      const x = top(external);
      const xOff = x ? lk.offtakers.get(x[0]) : undefined;
      const mm = top(millsTon);
      const mill = mm && mm[0] !== UNKNOWN_MILL_FILTER ? lk.mills.get(mm[0]) : undefined;
      const d = dist.get(row.code);
      return {
        ...row,
        offtakerCount: offs.size,
        millCount: millIds.size,
        mainOfftaker: o && o[1] > 0 ? { id: o[0], name: off?.name ?? o[0], type: off?.type ?? "AGEN", ton: o[1], isSelf: off?.farmerGroupCode === row.code } : null,
        mainExternal: x && x[1] > 0 ? { id: x[0], name: xOff?.name ?? x[0], type: xOff?.type ?? "AGEN", ton: x[1] } : null,
        mainMill: mm ? { millId: mm[0] === UNKNOWN_MILL_FILTER ? null : mm[0], name: mill ? millLabel(mill) : UNKNOWN_MILL_NAME, isUl: !!mill && isUlMill(mill), ton: mm[1] } : null,
        avgKm: d?.avgKm ?? null,
        maxKm: d?.maxKm ?? null,
      };
    })
    .sort((a, b) => b.ton - a.ton || a.abrv.localeCompare(b.abrv));
}

// ---------------------------------------------------------------------------
// Sorotan otomatis
// ---------------------------------------------------------------------------

/** Lembaga dianggap bergantung bila ≥ 80% tonasenya lewat satu offtaker pihak luar — koperasi Lembaga sendiri tidak dihitung (owner 2026-10-10). */
export const DEPENDENCY_THRESHOLD = 0.8;
/** Lembaga "sebagian besar tak pasti" bila ≥ 50% tonasenya tanpa PKS pasti. */
export const UNCERTAIN_THRESHOLD = 0.5;

/** Satu batas untuk Sorotan Kepastian dan sorotan kuning kolom PKS pasti di tabel Lembaga. */
export const isMostlyUncertain = (g: Pick<GroupVolumeRow, "ton" | "pastiTon">, threshold = UNCERTAIN_THRESHOLD) =>
  g.ton > 0 && (g.ton - g.pastiTon) / g.ton >= threshold;

/** Porsi pembeli luar terbesar (0–1); null bila tak ada pembeli luar. Dasar ⚠ ketergantungan. */
export const externalShare = (g: Pick<GroupVolumeRow, "ton" | "mainExternal">) => (g.ton > 0 && g.mainExternal ? g.mainExternal.ton / g.ton : null);

export type SupplyChainInsight =
  | { kind: "KONSENTRASI"; topMill: { millId: string; name: string; isUl: boolean }; topShare: number; top3Share: number; millCount: number }
  | { kind: "KETERGANTUNGAN"; threshold: number; groups: { code: string; abrv: string; offtakerName: string; share: number }[] }
  | { kind: "KEPASTIAN"; threshold: number; uncertainShare: number; unknownShare: number; groups: { code: string; abrv: string; share: number }[] }
  | { kind: "JARAK"; avgKm: number | null; coveredShare: number; farthestMill: { millId: string; name: string; avgKm: number } | null };

/**
 * Empat sorotan atas record yang sedang terfilter (Konsentrasi dilewati bila tak
 * ada Mill bernama). Angka mentah (0–1 untuk porsi) — layar yang memformat.
 * Kosong bila tidak ada tonase.
 */
export function supplyChainInsights(
  records: ScRecord[],
  data: Pick<SupplyChainData, "groups" | "offtakers" | "mills">,
  { dependencyThreshold = DEPENDENCY_THRESHOLD, uncertainThreshold = UNCERTAIN_THRESHOLD } = {},
): SupplyChainInsight[] {
  const lk = lookups(data);
  const total = records.reduce((a, r) => a + (r.supplyTon ?? 0), 0);
  if (!(total > 0)) return [];

  // Konsentrasi ke Mill bernama — "Mill tidak diketahui" bukan Mill, jadi tidak ikut peringkat
  // (porsinya tetap dihitung terhadap total TBS dan dilaporkan di sorotan Kepastian).
  const byMill = new Map<string, number>();
  for (const r of records) if (r.millId) byMill.set(r.millId, (byMill.get(r.millId) ?? 0) + (r.supplyTon ?? 0));
  const mills = [...byMill.entries()].filter(([, t]) => t > 0).sort((a, b) => b[1] - a[1]);
  const top = mills[0];
  const topMill = top ? lk.mills.get(top[0]) : undefined;
  const konsentrasi: SupplyChainInsight | null = top
    ? {
        kind: "KONSENTRASI",
        topMill: { millId: top[0], name: topMill ? millLabel(topMill) : top[0], isUl: !!topMill && isUlMill(topMill) },
        topShare: top[1] / total,
        top3Share: mills.slice(0, 3).reduce((a, m) => a + m[1], 0) / total,
        millCount: mills.length,
      }
    : null;

  // Ketergantungan & kepastian per Lembaga.
  const groups = groupVolumes(records, data);
  const dependent = groups
    // Pembeli luar (koperasi Lembaga sendiri dilewati, pembeli di belakangnya terhitung).
    .filter((g) => (externalShare(g) ?? 0) >= dependencyThreshold)
    .map((g) => ({ code: g.code, abrv: g.abrv, offtakerName: g.mainExternal!.name, share: externalShare(g)! }))
    .sort((a, b) => b.share - a.share || a.abrv.localeCompare(b.abrv));
  const uncertainTon = records.filter((r) => r.millStatus !== "PKS_PASTI").reduce((a, r) => a + (r.supplyTon ?? 0), 0);
  const unknownTon = records.filter((r) => r.millStatus === "TIDAK_DIKETAHUI").reduce((a, r) => a + (r.supplyTon ?? 0), 0);
  const uncertainGroups = groups
    .filter((g) => isMostlyUncertain(g, uncertainThreshold))
    .map((g) => ({ code: g.code, abrv: g.abrv, share: (g.ton - g.pastiTon) / g.ton }))
    .sort((a, b) => b.share - a.share || a.abrv.localeCompare(b.abrv));

  // Jarak.
  const all = distanceStats(records, data, () => ALL_KEY).get(ALL_KEY) ?? emptyStat();
  const perMill = distanceStats(records, data, (r) => r.millId);
  let farthest: { millId: string; name: string; avgKm: number } | null = null;
  for (const [id, s] of perMill) {
    const m = lk.mills.get(id);
    if (m && s.avgKm != null && (!farthest || s.avgKm > farthest.avgKm)) farthest = { millId: id, name: millLabel(m), avgKm: s.avgKm };
  }

  return [
    ...(konsentrasi ? [konsentrasi] : []),
    { kind: "KETERGANTUNGAN", threshold: dependencyThreshold, groups: dependent },
    { kind: "KEPASTIAN", threshold: uncertainThreshold, uncertainShare: uncertainTon / total, unknownShare: unknownTon / total, groups: uncertainGroups },
    { kind: "JARAK", avgKm: all.avgKm, coveredShare: all.tonWithDistance / total, farthestMill: farthest },
  ];
}
