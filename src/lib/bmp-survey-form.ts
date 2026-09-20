/**
 * Form survei Monev BMP per petani (#346) — parser & helper MURNI (tanpa
 * Prisma/DOM). Berkas `.xlsx` tim lapangan Rokan Hulu, 4 sheet:
 * `Form Penilaian (Gabungan)` (header + raport) · `Form Survey Lembaga` (14
 * indikator) · `Form Survey Individu` (18 indikator) · `Panduan` (rubrik).
 *
 * Fakta sumber yang membentuk aturan di sini (analisis 192 berkas, 2026-09-20):
 * - skor di Gabungan sebagian berupa formula ke sheet lain; yang ber-cache
 *   terbaca, yang tidak → kosong. Karena itu skor dibaca dari sheet Lembaga &
 *   Individu langsung (nilai polos), Gabungan hanya untuk header + total raport;
 * - sheet Lembaga/Individu TIDAK punya nomor urut indikator — dipetakan ke
 *   master lewat (kriteria, level, awalan teks), fallback urutan dalam kriteria;
 * - form tidak memuat ID Petani; 8 berkas header "Nama Petani" ≠ nama file
 *   (di-copy dari petani lain) → NAMA FILE = identitas utama, header = pembanding;
 * - 7 sel berskor 4 (di luar 0–3) diterima + ditandai (keputusan owner);
 * - `Periode` kosong di 80 berkas / hanya "Juni 2026" → tanggal null.
 */
import type { RawSheetRow } from "@/lib/excel-sheet-reader";
import { cleanId, parseScore, parseSurveyDate, roundScore } from "@/lib/bmp-assessment";

export type BmpIndicatorLevelCode = "LEMBAGA" | "INDIVIDU";

/** Subset master indikator yang dibutuhkan parser & penghitung. */
export interface BmpIndicatorRef {
  id: string;
  code: string;
  activityCode: string;
  activityName: string;
  activityWeight: number;
  criteriaCode: string;
  criteriaName: string;
  seq: number;
  level: BmpIndicatorLevelCode;
  name: string;
  weight: number | null;
  inFinalScore: boolean;
  scoreLabel0: string | null;
  scoreLabel1: string | null;
  scoreLabel2: string | null;
  scoreLabel3: string | null;
  sortOrder: number;
}

export interface BmpSurveyIndicatorScore {
  indicatorId: string;
  code: string;
  level: BmpIndicatorLevelCode;
  score: number | null;
  notes: string | null;
}

export interface BmpSurveyFormParsed {
  fileName: string;
  /** Nama petani dari nama file (identitas utama). */
  fileFarmerName: string | null;
  /** Nama petani di header sheet (pembanding). */
  headerFarmerName: string | null;
  groupName: string | null;
  periodeRaw: string | null;
  surveyDate: Date | null;
  location: string | null;
  areaHa: number | null;
  /** "2.29 (Praktisi)" apa adanya. */
  resultText: string | null;
  /** Total raport (Nilai Akhir) — angka resmi form; fallback dari resultText. */
  totalScore: number | null;
  individu: BmpSurveyIndicatorScore[];
  lembaga: BmpSurveyIndicatorScore[];
  warnings: string[];
}

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const nameKey = (s: unknown) => norm(s).replace(/[^a-z]/g, "");
const isBlank = (v: unknown) => v == null || String(v).trim() === "";

/** Nama petani dari nama berkas: `… - 2026 - IM_Budi Santoso(1).xlsx` → "Budi Santoso". */
export function farmerNameFromFileName(fileName: string): string | null {
  let base = fileName.split("/").pop() ?? fileName;
  base = base.replace(/\.xlsx?$/i, "").replace(/\s*\(\d+\)\s*$/, "").trim();
  const parts = base.includes("_") ? base.split("_") : base.split(/\s+-\s+/);
  const last = parts[parts.length - 1]?.trim() ?? "";
  return last || null;
}

function cellText(row: RawSheetRow | undefined, col: number): string {
  const v = row?.values[col - 1];
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).replace(/\s+/g, " ").trim();
}

/**
 * Nilai pertama yang terisi di kanan sebuah label. Sel label yang di-merge
 * (A7:B7) mengulang teks labelnya di kolom berikutnya — dilewati, begitu juga
 * sel lain yang berupa label (diakhiri ":").
 */
function valueRightOf(row: RawSheetRow, col: number, maxSpan = 6): string {
  const label = cellText(row, col);
  for (let c = col + 1; c <= col + maxSpan; c++) {
    const v = cellText(row, c);
    if (!v || v === label || v.endsWith(":")) continue;
    return v;
  }
  return "";
}

function findSheet(sheets: { name: string; rows: RawSheetRow[] }[], pattern: RegExp) {
  return sheets.find((s) => pattern.test(s.name));
}

/**
 * Baca satu form. `indicators` = master (32 baris) untuk pemetaan kode.
 * Tidak melempar — kegagalan struktural masuk `warnings` dan array skor kosong.
 */
export function parseBmpSurveyForm(
  fileName: string,
  sheets: { name: string; rows: RawSheetRow[] }[],
  indicators: BmpIndicatorRef[],
): BmpSurveyFormParsed {
  const out: BmpSurveyFormParsed = {
    fileName,
    fileFarmerName: farmerNameFromFileName(fileName),
    headerFarmerName: null,
    groupName: null,
    periodeRaw: null,
    surveyDate: null,
    location: null,
    areaHa: null,
    resultText: null,
    totalScore: null,
    individu: [],
    lembaga: [],
    warnings: [],
  };

  const gab = findSheet(sheets, /gabungan|penilaian/i) ?? sheets[0];
  const lem = findSheet(sheets, /lembaga/i);
  const ind = findSheet(sheets, /individu/i);
  if (!gab) {
    out.warnings.push("Sheet Form Penilaian tidak ditemukan");
    return out;
  }

  // ── Header (12 baris pertama): label diakhiri ":" dengan nilai di kanannya.
  for (const row of gab.rows.slice(0, 14)) {
    row.values.forEach((v, i) => {
      const label = norm(v);
      if (!label.endsWith(":") && !/^(nama lembaga|periode|nama petani|lokasi kebun|luasan|hasil penilaian)/.test(label)) return;
      const val = valueRightOf(row, i + 1);
      if (label.startsWith("nama lembaga")) out.groupName = val || out.groupName;
      else if (label.startsWith("periode")) out.periodeRaw = val || out.periodeRaw;
      else if (label.startsWith("nama petani")) out.headerFarmerName = val || out.headerFarmerName;
      else if (label.startsWith("lokasi kebun")) out.location = val || out.location;
      else if (label.startsWith("luasan")) out.areaHa = parseScore(val) ?? out.areaHa;
      else if (label.startsWith("hasil penilaian")) out.resultText = val || out.resultText;
    });
  }
  out.surveyDate = parseSurveyDate(out.periodeRaw);
  if (out.periodeRaw && !out.surveyDate) out.warnings.push(`Periode "${out.periodeRaw}" tidak terbaca sebagai tanggal — dikosongkan`);

  // ── Total raport: baris ber-label "Total" di blok raport, nilai = sel terisi terakhir.
  for (const row of gab.rows) {
    const idx = row.values.findIndex((v) => norm(v) === "total");
    if (idx < 0) continue;
    const nums = row.values.slice(idx + 1).map((v) => (typeof v === "number" ? v : parseScore(String(v ?? "")))).filter((n): n is number => n != null);
    if (nums.length) out.totalScore = roundScore(nums[nums.length - 1]);
    break;
  }
  if (out.totalScore == null && out.resultText) {
    const m = out.resultText.match(/(\d+(?:[.,]\d+)?)/);
    if (m) out.totalScore = roundScore(Number(m[1].replace(",", ".")));
  }
  if (out.totalScore == null) out.warnings.push("Skor akhir (Total raport / Hasil Penilaian) tidak ditemukan");

  // ── Skor per indikator dari sheet Lembaga & Individu (kolom: Kode | Kegiatan | Kode | Kriteria | Teks | Skor | Catatan).
  const readLevel = (sheet: { rows: RawSheetRow[] } | undefined, level: BmpIndicatorLevelCode): BmpSurveyIndicatorScore[] => {
    if (!sheet) {
      out.warnings.push(`Sheet ${level === "LEMBAGA" ? "Form Survey Lembaga" : "Form Survey Individu"} tidak ditemukan`);
      return [];
    }
    const master = indicators.filter((x) => x.level === level).sort((a, b) => a.sortOrder - b.sortOrder);
    const byCrit = new Map<string, BmpIndicatorRef[]>();
    for (const m of master) byCrit.set(m.criteriaCode, [...(byCrit.get(m.criteriaCode) ?? []), m]);
    const used = new Set<string>();
    const posInCrit = new Map<string, number>();
    const result: BmpSurveyIndicatorScore[] = [];
    for (const row of sheet.rows) {
      const crit = cellText(row, 3);
      if (!/^\d\.\d\.\d$/.test(crit)) continue;
      const text = cellText(row, 5);
      const rawScore = row.values[5];
      const notes = cellText(row, 7) || null;
      const candidates = (byCrit.get(crit) ?? []).filter((m) => !used.has(m.id));
      const key = nameKey(text).slice(0, 12);
      let hit = candidates.find((m) => nameKey(m.name).slice(0, 12) === key);
      if (!hit) {
        const pos = posInCrit.get(crit) ?? 0;
        hit = (byCrit.get(crit) ?? [])[pos];
        if (hit && used.has(hit.id)) hit = candidates[0];
      }
      posInCrit.set(crit, (posInCrit.get(crit) ?? 0) + 1);
      if (!hit) {
        out.warnings.push(`Indikator ${crit} "${text.slice(0, 40)}" (${level.toLowerCase()}) tidak ada di master — dilewati`);
        continue;
      }
      used.add(hit.id);
      let score: number | null = null;
      if (!isBlank(rawScore)) {
        const n = typeof rawScore === "number" ? rawScore : parseScore(String(rawScore));
        if (n == null) out.warnings.push(`Skor ${hit.code} "${String(rawScore)}" bukan angka — dianggap kosong`);
        else if (n < 0 || n > 9) {
          // Batas yang sama dengan skema import (0–9): salah ketik jelas ("33") dikosongkan di
          // pratinjau, bukan menggagalkan seluruh batch di server tanpa menyebut berkasnya.
          out.warnings.push(`Skor ${hit.code} = ${n} tidak masuk akal — dianggap kosong`);
        } else {
          score = Math.round(n);
          if (score > 3) out.warnings.push(`Skor ${hit.code} = ${score} di luar rubrik 0–3 (diterima, ditandai)`);
        }
      }
      result.push({ indicatorId: hit.id, code: hit.code, level, score, notes });
    }
    const missing = master.filter((m) => !used.has(m.id));
    if (missing.length) out.warnings.push(`${missing.length} indikator ${level.toLowerCase()} tidak ada di sheet: ${missing.map((m) => m.code).join(", ")}`);
    return result;
  };
  out.lembaga = readLevel(lem, "LEMBAGA");
  out.individu = readLevel(ind, "INDIVIDU");

  if (out.fileFarmerName && out.headerFarmerName && !namesAgree(out.fileFarmerName, out.headerFarmerName)) {
    out.warnings.push(`Nama di header "${out.headerFarmerName}" ≠ nama berkas "${out.fileFarmerName}" — nama berkas yang dipakai`);
  }
  return out;
}

// ── Pencocokan nama petani ────────────────────────────────────────────────

/** Jarak Levenshtein sederhana (string pendek). */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Dua nama dianggap sama bila kunci hurufnya sama, saling berawalan 6 huruf, atau berjarak ≤ 2. */
export function namesAgree(a: string, b: string): boolean {
  const x = nameKey(a);
  const y = nameKey(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 6 && y.length >= 6 && (x.startsWith(y.slice(0, 6)) || y.startsWith(x.slice(0, 6)))) return true;
  return levenshtein(x, y) <= 2;
}

export type BmpNameMatchConfidence = "EXACT" | "FUZZY" | "AMBIGUOUS" | "NONE";

export interface BmpNameMatch {
  farmerDbId: string | null;
  confidence: BmpNameMatchConfidence;
  /** Kandidat (≤ 5) untuk dropdown saat ragu/tak ditemukan. */
  suggestions: { farmerDbId: string; name: string; farmerCode: string }[];
}

/**
 * Cocokkan nama dari berkas ke petani satu Lembaga. EXACT = kunci huruf sama;
 * FUZZY = satu kandidat berawalan sama / jarak ≤ 2 / token depan sama unik;
 * AMBIGUOUS = lebih dari satu kandidat fuzzy; NONE = tidak ada.
 */
export function matchFarmerName(
  name: string | null,
  farmers: { farmerDbId: string; name: string; farmerCode: string }[],
  options: {
    /**
     * Petani yang SUDAH punya penilaian tahun itu (dari rekap skor #344). Nama
     * kembar dalam satu Lembaga (dua pasang nama identik di data Rohul) lazim; rekap sudah
     * mengikat skor ke ID tertentu, jadi kandidat itu yang dipilih — sebagai
     * FUZZY (masih ditandai untuk dilirik), bukan EXACT.
     */
    preferIds?: Set<string>;
  } = {},
): BmpNameMatch {
  if (!name) return { farmerDbId: null, confidence: "NONE", suggestions: [] };
  const key = nameKey(name);
  const exact = farmers.filter((f) => nameKey(f.name) === key);
  if (exact.length === 1) return { farmerDbId: exact[0].farmerDbId, confidence: "EXACT", suggestions: exact };
  if (exact.length > 1) {
    const preferred = exact.filter((f) => options.preferIds?.has(f.farmerDbId));
    if (preferred.length === 1) return { farmerDbId: preferred[0].farmerDbId, confidence: "FUZZY", suggestions: exact.slice(0, 5) };
    return { farmerDbId: null, confidence: "AMBIGUOUS", suggestions: exact.slice(0, 5) };
  }

  const scored = farmers
    .map((f) => {
      const k = nameKey(f.name);
      const prefix = key.length >= 6 && k.length >= 6 && (k.startsWith(key.slice(0, 6)) || key.startsWith(k.slice(0, 6)));
      const dist = levenshtein(key, k);
      // Token depan sama (atau beda ≤ 1 huruf, "Mardiyah" vs "Mardiah Susanti") —
      // petani sering ditulis nama depannya saja di berkas.
      const firstTok = nameKey(norm(name).split(" ")[0]);
      const theirFirst = nameKey(norm(f.name).split(" ")[0]);
      const firstTokHit = firstTok.length >= 4 && theirFirst.length >= 4 && (theirFirst === firstTok || levenshtein(firstTok, theirFirst) <= 1);
      const rank = dist <= 2 ? 0 : prefix ? 1 : firstTokHit ? 2 : 99;
      return { f, rank, dist };
    })
    .filter((x) => x.rank < 99)
    .sort((a, b) => a.rank - b.rank || a.dist - b.dist);
  if (scored.length === 0) return { farmerDbId: null, confidence: "NONE", suggestions: [] };
  const best = scored[0];
  const tie = scored.filter((x) => x.rank === best.rank);
  if (tie.length > 1) {
    const preferred = tie.filter((x) => options.preferIds?.has(x.f.farmerDbId));
    if (preferred.length === 1) return { farmerDbId: preferred[0].f.farmerDbId, confidence: "FUZZY", suggestions: tie.slice(0, 5).map((x) => x.f) };
    return { farmerDbId: null, confidence: "AMBIGUOUS", suggestions: tie.slice(0, 5).map((x) => x.f) };
  }
  return { farmerDbId: best.f.farmerDbId, confidence: "FUZZY", suggestions: scored.slice(0, 5).map((x) => x.f) };
}

// ── Hitung ulang skor ─────────────────────────────────────────────────────

export interface BmpActivityScore {
  activityCode: string;
  activityName: string;
  activityWeight: number;
  /** Σ bobot indikator × skor (skala 0–3; kriteria alternatif dihitung sekali; skor 4 di luar rubrik bisa melampauinya). */
  indicatorScore: number;
  /** indicatorScore × bobot kegiatan — kontribusi ke skor akhir. */
  contribution: number;
  /** Indikator berbobot yang skornya kosong (dihitung 0). */
  missingWeighted: number;
}

export interface BmpRecomputeResult {
  total: number;
  activities: BmpActivityScore[];
}

/**
 * Rumus form: skor akhir = Σ_kegiatan bobot × Σ_indikator (bobot × skor), sel
 * kosong = 0. Sumber skor per indikator mengikuti level master (INDIVIDU dari
 * rincian petani, LEMBAGA dari penilaian Lembaga tahun itu).
 */
/**
 * Kriteria yang indikator berbobotnya ALTERNATIF — hanya SALAH SATU yang
 * ditanya di lapangan (owner 2026-09-20): 1.3.2 Identifikasi Gulma = petani
 * ATAU pekerja (0,2 masing-masing). Rumus form menjumlahkan keduanya sehingga
 * Σ bobot Gulma tampak 1,2 (maks 3,60); rumus sistem memakai skor tertinggi
 * yang terisi dan menghitung bobotnya sekali → Σ efektif 1,0, maks 3,00.
 */
export const BMP_EXCLUSIVE_CRITERIA: ReadonlySet<string> = new Set(["1.3.2"]);

type BmpWeightRef = Pick<BmpIndicatorRef, "activityCode" | "criteriaCode" | "level" | "weight" | "inFinalScore">;

/**
 * Kunci "slot" indikator berbobot untuk menghitung terisi/total: indikator
 * kriteria alternatif berbagi satu slot (15 slot individu berbobot, bukan 16).
 */
export function bmpWeightedSlotKey(m: Pick<BmpIndicatorRef, "id" | "criteriaCode" | "level">): string {
  return BMP_EXCLUSIVE_CRITERIA.has(m.criteriaCode) ? `crit:${m.criteriaCode}|${m.level}` : m.id;
}

/** Σ bobot efektif indikator berbobot satu kegiatan (kriteria alternatif dihitung sekali). */
export function bmpActivityWeightSum(indicators: BmpWeightRef[], activityCode: string): number {
  const seen = new Set<string>();
  let sum = 0;
  for (const m of indicators) {
    if (m.activityCode !== activityCode || !m.inFinalScore || m.weight == null) continue;
    if (BMP_EXCLUSIVE_CRITERIA.has(m.criteriaCode)) {
      const key = `${m.criteriaCode}|${m.level}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    sum += m.weight;
  }
  return Math.round(sum * 100) / 100;
}

/** Skor maksimum kegiatan = Σ bobot efektif × 3 (3,00 untuk kelima kegiatan). */
export function bmpActivityMaxScore(indicators: BmpWeightRef[], activityCode: string): number {
  return Math.round(bmpActivityWeightSum(indicators, activityCode) * 3 * 100) / 100;
}

export function recomputeBmpScore(
  indicators: BmpIndicatorRef[],
  individuScores: Map<string, number | null>,
  lembagaScores: Map<string, number | null>,
): BmpRecomputeResult {
  const acts = new Map<string, BmpActivityScore>();
  // Kriteria alternatif: simpan skor tertinggi yang terisi (beserta bobotnya), dijumlahkan setelah loop.
  const exclusive = new Map<string, { act: BmpActivityScore; best: number | null; weight: number }>();
  for (const m of [...indicators].sort((a, b) => a.sortOrder - b.sortOrder)) {
    let a = acts.get(m.activityCode);
    if (!a) {
      a = { activityCode: m.activityCode, activityName: m.activityName, activityWeight: m.activityWeight, indicatorScore: 0, contribution: 0, missingWeighted: 0 };
      acts.set(m.activityCode, a);
    }
    if (!m.inFinalScore || m.weight == null) continue;
    const src = m.level === "LEMBAGA" ? lembagaScores : individuScores;
    const s = src.get(m.code);
    if (BMP_EXCLUSIVE_CRITERIA.has(m.criteriaCode)) {
      const key = `${m.criteriaCode}|${m.level}`;
      const e = exclusive.get(key) ?? { act: a, best: null, weight: m.weight };
      if (s != null && (e.best == null || s > e.best)) {
        e.best = s;
        e.weight = m.weight;
      }
      exclusive.set(key, e);
      continue;
    }
    if (s == null) a.missingWeighted++;
    a.indicatorScore += m.weight * (s ?? 0);
  }
  for (const e of exclusive.values()) {
    if (e.best == null) e.act.missingWeighted++;
    e.act.indicatorScore += e.weight * (e.best ?? 0);
  }
  let total = 0;
  for (const a of acts.values()) {
    a.indicatorScore = Math.round(a.indicatorScore * 10000) / 10000;
    a.contribution = Math.round(a.indicatorScore * a.activityWeight * 10000) / 10000;
    total += a.contribution;
  }
  return { total: roundScore(total), activities: [...acts.values()] };
}

/** Label rubrik untuk skor tertentu, atau null bila di luar 0–3 / tidak didefinisikan. */
export function bmpScoreLabel(m: Pick<BmpIndicatorRef, "scoreLabel0" | "scoreLabel1" | "scoreLabel2" | "scoreLabel3">, score: number | null): string | null {
  if (score == null) return null;
  return [m.scoreLabel0, m.scoreLabel1, m.scoreLabel2, m.scoreLabel3][score] ?? null;
}

export { cleanId };
