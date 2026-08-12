// Baca File browser → base64 tanpa prefix data-URL, payload parse ZIP untuk
// Server Action (dedup #241 — semula alur FileReader ini duplikat di klien
// upload Lahan & Pohon).
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(new Error("Gagal membaca berkas"));
    reader.readAsDataURL(file);
  });
}
