import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

/**
 * Kerangka dua kolom halaman Bantuan: daftar isi di kiri, materi di kanan.
 *
 * Daftar isi bisa dilipat agar materi memakai lebar penuh — berguna untuk
 * tutorial yang langkahnya panjang. Toggle memakai checkbox + CSS, **tanpa
 * JavaScript**, konsisten dengan sifat statis halaman Bantuan (#182/#183).
 *
 * Catatan teknis: Tailwind menghasilkan `peer-*` sebagai selektor sibling
 * (`:where(.peer):checked ~ *`), jadi kelas peer HANYA berlaku pada elemen yang
 * bersibling setelah checkbox — karena itu grid-nya yang diberi kelas, lalu
 * menyasar ke dalam lewat `[data-help-nav]`. Menaruhnya langsung di sidebar
 * (yang bersarang) tidak akan pernah cocok.
 */
export function HelpLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6">
      <input
        type="checkbox"
        id="help-nav"
        aria-label="Sembunyikan daftar isi"
        className="peer sr-only"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr] peer-checked:lg:grid-cols-1 peer-checked:[&_[data-nav-hide]]:hidden peer-checked:[&_[data-nav-show]]:inline-block peer-checked:lg:[&>[data-help-nav]]:hidden peer-focus-visible:[&_[data-nav-toggle]]:outline-2 peer-focus-visible:[&_[data-nav-toggle]]:outline-offset-2 peer-focus-visible:[&_[data-nav-toggle]]:outline-primary">
        <div data-help-nav className="min-w-0">
          {sidebar}
        </div>

        <div className="min-w-0 space-y-4">
          {/* Tombol lipat hanya berguna di layar lebar — di bawah lg daftar isi
              memang sudah menumpuk di atas materi. */}
          <label
            htmlFor="help-nav"
            data-nav-toggle
            className="hidden w-fit cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent lg:inline-flex"
          >
            <PanelLeftClose data-nav-hide className="h-3.5 w-3.5" />
            <PanelLeftOpen data-nav-show className="hidden h-3.5 w-3.5" />
            <span data-nav-hide>Sembunyikan daftar isi</span>
            <span data-nav-show className="hidden">
              Tampilkan daftar isi
            </span>
          </label>

          {children}
        </div>
      </div>
    </div>
  );
}
