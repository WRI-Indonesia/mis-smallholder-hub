// Gaya layer peta bersama (dedup #241).

import type { CircleLayerSpecification } from "maplibre-gl";

/**
 * Paint titik pohon sawit (kuning, tepi cokelat) — dipakai peta Informasi
 * Lahan (Detail Lahan) dan peta Sebaran Lahan (Detail Petani/Lembaga).
 * Warna yang sama juga dipakai dot legenda di kedua halaman (kelas Tailwind
 * literal `bg-[#facc15] border-[#854d0e]` — tak bisa dari konstanta).
 */
export const TREE_POINT_PAINT: NonNullable<CircleLayerSpecification["paint"]> = {
  "circle-radius": 3.5,
  "circle-color": "#facc15",
  "circle-opacity": 0.9,
  "circle-stroke-width": 1,
  "circle-stroke-color": "#854d0e",
};
