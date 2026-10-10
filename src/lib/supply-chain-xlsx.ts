/**
 * Ekspor Excel Dashboard Rantai Pasok (owner 2026-10-10): satu berkas tiga
 * sheet — Jalur (Lembaga × offtaker × Mill), Mill, Lembaga — mengikuti filter
 * aktif. Murni: menghasilkan definisi sheet untuk `exportMultiSheetToExcel`.
 */

import type { ExportSheet } from "@/lib/xlsx";
import {
  CHANNEL_LABEL,
  MILL_BASIS_LABEL,
  MILL_STATUS_LABEL,
  OFFTAKER_TYPE_LABEL,
  GROUP_CATEGORY_LABEL,
  UNKNOWN_MILL_FILTER,
  isUlMill,
  millDistrict,
  millLabel,
  millVolumes,
  recordChannel,
  recordUlTon,
  type ScRecord,
  type SupplyChainData,
  type SupplyChannel,
} from "@/lib/supply-chain-flow";
import { UNKNOWN_MILL_NAME, distanceStats, groupVolumes, millKey, recordDistanceKm } from "@/lib/supply-chain-insights";

const round1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 1000) / 10 : null);
const yesNo = (b: boolean) => (b ? "Ya" : "Tidak");

/** Tiga sheet ekspor dari record terfilter. Jarak = garis lurus (K8), km. */
export function supplyChainExportSheets(records: ScRecord[], data: Pick<SupplyChainData, "groups" | "offtakers" | "mills">): ExportSheet[] {
  const groups = new Map(data.groups.map((g) => [g.code, g]));
  const offtakers = new Map(data.offtakers.map((o) => [o.id, o]));
  const mills = new Map(data.mills.map((m) => [m.id, m]));
  const lk = { groups, offtakers, mills };

  // Sheet Jalur: agregasi per Lembaga × offtaker 1 × offtaker 2 × Mill.
  type Path = { groupCode: string; offtakerId: string | null; nextOfftakerId: string | null; millId: string | null; channel: SupplyChannel; status: ScRecord["millStatus"]; basis: string; toUl: boolean; ton: number; ulTon: number; rows: number; tonKm: number; tonWithKm: number };
  const paths = new Map<string, Path>();
  for (const r of records) {
    const key = [r.groupCode, r.offtakerId ?? "", r.nextOfftakerId ?? "", r.millId ?? "", r.toUl ? "UL" : ""].join("|");
    const p = paths.get(key) ?? { groupCode: r.groupCode, offtakerId: r.offtakerId, nextOfftakerId: r.nextOfftakerId, millId: r.millId, channel: recordChannel(r, offtakers), status: r.millStatus, basis: r.millBasis, toUl: r.toUl, ton: 0, ulTon: 0, rows: 0, tonKm: 0, tonWithKm: 0 };
    const ton = r.supplyTon ?? 0;
    p.ton += ton;
    p.ulTon += recordUlTon(r);
    p.rows += 1;
    // Status naik ke PKS pasti → basisnya ikut dari record yang pasti (kolom Status & Basis tak saling bertentangan).
    if (r.millStatus === "PKS_PASTI" && p.status !== "PKS_PASTI") {
      p.status = "PKS_PASTI";
      p.basis = r.millBasis;
    }
    const km = recordDistanceKm(r, lk);
    if (km != null && ton > 0) {
      p.tonKm += ton * km;
      p.tonWithKm += ton;
    }
    paths.set(key, p);
  }
  const off = (id: string | null) => (id ? offtakers.get(id) : undefined);
  const jalur = [...paths.values()]
    .sort((a, b) => b.ton - a.ton)
    .map((p) => {
      const g = groups.get(p.groupCode);
      const o1 = off(p.offtakerId);
      const o2 = off(p.nextOfftakerId);
      const m = p.millId ? mills.get(p.millId) : undefined;
      return {
        distrik: g?.districtName ?? "",
        kodeLembaga: p.groupCode,
        lembaga: g?.name ?? p.groupCode,
        kategori: g ? GROUP_CATEGORY_LABEL[g.category] : "",
        jalur: CHANNEL_LABEL[p.channel],
        offtaker1Kode: p.offtakerId ?? "",
        offtaker1: o1?.name ?? "",
        offtaker1Tipe: o1 ? OFFTAKER_TYPE_LABEL[o1.type] : "",
        offtaker2Kode: p.nextOfftakerId ?? "",
        offtaker2: o2?.name ?? "",
        offtaker2Tipe: o2 ? OFFTAKER_TYPE_LABEL[o2.type] : "",
        mill: m ? millLabel(m) : UNKNOWN_MILL_NAME,
        perusahaan: m?.company ?? "",
        millDistrik: m ? millDistrict(m) ?? "" : "",
        statusMill: MILL_STATUS_LABEL[p.status],
        basisMill: MILL_BASIS_LABEL[p.basis] ?? p.basis,
        millUl: yesNo(!!m && isUlMill(m)),
        supplyUl: yesNo(p.toUl),
        ton: round1(p.ton),
        tonUl: round1(p.ulTon),
        jarakKm: p.tonWithKm > 0 ? round1(p.tonKm / p.tonWithKm) : null,
        baris: p.rows,
      };
    });

  const total = records.reduce((a, r) => a + (r.supplyTon ?? 0), 0);
  const millDist = distanceStats(records, data, millKey);
  const millRows = millVolumes(records, mills).map((m) => {
    const d = millDist.get(m.millId ?? UNKNOWN_MILL_FILTER);
    return {
      mill: m.name,
      perusahaan: m.company ?? "",
      distrik: m.district ?? "",
      status: MILL_STATUS_LABEL[m.status],
      basis: MILL_BASIS_LABEL[m.basis] ?? m.basis,
      ul: yesNo(m.isUl),
      ton: round1(m.ton),
      porsi: pct(m.ton, total),
      tonUl: round1(m.ulTon),
      lembaga: m.groupCount,
      offtaker: m.offtakerCount,
      jarakRata: round1(d?.avgKm ?? null),
      jarakMaks: round1(d?.maxKm ?? null),
    };
  });

  const groupRows = groupVolumes(records, data).map((g) => ({
    distrik: g.district,
    kode: g.code,
    lembaga: g.name,
    singkatan: g.abrv,
    kategori: GROUP_CATEGORY_LABEL[g.category],
    ton: round1(g.ton),
    porsi: pct(g.ton, total),
    tonUl: round1(g.ulTon),
    pctUl: pct(g.ulTon, g.ton),
    pctPasti: pct(g.pastiTon, g.ton),
    offtaker: g.offtakerCount,
    offtakerUtama: g.mainOfftaker ? `${g.mainOfftaker.name} (${OFFTAKER_TYPE_LABEL[g.mainOfftaker.type]})` : "",
    pctOfftakerUtama: g.mainOfftaker ? pct(g.mainOfftaker.ton, g.ton) : null,
    mill: g.millCount,
    millUtama: g.mainMill?.name ?? "",
    pctMillUtama: g.mainMill ? pct(g.mainMill.ton, g.ton) : null,
    jarakRata: round1(g.avgKm),
    jarakMaks: round1(g.maxKm),
  }));

  return [
    {
      name: "Jalur",
      columns: [
        { header: "Distrik", key: "distrik" },
        { header: "Kode Lembaga", key: "kodeLembaga" },
        { header: "Lembaga", key: "lembaga" },
        { header: "Kategori", key: "kategori" },
        { header: "Jalur", key: "jalur" },
        { header: "Kode Offtaker 1", key: "offtaker1Kode" },
        { header: "Offtaker 1", key: "offtaker1" },
        { header: "Tipe Offtaker 1", key: "offtaker1Tipe" },
        { header: "Kode Offtaker 2", key: "offtaker2Kode" },
        { header: "Offtaker 2", key: "offtaker2" },
        { header: "Tipe Offtaker 2", key: "offtaker2Tipe" },
        { header: "Mill", key: "mill" },
        { header: "Perusahaan", key: "perusahaan" },
        { header: "Distrik Mill", key: "millDistrik" },
        { header: "Status Mill", key: "statusMill" },
        { header: "Basis Pemetaan Mill", key: "basisMill" },
        { header: "Mill Pemasok UL", key: "millUl" },
        { header: "Supply to UL", key: "supplyUl" },
        { header: "Tonase (t)", key: "ton" },
        { header: "Tonase ke UL (t)", key: "tonUl" },
        { header: "Jarak Garis Lurus (km)", key: "jarakKm" },
        { header: "Baris Survei", key: "baris" },
      ],
      data: jalur,
    },
    {
      name: "Mill",
      columns: [
        { header: "Mill", key: "mill" },
        { header: "Perusahaan", key: "perusahaan" },
        { header: "Distrik", key: "distrik" },
        { header: "Status", key: "status" },
        { header: "Basis Pemetaan", key: "basis" },
        { header: "Pemasok UL", key: "ul" },
        { header: "Tonase (t)", key: "ton" },
        { header: "Porsi (%)", key: "porsi" },
        { header: "Tonase ke UL (t)", key: "tonUl" },
        { header: "Jumlah Lembaga", key: "lembaga" },
        { header: "Jumlah Offtaker", key: "offtaker" },
        { header: "Jarak Rata-rata (km)", key: "jarakRata" },
        { header: "Jarak Maksimum (km)", key: "jarakMaks" },
      ],
      data: millRows,
    },
    {
      name: "Lembaga",
      columns: [
        { header: "Distrik", key: "distrik" },
        { header: "Kode", key: "kode" },
        { header: "Lembaga", key: "lembaga" },
        { header: "Singkatan", key: "singkatan" },
        { header: "Kategori", key: "kategori" },
        { header: "Tonase (t)", key: "ton" },
        { header: "Porsi (%)", key: "porsi" },
        { header: "Tonase ke UL (t)", key: "tonUl" },
        { header: "% ke UL", key: "pctUl" },
        { header: "% PKS Pasti", key: "pctPasti" },
        { header: "Jumlah Offtaker", key: "offtaker" },
        { header: "Offtaker Utama", key: "offtakerUtama" },
        { header: "% Offtaker Utama", key: "pctOfftakerUtama" },
        { header: "Jumlah Mill", key: "mill" },
        { header: "Mill Utama", key: "millUtama" },
        { header: "% Mill Utama", key: "pctMillUtama" },
        { header: "Jarak Rata-rata (km)", key: "jarakRata" },
        { header: "Jarak Maksimum (km)", key: "jarakMaks" },
      ],
      data: groupRows,
    },
  ];
}

/** Nama berkas: tahun + ringkasan filter, tanpa spasi. */
export function supplyChainExportFilename(year: number | null, filterParts: string[]): string {
  const slug = filterParts
    .map((p) => p.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean)
    .join("_");
  return `rantai-pasok_${year ?? "semua"}${slug ? `_${slug}` : ""}`;
}
