import { Fragment } from "react";
import { parseInline } from "@/lib/markdown-lite";
import type { SprintCategory, SprintItemStatus } from "@/lib/sprint-plan";
import { issueUrl } from "@/app/(admin)/admin/dashboard/metrics/metrics-shared";

/**
 * Warna kategori = slot 1–6 palet kategorikal tervalidasi yang juga dipakai
 * Metrik Rilis (urutan tetap, lolos validator untuk batang bertumpuk/adjacent).
 * Warna mengikuti kategori, bukan peringkat; teks tidak pernah memakai warna ini.
 */
export const CATEGORY_COLOR: Record<SprintCategory, { light: string; dark: string }> = {
  Keamanan: { light: "#2a78d6", dark: "#3987e5" },
  Rilis: { light: "#eb6834", dark: "#d95926" },
  Performa: { light: "#1baf7a", dark: "#199e70" },
  Data: { light: "#eda100", dark: "#c98500" },
  Fitur: { light: "#e87ba4", dark: "#d55181" },
  Kerapian: { light: "#008300", dark: "#008300" },
};

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
 */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) => {
        if (part.type === "strong") return <strong key={i} className="font-medium"><IssueLinks text={part.value} /></strong>;
        if (part.type === "code") return <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{part.value}</code>;
        if (part.type === "link") return <a key={i} href={part.href} className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">{part.value}</a>;
        return <IssueLinks key={i} text={part.value} />;
      })}
    </>
  );
}

function IssueLinks({ text }: { text: string }) {
  return (
    <>
      {text.split(/(#\d+)/g).map((p, i) =>
        /^#\d+$/.test(p) ? (
          <a key={i} href={issueUrl(p)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
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
