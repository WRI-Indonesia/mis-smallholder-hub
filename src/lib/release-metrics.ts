import type {
  DayKind,
  PeriodBucket,
  PeriodGranularity,
  ReleaseMetric,
} from "@/types/release-metrics";

/**
 * Parser & agregasi Metrik Rilis (#227). Sumber tunggal: tabel
 * `docs/project/metrics.md` (di-bundle webpack `asset/source`, pola konten
 * Bantuan #184) — TIDAK ada JSON pendamping, supaya tidak drift.
 *
 * Validasi format berjalan di sini dan dilindungi unit test (pengganti "skrip
 * validasi commit" spec §7): tabel rusak / RVS turun / roadmap turun tanpa
 * catatan → throw → build & test gagal, bukan salah render di produksi.
 */

/** Sejak versi ini angka DIUKUR saat rilis; sebelumnya rekonstruksi ± (spec §2.3–2.4). */
export const MEASURED_FROM_VERSION = "v0.21.0";

// Titik hanya dibuang bila benar pemisah ribuan (diikuti tepat 3 digit) —
// typo desimal-titik ("2.67") tidak boleh terbaca 267 (#229).
const num = (s: string): number =>
  Number.parseFloat(s.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));

/** "±440" / "748" / "—" → number|null (marker ± dibuang; dicatat terpisah). */
function cellNumber(raw: string): number | null {
  const s = raw.replace(/±|\*|_/g, "").trim();
  if (s === "" || s === "—") return null;
  const m = s.match(/-?[\d.,]+/);
  return m ? num(m[0]) : null;
}

function semverTuple(version: string): [number, number, number] | null {
  const m = version.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function semverLt(a: string, b: string): boolean {
  const ta = semverTuple(a);
  const tb = semverTuple(b);
  if (!ta || !tb) return false;
  for (let i = 0; i < 3; i++) {
    if (ta[i] !== tb[i]) return ta[i] < tb[i];
  }
  return false;
}

/**
 * Parse tabel §Tabel Metrik per Rilis. Kolom (urutan wajib):
 * Rilis | Tanggal | Roadmap % | KPI (payload · Bantuan · test · bug · TD) | RVS | Δ | Catatan
 */
export function parseReleaseMetrics(markdown: string): ReleaseMetric[] {
  const rows = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && !/^\|[\s\-|]+\|$/.test(l))
    .map((l) => l.slice(1, -1).split("|").map((c) => c.trim()))
    // Baris data: kolom pertama versi vX.Y.Z atau baris siklus berjalan.
    .filter((c) => /v\d+\.\d+\.\d+/.test(c[0]) || /berjalan/i.test(c[0]));

  if (rows.length === 0) {
    throw new Error("metrics.md: tabel Metrik per Rilis tidak ditemukan / format kolom berubah");
  }

  // Jumlah kolom salah harus GAGAL KERAS, bukan baris hilang diam-diam —
  // sel Catatan yang mengandung "|" memecah baris jadi >7 kolom (#229).
  for (const c of rows) {
    if (c.length !== 7) {
      throw new Error(
        `metrics.md ${c[0]}: baris rilis harus 7 kolom, dapat ${c.length} — ada "|" di sel Catatan?`
      );
    }
  }

  const statedDeltas: (number | null)[] = [];
  const releases = rows.map((c): ReleaseMetric => {
    const [rilis, tanggal, roadmap, kpi, rvsRaw, deltaRaw, catatan] = c;
    statedDeltas.push(cellNumber(deltaRaw));
    const isProvisional = /berjalan/i.test(rilis);
    const version = isProvisional ? "berjalan" : (rilis.match(/v\d+\.\d+\.\d+/) as RegExpMatchArray)[0];

    const kpiParts = kpi.split("·").map((p) => p.trim());
    if (kpiParts.length !== 5) {
      throw new Error(`metrics.md ${version}: kolom KPI harus 5 bagian (payload · Bantuan · test · bug · TD), dapat ${kpiParts.length}`);
    }
    const [payload, bantuan, test, bug, td] = kpiParts;
    const bantuanMatch = bantuan.match(/(\d+)\s*\/\s*(\d+)/);

    const roadmapPct = cellNumber(roadmap);
    const rvs = cellNumber(rvsRaw);
    if (roadmapPct == null || rvs == null) {
      throw new Error(`metrics.md ${version}: Roadmap % / RVS kosong`);
    }

    const dateMatch = tanggal.match(/\d{4}-\d{2}-\d{2}/);
    if (!isProvisional && !dateMatch) {
      throw new Error(`metrics.md ${version}: tanggal rilis wajib (YYYY-MM-DD)`);
    }

    return {
      version,
      releasedAt: dateMatch ? dateMatch[0] : null,
      roadmapPct,
      rvs,
      testCount: cellNumber(test),
      bugOpen: cellNumber(bug),
      techDebt: cellNumber(td),
      bantuanDone: bantuanMatch ? Number(bantuanMatch[1]) : null,
      bantuanTotal: bantuanMatch ? Number(bantuanMatch[2]) : null,
      payloadMb: cellNumber(payload),
      isEstimated: !isProvisional && semverLt(version, MEASURED_FROM_VERSION),
      isProvisional,
      notes: catatan.replace(/\*\*/g, ""),
      issueRefs: [...new Set(catatan.match(/#\d+/g) ?? [])],
      delta: null, // diisi di bawah (turunan §2.2)
    };
  });

  // Turunan delta + validasi invarian (§7).
  const seen = new Set<string>();
  for (let i = 0; i < releases.length; i++) {
    const cur = releases[i];
    const prev = i > 0 ? releases[i - 1] : null;
    if (seen.has(cur.version)) {
      throw new Error(`metrics.md: versi ${cur.version} tercatat dua kali`);
    }
    seen.add(cur.version);
    if (prev) {
      cur.delta = cur.rvs - prev.rvs;
      if (cur.rvs < prev.rvs) {
        throw new Error(`metrics.md ${cur.version}: RVS turun (${prev.rvs} → ${cur.rvs}) — kumulatif tidak boleh turun`);
      }
      const stated = statedDeltas[i];
      if (stated != null && Math.abs(stated - cur.delta) > 0.001) {
        throw new Error(
          `metrics.md ${cur.version}: kolom Δ (+${stated}) tidak cocok dengan selisih RVS (${prev.rvs} → ${cur.rvs} = +${cur.delta})`
        );
      }
      if (cur.roadmapPct < prev.roadmapPct && cur.notes.trim() === "") {
        throw new Error(`metrics.md ${cur.version}: roadmap % turun tanpa catatan penjelas`);
      }
      if (prev.releasedAt && cur.releasedAt && cur.releasedAt < prev.releasedAt) {
        throw new Error(`metrics.md ${cur.version}: tanggal mundur dari ${prev.version}`);
      }
      if (prev.isProvisional) {
        throw new Error(`metrics.md: baris "(siklus berjalan)" harus paling akhir`);
      }
    }
  }
  return releases;
}

// ── Turunan kalender (§2.2, §4.3) ────────────────────────────────────────────

/** Jenis hari dari tanggal kalender (timezone-agnostik — hitung dari Y/M/D). */
export function dayKind(isoDate: string): DayKind {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 ? "sunday" : dow === 6 ? "saturday" : "weekday";
}

/** Senin (ISO) minggu yang memuat tanggal ini, sebagai ISO date. */
export function isoWeekStart(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const shift = (dt.getUTCDay() + 6) % 7; // Senin=0
  dt.setUTCDate(dt.getUTCDate() - shift);
  return dt.toISOString().slice(0, 10);
}

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const dmy = (isoDate: string): string => {
  const [, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS_ID[m - 1]}`;
};

function periodKeyLabel(isoDate: string, granularity: PeriodGranularity): { key: string; label: string } {
  if (granularity === "day") return { key: isoDate, label: dmy(isoDate) };
  if (granularity === "week") {
    const start = isoWeekStart(isoDate);
    const [y, m, d] = start.split("-").map(Number);
    const end = new Date(Date.UTC(y, m - 1, d + 6)).toISOString().slice(0, 10);
    return { key: start, label: `${dmy(start)}–${dmy(end)}` };
  }
  if (granularity === "month") {
    const [y, m] = isoDate.split("-").map(Number);
    return { key: isoDate.slice(0, 7), label: `${["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][m - 1]} ${y}` };
  }
  return { key: isoDate.slice(0, 4), label: isoDate.slice(0, 4) };
}

/**
 * Perolehan RVS per periode. Atribusi: delta sebuah rilis dicatat
 * pada TANGGAL RILISNYA (penyederhanaan yang disetujui owner — pekerjaan
 * terjadi di hari-hari sebelumnya). Baris tanpa delta (anchor) dan baris
 * provisional tanpa tanggal dilewati; `provisionalDate` (default: tidak ada)
 * menempatkan siklus berjalan pada tanggal "hari ini" milik pemanggil.
 */
export function bucketRvsGains(
  releases: ReleaseMetric[],
  granularity: PeriodGranularity,
  provisionalDate?: string
): PeriodBucket[] {
  const buckets = new Map<string, PeriodBucket>();
  for (const r of releases) {
    const date = r.releasedAt ?? (r.isProvisional ? provisionalDate ?? null : null);
    if (r.delta == null || date == null) continue;
    const { key, label } = periodKeyLabel(date, granularity);
    let b = buckets.get(key);
    if (!b) {
      b = { key, label, weekday: 0, saturday: 0, sunday: 0, total: 0, releases: 0, hasEstimated: false };
      buckets.set(key, b);
    }
    b[dayKind(date)] += r.delta;
    b.total += r.delta;
    b.releases += 1;
    if (r.isEstimated) b.hasEstimated = true;
  }
  return [...buckets.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
}
