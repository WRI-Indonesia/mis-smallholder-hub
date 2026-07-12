"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight, ChevronDown, Search, Plus, Pencil, Trash2, RotateCcw, Map, Building2, MapPin, Home,
} from "lucide-react";
import { toast } from "sonner";
import {
  toggleProvinceActive, toggleDistrictActive, toggleSubdistrictActive, toggleVillageActive,
} from "@/server/actions/region";
import { RegionFormModal, type RegionLevel, type RegionFormData } from "./region-form-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Village {
  id: string; code: string; name: string; isActive: boolean;
}
interface Subdistrict {
  id: string; code: string; name: string; isActive: boolean;
  villages: Village[];
}
interface District {
  id: string; code: string; name: string; isActive: boolean;
  subdistricts: Subdistrict[];
}
interface Province {
  id: string; code: string; name: string; isActive: boolean;
  districts: District[];
}

interface RegionListClientProps {
  initialData: Province[];
  permissions: string[];
}

const LEVEL_ICONS = {
  province: <Map className="h-3.5 w-3.5 text-blue-500" />,
  district: <Building2 className="h-3.5 w-3.5 text-green-500" />,
  subdistrict: <MapPin className="h-3.5 w-3.5 text-orange-500" />,
  village: <Home className="h-3.5 w-3.5 text-purple-500" />,
};

type RegionNodeLevel = "province" | "district" | "subdistrict" | "village";

const CHILD_LEVEL: Record<RegionNodeLevel, RegionLevel | null> = {
  province: "district",
  district: "subdistrict",
  subdistrict: "village",
  village: null,
};

// ─── Row renderers ─────────────────────────────────────────────────────────────
// Declared at module scope (not inside the component) so React doesn't recreate
// the component type on every render.

function ActionCell({
  level, item, isActive, parentId, parentName, permissions, onCreate, onEdit, onToggle,
}: {
  level: RegionNodeLevel;
  item: { id: string; code: string; name: string };
  isActive: boolean;
  parentId?: string;
  parentName?: string;
  permissions: string[];
  onCreate: (level: RegionLevel, parentId?: string, parentName?: string) => void;
  onEdit: (level: RegionLevel, item: { id: string; code: string; name: string }, parentId?: string, parentName?: string) => void;
  onToggle: (level: RegionNodeLevel, id: string) => void;
}) {
  const childLvl = CHILD_LEVEL[level];

  return (
    <div className="flex items-center gap-0.5">
      {childLvl && permissions.includes("CREATE") && (
        <Button
          variant="ghost" size="icon"
          title={`Tambah ${childLvl === "district" ? "Distrik" : childLvl === "subdistrict" ? "Kecamatan" : "Desa"}`}
          onClick={() => onCreate(childLvl, item.id, item.name)}
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
      {permissions.includes("EDIT") && (
        <Button
          variant="ghost" size="icon"
          title="Edit"
          onClick={() => onEdit(level as RegionLevel, item, parentId, parentName)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {permissions.includes("DELETE") && (
        <Button
          variant="ghost" size="icon"
          title={isActive ? "Nonaktifkan" : "Aktifkan kembali"}
          onClick={() => onToggle(level, item.id)}
        >
          {isActive
            ? <Trash2 className="h-4 w-4" />
            : <RotateCcw className="h-4 w-4 text-muted-foreground" />}
        </Button>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RegionListClient({ initialData, permissions }: RegionListClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLevel, setModalLevel] = useState<RegionLevel>("province");
  const [modalData, setModalData] = useState<RegionFormData | undefined>();

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(level: RegionLevel, parentId?: string, parentName?: string) {
    setModalLevel(level);
    setModalData({ parentId, parentName });
    setModalOpen(true);
  }

  function openEdit(level: RegionLevel, item: { id: string; code: string; name: string }, parentId?: string, parentName?: string) {
    setModalLevel(level);
    setModalData({ id: item.id, code: item.code, name: item.name, parentId, parentName });
    setModalOpen(true);
  }

  const handleSuccess = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  async function handleToggle(
    level: "province" | "district" | "subdistrict" | "village",
    id: string,
  ) {
    const fn = {
      province: toggleProvinceActive,
      district: toggleDistrictActive,
      subdistrict: toggleSubdistrictActive,
      village: toggleVillageActive,
    }[level];

    const result = await fn(id);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Gagal mengubah status");
    } else {
      toast.success("Status berhasil diubah");
      startTransition(() => router.refresh());
    }
  }

  // ─── Search / Filter helpers ────────────────────────────────────────────────

  const q = search.toLowerCase();

  function matchesSearch(item: { code: string; name: string }) {
    return !q || item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
  }

  function matchesStatus(isActive: boolean) {
    if (statusFilter === "active") return isActive;
    if (statusFilter === "inactive") return !isActive;
    return true;
  }

  // When search is active, compute the set of IDs that should be auto-expanded
  // so matching descendants are always visible without manual expand.
  const autoExpandIds = new Set<string>();
  if (q || statusFilter !== "all") {
    for (const p of initialData) {
      for (const d of p.districts) {
        for (const s of d.subdistricts) {
          const villageMatch = s.villages.some((v) => matchesSearch(v) && matchesStatus(v.isActive));
          if (villageMatch) { autoExpandIds.add(p.id); autoExpandIds.add(d.id); autoExpandIds.add(s.id); }
          if (matchesSearch(s) && matchesStatus(s.isActive)) { autoExpandIds.add(p.id); autoExpandIds.add(d.id); }
        }
        if (matchesSearch(d) && matchesStatus(d.isActive)) autoExpandIds.add(p.id);
      }
    }
  }

  // A node is "expanded" if user explicitly toggled it, OR if auto-expansion applies
  function isExpanded(id: string) {
    return expandedIds.has(id) || autoExpandIds.has(id);
  }

  // Show province if it or any descendant matches both search + status filter
  const filteredProvinces = initialData.filter((p) => {
    if (matchesSearch(p) && matchesStatus(p.isActive)) return true;
    return p.districts.some((d) =>
      (matchesSearch(d) && matchesStatus(d.isActive)) ||
      d.subdistricts.some((s) =>
        (matchesSearch(s) && matchesStatus(s.isActive)) ||
        s.villages.some((v) => matchesSearch(v) && matchesStatus(v.isActive))
      )
    );
  });

  // ─── Render rows ─────────────────────────────────────────────────────────────

  const rows: React.ReactNode[] = [];

  for (const province of filteredProvinces) {
    const provExpanded = isExpanded(province.id);
    const provMuted = !province.isActive;

    rows.push(
      <TableRow key={province.id} className={provMuted ? "opacity-50" : ""}>
        <TableCell className="w-[1%] whitespace-nowrap">
          <ActionCell level="province" item={province} isActive={province.isActive} permissions={permissions} onCreate={openCreate} onEdit={openEdit} onToggle={handleToggle} />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5" style={{ paddingLeft: 0 }}>
            <button
              className="p-0.5 rounded hover:bg-muted/50"
              onClick={() => toggleExpand(province.id)}
              type="button"
            >
              {provExpanded
                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
            {LEVEL_ICONS.province}
            <span className="text-sm font-semibold">{province.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-sm font-mono text-muted-foreground">{province.code}</TableCell>
        <TableCell>
          <Badge variant={province.isActive ? "default" : "secondary"}>
            {province.isActive ? "Aktif" : "Nonaktif"}
          </Badge>
        </TableCell>
      </TableRow>
    );

    if (!provExpanded) continue;

    for (const district of province.districts) {
      const distExpanded = isExpanded(district.id);
      const distMuted = provMuted || !district.isActive;

      rows.push(
        <TableRow key={district.id} className={distMuted ? "opacity-50" : ""}>
          <TableCell className="w-[1%] whitespace-nowrap">
            <ActionCell level="district" item={district} isActive={district.isActive} parentId={province.id} parentName={province.name} permissions={permissions} onCreate={openCreate} onEdit={openEdit} onToggle={handleToggle} />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-1.5" style={{ paddingLeft: 24 }}>
              <button
                className="p-0.5 rounded hover:bg-muted/50"
                onClick={() => toggleExpand(district.id)}
                type="button"
              >
                {distExpanded
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
              {LEVEL_ICONS.district}
              <span className="text-sm font-medium">{district.name}</span>
            </div>
          </TableCell>
          <TableCell className="text-sm font-mono text-muted-foreground">{district.code}</TableCell>
          <TableCell>
            <Badge variant={district.isActive ? "default" : "secondary"}>
              {district.isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          </TableCell>
        </TableRow>
      );

      if (!distExpanded) continue;

      for (const sub of district.subdistricts) {
        const subExpanded = isExpanded(sub.id);
        const subMuted = distMuted || !sub.isActive;

        rows.push(
          <TableRow key={sub.id} className={subMuted ? "opacity-50" : ""}>
            <TableCell className="w-[1%] whitespace-nowrap">
              <ActionCell level="subdistrict" item={sub} isActive={sub.isActive} parentId={district.id} parentName={district.name} permissions={permissions} onCreate={openCreate} onEdit={openEdit} onToggle={handleToggle} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5" style={{ paddingLeft: 48 }}>
                <button
                  className="p-0.5 rounded hover:bg-muted/50"
                  onClick={() => toggleExpand(sub.id)}
                  type="button"
                >
                  {subExpanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                {LEVEL_ICONS.subdistrict}
                <span className="text-sm">{sub.name}</span>
              </div>
            </TableCell>
            <TableCell className="text-sm font-mono text-muted-foreground">{sub.code}</TableCell>
            <TableCell>
              <Badge variant={sub.isActive ? "default" : "secondary"}>
                {sub.isActive ? "Aktif" : "Nonaktif"}
              </Badge>
            </TableCell>
          </TableRow>
        );

        if (!subExpanded) continue;

        for (const village of sub.villages) {
          const vilMuted = subMuted || !village.isActive;

          rows.push(
            <TableRow key={village.id} className={vilMuted ? "opacity-50" : ""}>
              <TableCell className="w-[1%] whitespace-nowrap">
                <ActionCell level="village" item={village} isActive={village.isActive} parentId={sub.id} parentName={sub.name} permissions={permissions} onCreate={openCreate} onEdit={openEdit} onToggle={handleToggle} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5" style={{ paddingLeft: 72 }}>
                  <span className="w-5 inline-block" />
                  {LEVEL_ICONS.village}
                  <span className="text-sm text-muted-foreground">{village.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm font-mono text-muted-foreground">{village.code}</TableCell>
              <TableCell>
                <Badge variant={village.isActive ? "default" : "secondary"}>
                  {village.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </TableCell>
            </TableRow>
          );
        }
      }
    }
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────

  return (
    <>
      <RegionFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        level={modalLevel}
        data={modalData}
      />

      <Card className="p-4 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>

          {permissions.includes("CREATE") && (
            <Button onClick={() => openCreate("province")}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Provinsi
            </Button>
          )}
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/70 border-b-2 border-border">
              <TableHead className="w-[1%] whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aksi</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wilayah</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kode</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0
              ? rows
              : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Tidak ada data wilayah yang ditemukan
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1">{LEVEL_ICONS.province} Provinsi</span>
          <span className="flex items-center gap-1">{LEVEL_ICONS.district} Distrik</span>
          <span className="flex items-center gap-1">{LEVEL_ICONS.subdistrict} Kecamatan</span>
          <span className="flex items-center gap-1">{LEVEL_ICONS.village} Desa / Kelurahan</span>
        </div>
      </Card>
    </>
  );
}
