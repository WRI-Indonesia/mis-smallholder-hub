/**
 * Kepala seksi dashboard (#346, revisi UX owner 2026-09-20): memberi alur
 * baca — Gambaran umum → Lembaga → Kegiatan & indikator → Tindak lanjut —
 * supaya sembilan kartu bergaya sama tidak dibaca sebagai tumpukan tabel.
 */
export function BmpMonevSection({ step, title, lead, children }: { step: number; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3 border-b pb-2">
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{step}</span>
        <div>
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{lead}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
