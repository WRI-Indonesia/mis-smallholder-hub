import {
  BookOpen,
  LogIn,
  Shield,
  Database,
  Upload,
  LayoutDashboard,
  Map as MapIcon,
  BarChart3,
  FileText,
  Wrench,
  HelpCircle,
  UserPlus,
  ListChecks,
  UploadCloud,
  Telescope,
  GraduationCap,
  TrendingUp,
  Rocket,
  FolderInput,
  Eye,
  Printer,
  Settings2,
  LifeBuoy,
} from "lucide-react";
import { parseMarkdown, blocksToPlainText, type MdBlock } from "@/lib/markdown-lite";

// Konten Bantuan (#184): file .md di-bundle sebagai string (webpack
// `asset/source`, lihat next.config.ts) lalu di-parse sekali di modul ini.
// Menambah topik = tambah file .md + satu baris import di CHAPTER_SOURCES.
import istilah from "@/content/help/1-memulai/1-1-istilah.md";
import masukAkun from "@/content/help/1-memulai/1-2-masuk-akun.md";
import hakAkses from "@/content/help/1-memulai/1-3-hak-akses.md";
import masterData from "@/content/help/2-mengelola-data/2-1-master-data.md";
import bulkUpload from "@/content/help/2-mengelola-data/2-2-bulk-upload.md";
import dashboard from "@/content/help/3-memantau/3-1-dashboard.md";
import peta from "@/content/help/3-memantau/3-2-peta.md";
import dataAnalyst from "@/content/help/3-memantau/3-3-data-analyst.md";
import report from "@/content/help/4-laporan/4-1-report.md";
import tools from "@/content/help/5-administrasi/5-1-tools.md";
import kendala from "@/content/help/6-bantuan-lanjutan/6-1-kendala.md";

// Lapis Tutorial (berbasis tugas) — dipisah dari lapis Konsep di bawahnya.
import tMenambahPetani from "@/content/help/tutorial/t-1-menambah-petani.md";
import tMenambahLahan from "@/content/help/tutorial/t-2-menambah-lahan.md";
import tMencatatPelatihan from "@/content/help/tutorial/t-3-mencatat-pelatihan.md";
import tMencatatProduksi from "@/content/help/tutorial/t-4-mencatat-produksi.md";
import uUnggahPetani from "@/content/help/tutorial/u-1-unggah-petani.md";
import uUnggahProduksi from "@/content/help/tutorial/u-2-unggah-produksi.md";
import uUnggahLahan from "@/content/help/tutorial/u-3-unggah-lahan.md";
import pMembacaDashboard from "@/content/help/tutorial/p-1-membaca-dashboard.md";
import pCakupanPelatihan from "@/content/help/tutorial/p-2-cakupan-pelatihan.md";
import pMembacaPeta from "@/content/help/tutorial/p-3-membaca-peta.md";
import lMembuatLaporan from "@/content/help/tutorial/l-1-membuat-laporan.md";
import lLaporanLahan from "@/content/help/tutorial/l-2-laporan-lahan.md";
import lMemperbaruiDashboard from "@/content/help/tutorial/l-3-memperbarui-dashboard.md";
import pDashboardBmp from "@/content/help/tutorial/p-4-dashboard-bmp.md";
import pPetaLahan from "@/content/help/tutorial/p-5-peta-lahan.md";
import aAnalisaData from "@/content/help/tutorial/a-1-analisa-data.md";
import aMengelolaPengguna from "@/content/help/tutorial/a-2-mengelola-pengguna.md";

type IconType = React.ComponentType<{ className?: string }>;

/** Ikon yang boleh dirujuk frontmatter `icon:` (nama tak dikenal → fallback). */
const ICONS: Record<string, IconType> = {
  BookOpen,
  LogIn,
  Shield,
  Database,
  Upload,
  LayoutDashboard,
  Map: MapIcon,
  BarChart3,
  FileText,
  Wrench,
  HelpCircle,
  UserPlus,
  GraduationCap,
  TrendingUp,
  Printer,
};

export interface HelpTopic {
  /** Slug anchor & kunci pencarian. */
  id: string;
  title: string;
  intro?: string;
  icon: IconType;
  blocks: MdBlock[];
  /** Teks polos untuk indeks pencarian. */
  plainText: string;
  /** Tutorial: hasil yang didapat pembaca di akhir langkah. */
  goal?: string;
  /** Tutorial: perkiraan waktu pengerjaan (menit). */
  duration?: number;
  /**
   * Tutorial: menu yang dipakai + level izin minimalnya. Dipakai menandai
   * tutorial yang di luar hak akses pembaca (lihat `markTopicAccess`).
   */
  menuKey?: string;
  permission?: string;
  /** Tutorial: tautan langsung ke halaman yang dibahas + label tombolnya. */
  href?: string;
  hrefLabel?: string;
}

/**
 * Tiga lapis Bantuan. **Tutorial** berorganisasi per tugas ("bagaimana caranya"),
 * **konsep** menjelaskan istilah & aturan main yang dirujuk tutorial ("apa itu"),
 * **referensi** merinci arti tiap kolom/tombol per halaman ("apa arti ini").
 * Rute tetap `/admin/help/[chapter]/[topic]` — section hanya mengelompokkan.
 */
export type HelpSection = "tutorial" | "konsep" | "referensi";

export interface HelpChapter {
  /** Slug rute: `/admin/help/[chapter]`. */
  slug: string;
  section: HelpSection;
  title: string;
  summary: string;
  icon: IconType;
  topics: HelpTopic[];
}

interface ChapterSource {
  slug: string;
  section: HelpSection;
  title: string;
  summary: string;
  icon: IconType;
  topics: { id: string; source: string }[];
}

const CHAPTER_SOURCES: ChapterSource[] = [
  {
    slug: "tutorial-data-harian",
    section: "tutorial",
    title: "Mengelola Data Harian",
    summary:
      "Langkah demi langkah pekerjaan yang paling sering dilakukan: mendaftarkan petani, lahan, pelatihan, dan produksi.",
    icon: ListChecks,
    topics: [
      { id: "menambah-petani", source: tMenambahPetani },
      { id: "menambah-lahan", source: tMenambahLahan },
      { id: "mencatat-pelatihan", source: tMencatatPelatihan },
      { id: "mencatat-produksi", source: tMencatatProduksi },
    ],
  },
  {
    slug: "tutorial-unggah-massal",
    section: "tutorial",
    title: "Unggah Massal",
    summary:
      "Memasukkan data dalam jumlah besar sekaligus — Excel untuk petani & produksi, shapefile untuk lahan.",
    icon: UploadCloud,
    topics: [
      { id: "unggah-petani", source: uUnggahPetani },
      { id: "unggah-produksi", source: uUnggahProduksi },
      { id: "unggah-lahan", source: uUnggahLahan },
    ],
  },
  {
    slug: "tutorial-memantau",
    section: "tutorial",
    title: "Memantau & Menindaklanjuti",
    summary:
      "Membaca dashboard dan peta, lalu mengubah temuannya jadi daftar kerja yang bisa ditindaklanjuti.",
    icon: Telescope,
    topics: [
      { id: "membaca-dashboard", source: pMembacaDashboard },
      { id: "cakupan-pelatihan", source: pCakupanPelatihan },
      { id: "membaca-peta", source: pMembacaPeta },
      { id: "dashboard-bmp", source: pDashboardBmp },
      { id: "peta-lahan", source: pPetaLahan },
    ],
  },
  {
    slug: "tutorial-laporan",
    section: "tutorial",
    title: "Laporan & Perawatan",
    summary:
      "Menyiapkan berkas untuk donor atau audit, dan menjaga angka dashboard tetap mutakhir.",
    icon: Printer,
    topics: [
      { id: "membuat-laporan", source: lMembuatLaporan },
      { id: "laporan-lahan", source: lLaporanLahan },
      { id: "memperbarui-dashboard", source: lMemperbaruiDashboard },
    ],
  },
  {
    slug: "tutorial-administrasi",
    section: "tutorial",
    title: "Analisa & Administrasi",
    summary: "Memeriksa kelengkapan data sebelum dilaporkan, dan mengatur siapa boleh melihat apa.",
    icon: Shield,
    topics: [
      { id: "analisa-data", source: aAnalisaData },
      { id: "mengelola-pengguna", source: aMengelolaPengguna },
    ],
  },
  {
    slug: "memulai",
    section: "konsep",
    title: "Memulai",
    summary:
      "Kenali istilah yang dipakai sistem, cara masuk, dan mengapa tampilan tiap pengguna berbeda.",
    icon: Rocket,
    topics: [
      { id: "istilah", source: istilah },
      { id: "masuk-akun", source: masukAkun },
      { id: "hak-akses", source: hakAkses },
    ],
  },
  {
    slug: "mengelola-data",
    section: "konsep",
    title: "Mengelola Data",
    summary: "Input harian lewat Master Data, atau unggah massal lewat Bulk Upload.",
    icon: FolderInput,
    topics: [
      { id: "master-data", source: masterData },
      { id: "bulk-upload", source: bulkUpload },
    ],
  },
  {
    slug: "memantau",
    section: "konsep",
    title: "Memantau & Menganalisa",
    summary:
      "Ringkasan program lewat dashboard, sebaran spasial lewat peta, dan kualitas data lewat analisa.",
    icon: Eye,
    topics: [
      { id: "dashboard", source: dashboard },
      { id: "peta", source: peta },
      { id: "data-analyst", source: dataAnalyst },
    ],
  },
  {
    slug: "laporan",
    section: "konsep",
    title: "Laporan & Cetak",
    summary: "Enam laporan siap unduh (Excel & PDF), termasuk Laporan Lahan yang menyertakan peta.",
    icon: Printer,
    topics: [{ id: "report", source: report }],
  },
  {
    slug: "administrasi",
    section: "konsep",
    title: "Administrasi",
    summary: "Perawatan berkala agar angka dashboard mengikuti data terbaru.",
    icon: Settings2,
    topics: [{ id: "tools", source: tools }],
  },
  {
    slug: "bantuan-lanjutan",
    section: "konsep",
    title: "Bantuan Lanjutan",
    summary: "Kendala yang paling sering ditemui beserta langkah pemeriksaannya.",
    icon: LifeBuoy,
    topics: [{ id: "kendala", source: kendala }],
  },
];

export const HELP_CHAPTERS: HelpChapter[] = CHAPTER_SOURCES.map((chapter) => ({
  slug: chapter.slug,
  section: chapter.section,
  title: chapter.title,
  summary: chapter.summary,
  icon: chapter.icon,
  topics: chapter.topics.map(({ id, source }) => {
    const { frontmatter, blocks } = parseMarkdown(source);
    const duration = Number.parseInt(frontmatter.duration ?? "", 10);
    return {
      id,
      title: frontmatter.title || id,
      intro: frontmatter.intro || undefined,
      icon: ICONS[frontmatter.icon] ?? HelpCircle,
      blocks,
      plainText: blocksToPlainText(blocks),
      goal: frontmatter.goal || undefined,
      duration: Number.isFinite(duration) ? duration : undefined,
      menuKey: frontmatter.menuKey || undefined,
      permission: frontmatter.permission || undefined,
      href: frontmatter.href || undefined,
      hrefLabel: frontmatter.hrefLabel || undefined,
    };
  }),
}));

/** Bab pada satu lapis, urut sesuai deklarasi. */
export function helpChaptersBySection(
  section: HelpSection,
  chapters: HelpChapter[] = HELP_CHAPTERS,
): HelpChapter[] {
  return chapters.filter((c) => c.section === section);
}

/** Bungkus `findTutorialForMenu` dengan daftar bab bawaan. Intinya ada di
 * `help-access.ts` (modul murni) agar bisa diuji tanpa memuat berkas `.md`. */
export function findTutorialForMenu(menuKey: string, chapters: HelpChapter[] = HELP_CHAPTERS) {
  return findTutorialCore(menuKey, chapters);
}

// Penanda hak akses dipindah ke modul murni agar bisa diuji (berkas ini
// mengimpor `.md` yang tak bisa dimuat vitest); di-re-export demi kompatibilitas.
export { isTopicAccessible, type AccessCheckable } from "@/lib/help-access";
import { findTutorialForMenu as findTutorialCore } from "@/lib/help-access";

export function getHelpChapter(slug: string): HelpChapter | undefined {
  return HELP_CHAPTERS.find((c) => c.slug === slug);
}

/** Satu topik beserta posisinya — untuk halaman `[chapter]/[topic]`. */
export interface HelpTopicLocation {
  chapter: HelpChapter;
  chapterIndex: number;
  topic: HelpTopic;
  topicIndex: number;
  number: string;
}

export function getHelpTopic(chapterSlug: string, topicId: string): HelpTopicLocation | undefined {
  const chapterIndex = HELP_CHAPTERS.findIndex((c) => c.slug === chapterSlug);
  if (chapterIndex === -1) return undefined;
  const chapter = HELP_CHAPTERS[chapterIndex];
  const topicIndex = chapter.topics.findIndex((t) => t.id === topicId);
  if (topicIndex === -1) return undefined;
  return {
    chapter,
    chapterIndex,
    topic: chapter.topics[topicIndex],
    topicIndex,
    number: topicNumber(chapterIndex, topicIndex),
  };
}

/** Tautan ringkas satu topik (untuk tombol sebelumnya/berikutnya). */
export interface HelpTopicLink {
  chapterSlug: string;
  topicId: string;
  title: string;
  number: string;
}

/** Semua topik berurutan lintas bab — dasar navigasi maju/mundur. */
export function flattenHelpTopics(chapters: HelpChapter[] = HELP_CHAPTERS): HelpTopicLink[] {
  return chapters.flatMap((chapter, ci) =>
    chapter.topics.map((topic, ti) => ({
      chapterSlug: chapter.slug,
      topicId: topic.id,
      title: topic.title,
      number: topicNumber(ci, ti),
    })),
  );
}

/** Topik sebelum & sesudah (menyeberang bab bila perlu). */
export function getAdjacentHelpTopics(
  chapterSlug: string,
  topicId: string,
): { prev: HelpTopicLink | null; next: HelpTopicLink | null } {
  const all = flattenHelpTopics();
  const i = all.findIndex((t) => t.chapterSlug === chapterSlug && t.topicId === topicId);
  if (i === -1) return { prev: null, next: null };
  return { prev: all[i - 1] ?? null, next: all[i + 1] ?? null };
}

/** Nomor bab.topik (1-based) untuk penomoran & rujukan lisan. */
export function topicNumber(chapterIndex: number, topicIndex: number): string {
  return `${chapterIndex + 1}.${topicIndex + 1}`;
}

/** Entri indeks pencarian — serializable, aman dikirim ke Client Component. */
export interface HelpSearchEntry {
  chapterSlug: string;
  chapterTitle: string;
  topicId: string;
  topicTitle: string;
  number: string;
  /** Judul + intro + isi, huruf kecil — untuk pencocokan kata kunci. */
  haystack: string;
}

export function buildHelpSearchIndex(chapters: HelpChapter[] = HELP_CHAPTERS): HelpSearchEntry[] {
  return chapters.flatMap((chapter, ci) =>
    chapter.topics.map((topic, ti) => ({
      chapterSlug: chapter.slug,
      chapterTitle: chapter.title,
      topicId: topic.id,
      topicTitle: topic.title,
      number: topicNumber(ci, ti),
      haystack: [chapter.title, topic.title, topic.intro ?? "", topic.plainText]
        .join(" ")
        .toLowerCase(),
    })),
  );
}

/** Struktur ringan (tanpa ikon/konten) untuk navigasi di Client Component. */
export interface HelpNavChapter {
  slug: string;
  title: string;
  topics: { id: string; title: string; number: string }[];
}

export function buildHelpNav(chapters: HelpChapter[] = HELP_CHAPTERS): HelpNavChapter[] {
  return chapters.map((chapter, ci) => ({
    slug: chapter.slug,
    title: chapter.title,
    topics: chapter.topics.map((topic, ti) => ({
      id: topic.id,
      title: topic.title,
      number: topicNumber(ci, ti),
    })),
  }));
}
