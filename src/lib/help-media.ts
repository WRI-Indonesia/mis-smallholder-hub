// Modul server-only: mengimpor `lib/s3` (kredensial env) — jangan diimpor dari
// Client Component. Tanpa paket `server-only` (belum jadi dependency proyek),
// batas ini dijaga konvensi + review.
import { getPresignedUrl } from "@/lib/s3";
import { s3KeyFromSrc, type MdBlock } from "@/lib/markdown-lite";

/**
 * Ganti sumber media `s3://<key>` dengan **presigned URL** (#185). Dipanggil
 * saat render halaman topik Bantuan sehingga tautan selalu segar — URL S3
 * bertanda tangan punya masa berlaku, jadi tak boleh ditulis mati di Markdown.
 *
 * Sumber lain (path lokal `public/help/…`, URL publik, sematan YouTube/Vimeo)
 * dikembalikan apa adanya. Bila presign gagal (key salah/kredensial tak ada),
 * blok media tersebut **dibuang** agar sisa materi tetap tampil.
 */
export async function resolveHelpMedia(blocks: MdBlock[]): Promise<MdBlock[]> {
  const resolved = await Promise.all(
    blocks.map(async (block) => {
      if (block.type !== "media") return block;
      const key = s3KeyFromSrc(block.src);
      if (!key) return block;
      try {
        return { ...block, src: await getPresignedUrl(key) };
      } catch (error) {
        console.error(`[help] gagal presign media S3 "${key}":`, error);
        return null;
      }
    }),
  );
  return resolved.filter((b): b is MdBlock => b !== null);
}
