"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import type { FeatureCollection } from "geojson";
import {
  RIAU_BBOX,
  confidenceLabel,
  countByConfidence,
  fetchHotspots,
  formatWib,
  hotspotWindowLabel,
  satelliteLabel,
  type HotspotDayRange,
} from "@/app/(admin)/admin/map/parcel/map-hotspot";
import {
  classifyHotspots,
  combinedBbox,
  countHotspotsByGroup,
  countPointsByNamedArea,
  countUniqueInsideByDistrict,
  filterPointsWithinAreas,
  formatExportedAt,
  formatHotspotRange,
  hotspotWindowStart,
  indexBoundaries,
  multiPolygonBbox,
  summarizeFire,
  type FireBoundary,
} from "@/lib/fire-alert";
import type { AdminBoundaryLine } from "@/server/actions/fire-boundary";
import { FireAlertPanel, type FirePrintScope } from "./fire-alert-panel";
import { type FireMapCaptureFn, type FireMapZoomFn } from "./fire-map-canvas";

/** Rasterisasi logo WRI (SVG → PNG 3×) — jsPDF tidak membaca SVG. */
async function rasterizeLogo(): Promise<{ dataUrl: string; widthPx: number; heightPx: number } | null> {
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("logo load failed"));
      img.src = "/images/logo/wri-indonesia.svg";
    });
    const scale = 3;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL("image/png"), widthPx: canvas.width, heightPx: canvas.height };
  } catch {
    return null; // laporan tetap terbit tanpa logo
  }
}

/** TTF Acumin Pro (base64) untuk embed jsPDF — di-cache level modul; gagal → null (fallback helvetica). */
let acuminCache: { regular: string; bold: string; italic: string } | null | undefined;
async function loadAcuminFonts() {
  if (acuminCache !== undefined) return acuminCache;
  try {
    const load = async (path: string) => {
      const res = await fetch(path);
      if (!res.ok) throw new Error(path);
      const bytes = new Uint8Array(await res.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(bin);
    };
    const [regular, bold, italic] = await Promise.all([
      load("/fonts/acumin-pro-regular.ttf"),
      load("/fonts/acumin-pro-bold.ttf"),
      load("/fonts/acumin-pro-italic.ttf"),
    ]);
    acuminCache = { regular, bold, italic };
  } catch {
    acuminCache = null;
  }
  return acuminCache;
}

const FireMapCanvas = dynamic(
  () => import("./fire-map-canvas").then((m) => m.FireMapCanvas),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-muted/30 animate-pulse" />,
  }
);

interface Props {
  boundaries: FireBoundary[];
  /** Garis batas kabupaten (BIG, tersimplifikasi) sebagai konteks peta. */
  adminBoundaries: AdminBoundaryLine[];
  /** PRINT menu Fire Alert — gate seksi Print Map. */
  canPrint: boolean;
  /** HelpHint dirender di server agar markdown Bantuan tak masuk bundle client. */
  helpSlot?: React.ReactNode;
}

export function FireAlertClient({ boundaries, adminBoundaries, canPrint, helpSlot }: Props) {
  const indexed = useMemo(() => indexBoundaries(boundaries), [boundaries]);

  // Default 5 hari — tabel panel memang merekap "5 hari terakhir" (#266).
  const [dayRange, setDayRange] = useState<HotspotDayRange>(5);
  const [classified, setClassified] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [printScope, setPrintScope] = useState<FirePrintScope>("riau");
  const [printing, setPrinting] = useState(false);
  // Lampiran PDF di-capture satu peta per lembaga secara berurutan; pada scope
  // Full Riau saat musim kebakaran itu bisa puluhan lembaga × tunggu tile,
  // jadi progres dan pembatalan wajib ada (#276).
  const [printProgress, setPrintProgress] = useState<{ done: number; total: number } | null>(null);
  const printAbortRef = useRef<AbortController | null>(null);

  // Fetch se-bbox Riau → pangkas ke Provinsi Riau (poligon kabupaten BIG —
  // bbox FIRMS persegi ikut mencakup Malaysia/Sumbar/Jambi) → klasifikasi
  // point-in-polygon di klien (volume kecil).
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchHotspots(RIAU_BBOX, dayRange, Date.now(), controller.signal)
      .then((fc) => {
        setClassified(classifyHotspots(filterPointsWithinAreas(fc, adminBoundaries), indexed));
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.warn("Fire alert fetch failed:", err);
        setClassified(null);
        setLoading(false);
        toast.error("Gagal memuat titik api dari NASA FIRMS");
      });
    return () => controller.abort();
  }, [dayRange, indexed, adminBoundaries]);

  const summary = useMemo(() => (classified ? summarizeFire(classified) : null), [classified]);
  const rows = useMemo(
    () => (classified ? countHotspotsByGroup(classified, boundaries) : countHotspotsByGroup({ type: "FeatureCollection", features: [] }, boundaries)),
    [classified, boundaries]
  );
  const countsByGroup = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.farmerGroupId, r.count])),
    [rows]
  );
  const confInside = useMemo(
    () =>
      countByConfidence(
        classified
          ? {
              type: "FeatureCollection",
              features: classified.features.filter((f) => f.properties?.inBoundary === "in"),
            }
          : null
      ),
    [classified]
  );

  const districts = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of boundaries) map.set(b.districtId, b.districtName);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [boundaries]);

  // Rincian tooltip kartu: titik DALAM boundary per distrik program (agregasi
  // dari rekap lembaga), dan titik LUAR boundary per kabupaten (PiP terhadap
  // poligon BIG distrik program; sisanya "Kab. Lainnya").
  // Titik UNIK per distrik — bukan penjumlahan `rows[].count` yang menghitung
  // titik boundary bersama di tiap pemilik (tooltip harus cocok dgn kartunya).
  const insideByDistrict = useMemo(
    () => (classified ? countUniqueInsideByDistrict(classified, boundaries) : []),
    [classified, boundaries]
  );
  // Poligon kabupaten BIG milik distrik program — dasar rincian per kabupaten.
  // Dicocokkan lewat `districtId` yang sudah ditautkan saat seed, bukan lewat
  // kecocokan nama (nama BIG "Kota X" vs nama District program mudah meleset).
  const programAreas = useMemo(() => {
    const programIds = new Set(districts.map((d) => d.id));
    return adminBoundaries
      .filter((b) => b.districtId !== null && programIds.has(b.districtId))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [adminBoundaries, districts]);
  const outsideByKabupaten = useMemo(() => {
    if (!classified) return [];
    return countPointsByNamedArea(
      {
        type: "FeatureCollection",
        features: classified.features.filter((f) => f.properties?.inBoundary !== "in"),
      },
      programAreas,
      "Kab. Lainnya"
    );
  }, [classified, programAreas]);
  const totalByKabupaten = useMemo(
    () => (classified ? countPointsByNamedArea(classified, programAreas, "Kab. Lainnya") : []),
    [classified, programAreas]
  );

  const captureRef = useRef<FireMapCaptureFn | null>(null);
  const registerCapture = useCallback((fn: FireMapCaptureFn | null) => {
    captureRef.current = fn;
  }, []);

  const zoomRef = useRef<FireMapZoomFn | null>(null);
  const registerZoomTo = useCallback((fn: FireMapZoomFn | null) => {
    zoomRef.current = fn;
  }, []);
  // Lembaga terpilih (klik baris tabel / klik poligon di peta) → di-highlight.
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const handleZoomToGroup = useCallback(
    (farmerGroupId: string) => {
      // Klik ulang baris yang sama = batal pilih (toggle) — pengganti tombol
      // "clear selected" terpisah.
      if (selectedGroupId === farmerGroupId) {
        setSelectedGroupId(null);
        return;
      }
      const boundary = indexed.find((b) => b.farmerGroupId === farmerGroupId);
      if (!boundary) return;
      setSelectedGroupId(farmerGroupId);
      zoomRef.current?.(boundary.bbox);
    },
    [indexed, selectedGroupId]
  );

  const handlePrint = async () => {
    if (!classified || !summary || printing) return;
    const capture = captureRef.current;
    if (!capture) {
      toast.error("Peta belum siap");
      return;
    }

    // Scope → bbox zoom + irisan data. Boundary ICS sudah dibuat TERMASUK
    // buffer 1,5 km (keputusan owner) — deteksi cukup point-in-polygon.
    // Full Riau = gabungan bbox 12 kabupaten BIG (bukan RIAU_BBOX persegi yang
    // ikut memuat Malaysia), fallback RIAU_BBOX bila batas belum ter-seed.
    let riauBox: [number, number, number, number] | null = null;
    for (const b of adminBoundaries) {
      const [w, s, e, n] = multiPolygonBbox(b.geometry);
      riauBox = riauBox
        ? [Math.min(riauBox[0], w), Math.min(riauBox[1], s), Math.max(riauBox[2], e), Math.max(riauBox[3], n)]
        : [w, s, e, n];
    }
    let bbox: [number, number, number, number] = riauBox ?? RIAU_BBOX;
    let scopeSlug = "full-riau";
    let kabupatenLabel = districts.map((d) => d.name).join(", ");
    let scopeDistrictId: string | null = null;
    if (printScope.startsWith("district:")) {
      scopeDistrictId = printScope.slice("district:".length);
      const scopeBoundaries = indexed.filter((b) => b.districtId === scopeDistrictId);
      const box = combinedBbox(scopeBoundaries);
      if (!box) {
        toast.error("Tidak ada boundary pada distrik ini");
        return;
      }
      bbox = box;
      const name = districts.find((d) => d.id === scopeDistrictId)?.name ?? "";
      kabupatenLabel = name;
      scopeSlug = name.replace(/\s+/g, "-").toLowerCase() || "distrik";
    }

    // Irisan scope: distrik → total/confidence dari titik dalam poligon
    // kabupaten BIG-nya; dalam-boundary & lembaga dari boundary distrik tsb.
    const scopeArea = scopeDistrictId
      ? (programAreas.find((a) => a.districtId === scopeDistrictId) ?? null)
      : null;
    // Tanpa poligon kabupaten, angka scope distrik akan diam-diam terisi
    // se-Riau padahal judulnya satu kabupaten — lebih baik gagal terang.
    if (scopeDistrictId && !scopeArea) {
      toast.error("Batas kabupaten distrik ini belum tersedia — cetak per distrik tidak bisa dilakukan");
      return;
    }
    const scopeFc = scopeArea ? filterPointsWithinAreas(classified, [scopeArea]) : classified;
    const conf = countByConfidence(scopeFc);
    const scopeGroupRows = scopeDistrictId
      ? rows.filter((r) => r.districtId === scopeDistrictId)
      : rows;

    const groupDistrict = new Map(boundaries.map((b) => [b.farmerGroupId, b.districtId]));
    const insideFeatures = classified.features.filter((f) => {
      if (f.properties?.inBoundary !== "in") return false;
      if (!scopeDistrictId) return true;
      // Boundary bisa bersama (groupIds > 1) — cukup salah satu pemilik
      // berada di distrik scope.
      return ((f.properties?.groupIds as string[] | undefined) ?? []).some(
        (id) => groupDistrict.get(id) === scopeDistrictId
      );
    });
    const detailRows = insideFeatures
      .map((f) => ({
        iso: (f.properties?.acqDatetime as string) ?? "",
        timeWib: formatWib(f.properties?.acqDatetime as string | undefined),
        satellite: satelliteLabel(f.properties?.satellite),
        confidence: confidenceLabel(f.properties?.confidence),
        frp:
          typeof f.properties?.frp === "number" && Number.isFinite(f.properties.frp)
            ? String(f.properties.frp)
            : "—",
        lat: f.geometry.type === "Point" ? f.geometry.coordinates[1].toFixed(5) : "—",
        lng: f.geometry.type === "Point" ? f.geometry.coordinates[0].toFixed(5) : "—",
        groupName: String(f.properties?.groupName ?? "—"),
      }))
      .sort((a, b) => b.iso.localeCompare(a.iso));

    const abort = new AbortController();
    printAbortRef.current = abort;
    setPrinting(true);
    setPrintProgress(null);
    try {
      const [shot, logo, fonts] = await Promise.all([
        capture(bbox),
        rasterizeLogo(),
        loadAcuminFonts(),
      ]);
      // Persiapan bisa memakan detik (fetch 3 TTF Acumin) — batal di fase ini
      // harus berkabar sama seperti batal di tengah loop lampiran.
      if (abort.signal.aborted) {
        toast.info("Cetak PDF dibatalkan");
        return;
      }
      if (!shot) {
        toast.error("Gagal mengambil gambar peta. Coba basemap Light/Dark (bukan Hybrid).");
        return;
      }

      // Peta per lembaga ber-titik api (berurutan — tiap capture menunggu
      // tile termuat), lalu kembalikan tampilan ke scope utama.
      const affected = scopeGroupRows.filter((g) => g.count > 0);
      setPrintProgress({ done: 0, total: affected.length });
      const groupMaps: { name: string; count: number; shared: number; dataUrl: string; widthPx: number; heightPx: number }[] = [];
      for (const [i, r] of affected.entries()) {
        // Dicek TIAP iterasi: pembatalan tidak bisa menghentikan satu capture
        // yang sedang menunggu "idle", tapi menghentikan sisanya.
        if (abort.signal.aborted) break;
        const b = indexed.find((x) => x.farmerGroupId === r.farmerGroupId);
        if (!b) continue;
        const gshot = await capture(b.bbox, r.farmerGroupId);
        setPrintProgress({ done: i + 1, total: affected.length });
        if (gshot) {
          groupMaps.push({
            name: r.name,
            count: r.count,
            shared: r.shared,
            dataUrl: gshot.dataUrl,
            widthPx: gshot.width,
            heightPx: gshot.height,
          });
        }
      }
      zoomRef.current?.(bbox);
      // Dibatalkan = tidak ada PDF. Menerbitkan laporan berlampiran separuh
      // tanpa keterangan justru memotong diam-diam — persis yang dihindari.
      if (abort.signal.aborted) {
        toast.info("Cetak PDF dibatalkan");
        return;
      }
      const now = new Date();
      const start = hotspotWindowStart(now, dayRange);
      const exportedAt = formatExportedAt(now);

      const { generateFireMapPdf } = await import("@/lib/fire-map-print");
      generateFireMapPdf({
        subtitle: "Smallholder Hub Group",
        kabupatenLabel,
        rangeLabel: `${hotspotWindowLabel(dayRange)} terakhir (${formatHotspotRange(start, now)})`,
        exportedAt,
        logo,
        fonts,
        stats: {
          total: scopeFc.features.length,
          high: conf.high,
          nominal: conf.nominal,
          low: conf.low,
          inside: insideFeatures.length,
          groupsAffected: scopeGroupRows.filter((r) => r.count > 0).length,
        },
        imageDataUrl: shot.dataUrl,
        imageWidthPx: shot.width,
        imageHeightPx: shot.height,
        rows: detailRows,
        groupMaps,
        fileName: `laporan-titik-api-${scopeSlug}.pdf`,
      });
    } catch (err) {
      console.warn("Fire alert print failed:", err);
      toast.error("Gagal membuat PDF laporan");
    } finally {
      setPrinting(false);
      setPrintProgress(null);
      printAbortRef.current = null;
    }
  };

  const handleCancelPrint = () => printAbortRef.current?.abort();

  return (
    <div className="relative -m-6 flex h-[calc(100vh-3.5rem)] w-auto overflow-hidden">
      {/* 3/4 peta */}
      <div className="relative min-w-0 flex-1">
        <FireMapCanvas
          boundaries={indexed}
          adminBoundaries={adminBoundaries}
          hotspots={classified}
          countsByGroup={countsByGroup}
          registerCapture={registerCapture}
          registerZoomTo={registerZoomTo}
          selectedGroupId={selectedGroupId}
          onSelectGroup={setSelectedGroupId}
        />
      </div>
      {/* 1/4 panel info */}
      <aside className="w-1/4 min-w-[300px] max-w-[400px] shrink-0 border-l bg-background">
        <FireAlertPanel
          helpSlot={helpSlot}
          dayRange={dayRange}
          onDayRangeChange={setDayRange}
          loading={loading}
          summary={summary}
          confInside={confInside}
          insideByDistrict={insideByDistrict}
          outsideByKabupaten={outsideByKabupaten}
          totalByKabupaten={totalByKabupaten}
          rows={rows}
          onZoomToGroup={handleZoomToGroup}
          selectedGroupId={selectedGroupId}
          districts={districts}
          canPrint={canPrint}
          printScope={printScope}
          onPrintScopeChange={setPrintScope}
          onPrint={handlePrint}
          printing={printing}
          printProgress={printProgress}
          onCancelPrint={handleCancelPrint}
        />
      </aside>
    </div>
  );
}
