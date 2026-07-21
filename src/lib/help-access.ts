/**
 * Penanda hak akses materi Bantuan — modul terpisah dan **murni** agar bisa
 * diuji: `help-content.ts` mengimpor berkas `.md` (bundling webpack
 * `asset/source`) yang tidak bisa dimuat di vitest.
 *
 * Sengaja tidak bergantung pada tipe `HelpTopic`; cukup bentuk minimal yang
 * dibutuhkan, sehingga modul ini bebas dari rantai impor konten.
 */
export interface AccessCheckable {
  menuKey?: string;
  /** Level izin yang dibutuhkan tutorial ini, mis. `CREATE`. */
  permission?: string;
}

/**
 * Apakah pembaca punya izin untuk benar-benar menjalankan tutorial ini.
 *
 * Tutorial di luar hak akses **ditandai, bukan disembunyikan** — panduannya
 * tetap berguna saat pelatihan lintas peran; penanda hanya mencegah orang
 * mengikuti langkah lalu kebingungan mencari tombol yang tak akan muncul.
 *
 * Diperiksa sampai **level izin**, bukan sekadar bisa-tidaknya membuka menu:
 * pembaca dengan VIEW tetapi tanpa CREATE pada `master-data-farmers` tetap
 * perlu diberi tahu bahwa tombol "Tambah Petani" tidak ada untuknya.
 *
 * @param effective peta `menuKey → daftar izin`, dari `getEffectiveMenuPermissions`
 */
export function isTopicAccessible(
  topic: AccessCheckable,
  effective: Record<string, string[]>,
): boolean {
  if (topic.menuKey == null) return true;
  const granted = effective[topic.menuKey];
  if (granted == null) return false;
  return topic.permission == null || granted.includes(topic.permission);
}

/** Bentuk minimal bab yang dibutuhkan pencarian tutorial kontekstual. */
export interface ChapterLike<T extends AccessCheckable = AccessCheckable> {
  slug: string;
  section: string;
  topics: (T & { id: string; title: string })[];
}

/**
 * Tutorial yang membahas satu menu — sumber tautan bantuan kontekstual (ikon `?`
 * di header halaman). Mengembalikan yang **pertama** cocok; bila satu menu punya
 * beberapa tutorial, yang paling awal dideklarasikan dianggap paling mendasar.
 */
export function findTutorialForMenu(
  menuKey: string,
  chapters: ChapterLike[],
): { href: string; title: string } | null {
  for (const chapter of chapters) {
    if (chapter.section !== "tutorial") continue;
    const topic = chapter.topics.find((t) => t.menuKey === menuKey);
    if (topic) return { href: `/admin/help/${chapter.slug}/${topic.id}`, title: topic.title };
  }
  return null;
}
