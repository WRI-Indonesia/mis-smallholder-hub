/**
 * Pengukuran waktu untuk test performa (#311): MINIMUM dari beberapa putaran,
 * bukan satu pengukuran. Beban mesin (build/typecheck paralel, dev server) hanya
 * bisa MENAMBAH waktu, tak pernah mengurangi — jadi minimum adalah penaksir
 * biaya sebenarnya dan kebal lonjakan. Satu putaran dulu membuat gate wajib
 * `npm test` merah acak (hingga 7 test sekaligus tepat setelah `npm run build`).
 *
 * Putaran: minimal `MIN_RUNS`, lalu berhenti setelah anggaran waktu habis atau
 * `MAX_RUNS` tercapai — test berat (ratusan ms) cukup 3 putaran, test ringan 10.
 * Nilai kembalian = hasil putaran terakhir, untuk assertion lanjutan.
 */
const MIN_RUNS = 3;
const MAX_RUNS = 10;
const BUDGET_MS = 1000;

export function minTime<T>(fn: () => T): { value: T; ms: number } {
  let best = Infinity;
  let value!: T;
  const started = performance.now();
  for (let i = 0; i < MAX_RUNS; i++) {
    const t = performance.now();
    value = fn();
    best = Math.min(best, performance.now() - t);
    if (i + 1 >= MIN_RUNS && performance.now() - started > BUDGET_MS) break;
  }
  return { value, ms: best };
}

export async function minTimeAsync<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  let best = Infinity;
  let value!: T;
  const started = performance.now();
  for (let i = 0; i < MAX_RUNS; i++) {
    const t = performance.now();
    value = await fn();
    best = Math.min(best, performance.now() - t);
    if (i + 1 >= MIN_RUNS && performance.now() - started > BUDGET_MS) break;
  }
  return { value, ms: best };
}
