import type { MultiPolygon, Polygon } from "geojson";
import { buildLayerReportDoc, type LayerReportInput } from "@/lib/layer-report-pdf";
import { isNktAffected, landNktStatusLabel, nktCategoryShort, NKT_CATEGORY_DESCRIPTIONS, type NktCategoryCode } from "@/lib/land-parcel-satellite-format";

/**
 * Laporan NKT per Lembaga (#332) — builder MURNI di atas `buildLayerReportDoc`:
 * kop Lembaga + KPI, peta seluruh lahan Lembaga (lahan NKT merah bernomor,
 * lahan lain ungu tipis, halaman rinci per klaster), tabel lahan NKT, dan
 * ringkasan per kategori. Data dari `getNktReportData` (report.ts).
 */
export interface NktReportParcel {
  id: string;
  parcelId: string;
  farmerName: string;
  farmerCode: string;
  subGroupLv2: string | null;
  blok: string | null;
  area: number | null;
  geometry: unknown;
  nkt: {
    status: string;
    categories: string[];
    affectedAreaHa: number | null;
    affectedLengthM: number | null;
    assessedAt: string | null;
    assessor: string | null;
    source: string | null;
    notes: string | null;
  } | null;
}

export interface NktReportData {
  group: { name: string; code: string | null; abrv: string | null; districtName: string | null };
  parcels: NktReportParcel[];
  /** Patok yang salah satu lahan pemakainya kena NKT. */
  markersNkt: number;
  printedAt: string;
}

const RED: [number, number, number] = [220, 38, 38];
const fmtHa = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n));
const fmtNum = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const fmtDate = (iso: string | null) => (iso ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(iso)) : "—");

function isPolygon(g: unknown): g is Polygon | MultiPolygon {
  if (!g || typeof g !== "object") return false;
  const t = (g as { type?: string }).type;
  return t === "Polygon" || t === "MultiPolygon";
}

/** Angka ringkasan yang juga dipakai KPI — dipisah agar teruji tanpa jsPDF. */
export function summarizeNktReport(data: NktReportData) {
  const assessed = data.parcels.filter((p) => p.nkt);
  const affected = data.parcels.filter((p) => isNktAffected(p.nkt?.status));
  const clean = assessed.filter((p) => !isNktAffected(p.nkt?.status));
  const areaAffectedParcels = affected.reduce((s, p) => s + (p.area ?? 0), 0);
  const nktArea = affected.reduce((s, p) => s + (p.nkt?.affectedAreaHa ?? 0), 0);
  const nktLength = affected.reduce((s, p) => s + (p.nkt?.affectedLengthM ?? 0), 0);
  const byCategory = new Map<string, number>();
  for (const p of affected) for (const c of p.nkt?.categories ?? []) byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
  const assessors = [...new Set(affected.map((p) => [p.nkt?.assessor, p.nkt?.source].filter(Boolean).join(" — ")).filter(Boolean))];
  return { total: data.parcels.length, assessed: assessed.length, affected: affected.length, clean: clean.length, unassessed: data.parcels.length - assessed.length, areaAffectedParcels, nktArea, nktLength, byCategory, assessors };
}

export function buildNktReportInput(data: NktReportData): LayerReportInput {
  const s = summarizeNktReport(data);
  const affected = data.parcels.filter((p) => isNktAffected(p.nkt?.status) && isPolygon(p.geometry));
  const affectedRows = data.parcels.filter((p) => isNktAffected(p.nkt?.status));
  const label = data.group.code?.trim() || data.group.name;
  const uniformAssessor = s.assessors.length <= 1;
  const printed = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(data.printedAt));
  return {
    kicker: "SMALLHOLDER HUB · LAPORAN NKT",
    title: `Laporan NKT — ${data.group.name}`,
    subtitle: `${label}${data.group.districtName ? ` · ${data.group.districtName}` : ""} · ${s.assessors.length ? `sumber asesmen: ${s.assessors.join("; ")}` : "sumber asesmen belum dicatat"} · dicetak ${printed}`,
    kpis: [
      { label: "Lahan aktif", value: fmtNum(s.total), note: `${fmtNum(s.unassessed)} belum dinilai` },
      { label: "Sudah dinilai", value: fmtNum(s.assessed), note: `${fmtNum(s.clean)} tidak terdampak` },
      { label: "Lahan NKT", value: fmtNum(s.affected), note: `${fmtHa(s.areaAffectedParcels)} ha luas lahan` },
      { label: "Luas area NKT", value: `${fmtHa(s.nktArea)} ha`, note: "di dalam lahan (Lampiran asesmen)" },
      { label: "Panjang", value: `${fmtNum(Math.round(s.nktLength))} m`, note: "sempadan/koridor NKT" },
      { label: "Patok NKT", value: fmtNum(data.markersNkt), note: "patok lahan NKT (turunan)" },
    ],
    fc: {
      type: "FeatureCollection",
      features: affected.map((p) => ({ type: "Feature", geometry: p.geometry as Polygon | MultiPolygon, properties: { parcelId: p.parcelId, farmerName: p.farmerName } })),
    },
    context: {
      fc: {
        type: "FeatureCollection",
        features: data.parcels.filter((p) => isPolygon(p.geometry)).map((p) => ({ type: "Feature", geometry: p.geometry as Polygon | MultiPolygon, properties: { farmerName: p.farmerName } })),
      },
      labelOf: (p) => (typeof p.farmerName === "string" ? p.farmerName : null),
    },
    style: { color: RED, numbered: true, labelOf: (p) => (typeof p.farmerName === "string" ? p.farmerName : null) },
    legend: [{ color: RED, label: "Lahan NKT" }, { color: [239, 230, 250], label: "Lahan lain" }],
    columns: [
      { header: "No", key: "no", align: "right", width: 9 },
      { header: "ID Lahan", key: "parcelId", width: 44 },
      { header: "Petani", key: "farmerName", width: 36 },
      { header: "ID Petani", key: "farmerCode", width: 40 },
      { header: "KT / Blok", key: "ktBlok", width: 20 },
      { header: "Luas (ha)", key: "area", align: "right", width: 16 },
      { header: "Status", key: "status", width: 24 },
      { header: "Kategori", key: "categories", width: 22 },
      { header: "Luas NKT (ha)", key: "nktArea", align: "right", width: 18 },
      { header: "Panjang (m)", key: "nktLength", align: "right", width: 18 },
      // Asesor/sumber seragam sudah disebut di kop → kolom cukup tanggal + catatan (hemat, tak berulang).
      { header: uniformAssessor ? "Tanggal · Catatan" : "Tanggal · Asesor · Catatan", key: "assessed" },
    ],
    rows: affectedRows.map((p, i) => ({
      no: i + 1,
      parcelId: p.parcelId,
      farmerName: p.farmerName,
      farmerCode: p.farmerCode,
      ktBlok: [p.subGroupLv2, p.blok].filter(Boolean).join(" / "),
      area: fmtHa(p.area),
      status: landNktStatusLabel(p.nkt!.status, true),
      categories: (p.nkt!.categories ?? []).map((c) => nktCategoryShort(c as NktCategoryCode)).join(", "),
      nktArea: fmtHa(p.nkt!.affectedAreaHa),
      nktLength: p.nkt!.affectedLengthM != null ? fmtNum(Math.round(p.nkt!.affectedLengthM)) : "—",
      assessed: [fmtDate(p.nkt!.assessedAt), uniformAssessor ? null : [p.nkt!.assessor, p.nkt!.source].filter(Boolean).join(" — "), p.nkt!.notes].filter((x) => x && x !== "—").join(" · ") || "—",
    })),
    extraTables: [
      {
        title: "Ringkasan per kategori NKT",
        columns: [
          { header: "Kategori", key: "cat", width: 30 },
          { header: "Keterangan", key: "desc" },
          { header: "Jumlah lahan", key: "n", align: "right", width: 26 },
        ],
        rows: [...s.byCategory.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([cat, n]) => ({
          cat: nktCategoryShort(cat as NktCategoryCode),
          desc: NKT_CATEGORY_DESCRIPTIONS[cat as NktCategoryCode] ?? "",
          n: fmtNum(n),
        })),
      },
    ],
    footnote: "Catatan: Status NKT bersumber dari asesmen yang dicatat di sistem; peta skematis tanpa basemap, bukan bukti kepemilikan legal atas tanah.",
  };
}

export function buildNktReportDoc(data: NktReportData) {
  return buildLayerReportDoc(buildNktReportInput(data));
}

export function nktReportFilename(data: NktReportData): string {
  const safe = (x: string) => x.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const d = new Date(data.printedAt);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `Laporan_NKT_${safe(data.group.code?.trim() || data.group.name)}_${stamp}.pdf`;
}
