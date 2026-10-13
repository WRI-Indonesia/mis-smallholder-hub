import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AvailabilityHero } from "@/app/(admin)/admin/data-analyst/data-availability/availability-hero";
import { ActiveFilterBar } from "@/app/(admin)/admin/data-analyst/data-availability/active-filter-bar";
import { uiAnomalyLabel, WORKLIST_TABS } from "@/app/(admin)/admin/data-analyst/data-availability/availability-worklist";
import { AvailabilityDomainCards } from "@/app/(admin)/admin/data-analyst/data-availability/availability-domain-cards";
import { BAND_SHORT } from "@/lib/score-band-styles";
import type { AvailabilityTotals } from "@/types/dashboard";

/**
 * #417 — kerangka Semua Lembaga: render statis (tanpa jsdom, suite tetap env
 * node) untuk memeriksa nama aksesibel & keadaan kosong komponen baru.
 */
const totals = {
  totalGroups: 32,
  totalFarmers: 8863,
  totalParcels: 13485,
  totalActivities: 854,
  farmersWithProduction: 1755,
  overallScore: 67,
  totalAnomalies: 120,
  domainScores: { profil: 99.5, petani: 77.2, lahan: 70.1, pelatihan: 80.6, produksi: 19.8 },
} as unknown as AvailabilityTotals;

describe("AvailabilityHero — segmen tingkat skor (T4)", () => {
  const html = renderToStaticMarkup(
    createElement(AvailabilityHero, { totals, distribution: { bad: 2, warn: 24, good: 6, full: 0 }, activeBand: "warn", onBandChange: () => {} }),
  );

  it("tiap segmen berisi jumlah + aria-label yang menyebut aksinya; segmen kosong tidak dirender", () => {
    expect(html).toContain('aria-label="24 Lembaga 50 – &lt;80 — perlu perhatian — klik untuk melepas filter"');
    expect(html).toContain('aria-label="2 Lembaga &lt;50 — kritis — klik untuk menyaring"');
    expect(html).not.toContain('data-band="full"');
    expect(html.match(/aria-pressed="true"/g)?.length).toBe(1);
  });

  it("kalimat ringkas memakai istilah Lahan (bukan Persil) dan tanpa kolom Aksi lintas Lembaga (T2)", () => {
    expect(html).toContain("lahan");
    expect(html).not.toContain("Persil");
    expect(html).not.toContain("Aksi lintas Lembaga");
  });

  it("pilihan filter kosong → keadaan kosong, bukan cincin skor 0", () => {
    const empty = renderToStaticMarkup(
      createElement(AvailabilityHero, { totals: { ...totals, totalGroups: 0 } as AvailabilityTotals, distribution: { bad: 0, warn: 0, good: 0, full: 0 }, activeBand: null, onBandChange: () => {} }),
    );
    expect(empty).toContain("Tidak ada Lembaga Petani pada pilihan filter ini.");
  });
});

describe("ActiveFilterBar — chip ↔ URL (T3)", () => {
  it("tanpa chip → tidak dirender (tampilan bawaan bersih)", () => {
    expect(renderToStaticMarkup(createElement(ActiveFilterBar, { chips: [] }))).toBe("");
  });

  it("satu chip per kunci URL dengan tombol lepas bernama; Reset di bar filter, bukan di baris chip (#427)", () => {
    const onRemove = vi.fn();
    const html = renderToStaticMarkup(
      createElement(ActiveFilterBar, {
        chips: [
          { id: "band", label: "Tingkat skor", value: "kritis", onRemove },
          { id: "urut", label: "Urut", value: "produksi ↑", onRemove },
        ],
      }),
    );
    expect(html).toContain('data-filter="band"');
    expect(html).toContain('data-filter="urut"');
    expect(html).toContain('aria-label="Lepas filter Tingkat skor: kritis"');
    expect(html).not.toContain("Reset semua");
  });
});

describe("Daftar Kerja — tab & istilah (#417 C/D)", () => {
  it("tiga tab, urutan tetap (kunci URL ?kerja=)", () => {
    expect(WORKLIST_TABS).toEqual(["sistemik", "entitas", "tertinggal"]);
  });
  it("label registri 'persil' dibaca 'lahan' di layar, kata lain tak tersentuh", () => {
    expect(uiAnomalyLabel("Persil tanpa status lahan")).toBe("Lahan tanpa status lahan");
    expect(uiAnomalyLabel("Produksi tidak terhubung ke persil")).toBe("Produksi tidak terhubung ke lahan");
    expect(uiAnomalyLabel("Petani tanpa NIK")).toBe("Petani tanpa NIK");
  });
});

describe("review #417", () => {
  it("chip kartu domain aktif menyebut arah yang sebenarnya (menurun = tertinggi dulu)", () => {
    const render = (asc: boolean) =>
      renderToStaticMarkup(createElement(AvailabilityDomainCards, { totals, groups: [], activeSort: "produksi", activeSortAsc: asc, onSelect: () => {} }));
    expect(render(true)).toContain("Produksi, terendah dulu");
    expect(render(false)).toContain("Produksi, tertinggi dulu");
  });

  it("nama pendek tingkat skor satu sumber (chip, segmen hero, legenda)", () => {
    expect(BAND_SHORT).toEqual({ bad: "kritis", warn: "perhatian", good: "baik", full: "lengkap" });
  });

  it("uiCheckLabel juga menangkap bentuk berimbuhan tanda hubung", () => {
    expect(uiAnomalyLabel("Persil-persil tanpa surat")).toBe("Lahan-lahan tanpa surat");
  });
});

