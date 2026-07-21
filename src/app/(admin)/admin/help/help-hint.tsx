import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { findTutorialForMenu } from "@/lib/help-content";

/**
 * Tautan bantuan kontekstual — ikon `?` di header halaman yang menuju tutorial
 * pembahas menu ini.
 *
 * Alasannya: pengguna yang bingung sedang berada **di halaman itu**, bukan di
 * menu Bantuan. Memaksanya mencari sendiri berarti ia harus meninggalkan
 * pekerjaannya. Tautan dibuka di tab baru agar isian yang belum tersimpan tidak
 * hilang.
 *
 * Tidak merender apa pun bila menu ini belum punya tutorial — jadi aman
 * dipasang lebih dulu di halaman yang materinya menyusul.
 */
export function HelpHint({ menuKey }: { menuKey: string }) {
  const tutorial = findTutorialForMenu(menuKey);
  if (!tutorial) return null;

  return (
    <Link
      href={tutorial.href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Panduan: ${tutorial.title}`}
      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <HelpCircle className="h-3.5 w-3.5" />
      Panduan
      <span className="sr-only">: {tutorial.title} (terbuka di tab baru)</span>
    </Link>
  );
}
