import { describe, expect, it } from "vitest";
import { computePopupPan, POPUP_VIEW_PAD } from "@/components/shared/map-popup";

/** Viewport peta 800×600 di origin. */
const MAP = { left: 0, top: 0, right: 800, bottom: 600 };

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

describe("computePopupPan (#222 — popup harus utuh di viewport peta)", () => {
  it("popup sudah utuh → tidak menggeser", () => {
    expect(computePopupPan(MAP, rect(300, 200, 280, 300))).toEqual([0, 0]);
  });

  it("terpotong tepi atas → dy negatif (konten turun) sampai pas padding", () => {
    const [dx, dy] = computePopupPan(MAP, rect(300, -50, 280, 300));
    expect(dx).toBe(0);
    expect(dy).toBe(-50 - POPUP_VIEW_PAD);
  });

  it("terpotong tepi bawah → dy positif (konten naik)", () => {
    const [dx, dy] = computePopupPan(MAP, rect(300, 400, 280, 300));
    expect(dx).toBe(0);
    expect(dy).toBe(400 + 300 - (600 - POPUP_VIEW_PAD));
  });

  it("terpotong tepi kiri dan atas sekaligus → geser dua sumbu", () => {
    const [dx, dy] = computePopupPan(MAP, rect(-40, -30, 280, 300));
    expect(dx).toBe(-40 - POPUP_VIEW_PAD);
    expect(dy).toBe(-30 - POPUP_VIEW_PAD);
  });

  it("terpotong tepi kanan → dx positif", () => {
    const [dx] = computePopupPan(MAP, rect(700, 200, 280, 300));
    expect(dx).toBe(700 + 280 - (800 - POPUP_VIEW_PAD));
  });

  it("popup lebih tinggi dari viewport → prioritaskan tepi atas (header + close terlihat)", () => {
    const [, dy] = computePopupPan(MAP, rect(300, -100, 280, 900));
    expect(dy).toBe(-100 - POPUP_VIEW_PAD);
  });

  it("pas di batas padding → dianggap utuh", () => {
    expect(
      computePopupPan(MAP, rect(POPUP_VIEW_PAD, POPUP_VIEW_PAD, 800 - 2 * POPUP_VIEW_PAD, 600 - 2 * POPUP_VIEW_PAD))
    ).toEqual([0, 0]);
  });

  it("viewport tidak di origin (rect halaman, bukan lokal) tetap benar", () => {
    const map = { left: 100, top: 50, right: 900, bottom: 650 };
    const [dx, dy] = computePopupPan(map, rect(60, 20, 280, 300));
    expect(dx).toBe(60 - (100 + POPUP_VIEW_PAD));
    expect(dy).toBe(20 - (50 + POPUP_VIEW_PAD));
  });
});
