import { describe, it, expect } from "vitest";
import { barLabelWidth, stackedBarLabelLayout } from "@/lib/stacked-bar-labels";

const layout = (widthPx: number, trainedPct: number, trainedText: string, belumText: string | null, otherPct = 0, otherText: string | null = null) =>
  stackedBarLabelLayout({ widthPx, trainedPct, otherPct, trainedText, otherText, belumText });

describe("stackedBarLabelLayout — angka Capaian Paket per Distrik", () => {
  it("belum terukur → semua angka disembunyikan (tak ada lompatan posisi)", () => {
    expect(layout(0, 50, "1.000", "1.000")).toEqual({ trained: "hidden", other: false, belum: false });
  });

  it("segmen lebar: angka dilatih di dalam, angka belum di kanan", () => {
    expect(layout(200, 80, "3.186", "431")).toEqual({ trained: "inside", other: false, belum: true });
  });

  it("dilatih tak muat → menempel di luar; angka belum disembunyikan bila keduanya akan berdempetan (Paket 3 & 4)", () => {
    // 30% dari 100 px = 30 px < lebar "1.333"; sisa 70 px tak cukup untuk "1.333" + jarak + "2.156".
    expect(layout(100, 30, "1.333", "2.156")).toEqual({ trained: "outside", other: false, belum: false });
  });

  it("dilatih di luar, angka belum tetap tampil bila sisa ruang cukup untuk keduanya", () => {
    expect(layout(200, 10, "339", "1.001")).toEqual({ trained: "outside", other: false, belum: true });
  });

  it("dilatih 0% dan tak ada angka dilatih → hanya angka belum", () => {
    // Regresi: teks kosong dulu dianggap "tak muat" lalu "0" muncul di luar segmen (Pelalawan).
    expect(layout(100, 0, "", "417")).toEqual({ trained: "hidden", other: false, belum: true });
  });

  it("angka belum disembunyikan bila tak muat di sisa bar", () => {
    expect(layout(100, 92, "8.190", "673")).toEqual({ trained: "inside", other: false, belum: false });
  });

  it("segmen tahun lain: angkanya tak boleh menimpa angka dilatih yang menempel di luar", () => {
    // hijau 10 px (dilatih di luar, ±32 px), tahun lain 40 px — tak cukup untuk keduanya.
    expect(layout(200, 5, "120", null, 20, "800")).toMatchObject({ trained: "outside", other: false });
    // tahun lain 120 px — cukup.
    expect(layout(200, 5, "120", null, 60, "2.400")).toMatchObject({ trained: "outside", other: true });
  });

  it("perkiraan lebar label sebanding panjang teks", () => {
    expect(barLabelWidth("8.282")).toBeGreaterThan(barLabelWidth("417"));
  });
});
