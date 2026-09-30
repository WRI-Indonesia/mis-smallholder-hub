import { Fragment } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
 * issue hanya bermakna di halaman ini. Jangan dipakai DI DALAM `<button>`
 * (tautan bersarang = HTML tak valid) — kartu kanban meletakkannya di luar tombol.
 */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) => {
        if (part.type === "strong") return <strong key={i} className="font-medium"><IssueLinks text={part.value} /></strong>;
        if (part.type === "code") return <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{part.value}</code>;
        if (part.type === "link") {
          return <a key={i} href={part.href} className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">{part.value}</a>;
        }
        return <IssueLinks key={i} text={part.value} />;
      })}
    </>
  );
}

/** Teks polos dari markdown inline (tanpa tautan) — untuk label aksesibel & teks terpotong. */
export function plainInline(text: string): string {
  return parseInline(text).map((p) => p.value).join("");
}

/**
 * Pencarian teks tab Semua Issue & Backlog: setiap kata kueri harus ada di
 * salah satu bagian (teks polos, tanpa beda huruf besar/kecil). Kueri kosong = cocok.
 */
export function matchesQuery(query: string, parts: (string | null)[]): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = parts.filter((p): p is string => !!p).map((p) => plainInline(p).toLowerCase()).join(" ");
  return words.every((w) => hay.includes(w));
}

export function CategoryLabel({ category }: { category: SprintCategory }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full bg-[var(--c-light)] dark:bg-[var(--c-dark)]"
        style={{ "--c-light": CATEGORY_COLOR[category].light, "--c-dark": CATEGORY_COLOR[category].dark } as React.CSSProperties}
      />
      {category}
    </span>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="pl-9" />
    </div>
  );
}

function IssueLinks({ text }: { text: string }) {
  return (
    <>
      {text.split(/(#\d+)/g).map((p, i) =>
        /^#\d+$/.test(p) ? (
          <a key={i} href={issueUrl(p)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {p}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
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
