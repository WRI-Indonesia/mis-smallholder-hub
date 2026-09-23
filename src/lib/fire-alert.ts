/**
 * Pure helpers Dashboard Risk Management — Fire Alert (#266): klasifikasi titik
 * api FIRMS terhadap boundary lembaga (point-in-polygon) + rekap per lembaga.
 * Bebas API Next/Node/MapLibre agar bisa diunit-test terisolasi.
 *
 * Point-in-polygon ditulis lokal (ray casting even-odd, mendukung MultiPolygon
 * berlubang) — volume kecil (ratusan titik × 30 boundary dengan pra-cek bbox),
 * tanpa menyeret @turf/turf ke bundle client.
 */

import type { Feature, FeatureCollection, MultiPolygon, Position } from "geojson";
import { FIRMS_SOURCES, utcMidnightDaysAgo, type FirmsSource } from "@/lib/firms";

/** Boundary lembaga siap render/klasifikasi (hasil `getFireBoundaries`). */
export type FireBoundary = {
  /** id baris tbl_farmer_group_boundary */
  id: string;
  farmerGroupId: string;
  name: string;
  districtId: string;
  districtName: string;
  geometry: MultiPolygon;
};

export type FireBoundaryIndexed = FireBoundary & {
  /** [west, south, east, north] — pra-cek murah sebelum point-in-polygon. */
  bbox: [number, number, number, number];
};

/** Bounding box sebuah MultiPolygon. */
export function multiPolygonBbox(geometry: MultiPolygon): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const polygon of geometry.coordinates) {
    for (const [lng, lat] of polygon[0] ?? []) {
      if (lng < w) w = lng;
      if (lng > e) e = lng;
      if (lat < s) s = lat;
      if (lat > n) n = lat;
    }
  }
  return [w, s, e, n];
}

/**
 * Ring ter-index untuk ray casting: titik-titiknya apa adanya, ditambah
 * **bucket lintang**. Ray casting horizontal pada garis `y` hanya peduli pada
 * sisi yang melintasi `y`; tanpa bucket, tiap titik menguji SELURUH sisi ring.
 * Ring daratan Riau ter-union punya ribuan sisi, jadi bedanya bukan kosmetik.
 *
 * `bands[b]` memuat indeks titik `i` yang sisinya (`i-1` → `i`) menyentuh pita
 * lintang ke-b. Satu sisi bisa masuk beberapa pita; sisi horizontal masuk satu.
 */
type IndexedRing = {
  bbox: [number, number, number, number];
  pts: Position[];
  bands: Uint32Array[];
  y0: number;
  bandH: number;
};

/** Satu polygon yang sudah dipisah ring luar/lubang beserta bbox-nya sendiri. */
type IndexedPolygon = {
  bbox: [number, number, number, number];
  outer: IndexedRing;
  holes: IndexedRing[];
};

/**
 * MultiPolygon yang disiapkan untuk uji point-in-polygon massal (#280/#286).
 *
 * Dua hal yang tidak dilakukan `pointInMultiPolygon`, dan keduanya baru terasa
 * pada geometri besar:
 * 1. **bbox per polygon.** Outline Riau ter-union adalah satu MultiPolygon
 *    berisi ±84 pulau; tanpa bbox per polygon, satu titik di tengah daratan
 *    diuji terhadap ring seluruh pulau hanya karena berada di bbox provinsi.
 * 2. **Lubang dipisah sekali di sini.** `pointInMultiPolygon` memanggil
 *    `polygon.slice(1)` di dalam loop — satu alokasi array per titik per
 *    polygon.
 */
export type IndexedArea = {
  bbox: [number, number, number, number];
  polygons: IndexedPolygon[];
};

function ringBbox(ring: Position[]): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < w) w = lng;
    if (lng > e) e = lng;
    if (lat < s) s = lat;
    if (lat > n) n = lat;
  }
  return [w, s, e, n];
}

/**
 * ±32 sisi per pita: cukup kasar agar biaya indeks kecil, cukup halus agar
 * ring besar terpotong ratusan kali. Dibatasi 256 supaya ring kecil tak
 * membuat lebih banyak pita daripada sisinya.
 */
function indexRing(input: Position[]): IndexedRing {
  // `pointInRing` menutup ring secara implisit (`j = ring.length - 1`), jadi
  // sisi terakhir → pertama SELALU diuji. Indeks ini memasangkan (i-1, i)
  // sehingga sisi itu hilang bila ring datang tak tertutup — dan kolom
  // `geojson` ditulis skrip seed di luar aplikasi, tanpa constraint DB yang
  // menjamin bentuknya (lihat `asMultiPolygon`). Ring yang belum tertutup
  // ditutup di sini supaya keduanya benar-benar setara; ring normal tak
  // tersentuh.
  const first = input[0];
  const last = input[input.length - 1];
  const ring =
    first && last && (first[0] !== last[0] || first[1] !== last[1]) ? [...input, first] : input;
  const bbox = ringBbox(ring);
  const [, s, , n] = bbox;
  const bandCount = Math.max(1, Math.min(256, Math.ceil(ring.length / 32)));
  // Ring horizontal sempurna (tinggi 0) tetap butuh satu pita yang sah.
  const bandH = (n - s) / bandCount || 1;
  const buckets: number[][] = Array.from({ length: bandCount }, () => []);
  const bandOf = (y: number) =>
    Math.max(0, Math.min(bandCount - 1, Math.floor((y - s) / bandH)));
  for (let i = 1; i < ring.length; i++) {
    const lo = bandOf(Math.min(ring[i - 1][1], ring[i][1]));
    const hi = bandOf(Math.max(ring[i - 1][1], ring[i][1]));
    for (let b = lo; b <= hi; b++) buckets[b].push(i);
  }
  return {
    bbox,
    pts: ring,
    bands: buckets.map((b) => Uint32Array.from(b)),
    y0: s,
    bandH,
  };
}

/** Ray casting even-odd memakai bucket lintang — setara `pointInRing`. */
function pointInIndexedRing(pt: Position, ring: IndexedRing): boolean {
  const [x, y] = pt;
  const [w, s, e, n] = ring.bbox;
  if (x < w || x > e || y < s || y > n) return false;
  const band = ring.bands[
    Math.max(0, Math.min(ring.bands.length - 1, Math.floor((y - ring.y0) / ring.bandH)))
  ];
  let inside = false;
  for (let k = 0; k < band.length; k++) {
    const i = band[k];
    const [xi, yi] = ring.pts[i];
    const [xj, yj] = ring.pts[i - 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Siapkan `geometry` untuk diuji berkali-kali. Hitung sekali, pakai per titik. */
export function indexArea(geometry: MultiPolygon): IndexedArea {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  const polygons: IndexedPolygon[] = [];
  for (const polygon of geometry.coordinates) {
    const ring = polygon[0];
    if (!ring || ring.length === 0) continue;
    const outer = indexRing(ring);
    const [bw, bs, be, bn] = outer.bbox;
    if (bw < w) w = bw;
    if (bs < s) s = bs;
    if (be > e) e = be;
    if (bn > n) n = bn;
    polygons.push({ bbox: outer.bbox, outer, holes: polygon.slice(1).map(indexRing) });
  }
  return { bbox: [w, s, e, n], polygons };
}

/** Uji titik terhadap area ter-index — setara `pointInMultiPolygon`, tanpa alokasi. */
export function pointInIndexedArea(pt: Position, area: IndexedArea): boolean {
  const [x, y] = pt;
  const [w, s, e, n] = area.bbox;
  if (x < w || x > e || y < s || y > n) return false;
  // Area berpolygon TUNGGAL: bbox area = bbox polygon itu, jadi cek kedua
  // selalu lolos — murni biaya. Berlaku untuk 8 dari 12 kabupaten BIG dan
  // untuk scope cetak per distrik. Kecil tapi nyata: `summarizeByNamedArea`
  // 12 kabupaten × 9.929 titik terukur 9,19 → 8,92 ms (min dari 30 kali).
  const many = area.polygons.length > 1;
  for (const poly of area.polygons) {
    if (many) {
      const [pw, ps, pe, pn] = poly.bbox;
      if (x < pw || x > pe || y < ps || y > pn) continue;
    }
    if (!pointInIndexedRing(pt, poly.outer)) continue;
    let inHole = false;
    for (const hole of poly.holes) {
      if (pointInIndexedRing(pt, hole)) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

/**
 * Boundary lembaga SENGAJA tidak memakai `indexArea` (#286 butir 4, diukur
 * 2026-09-23): 31 boundary, mayoritas satu polygon ±209 verteks, dan bbox-nya
 * sudah menolak ±96% pasangan titik×boundary sebelum ring disentuh. Indeks pita
 * justru menambah biaya pada jalur penolakan itu — `findContainingBoundaries`
 * 30.000 titik terukur **3,96 ms → 4,63 ms** (min dari 30 kali, pembanding
 * berstruktur identik). Yang berat ada di klip provinsi, dan itu sudah
 * ter-index.
 */
export function indexBoundaries(boundaries: FireBoundary[]): FireBoundaryIndexed[] {
  return boundaries.map((b) => ({ ...b, bbox: multiPolygonBbox(b.geometry) }));
}

/** Ray casting even-odd terhadap satu ring (batas tepat di garis tak dijamin). */
function pointInRing(pt: Position, ring: Position[]): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** True bila titik berada dalam MultiPolygon (ring pertama luar, sisanya lubang). */
export function pointInMultiPolygon(pt: Position, geometry: MultiPolygon): boolean {
  for (const polygon of geometry.coordinates) {
    if (polygon.length === 0 || !pointInRing(pt, polygon[0])) continue;
    const inHole = polygon.slice(1).some((hole) => pointInRing(pt, hole));
    if (!inHole) return true;
  }
  return false;
}

/** SEMUA boundary yang memuat titik — boundary bisa bertumpuk/bersama (KSJ & KBJ). */
export function findContainingBoundaries(
  pt: Position,
  boundaries: FireBoundaryIndexed[]
): FireBoundaryIndexed[] {
  const hits: FireBoundaryIndexed[] = [];
  for (const b of boundaries) {
    const [w, s, e, n] = b.bbox;
    if (pt[0] < w || pt[0] > e || pt[1] < s || pt[1] > n) continue;
    if (pointInMultiPolygon(pt, b.geometry)) hits.push(b);
  }
  return hits;
}

/** Boundary pertama yang memuat titik (urutan input; null bila di luar semua). */
export function findContainingBoundary(
  pt: Position,
  boundaries: FireBoundaryIndexed[]
): FireBoundaryIndexed | null {
  return findContainingBoundaries(pt, boundaries)[0] ?? null;
}

/**
 * Tandai tiap titik api: `inBoundary` ("in"/"out"); bila di dalam juga
 * `groupIds` (SEMUA lembaga pemilik — satu poligon bisa bersama, mis. KSJ &
 * KBJ, keputusan owner 2026-08-19) dan `groupName` (nama digabung " & ").
 * Dipakai ekspresi styling MapLibre, popup, tabel, dan PDF.
 *
 * Hit di-dedup per lembaga: bila satu lembaga punya >1 boundary aktif yang
 * sama-sama memuat titik, tanpa dedup titik itu terhitung dua kali dan salah
 * ditandai "bersama" (`groupIds.length > 1`) padahal pemiliknya satu.
 */
export function classifyHotspots(
  fc: FeatureCollection,
  boundaries: FireBoundaryIndexed[]
): FeatureCollection {
  const features: Feature[] = fc.features.map((f) => {
    const pt = f.geometry.type === "Point" ? (f.geometry.coordinates as Position) : null;
    const owners = new Map<string, FireBoundaryIndexed>();
    for (const h of pt ? findContainingBoundaries(pt, boundaries) : []) {
      if (!owners.has(h.farmerGroupId)) owners.set(h.farmerGroupId, h);
    }
    const hits = [...owners.values()];
    return {
      ...f,
      properties: {
        ...(f.properties ?? {}),
        inBoundary: hits.length > 0 ? "in" : "out",
        groupIds: hits.map((h) => h.farmerGroupId),
        groupName: hits.length > 0 ? hits.map((h) => h.name).join(" & ") : null,
      },
    };
  });
  return { type: "FeatureCollection", features };
}

/** Satu baris tabel panel: lembaga × jumlah titik api dalam boundary-nya. */
export type FireGroupCount = {
  farmerGroupId: string;
  name: string;
  districtId: string;
  districtName: string;
  count: number;
  /** Berapa dari `count` yang berada di wilayah tumpang-tindih (juga dihitung
   *  di lembaga lain) — dasar keterangan anti-"double counting" di UI/PDF. */
  shared: number;
  /** Berapa dari `count` yang berkeyakinan tinggi (`confBucket` "high") — rekap lembaga laporan bulanan (#365). */
  high: number;
};

/**
 * Rekap jumlah titik (ter-klasifikasi) per lembaga — lembaga tanpa titik tetap
 * muncul (count 0); titik dalam boundary bersama dihitung di TIAP pemiliknya
 * (kartu ringkasan tetap menghitung titik unik via `summarizeFire`).
 * Urut: jumlah menurun, lalu nama.
 *
 * Baris dibangun per LEMBAGA, bukan per baris boundary: relasi
 * FarmerGroup→boundary adalah 1-ke-banyak tanpa unique constraint, sehingga
 * satu lembaga dengan >1 boundary aktif (mis. seed gagal di antara
 * soft-delete dan insert) akan muncul dobel dengan jumlah titik penuh di
 * masing-masing baris, dan menggelembungkan penyebut "Lembaga Terdampak".
 */
export function countHotspotsByGroup(
  classified: FeatureCollection,
  boundaries: FireBoundary[]
): FireGroupCount[] {
  const counts = new Map<string, number>();
  const sharedCounts = new Map<string, number>();
  const highCounts = new Map<string, number>();
  for (const f of classified.features) {
    const groupIds = (f.properties?.groupIds as string[] | undefined) ?? [];
    for (const groupId of groupIds) {
      counts.set(groupId, (counts.get(groupId) ?? 0) + 1);
      if (groupIds.length > 1) sharedCounts.set(groupId, (sharedCounts.get(groupId) ?? 0) + 1);
      if (f.properties?.confBucket === "high") highCounts.set(groupId, (highCounts.get(groupId) ?? 0) + 1);
    }
  }
  const groupById = new Map<string, FireBoundary>();
  for (const b of boundaries) {
    if (!groupById.has(b.farmerGroupId)) groupById.set(b.farmerGroupId, b);
  }
  return [...groupById.values()]
    .map((b) => ({
      farmerGroupId: b.farmerGroupId,
      name: b.name,
      districtId: b.districtId,
      districtName: b.districtName,
      count: counts.get(b.farmerGroupId) ?? 0,
      shared: sharedCounts.get(b.farmerGroupId) ?? 0,
      high: highCounts.get(b.farmerGroupId) ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "id"));
}

export type FireSummary = {
  total: number;
  inside: number;
  outside: number;
  /** Titik unik yang berada di wilayah tumpang-tindih ≥2 lembaga. */
  insideShared: number;
  /** Jumlah lembaga dengan ≥1 titik dalam boundary. */
  groupsAffected: number;
};

export function summarizeFire(classified: FeatureCollection): FireSummary {
  let inside = 0;
  let insideShared = 0;
  const groups = new Set<string>();
  for (const f of classified.features) {
    if (f.properties?.inBoundary === "in") {
      inside++;
      const groupIds = (f.properties?.groupIds as string[] | undefined) ?? [];
      if (groupIds.length > 1) insideShared++;
      for (const groupId of groupIds) groups.add(groupId);
    }
  }
  return {
    total: classified.features.length,
    inside,
    outside: classified.features.length - inside,
    insideShared,
    groupsAffected: groups.size,
  };
}

/**
 * Saring titik: hanya yang berada di dalam salah satu wilayah (PiP + pra-cek
 * bbox). Dipakai membatasi hotspot FIRMS ke Provinsi Riau: Area API FIRMS
 * hanya menerima BBOX persegi (RIAU_BBOX ikut mencakup Malaysia/Sumbar/Jambi),
 * jadi hasilnya dipangkas terhadap gabungan 12 poligon kabupaten BIG.
 * `areas` kosong → kembalikan apa adanya (fallback bila batas belum di-seed).
 */
export function filterPointsWithinAreas(
  fc: FeatureCollection,
  areas: { geometry: MultiPolygon }[]
): FeatureCollection {
  if (areas.length === 0) return fc;
  const indexed = areas.map((a) => indexArea(a.geometry));
  const features = fc.features.filter((f) => {
    if (f.geometry.type !== "Point") return false;
    const pt = f.geometry.coordinates as Position;
    return indexed.some((a) => pointInIndexedArea(pt, a));
  });
  return { type: "FeatureCollection", features };
}

export type AreaCount = { name: string; count: number };

/** Rekap satu wilayah untuk laporan bulanan (#365): total, dalam boundary, keyakinan tinggi. */
export type AreaSummary = { name: string; total: number; inside: number; high: number };

/**
 * Rekap titik per wilayah bernama (point-in-polygon + pra-cek bbox); titik di
 * luar semua wilayah masuk bucket `otherLabel`. Wilayah tanpa titik tetap
 * muncul (0) agar urutan baris stabil. `inside` membaca `inBoundary` dan
 * `high` membaca `confBucket` hasil klasifikasi/`processHotspots` — pada
 * FeatureCollection mentah keduanya 0.
 */
export function summarizeByNamedArea(
  fc: FeatureCollection,
  areas: { name: string; geometry: MultiPolygon }[],
  otherLabel: string
): AreaSummary[] {
  const indexed = areas.map((a) => ({ name: a.name, area: indexArea(a.geometry) }));
  const blank = (name: string): AreaSummary => ({ name, total: 0, inside: 0, high: 0 });
  const rows = new Map<string, AreaSummary>(areas.map((a) => [a.name, blank(a.name)]));
  const other = blank(otherLabel);
  for (const f of fc.features) {
    if (f.geometry.type !== "Point") continue;
    const pt = f.geometry.coordinates as Position;
    let hit: AreaSummary = other;
    for (const a of indexed) {
      if (pointInIndexedArea(pt, a.area)) {
        hit = rows.get(a.name) ?? other;
        break;
      }
    }
    hit.total++;
    if (f.properties?.inBoundary === "in") hit.inside++;
    if (f.properties?.confBucket === "high") hit.high++;
  }
  return [...rows.values(), other];
}

/**
 * Hitung titik per wilayah bernama — bentuk ringkas `summarizeByNamedArea`.
 * Dipakai rincian kartu panel: titik luar boundary per kabupaten (poligon
 * BIG) + "Kab. Lainnya".
 */
export function countPointsByNamedArea(
  fc: FeatureCollection,
  areas: { name: string; geometry: MultiPolygon }[],
  otherLabel: string
): AreaCount[] {
  return summarizeByNamedArea(fc, areas, otherLabel).map(({ name, total }) => ({ name, count: total }));
}

/**
 * Semesta satu dokumen laporan scope distrik: titik di dalam poligon kabupaten
 * DITAMBAH titik milik lembaga distrik itu yang jatuh di luar poligon (boundary
 * ICS sudah termasuk buffer 1,5 km, jadi kepemilikan bisa melewati batas
 * kabupaten). `inBoundary` ditulis ulang mengikuti **kepemilikan**, supaya
 * seluruh angka dokumen memakai satu aturan: kartu ringkasan, Rekap per
 * Kabupaten, dan kolom "Dalam Boundary" Tren Harian menjadi mustahil berbeda
 * (keputusan owner 2026-09-23, melanjutkan "angka kartu yang menang" #294).
 *
 * `insideFeatures` harus berasal dari `classified` yang sama dengan `inPolygon`
 * — dicocokkan lewat identitas objek, bukan koordinat.
 */
export function buildScopeUniverse(
  inPolygon: FeatureCollection,
  insideFeatures: Feature[]
): FeatureCollection {
  const insideSet = new Set(insideFeatures);
  return {
    type: "FeatureCollection",
    features: [...new Set([...inPolygon.features, ...insideFeatures])].map((f) =>
      insideSet.has(f) || f.properties?.inBoundary !== "in"
        ? f
        : { ...f, properties: { ...f.properties, inBoundary: "out" } }
    ),
  };
}

/** Satu baris tren harian laporan bulanan (#365); tanggal = `acq_date` FIRMS (UTC). */
export type DailyCount = {
  date: string;
  inside: number;
  outside: number;
  total: number;
  /** false = tanggal tak tersedia di FIRMS saat laporan dibuat (celah SP/NRT) — angka 0-nya bukan "tidak ada api". */
  available: boolean;
};

/** Hari-hari UTC inklusif dari `from` s.d. `to` (YYYY-MM-DD). */
function utcDaysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end; t += 24 * 60 * 60 * 1000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Tren harian: jumlah titik per tanggal **UTC** (`acqDate`, satuan yang
 * dipakai satelit — konsisten dengan jendela FIRMS dan catatan Bantuan),
 * bukan WIB: deteksi malam ±01.30 WIB tercatat sebagai hari UTC sebelumnya,
 * sehingga pengelompokan WIB akan memunculkan baris tanggal 1 bulan
 * berikutnya di laporan bulan ini. Semua tanggal `from`…`to` muncul (0 tetap
 * ada); `missingDates` ditandai `available: false`.
 */
export function countHotspotsByDay(
  classified: FeatureCollection,
  from: string,
  to: string,
  missingDates: string[] = []
): DailyCount[] {
  const byDate = new Map<string, DailyCount>();
  const missing = new Set(missingDates);
  for (const date of utcDaysBetween(from, to)) {
    byDate.set(date, { date, inside: 0, outside: 0, total: 0, available: !missing.has(date) });
  }
  for (const f of classified.features) {
    const row = byDate.get(String(f.properties?.acqDate ?? ""));
    if (!row) continue;
    row.total++;
    if (f.properties?.inBoundary === "in") row.inside++;
    else row.outside++;
  }
  return [...byDate.values()];
}

/** "Januari 2025" — label mode Bulan (panel, PDF, nama berkas). */
export function formatHotspotMonth(month: string): string {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`)
  );
}

/** "Rab, 1 Jan" — label baris tren harian (tanggal UTC, dibaca apa adanya). */
export function formatHotspotDay(date: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** "4, 5, 6 Jul 2026" — daftar tanggal UTC ringkas (panel & catatan metodologi PDF). */
export function formatDateList(dates: string[]): string {
  const fmtDay = new Intl.DateTimeFormat("id-ID", { day: "numeric", timeZone: "UTC" });
  const fmtFull = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const groups = new Map<string, Date[]>();
  for (const d of dates) {
    const key = d.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), new Date(`${d}T00:00:00Z`)]);
  }
  return [...groups.values()]
    .map((ds) => {
      const last = ds[ds.length - 1];
      const heads = ds.slice(0, -1).map((d) => fmtDay.format(d));
      return heads.length > 0 ? `${heads.join(", ")}, ${fmtFull.format(last)}` : fmtFull.format(last);
    })
    .join("; ");
}

/**
 * Kalimat sumber data untuk catatan metodologi laporan bulanan — menyebut
 * sumber yang BENAR-BENAR dipakai (`coverage.sources`), karena arsip SP dan
 * NRT berbeda sifat (SP terproses ulang, NRT cepat tapi bisa direvisi).
 */
export function describeHotspotSources(sources: FirmsSource[]): string {
  const parts: string[] = [];
  if (sources.includes(FIRMS_SOURCES.sp)) {
    parts.push(
      "arsip NASA FIRMS VIIRS SNPP Standard Processing (data terproses ulang, terbit ±3 bulan setelah deteksi)"
    );
  }
  if (sources.includes(FIRMS_SOURCES.nrt)) {
    parts.push("NASA FIRMS VIIRS SNPP NRT (near-real-time, jeda ±3 jam, dapat direvisi saat arsip terbit)");
  }
  return parts.length > 0 ? parts.join(" dan ") : "NASA FIRMS (tidak ada sumber yang tersedia untuk periode ini)";
}

/** Gabungan bbox beberapa boundary — dasar auto-zoom cetak Per District/Lembaga. */
export function combinedBbox(
  boundaries: FireBoundaryIndexed[]
): [number, number, number, number] | null {
  if (boundaries.length === 0) return null;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const b of boundaries) {
    if (b.bbox[0] < w) w = b.bbox[0];
    if (b.bbox[1] < s) s = b.bbox[1];
    if (b.bbox[2] > e) e = b.bbox[2];
    if (b.bbox[3] > n) n = b.bbox[3];
  }
  return [w, s, e, n];
}

/** Zona waktu tunggal laporan Fire Alert — semua tanggal/jam dibaca sebagai WIB. */
const WIB = "Asia/Jakarta";

/**
 * Awal jendela waktu untuk label laporan.
 * - `1` = **bergulir** 1×24 jam ke belakang (perilaku layer 24 jam, #240).
 * - `5`/`10`/`30` = N hari **kalender UTC termasuk hari ini** — persis satuan
 *   yang dipakai FIRMS (`upstreamWindows`) → 00:00 UTC pada N-1 hari sebelum
 *   tanggal UTC `now`. Dihitung dari tanggal UTC, bukan `now − N×24 jam`,
 *   supaya pada 00:00–07:00 WIB (tanggal UTC masih kemarin) label tidak
 *   memundurkan awal rentang sehari lebih sedikit daripada data (#281).
 */
export function hotspotWindowStart(now: Date, dayRange: number): Date {
  if (dayRange <= 1) return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return utcMidnightDaysAgo(now, dayRange - 1);
}

/** Komponen hari/bulan/tahun sebuah Date menurut WIB (bukan zona browser). */
function wibDateParts(d: Date): { day: number; month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: WIB,
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(d);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { day: num("day"), month: num("month"), year: num("year") };
}

/**
 * "15–19 Agu 2026" (bentuk penuh bila lintas bulan/tahun) — selalu dibaca WIB
 * agar laporan tidak bergeser sehari untuk browser di luar zona Indonesia.
 */
export function formatHotspotRange(start: Date, end: Date): string {
  const full = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: WIB,
  });
  const a = wibDateParts(start);
  const b = wibDateParts(end);
  const sameMonth = a.month === b.month && a.year === b.year;
  return sameMonth ? `${a.day}–${full.format(end)}` : `${full.format(start)} – ${full.format(end)}`;
}

/** "19 Agu 2026, 14.55 WIB" — tanggal DAN jam sama-sama dibaca WIB. */
export function formatExportedAt(now: Date): string {
  const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: WIB }).format(now);
  const time = new Intl.DateTimeFormat("id-ID", { timeStyle: "short", timeZone: WIB }).format(now);
  return `${date}, ${time} WIB`;
}

/**
 * Rincian titik api DALAM boundary per distrik program, menghitung **titik
 * unik**: satu titik di boundary bersama (mis. KSJ & KBJ) hanya dihitung sekali
 * per distrik, sehingga jumlahnya cocok dengan kartu "Dalam Boundary" —
 * berbeda dari `countHotspotsByGroup` yang sengaja menghitung per pemilik.
 * (Satu titik yang boundary pemiliknya berbeda distrik tetap dihitung di tiap
 * distrik — kasus ini tidak ada pada data program saat ini.)
 */
export function countUniqueInsideByDistrict(
  classified: FeatureCollection,
  boundaries: FireBoundary[]
): AreaCount[] {
  const districtOfGroup = new Map<string, string>();
  const districtName = new Map<string, string>();
  for (const b of boundaries) {
    districtOfGroup.set(b.farmerGroupId, b.districtId);
    districtName.set(b.districtId, b.districtName);
  }
  const counts = new Map<string, number>([...districtName.keys()].map((id) => [id, 0]));
  for (const f of classified.features) {
    if (f.properties?.inBoundary !== "in") continue;
    const groupIds = (f.properties?.groupIds as string[] | undefined) ?? [];
    const districtIds = new Set(
      groupIds.map((id) => districtOfGroup.get(id)).filter((id): id is string => id !== undefined)
    );
    for (const id of districtIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ name: districtName.get(id) ?? id, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}
