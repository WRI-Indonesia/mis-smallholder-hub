import { describe, expect, it } from "vitest";
import { computePopupPan, popupViewRect, POPUP_VIEW_PAD } from "@/components/shared/map-popup";

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

describe("popupViewRect — panel melayang menutupi tepi kiri peta", () => {
  it("sisa lebar cukup → tepi kiri digeser selebar panel, popup didorong ke kanan panel", () => {
    const view = popupViewRect(MAP, 300, 352);
    expect(view.left).toBe(352);
    const [dx] = computePopupPan(view, rect(200, 200, 300, 280));
    expect(dx).toBe(200 - (352 + POPUP_VIEW_PAD));
  });

  it("peta sempit (sisa < popup + padding) → abaikan panel agar popup tak terdorong keluar tepi kanan", () => {
    const narrow = { left: 0, top: 0, right: 600, bottom: 600 };
    expect(popupViewRect(narrow, 300, 352).left).toBe(0);
    expect(computePopupPan(popupViewRect(narrow, 300, 352), rect(100, 200, 300, 280))).toEqual([0, 0]);
  });

  it("DOMRect asli (getter di prototype, bukan properti sendiri) → tepi kanan/atas/bawah tetap terbaca (QA staging v1.6.0)", () => {
    // `getBoundingClientRect()` mengembalikan DOMRect: `{ ...rect }` menghasilkan objek kosong,
    // sehingga popup yang meluber ke kanan/bawah tak pernah digeser balik.
    class DomRectLike {
      constructor(private l: number, private t: number, private w: number, private h: number) {}
      get left() { return this.l; }
      get top() { return this.t; }
      get right() { return this.l + this.w; }
      get bottom() { return this.t + this.h; }
    }
    const box = new DomRectLike(0, 0, 800, 600);
    expect({ ...box }).not.toHaveProperty("right"); // prasyarat: spread memang kehilangan getter
    const view = popupViewRect(box, 300, 352);
    expect(view).toEqual({ left: 352, top: 0, right: 800, bottom: 600 });
    const [dx, dy] = computePopupPan(view, rect(600, 400, 300, 280));
    expect(dx).toBe(600 + 300 - (800 - POPUP_VIEW_PAD));
    expect(dy).toBe(400 + 280 - (600 - POPUP_VIEW_PAD));
  });
});
