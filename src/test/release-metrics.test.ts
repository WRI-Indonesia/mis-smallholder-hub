import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  parseReleaseMetrics,
  bucketRvsGains,
  dayKind,
  isoWeekStart,
} from "@/lib/release-metrics";

const realMd = readFileSync(join(__dirname, "../../docs/project/metrics.md"), "utf-8");

const table = (rows: string[]) =>
  [
    "| Rilis | Tanggal | Roadmap % | KPI | RVS | Δ | Catatan |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");

describe("parseReleaseMetrics — file metrics.md nyata", () => {
  it("memparse seluruh baris rilis + siklus berjalan tanpa error", () => {
    const releases = parseReleaseMetrics(realMd);
    expect(releases.length).toBeGreaterThanOrEqual(14);
    expect(releases[0]).toMatchObject({ version: "v0.9.0", rvs: 1000, roadmapPct: 71, delta: null });
    const last = releases[releases.length - 1];
    expect(last.isProvisional).toBe(true);
    expect(last.releasedAt).toBeNull();
  });

  it("KPI komposit terurai: payload/bantuan/test/bug/TD; — menjadi null, bukan 0", () => {
    const releases = parseReleaseMetrics(realMd);
    const v21 = releases.find((r) => r.version === "v0.21.0");
    expect(v21).toMatchObject({
      payloadMb: 2.67,
      bantuanDone: 23,
      bantuanTotal: 28,
      testCount: 748,
      bugOpen: 0,
      techDebt: 12,
      isEstimated: false,
    });
    const v9 = releases.find((r) => r.version === "v0.9.0");
    expect(v9?.payloadMb).toBeNull();
    expect(v9?.bugOpen).toBeNull();
    expect(v9?.isEstimated).toBe(true);
  });

  it("delta dihitung dari selisih RVS; issue refs terekstrak", () => {
    const releases = parseReleaseMetrics(realMd);
    const v21 = releases.find((r) => r.version === "v0.21.0");
    expect(v21?.delta).toBe(125);
    expect(v21?.issueRefs).toContain("#211");
  });
});

describe("parseReleaseMetrics — validasi invarian (§7)", () => {
  const base = "| v0.9.0 | 2026-07-15 | 71,0% | — · — · 440 · — · — | 1000 | anchor | a |";

  it("RVS turun → error", () => {
    const md = table([base, "| v0.10.0 | 2026-07-16 | 71,0% | — · — · 441 · — · — | 990 | -10 | b |"]);
    expect(() => parseReleaseMetrics(md)).toThrow(/RVS turun/);
  });

  it("roadmap turun tanpa catatan → error", () => {
    const md = table([base, "| v0.10.0 | 2026-07-16 | 70,0% | — · — · 441 · — · — | 1010 | +10 | |"]);
    expect(() => parseReleaseMetrics(md)).toThrow(/roadmap % turun/);
  });

  it("tanggal mundur → error; KPI bukan 5 bagian → error; tabel hilang → error", () => {
    expect(() =>
      parseReleaseMetrics(table([base, "| v0.10.0 | 2026-07-14 | 71,0% | — · — · 441 · — · — | 1010 | +10 | b |"]))
    ).toThrow(/tanggal mundur/);
    expect(() => parseReleaseMetrics(table(["| v0.9.0 | 2026-07-15 | 71,0% | — · — | 1000 | anchor | a |"]))).toThrow(
      /5 bagian/
    );
    expect(() => parseReleaseMetrics("tidak ada tabel")).toThrow(/tidak ditemukan/);
  });

  it("baris berjalan bukan di akhir → error", () => {
    const md = table([
      base,
      "| _(siklus berjalan)_ | — | 71,0% | — · — · 441 · — · — | 1010 | +10 | b |",
      "| v0.10.0 | 2026-07-16 | 71,0% | — · — · 442 · — · — | 1020 | +10 | c |",
    ]);
    expect(() => parseReleaseMetrics(md)).toThrow(/paling akhir/);
  });

  it("baris rilis dengan '|' di sel Catatan (8 kolom) → error, bukan hilang diam-diam (#229)", () => {
    const md = table([base, "| v0.10.0 | 2026-07-16 | 71,0% | — · — · 441 · — · — | 1010 | +10 | b | c |"]);
    expect(() => parseReleaseMetrics(md)).toThrow(/7 kolom/);
  });

  it("versi duplikat → error (#229)", () => {
    const md = table([base, "| v0.9.0 | 2026-07-16 | 71,0% | — · — · 441 · — · — | 1010 | +10 | b |"]);
    expect(() => parseReleaseMetrics(md)).toThrow(/dua kali/);
  });

  it("kolom Δ tidak cocok dengan selisih RVS → error (#229)", () => {
    const md = table([base, "| v0.10.0 | 2026-07-16 | 71,0% | — · — · 441 · — · — | 1010 | +99 | b |"]);
    expect(() => parseReleaseMetrics(md)).toThrow(/tidak cocok/);
  });

  it("titik desimal tidak terbaca sebagai ribuan (2.67 ≠ 267); ribuan sejati tetap dibuang (#229)", () => {
    const md = table(["| v0.9.0 | 2026-07-15 | 71,0% | 2.67 MB · — · 1.234 · — · — | 1000 | anchor | a |"]);
    const [r] = parseReleaseMetrics(md);
    expect(r.payloadMb).toBeCloseTo(2.67);
    expect(r.testCount).toBe(1234);
  });
});

describe("kalender & agregasi Panel 2", () => {
  it("dayKind timezone-agnostik: 1 Ags 2026 = Sabtu, 15 Jul 2026 = hari kerja", () => {
    expect(dayKind("2026-08-01")).toBe("saturday");
    expect(dayKind("2026-08-02")).toBe("sunday");
    expect(dayKind("2026-07-15")).toBe("weekday");
  });

  it("isoWeekStart mulai Senin", () => {
    expect(isoWeekStart("2026-07-15")).toBe("2026-07-13"); // Rabu → Senin 13 Jul
    expect(isoWeekStart("2026-07-13")).toBe("2026-07-13");
    expect(isoWeekStart("2026-08-02")).toBe("2026-07-27"); // Minggu → Senin minggu itu
  });

  it("agregasi minggu sesuai tabel spec §4.3 (Sabtu 1 Ags terpisah dari hari kerja)", () => {
    const releases = parseReleaseMetrics(realMd);
    const weeks = bucketRvsGains(releases, "week");
    const byKey = Object.fromEntries(weeks.map((w) => [w.key, w]));
    // 4 rilis ber-delta (v0.10–v0.13; v0.9 anchor tanpa delta) — narasi spec
    // menulis "3" tapi data nyatanya 4; ikuti data.
    expect(byKey["2026-07-13"]).toMatchObject({ weekday: 174, saturday: 0, sunday: 0, releases: 4 });
    expect(byKey["2026-07-20"]).toMatchObject({ weekday: 275, releases: 3 });
    // 27 Jul–2 Ags: v0.17 (Selasa) +60, v0.18 (Jumat) +50, v0.19 (Sabtu 1 Ags) +40.
    expect(byKey["2026-07-27"]).toMatchObject({ weekday: 110, saturday: 40, sunday: 0, releases: 3 });
  });

  // Angka siklus berjalan berubah tiap update metrics.md — assert RELATIF
  // terhadap data, bukan nilai pin yang basi begitu file bertambah baris.
  it("baris provisional hanya masuk bucket bila diberi tanggal 'hari ini'", () => {
    const releases = parseReleaseMetrics(realMd);
    const last = releases[releases.length - 1];
    expect(last.isProvisional).toBe(true);
    const without = bucketRvsGains(releases, "month");
    const with2 = bucketRvsGains(releases, "month", "2026-08-05");
    const aug = (bs: typeof with2) => bs.find((b) => b.key === "2026-08");
    // Tepat pasca-rilis, baris siklus berjalan yang baru ber-delta 0 (bukan
    // null) — assert INKLUSI via jumlah rilis di bucket, bukan delta > 0.
    expect((aug(with2)?.releases ?? 0) - (aug(without)?.releases ?? 0)).toBe(last.delta == null ? 0 : 1);
    expect((aug(with2)?.total ?? 0) - (aug(without)?.total ?? 0)).toBe(last.delta ?? 0);
  });

  it("total bucket bulanan = jumlah delta rilis di bulan itu (Juli 559, estimasi)", () => {
    const releases = parseReleaseMetrics(realMd);
    const months = bucketRvsGains(releases, "month", "2026-08-05");
    const jul = months.find((m) => m.key === "2026-07");
    expect(jul?.total).toBe(559); // riwayat Juli beku — boleh di-pin
    expect(jul?.hasEstimated).toBe(true);
    const augExpected = releases
      .filter((r) => (r.releasedAt ?? "2026-08-05").startsWith("2026-08"))
      .reduce((s, r) => s + (r.delta ?? 0), 0);
    expect(months.find((m) => m.key === "2026-08")?.total).toBe(augExpected);
  });
});

describe("parseActiveTechDebt — register tech-debt.md nyata", () => {
  it("memparse semua item aktif dengan id/status/prioritas/judul; arsip tidak ikut", async () => {
    const { parseActiveTechDebt } = await import("@/lib/tech-debt");
    const md = readFileSync(join(__dirname, "../../docs/project/tech-debt.md"), "utf-8");
    const items = parseActiveTechDebt(md);
    expect(items.length).toBeGreaterThanOrEqual(10);
    const td15 = items.find((t) => t.id === "TD-015");
    expect(td15?.priority).toBe("P3");
    expect(td15?.title).toContain("DataTable");
    // Arsip (item selesai) tidak boleh terparse.
    expect(items.every((t) => !t.status.includes("✅"))).toBe(true);
    // Format rusak → error, bukan tabel kosong diam-diam.
    expect(() => parseActiveTechDebt("tanpa register")).toThrow(/Debt Register/);
  });
});
