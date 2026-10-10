/**
 * Peta Rantai Pasok — geometri & ringkasan murni (owner 2026-10-10): garis
 * lengkung agar aliran ke Mill yang sama tak saling tindih, skala tebal garis
 * untuk legenda, dan daftar entitas yang tidak tergambar (bernama, bukan hanya
 * tonase). Tanpa React/MapLibre — dipakai klien peta dan test.
 */

import { OFFTAKER_TYPE_LABEL, millLabel, recordCollectorId, recordRampId, recordWaypointOfftakers, type OfftakerType, type ScOfftaker, type ScRecord, type SupplyChainData } from "@/lib/supply-chain-flow";

export type LonLat = [number, number];

/** Lengkungan garis alir: 0 = lurus; 0,15 = kontrol bezier 15 % panjang garis ke kiri arah aliran. */
export const FLOW_BEND = 0.15;

/**
 * Koordinat kurva bezier kuadrat A → B. Titik kontrol di tengah, digeser tegak
 * lurus ke **kiri** arah aliran — A → B dan B → A melengkung ke sisi berlawanan
 * sehingga aliran dua arah tetap terbedakan. Titik berimpit → dua titik sama.
 */
export function arcCoordinates(a: LonLat, b: LonLat, bend = FLOW_BEND, steps = 24): LonLat[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0 || bend === 0) return [a, b];
  const mid: LonLat = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const ctrl: LonLat = [mid[0] - (dy / len) * bend * len, mid[1] + (dx / len) * bend * len];
  const pts: LonLat[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * ctrl[0] + t * t * b[0], u * u * a[1] + 2 * u * t * ctrl[1] + t * t * b[1]]);
  }
  return pts;
}

/** Tebal garis (px) ∝ √tonase relatif terhadap segmen terbesar — satu rumus untuk peta & legenda. */
export const flowLineWidth = (ton: number, maxTon: number) => 1.5 + Math.sqrt(ton / Math.max(1, maxTon)) * 12;

/** Bulatkan ke 1 angka penting (1.234 → 1.000; 8.700 → 9.000) untuk label legenda. */
export function niceTon(n: number): number {
  if (!(n > 0)) return 0;
  const mag = 10 ** Math.floor(Math.log10(n));
  return Math.round(n / mag) * mag;
}

/** Tiga contoh tebal garis untuk legenda: kecil · sedang · terbesar. */
export function widthScaleSamples(maxTon: number): { ton: number; width: number }[] {
  if (!(maxTon > 0)) return [];
  const tons = [...new Set([niceTon(maxTon / 20), niceTon(maxTon / 4), niceTon(maxTon)].filter((t) => t > 0))];
  return tons.map((ton) => ({ ton, width: flowLineWidth(Math.min(ton, maxTon), maxTon) }));
}

export interface UndrawnEntities {
  /** Mill dikenal tapi tanpa koordinat (tak ada di UML). */
  mills: { id: string; name: string; ton: number }[];
  /** Lembaga tanpa titik lokasi di MIS. */
  groups: { code: string; abrv: string; ton: number }[];
  /** Agen/RAMP/KT yang dilewati TBS tapi tanpa titik — garis dilompatkan. */
  offtakers: { id: string; name: string; type: OfftakerType; ton: number }[];
}

/**
 * Entitas bernama yang tidak bisa digambar, urut tonase — pelengkap angka
 * `UndrawnSummary`. Bucket-nya **sama persis** dengan `buildFlowSegments`: satu
 * record satu bucket (Mill tak diketahui → Mill tanpa titik → Lembaga tanpa
 * titik), dan offtaker tanpa titik hanya dari record yang garisnya tergambar.
 * Tonase offtaker per offtaker — record yang melompati dua offtaker tercatat di
 * keduanya, jadi jumlah daftar offtaker boleh melebihi angka barisnya.
 */
export function undrawnEntities(data: Pick<SupplyChainData, "groups" | "offtakers" | "mills">, records: ScRecord[], { viaOfftakers = true } = {}): UndrawnEntities {
  const groups = new Map(data.groups.map((g) => [g.code, g]));
  const offtakers = new Map(data.offtakers.map((o) => [o.id, o]));
  const mills = new Map(data.mills.map((m) => [m.id, m]));
  const millTon = new Map<string, number>();
  const groupTon = new Map<string, number>();
  const offTon = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string, t: number) => m.set(k, (m.get(k) ?? 0) + t);
  for (const r of records) {
    const ton = r.supplyTon ?? 0;
    if (!(ton > 0)) continue;
    const m = r.millId ? mills.get(r.millId) : undefined;
    if (!m) continue;
    if (m.lat == null || m.lon == null) {
      bump(millTon, m.id, ton);
      continue;
    }
    const g = groups.get(r.groupCode);
    if (!g || g.lat == null || g.lon == null) {
      bump(groupTon, r.groupCode, ton);
      continue;
    }
    if (!viaOfftakers) continue;
    for (const o of recordWaypointOfftakers(r, offtakers)) if (o.lat == null || o.lon == null) bump(offTon, o.id, ton);
  }
  const byTon = <T extends { ton: number }>(xs: T[]) => xs.sort((a, b) => b.ton - a.ton);
  return {
    mills: byTon([...millTon].map(([id, ton]) => ({ id, name: millLabel(mills.get(id)!), ton }))),
    groups: byTon([...groupTon].map(([code, ton]) => ({ code, abrv: groups.get(code)?.abrv ?? code, ton }))),
    offtakers: byTon([...offTon].map(([id, ton]) => ({ id, name: offtakers.get(id)?.name ?? id, type: offtakers.get(id)?.type ?? "AGEN", ton }))),
  };
}

/**
 * Patch filter untuk tombol "Jadikan filter" popup offtaker: `ramp` untuk RAMP,
 * `agen` untuk lainnya — hanya bila filter itu benar-benar menangkap record yang
 * dilalui offtaker ini. Offtaker yang cuma tercatat sebagai pembeli kedua
 * non-RAMP (mis. KUD setelah agen) tak terwakili filter Agen/RAMP → null, agar
 * tombol tidak menghasilkan peta kosong (review 2026-10-10).
 */
export function offtakerFilterPatch(id: string, records: ScRecord[], offtakers: Map<string, ScOfftaker>): { agen: string } | { ramp: string } | null {
  const o = offtakers.get(id);
  if (!o) return null;
  const isRamp = o.type === "RAMP";
  const hit = records.some((r) => (isRamp ? recordRampId(r, offtakers) : recordCollectorId(r, offtakers)) === id);
  return hit ? (isRamp ? { ramp: id } : { agen: id }) : null;
}

/** Label tipe offtaker untuk tooltip/popup. */
export const offtakerTypeLabel = (t: OfftakerType) => OFFTAKER_TYPE_LABEL[t];
