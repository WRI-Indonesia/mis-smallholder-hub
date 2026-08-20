/**
 * Encoder capture peta MapLibre untuk lampiran PDF (client-only — memakai
 * `document`). Dipakai bersama oleh Fire Alert dan Peta BMP.
 *
 * Dua keputusan yang menentukan ukuran berkas:
 *
 * 1. **Diperkecil ke `MAX_CAPTURE_PX`.** Canvas MapLibre mengikuti ukuran layar
 *    × devicePixelRatio (mis. 2180×1760 di laptop Retina). Digambar pada lebar
 *    konten A4 (186 mm potret / 273 mm lanskap) itu setara ±500 dpi — piksel
 *    yang tidak pernah terlihat di cetakan maupun layar.
 * 2. **JPEG, bukan PNG.** Citra peta bersifat fotografis (gradasi basemap, halo
 *    label, poligon semi-transparan) sehingga PNG lossless berukuran berlipat
 *    tanpa manfaat yang tampak. Laporan Fire Alert Full Riau melampirkan satu
 *    peta per lembaga terdampak, jadi biayanya berkali jumlah lembaga.
 */

export type MapCapture = { dataUrl: string; width: number; height: number };

/** 1500 px pada lebar konten A4 lanskap (273 mm) ≈ 140 dpi; potret ≈ 205 dpi. */
export const MAX_CAPTURE_PX = 1500;
/** 0,85 tak menampakkan artefak pada garis batas & label peta. */
export const CAPTURE_QUALITY = 0.85;

/** Format `addImage` jsPDF yang sesuai isi data URL (capture JPEG, placeholder PNG). */
export function imageFormatOf(dataUrl: string): "JPEG" | "PNG" {
  return dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
}

export function encodeMapCapture(source: HTMLCanvasElement): MapCapture {
  // Skala 1 (layar DPR-1: canvas sudah <= MAX_CAPTURE_PX) TETAP lewat canvas
  // antara. JPEG tak punya alpha, dan piksel transparan — mis. tile basemap
  // gagal dimuat — dikomposit browser di atas HITAM. Jalur PNG lama tampil
  // putih di halaman PDF, jadi menyalin canvas apa adanya akan menjadi regresi
  // yang hanya muncul di layar non-Retina.
  const scale = Math.min(1, MAX_CAPTURE_PX / Math.max(source.width, source.height));
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);

  const target = document.createElement("canvas");
  target.width = width;
  target.height = height;
  const ctx = target.getContext("2d");
  // Tanpa konteks 2D tak ada cara meratakan alpha — kembali ke PNG (lossless,
  // alpha aman) daripada menerbitkan JPEG berlatar hitam.
  if (!ctx) {
    return { dataUrl: source.toDataURL("image/png"), width: source.width, height: source.height };
  }

  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  return { dataUrl: target.toDataURL("image/jpeg", CAPTURE_QUALITY), width, height };
}
