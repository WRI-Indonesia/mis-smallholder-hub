"use client";

/**
 * Pemetaan kolom berkas → field sistem untuk semua Upload Massal (#420) —
 * pengganti grid kartu (Detail Lahan dulu 20 kartu). Dengan `groups`: grup
 * buka/tutup ber-header "n/m terpetakan"; grup tanpa kolom terpetakan dan tanpa
 * field wajib mulai TERTUTUP ("tak ada di berkas") tetapi tetap bisa dibuka
 * untuk memetakan manual; grup ber-`groupExtra` selalu mulai terbuka. Tanpa
 * `groups`: satu daftar ringkas (Petani/Produksi).
 * Tiap field satu baris: label · pilihan kolom · contoh nilai baris pertama.
 */
import { useState, type ReactNode } from "react";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatSampleValue, type MappingGroup } from "@/lib/upload-mapping-groups";

export interface MappingFieldDef {
  key: string;
  label: string;
  required: boolean;
  desc?: string;
}

interface Props {
  fields: readonly MappingFieldDef[];
  groups?: readonly MappingGroup[];
  headers: string[];
  mapping: Record<string, string>;
  onChange: (fieldKey: string, header: string) => void;
  /** Baris data pertama (header → nilai) untuk kolom "contoh". */
  sample?: Record<string, unknown>;
  /** Isi tambahan di ujung grup tertentu (mis. Bawaan NKT di grup `nkt`). */
  groupExtra?: Partial<Record<string, ReactNode>>;
  emptyLabel?: string;
}

const EMPTY = "_empty";

function FieldRow({
  field,
  headers,
  value,
  sample,
  onChange,
  emptyLabel,
}: {
  field: MappingFieldDef;
  headers: string[];
  value: string;
  sample: string;
  onChange: (v: string) => void;
  emptyLabel: string;
}) {
  const missingRequired = field.required && !value;
  return (
    <div className="grid grid-cols-1 gap-1.5 py-2 sm:grid-cols-[minmax(0,13rem)_minmax(0,16rem)_minmax(0,1fr)] sm:items-center sm:gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </p>
        {field.desc && <p className="text-[11px] leading-snug text-muted-foreground">{field.desc}</p>}
      </div>
      <Select value={value || EMPTY} onValueChange={(v) => onChange(!v || v === EMPTY ? "" : String(v))}>
        <SelectTrigger
          className={cn("h-9 w-full", missingRequired && "border-red-500/70")}
          aria-label={`Kolom berkas untuk ${field.label}`}
        >
          <SelectValue>{(v: string) => (!v || v === EMPTY ? emptyLabel : v)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY}>{emptyLabel}</SelectItem>
          {headers.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="min-w-0 truncate text-xs text-muted-foreground" title={sample || undefined}>
        {value ? (sample ? <span className="font-mono text-foreground/80">{sample}</span> : <span className="italic">(sel baris pertama kosong)</span>) : missingRequired ? <span className="text-red-500">Wajib dipetakan</span> : null}
      </p>
    </div>
  );
}

export function GroupedFieldMapping({
  fields,
  groups,
  headers,
  mapping,
  onChange,
  sample,
  groupExtra,
  emptyLabel = "-- Kosongkan --",
}: Props) {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const mappedCount = fields.filter((f) => mapping[f.key]).length;
  const sampleOf = (fieldKey: string) => {
    const h = mapping[fieldKey];
    return h && sample ? formatSampleValue(sample[h]) : "";
  };
  const row = (f: MappingFieldDef) => (
    <FieldRow
      key={f.key}
      field={f}
      headers={headers}
      value={mapping[f.key] || ""}
      sample={sampleOf(f.key)}
      onChange={(v) => onChange(f.key, v)}
      emptyLabel={emptyLabel}
    />
  );

  const summary = (
    <p className="text-xs text-muted-foreground">
      <span className="font-semibold tabular-nums text-foreground">
        {mappedCount}/{fields.length}
      </span>{" "}
      field terpetakan · contoh nilai dari baris data pertama
    </p>
  );

  if (!groups) {
    return (
      <div className="space-y-2">
        {summary}
        <div className="divide-y rounded-lg border px-3">{fields.map(row)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {summary}
      {groups.map((g) => (
        <MappingGroupSection
          // Berkas baru selalu me-remount komponen (pemanggil merender pemetaan hanya
          // bila `headers.length > 0` dan mengosongkan headers sebelum membaca), jadi
          // status buka/tutup dihitung ulang tanpa kunci tambahan (review #420).
          key={g.key}
          group={g}
          fields={g.fields.map((k) => byKey.get(k)).filter((f): f is MappingFieldDef => f != null)}
          mapping={mapping}
          extra={groupExtra?.[g.key]}
          renderRow={row}
        />
      ))}
    </div>
  );
}

function MappingGroupSection({
  group,
  fields,
  mapping,
  extra,
  renderRow,
}: {
  group: MappingGroup;
  fields: MappingFieldDef[];
  mapping: Record<string, string>;
  extra?: ReactNode;
  renderRow: (f: MappingFieldDef) => ReactNode;
}) {
  const mapped = fields.filter((f) => mapping[f.key]).length;
  const hasRequired = fields.some((f) => f.required);
  const requiredDone = fields.every((f) => !f.required || mapping[f.key]);
  // Bawaan: terbuka bila ada kolom terpetakan / field wajib / isi tambahan (mis. Bawaan NKT —
  // justru dipakai saat berkas TAK punya kolom NKT, review #420); sisanya tertutup.
  const [open, setOpen] = useState(mapped > 0 || hasRequired || extra != null);
  const complete = mapped === fields.length;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40">
        <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        <span className="text-sm font-semibold">{group.title}</span>
        {hasRequired && (
          <Badge variant={requiredDone ? "secondary" : "destructive"} className="text-[10px]">
            wajib
          </Badge>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
          {mapped === 0 && !hasRequired ? (extra != null ? "kolom tak ada di berkas · bawaan di bawah · " : "tak ada di berkas · ") : null}
          {mapped}/{fields.length}
          {complete && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-label="semua terpetakan" />}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t px-3">
        <div className="divide-y">{fields.map(renderRow)}</div>
        {extra && <div className="border-t py-3">{extra}</div>}
      </CollapsibleContent>
    </Collapsible>
  );
}
