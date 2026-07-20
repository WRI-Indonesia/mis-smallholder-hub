import {
  BookOpen,
  Database,
  Upload,
  LayoutDashboard,
  Map as MapIcon,
  FileText,
  BarChart3,
  Wrench,
  Shield,
  LogIn,
  HelpCircle,
} from "lucide-react";
import { requirePermission } from "@/lib/rbac";

// Halaman panduan STATIS (#182): tanpa query DB / server action / state.
// Konten diturunkan dari docs/product (role-flows, crud-flows, module-status) —
// perbarui bersama saat alur modul berubah.

interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  intro?: string;
  /** Poin panduan; `term` = istilah/langkah, `desc` = penjelasan. */
  items: { term: string; desc: string }[];
}

const SECTIONS: Section[] = [
  {
    id: "istilah",
    title: "Sekilas & Istilah Penting",
    icon: BookOpen,
    intro:
      "Smallholder HUB MIS adalah sistem informasi data petani sawit swadaya: petani, kelembagaan, lahan, pelatihan, dan produksi. Pahami dulu istilahnya agar tidak tertukar saat mengisi data.",
    items: [
      {
        term: "Petani",
        desc: "Individu anggota program. Punya identitas (ID Petani, NIK, alamat) dan bisa memiliki satu atau beberapa lahan.",
      },
      {
        term: "Kelompok Tani (KT)",
        desc: "Kumpulan petani di tingkat paling bawah. Di sistem ini KT melekat pada LAHAN (bukan pada petani), karena satu petani bisa punya lahan di KT berbeda.",
      },
      {
        term: "Gapoktan / KUD",
        desc: "Gabungan kelompok tani atau koperasi unit desa — tingkat di atas KT. Sama seperti KT, datanya melekat pada lahan.",
      },
      {
        term: "Lembaga Petani",
        desc: "Tingkat tertinggi kelembagaan (asosiasi/koperasi, mis. ICS). Setiap petani terdaftar pada satu Lembaga Petani. Di menu Master Data namanya \"Lembaga Petani\".",
      },
      {
        term: "Lahan / Persil",
        desc: "Sebidang kebun milik petani: ID Lahan, luas (Ha), tahun tanam, komoditas, dan poligon batas kebun (dari Shapefile).",
      },
      {
        term: "Produksi",
        desc: "Catatan panen per lahan per bulan (periode YYYY-MM), dalam kilogram. Satu bulan bisa berisi beberapa kali panen.",
      },
    ],
  },
  {
    id: "masuk",
    title: "Masuk & Akun",
    icon: LogIn,
    items: [
      {
        term: "Login",
        desc: "Gunakan email dan password yang diberikan admin. Bila lupa password, hubungi admin sistem untuk direset.",
      },
      {
        term: "Ubah password",
        desc: "Klik nama Anda di pojok kanan atas → Profile → ganti password. Gunakan password baru minimal 8 karakter.",
      },
      {
        term: "Keluar",
        desc: "Selalu logout bila memakai komputer bersama, karena data petani bersifat rahasia.",
      },
    ],
  },
  {
    id: "akses",
    title: "Hak Akses & Cakupan Data",
    icon: Shield,
    intro:
      "Menu yang tampil dan data yang terlihat berbeda antar pengguna. Ini normal — sistem membatasi sesuai peran dan wilayah/lembaga yang ditugaskan kepada Anda.",
    items: [
      {
        term: "SUPERADMIN",
        desc: "Akses penuh seluruh menu dan seluruh data, termasuk pengaturan pengguna, role, menu, dan wilayah.",
      },
      {
        term: "ADMIN",
        desc: "Kelola data dalam cakupan distrik/provinsi yang ditugaskan: master data, bulk upload, laporan, dan snapshot dashboard.",
      },
      {
        term: "OPERATOR",
        desc: "Petugas lapangan: input dan ubah data petani, lahan, pelatihan, dan produksi untuk lembaga/KT yang ditugaskan.",
      },
      {
        term: "MANAGEMENT",
        desc: "Hanya melihat (read-only): dashboard, laporan, dan analisa — tanpa tombol tambah/ubah/hapus.",
      },
      {
        term: "Kenapa daftar saya lebih sedikit?",
        desc: "Bila Anda ditugaskan pada distrik atau lembaga tertentu, semua daftar, laporan, dan peta otomatis tersaring ke cakupan itu.",
      },
    ],
  },
  {
    id: "master-data",
    title: "Master Data",
    icon: Database,
    intro:
      "Menu Master Data adalah tempat input harian: Lembaga Petani, Petani, Lahan, Pelatihan, dan Produksi. Semua daftar punya pola yang sama.",
    items: [
      {
        term: "Menambah data",
        desc: "Klik tombol Tambah di kanan atas daftar, isi formulir, lalu Simpan. Kolom bertanda wajib harus diisi.",
      },
      {
        term: "Mencari & menyaring",
        desc: "Gunakan kotak pencarian di atas tabel; tombol Kolom untuk menampilkan/menyembunyikan kolom; klik judul kolom untuk mengurutkan.",
      },
      {
        term: "Mengubah & melihat detail",
        desc: "Kolom Aksi di kiri baris berisi tombol ubah dan detail. Halaman detail Petani dan Lembaga Petani menampilkan profil lengkap: lahan + peta, pelatihan, dan produksi.",
      },
      {
        term: "Menonaktifkan, bukan menghapus",
        desc: "Data tidak pernah dihapus permanen. Tombol hapus akan menonaktifkan data (status Nonaktif) sehingga riwayat tetap utuh; gunakan filter Status untuk melihat data nonaktif dan mengaktifkannya kembali.",
      },
      {
        term: "Revisi data lahan",
        desc: "Saat data lahan diubah, sistem menyimpan versi lama dan membuat versi baru (nomor Revisi bertambah). Ini menjaga jejak perubahan batas/luas kebun.",
      },
      {
        term: "Data pribadi disensor",
        desc: "Di layar, NIK ditampilkan sebagian dan tanggal-bulan lahir disembunyikan (tahun tetap tampil). Hasil export Excel/PDF tetap lengkap untuk kebutuhan kerja data — jaga kerahasiaan filenya.",
      },
    ],
  },
  {
    id: "bulk-upload",
    title: "Bulk Upload (Unggah Massal)",
    icon: Upload,
    intro:
      "Untuk data dalam jumlah banyak, gunakan Bulk Upload alih-alih input satu per satu.",
    items: [
      {
        term: "Petani & Produksi (Excel)",
        desc: "Unggah file Excel apa adanya — tidak perlu template khusus. Setelah diunggah, cocokkan (mapping) kolom file Anda dengan kolom sistem, periksa pratinjau, lalu simpan.",
      },
      {
        term: "Lahan (Shapefile ZIP)",
        desc: "Unggah satu file ZIP berisi Shapefile (.shp, .dbf, .shx, .prj). Sistem membaca poligon lahan beserta atributnya; Anda dapat memetakan atribut Gapoktan/KUD, Kelompok Tani, dan Blok saat proses mapping.",
      },
      {
        term: "Baris yang gagal",
        desc: "Baris yang tidak lolos validasi tidak ikut tersimpan dan dapat diunduh kembali sebagai file untuk diperbaiki, lalu diunggah ulang.",
      },
      {
        term: "Data ganda",
        desc: "Sistem menolak data yang sudah ada (mis. lahan aktif dengan ID sama, atau produksi pada lahan & bulan yang sama) agar tidak terjadi perhitungan ganda.",
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    items: [
      {
        term: "Main Dashboard",
        desc: "Ringkasan program: jumlah petani, kelompok tani, lahan, luas, cakupan pelatihan, dan sertifikasi — dilengkapi peta sebaran lembaga.",
      },
      {
        term: "BMP Dashboard (Produksi)",
        desc: "Fokus produksi: total produksi, produktivitas (Ton/Ha), lahan ber-data, dan ketersediaan data produksi. Tersedia filter Kategori, Distrik, Lembaga, Tahun, dan Kelengkapan Data.",
      },
      {
        term: "Kenapa angkanya belum berubah?",
        desc: "Dashboard membaca snapshot (rekaman berkala), bukan menghitung ulang tiap kali dibuka — agar tetap cepat. Setelah input data besar, minta admin generate snapshot baru lewat menu Tools.",
      },
    ],
  },
  {
    id: "peta",
    title: "Peta",
    icon: MapIcon,
    items: [
      {
        term: "Peta Lahan",
        desc: "Sebaran poligon lahan dengan berbagai overlay (mis. SIGAP, titik panas/hotspot), alat ukur jarak, label, serta pencarian lahan dengan zoom otomatis.",
      },
      {
        term: "Peta BMP",
        desc: "Peta tematik: pilih layer Ketersediaan Data Produksi atau Produktivitas (Ton/Ha). Pilih Lembaga terlebih dulu, lalu Muat Data.",
      },
      {
        term: "Cetak peta",
        desc: "Tombol Cetak menghasilkan PDF sesuai tampilan layer aktif (peta + legenda + tabel data), dan tersedia juga unduhan Excel.",
      },
      {
        term: "Profil Lahan (PDF)",
        desc: "Dari peta atau halaman detail Petani, Anda dapat mencetak Profil Lahan satu persil: identitas petani, layout kebun, pelatihan, dan produksi.",
      },
    ],
  },
  {
    id: "report",
    title: "Report (Laporan)",
    icon: FileText,
    intro:
      "Semua laporan bisa diunduh sebagai Excel dan PDF. Sebagian laporan mewajibkan pilih Distrik dan Lembaga Petani lebih dulu.",
    items: [
      {
        term: "Petani / Pelatihan / Produksi",
        desc: "Rekap per lembaga: daftar petani, cakupan pelatihan per paket (termasuk nilai pre/post test), dan matriks produksi bulanan per petani atau lahan.",
      },
      {
        term: "Kelompok Tani (Summary & Detail)",
        desc: "Summary: rekap jumlah petani, lahan, dan luas per Gapoktan/KUD dan KT. Detail: daftar anggota per lembaga tersusun Gapoktan/KUD → KT → Petani.",
      },
      {
        term: "Lahan",
        desc: "Daftar lahan per lembaga (satu baris satu lahan). Pilih Lembaga Petani (wajib), atur kolom yang tampil, lalu cetak.",
      },
      {
        term: "Peta pada Laporan Lahan",
        desc: "PDF Laporan Lahan menyertakan peta poligon. Di panel Peta Cetak Anda dapat memecah peta menjadi beberapa halaman (isi jumlah baris × kolom) dan memilih isi label poligon (No, Nama, ID Petani, ID Lahan, Kelompok Tani). Pratinjau di layar sama dengan hasil cetak.",
      },
      {
        term: "Excel Laporan Lahan",
        desc: "Berisi sheet tabel lengkap beserta gambar peta, ditambah satu sheet per bagian peta bila pemecahan grid diaktifkan.",
      },
    ],
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    icon: BarChart3,
    items: [
      {
        term: "Ringkasan Petani",
        desc: "Agregat karakteristik petani beserta ekspor Excel untuk analisa lanjutan.",
      },
      {
        term: "Analisa Ketersediaan Data",
        desc: "Skor kelengkapan data per lembaga/KT beserta rincian domain yang masih kosong — pakai ini untuk menentukan prioritas pendataan lapangan.",
      },
    ],
  },
  {
    id: "tools",
    title: "Tools",
    icon: Wrench,
    items: [
      {
        term: "Dashboard Snapshot",
        desc: "Membuat rekaman data terbaru untuk Main Dashboard dan BMP Dashboard. Jalankan setelah input/import data dalam jumlah besar agar angka dashboard mengikuti data terkini.",
      },
      {
        term: "Riwayat snapshot",
        desc: "Snapshot lama tetap tersimpan dan dapat dilihat atau diunduh sebagai Excel.",
      },
    ],
  },
  {
    id: "kendala",
    title: "Pertanyaan Umum & Kendala",
    icon: HelpCircle,
    items: [
      {
        term: "Menu yang saya butuhkan tidak muncul",
        desc: "Menu mengikuti hak akses peran Anda. Hubungi admin bila memang memerlukan akses tersebut.",
      },
      {
        term: "Daftar kosong padahal data sudah diinput",
        desc: "Periksa filter yang aktif (Distrik, Lembaga, Status, periode). Pastikan juga data berada dalam cakupan wilayah/lembaga yang ditugaskan kepada Anda.",
      },
      {
        term: "Angka dashboard berbeda dengan master data",
        desc: "Dashboard memakai snapshot. Minta admin generate snapshot terbaru lewat menu Tools.",
      },
      {
        term: "Kolom Kelompok Tani masih kosong (\"-\")",
        desc: "Data KT berasal dari atribut lahan. Kolom akan terisi setelah data KT dilengkapi, umumnya melalui bulk upload Shapefile lahan.",
      },
      {
        term: "Hasil cetak peta terlalu padat",
        desc: "Pada Laporan Lahan, perbesar pemecahan grid (mis. 3 × 3) dan kurangi isi label poligon, lalu periksa pratinjau sebelum mencetak.",
      },
      {
        term: "Butuh bantuan lain",
        desc: "Hubungi admin sistem atau tim WRI Indonesia yang mendampingi program Anda.",
      },
    ],
  },
];

export default async function HelpPage() {
  await requirePermission("help");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bantuan</h1>
        <p className="text-muted-foreground">
          Panduan penggunaan Smallholder HUB MIS — istilah, alur input data, laporan, dan kendala umum.
        </p>
      </div>

      {/* Daftar isi */}
      <nav aria-label="Daftar isi" className="rounded-lg border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Daftar Isi
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s, idx) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <s.icon className="h-4 w-4 shrink-0" />
                <span>
                  {idx + 1}. {s.title}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {SECTIONS.map((s, idx) => (
        <section key={s.id} id={s.id} className="scroll-mt-6 rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-emerald-50 p-2 text-emerald-700">
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {idx + 1}. {s.title}
              </h2>
              {s.intro && <p className="text-sm text-muted-foreground mt-1">{s.intro}</p>}
            </div>
          </div>

          <dl className="space-y-3 border-t pt-4">
            {s.items.map((item) => (
              <div key={item.term} className="grid gap-1 sm:grid-cols-[220px_1fr] sm:gap-4">
                <dt className="text-sm font-medium">{item.term}</dt>
                <dd className="text-sm text-muted-foreground">{item.desc}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <p className="text-xs text-muted-foreground">
        Panduan ini bersifat umum; tampilan menu dapat berbeda mengikuti hak akses Anda.
      </p>
    </div>
  );
}
