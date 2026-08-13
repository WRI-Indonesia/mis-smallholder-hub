"use client";

import { useMemo, useState } from "react";
import type { DataLineage, LineageAccess, UnmappedRoute } from "@/types/data-lineage";
import type { MenuLabel } from "@/types/data-map";

/**
 * Tab Jalur data (DA-07, #256): matriks menu × entitas, sel berisi R / W / RW.
 *
 * Bentuknya matriks, bukan graf: yang ditanyakan pembaca adalah "menu ini
 * menyentuh apa" dan "entitas ini disentuh siapa" — dua pertanyaan lookup yang
 * dijawab baris dan kolom, sesuatu yang kanvas justru mempersulit. Pola matriks
 * mengikuti yang sudah ada di repo (Ketersediaan Data, Cakupan Pelatihan).
 */

const ACCESS_STYLE: Record<LineageAccess, string> = {
  R: "text-muted-foreground",
  W: "font-medium text-amber-700 dark:text-amber-400",
  RW: "font-medium text-foreground",
};

export function LineageMatrix({
  lineage,
  menus,
  infraModels,
  unmapped,
}: {
  lineage: DataLineage;
  menus: MenuLabel[];
  infraModels: Record<string, LineageAccess>;
  unmapped: UnmappedRoute[];
}) {
  const [onlyWrites, setOnlyWrites] = useState(false);
  const labels = useMemo(() => new Map(menus.map((m) => [m.key, m])), [menus]);

  const rows = useMemo(() => {
    // Akses dinamis ikut dihitung: penanda itu justru ada untuk membuat akses
    // yang tak terdeteksi lebih terlihat, jadi menyembunyikannya dari saringan
    // "yang menulis" adalah kebalikan dari tujuannya.
    const visible = onlyWrites
      ? lineage.filter(
          (entry) =>
            Object.values(entry.models).some((a) => a !== "R") ||
            (entry.dynamicAccess !== null && entry.dynamicAccess !== "R")
        )
      : lineage;
    // Urutkan mengikuti urutan menu aplikasi bila menunya dikenal DB; sisanya di bawah.
    return [...visible].sort((a, b) => {
      const oa = labels.get(a.menuKey)?.order ?? 9_999;
      const ob = labels.get(b.menuKey)?.order ?? 9_999;
      return oa - ob || a.menuKey.localeCompare(b.menuKey);
    });
  }, [lineage, onlyWrites, labels]);

  const columns = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of rows) {
      for (const model of Object.keys(entry.models)) counts.set(model, (counts.get(model) ?? 0) + 1);
    }
    // Entitas yang paling banyak disentuh di kiri — kolom padat lebih dulu terbaca.
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([m]) => m);
  }, [rows]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">R</span> membaca ·{" "}
          <span className="font-medium text-amber-700 dark:text-amber-400">W</span> menulis ·{" "}
          <span className="font-medium">RW</span> keduanya. Diturunkan dari kode
          (<code>requirePermission</code> → import → pemanggilan Prisma), bukan dicatat tangan.
        </p>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={onlyWrites}
            onChange={(e) => setOnlyWrites(e.target.checked)}
            className="accent-primary"
          />
          hanya menu yang menulis
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="text-xs">
          <thead>
            <tr className="border-b">
              <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">Menu</th>
              {columns.map((model) => (
                <th key={model} className="px-2 py-2 text-center font-normal whitespace-nowrap">
                  <span className="inline-block max-w-[110px] truncate align-bottom" title={model}>
                    {model}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => {
              const label = labels.get(entry.menuKey);
              return (
                <tr key={entry.menuKey} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                  <th className="sticky left-0 z-10 bg-card px-3 py-1.5 text-left font-normal">
                    <span className="block max-w-[220px] truncate" title={entry.route}>
                      {label?.title ?? entry.menuKey}
                    </span>
                    <span className="block font-mono text-[10px] text-muted-foreground">{entry.menuKey}</span>
                  </th>
                  {columns.map((model) => {
                    const access = entry.models[model];
                    if (access) {
                      return (
                        <td key={model} className="px-2 py-1.5 text-center tabular-nums">
                          <span className={ACCESS_STYLE[access]} title={`${entry.menuKey} → ${model}: ${access}`}>
                            {access}
                          </span>
                        </td>
                      );
                    }
                    // Akses dinamis: pemindai tidak bisa memastikan entitas mana,
                    // jadi ditandai miring — dugaan berdasar penanda, bukan temuan.
                    return (
                      <td key={model} className="px-2 py-1.5 text-center tabular-nums">
                        {entry.dynamicAccess ? (
                          <span
                            className="text-muted-foreground/70 italic"
                            title={`${entry.menuKey} membaca entitas secara dinamis — lihat catatan di bawah`}
                          >
                            {entry.dynamicAccess}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/25">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Tidak tercantum di matriks:</span> entitas yang
          dilewati <em>setiap</em> menu lewat guard RBAC &amp; scope akses —{" "}
          <span className="font-mono">{Object.keys(infraModels).join(", ")}</span>. Mencantumkannya di
          tiap baris hanya menenggelamkan entitas domain.
        </p>
        {unmapped.length > 0 && (
          <p>
            <span className="font-medium text-foreground">{unmapped.length} rute induk</span> tidak
            terpetakan karena tidak memanggil <code>requirePermission</code> (halaman pengantar seperti
            /admin, /dashboard, /report) — halaman itu memang tidak mengambil data.
          </p>
        )}
        <p>
          Matriks memakai granularitas per fungsi: yang dihitung hanya fungsi yang benar-benar diimpor
          halaman, bukan seluruh isi berkas action-nya.
        </p>
        {rows.some((r) => r.dynamicAccess) && (
          <p>
            <span className="font-medium text-foreground">Huruf miring</span> = akses <em>dinamis</em>{" "}
            (<code>prisma[namaModel]</code>), yang tidak bisa dipastikan pemindaian statis dan karenanya
            dinyatakan lewat penanda eksplisit di kode. Halaman ini sendiri salah satunya — ia membaca
            seluruh entitas untuk menghitung keterisian.
          </p>
        )}
      </div>
    </div>
  );
}
