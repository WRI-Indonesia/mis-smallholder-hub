import { Fragment } from "react";
import { parseInline } from "@/lib/markdown-lite";
import { SPRINT_CATEGORIES, type SprintCategory, type SprintItemStatus } from "@/lib/sprint-plan";
import { CATEGORICAL } from "@/lib/chart-palette";
import { issueUrl } from "@/lib/repo-links";

/**
 * Warna kategori = slot 1–6 palet kategorikal bersama (`src/lib/chart-palette.ts`,
 * juga dipakai Metrik Rilis), urut `SPRINT_CATEGORIES`. Warna mengikuti
 * kategori, bukan peringkat; teks tidak pernah memakai warna ini.
 */
export const CATEGORY_COLOR = Object.fromEntries(SPRINT_CATEGORIES.map((c, i) => [c, CATEGORICAL[i]])) as Record<
  SprintCategory,
  { light: string; dark: string }
>;

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
/** "2026-09-28" → "28 Sep 2026" (atau "28 Sep" tanpa tahun). */
export function fmtDate(iso: string, withYear = true): string {
  const [y, m, d] = iso.split("-").map(Number);
  return withYear ? `${d} ${MONTHS_ID[m - 1]} ${y}` : `${d} ${MONTHS_ID[m - 1]}`;
}

export const STATUS_STYLE: Record<SprintItemStatus, string> = {
  todo: "border-border text-muted-foreground",
  progress: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  decision: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  moved: "border-border text-muted-foreground",
};

/**
 * Markdown inline sel tabel (`**tebal**`, `` `kode` ``, tautan) + `#nnn`
 * menjadi tautan issue GitHub. Sengaja tidak memakai renderer Bantuan: tautan
 * issue hanya bermakna di halaman ini.
 *
 * `links={false}` merender teks polos tanpa `<a>` — wajib bila dipakai DI DALAM
 * `<button>` (konten interaktif bersarang = HTML tak valid; klik #nnn di
 * Firefox/pembaca layar jatuh ke tombol, bukan ke tautan).
 */
export function Inline({ text, links = true }: { text: string; links?: boolean }) {
  return (
    <>
      {parseInline(text).map((part, i) => {
        if (part.type === "strong") return <strong key={i} className="font-medium"><IssueLinks text={part.value} links={links} /></strong>;
        if (part.type === "code") return <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{part.value}</code>;
        if (part.type === "link") {
          return links ? <a key={i} href={part.href} className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">{part.value}</a> : <Fragment key={i}>{part.value}</Fragment>;
        }
        return <IssueLinks key={i} text={part.value} links={links} />;
      })}
    </>
  );
}

function IssueLinks({ text, links }: { text: string; links: boolean }) {
  return (
    <>
      {text.split(/(#\d+)/g).map((p, i) =>
        links && /^#\d+$/.test(p) ? (
          <a key={i} href={issueUrl(p)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {p}
          </a>
        ) : /^#\d+$/.test(p) ? (
          <span key={i} className="text-primary">{p}</span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

/** Tautan GitHub untuk setiap `#nnn` sebuah butir — dirender DI LUAR tombol baris. */
export function IssueRefLinks({ refs }: { refs: string[] }) {
  if (refs.length === 0) return null;
  return (
    <span className="flex shrink-0 gap-1">
      {refs.map((ref) => (
        <a
          key={ref}
          href={issueUrl(ref)}
          target="_blank"
          rel="noopener noreferrer"
          title={`Buka ${ref} di GitHub`}
          className="rounded border px-1.5 py-0.5 text-xs text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          {ref} ↗
        </a>
      ))}
    </span>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
