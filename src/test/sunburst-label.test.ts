import { describe, expect, it } from "vitest";
import { clipLabel, sunburstLabel } from "@/lib/sunburst-label";

describe("sunburstLabel (Peta Fitur & Aliran TBS)", () => {
  it("null bila busur terlalu sempit", () => {
    expect(sunburstLabel(0, 0.05, 100, "Lembaga")).toBeNull();
  });

  it("irisan sangat lebar → label mendatar di tengah cincin, dipotong flatMax", () => {
    const l = sunburstLabel(0, Math.PI, 100, "x".repeat(40), { flatMax: 10 });
    expect(l).toMatchObject({ kind: "flat", text: "xxxxxxxxx…" });
    // Tengah irisan 0..π = arah jam 3 → x ≈ r, y ≈ 0.
    if (l?.kind === "flat") {
      expect(l.x).toBeCloseTo(100);
      expect(l.y).toBeCloseTo(0);
    }
  });

  it("irisan sedang → diputar; belahan kiri dibalik 180° agar tak terbalik", () => {
    // Busur 0,4 rad × r 200 = 80 px > ambang 46 px.
    const right = sunburstLabel(0.4, 0.8, 200, "Siak");
    const left = sunburstLabel(4.4, 4.8, 200, "Siak");
    expect(right).toMatchObject({ kind: "rotated", text: "Siak" });
    expect(right?.kind === "rotated" && right.transform.endsWith("rotate(0)")).toBe(true);
    expect(left?.kind === "rotated" && left.transform.endsWith("rotate(180)")).toBe(true);
  });

  it("clipLabel memotong dengan elipsis dan selalu menyisakan minimal satu huruf", () => {
    expect(clipLabel("Kampar", 10)).toBe("Kampar");
    expect(clipLabel("Rokan Hulu", 5)).toBe("Roka…");
    expect(clipLabel("Rokan Hulu", 0)).toBe("R…");
  });
});
