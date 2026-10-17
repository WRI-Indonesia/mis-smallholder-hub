import { requirePermission } from "@/lib/rbac";
import { HelpHint } from "@/app/(admin)/admin/help/help-hint";
import { SITEMAP_DOCS } from "@/lib/sitemap-data";
import { SitemapViewClient } from "./sitemap-view-client";

/**
 * Peta Fitur (owner 2026-10-17): seluruh fitur aplikasi sebagai flowchart
 * Menu → Sub menu → Halaman → Bagian → Isi, dibaca dari
 * `docs/product/sitemap/*.md` yang di-bundle saat build (pola Rencana
 * Pengembangan). Sumber yang sama dipakai untuk board Miro & naskah video.
 * Tanpa akses DB — halaman tentang aplikasinya sendiri, bukan data petani.
 */
export default async function SitemapPage() {
  await requirePermission("platform-developer-sitemap");

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Peta Fitur</h1>
          <HelpHint menuKey="platform-developer-sitemap" />
        </div>
        <p className="text-muted-foreground">
          Seluruh menu, halaman, bagian, dan isinya sebagai diagram alur — satu berkas per menu dari dokumentasi
          produk, ditampilkan dengan dua mesin gambar atas sumber yang sama.
        </p>
      </div>
      <SitemapViewClient docs={SITEMAP_DOCS} />
    </div>
  );
}
