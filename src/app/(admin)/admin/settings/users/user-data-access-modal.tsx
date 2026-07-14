"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Map, Building2, Tractor, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  getUserDataAccess,
  getRegionsForSelect,
  assignUserProvince,
  removeUserProvince,
  assignUserDistrict,
  removeUserDistrict,
  assignUserFarmerGroup,
  removeUserFarmerGroup,
} from "@/server/actions/user-data-access";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onDataChange?: () => void;
  userId: string;
  userName: string;
}

type UserAccess = Awaited<ReturnType<typeof getUserDataAccess>>;
type Regions = Awaited<ReturnType<typeof getRegionsForSelect>>;

// ─── Component ────────────────────────────────────────────────────────────────

export function UserDataAccessModal({ open, onClose, onDataChange, userId, userName }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [access, setAccess] = useState<UserAccess>(null);
  const [regions, setRegions] = useState<Regions | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accessData, regionsData] = await Promise.all([
        getUserDataAccess(userId),
        getRegionsForSelect(),
      ]);
      setAccess(accessData);
      setRegions(regionsData);
    } catch {
      toast.error("Gagal memuat data akses");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) {
      setSearch("");
      load();
    }
  }, [open, load]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const assignedProvinceIds = new Set(access?.provinces.map((p) => p.provinceId) ?? []);
  const assignedDistrictIds = new Set(access?.districts.map((d) => d.districtId) ?? []);
  const assignedFarmerGroupIds = new Set(access?.farmerGroups.map((f) => f.farmerGroupId) ?? []);

  const hasAnyAssignment =
    assignedProvinceIds.size > 0 ||
    assignedDistrictIds.size > 0 ||
    assignedFarmerGroupIds.size > 0;

  const q = search.toLowerCase();
  const filteredProvinces = regions?.provinces.filter((p) =>
    !q || p.name.toLowerCase().includes(q)
  ) ?? [];
  const filteredDistricts = regions?.districts.filter((d) =>
    !q || d.name.toLowerCase().includes(q) || d.province.name.toLowerCase().includes(q)
  ) ?? [];
  const filteredFarmerGroups = regions?.farmerGroups.filter((f) =>
    !q ||
    f.name.toLowerCase().includes(q) ||
    (f.abrv ?? "").toLowerCase().includes(q) ||
    f.district.name.toLowerCase().includes(q)
  ) ?? [];

  // ─── Toggle handlers ──────────────────────────────────────────────────────

  async function toggleProvince(provinceId: string, checked: boolean) {
    setSaving(`prov-${provinceId}`);
    const result = checked
      ? await assignUserProvince(userId, provinceId)
      : await removeUserProvince(userId, provinceId);
    setSaving(null);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Gagal menyimpan");
    } else {
      onDataChange?.();
      await load();
    }
  }

  async function toggleDistrict(districtId: string, checked: boolean) {
    setSaving(`dist-${districtId}`);
    const result = checked
      ? await assignUserDistrict(userId, districtId)
      : await removeUserDistrict(userId, districtId);
    setSaving(null);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Gagal menyimpan");
    } else {
      onDataChange?.();
      await load();
    }
  }

  async function toggleFarmerGroup(farmerGroupId: string, checked: boolean) {
    setSaving(`fg-${farmerGroupId}`);
    const result = checked
      ? await assignUserFarmerGroup(userId, farmerGroupId)
      : await removeUserFarmerGroup(userId, farmerGroupId);
    setSaving(null);
    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Gagal menyimpan");
    } else {
      onDataChange?.();
      await load();
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Akses Data — {userName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 overflow-y-auto pr-1">
            {/* Visual Summary */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ringkasan Akses
              </p>
              {!hasAnyAssignment ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Belum dibatasi (akses semua data)</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {access?.provinces.map((p) => (
                    <Badge key={p.provinceId} variant="secondary" className="gap-1">
                      <Map className="h-3 w-3" />
                      Semua district di {p.province.name}
                    </Badge>
                  ))}
                  {access?.districts.map((d) => (
                    <Badge key={d.districtId} variant="secondary" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      {d.district.name}
                    </Badge>
                  ))}
                  {access?.farmerGroups.map((f) => (
                    <Badge key={f.farmerGroupId} variant="secondary" className="gap-1">
                      <Tractor className="h-3 w-3" />
                      {f.farmerGroup.abrv ?? f.farmerGroup.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <Input
              placeholder="Cari provinsi, distrik, atau lembaga petani..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />

            {/* Tabs */}
            <Tabs defaultValue="province">
              <TabsList className="w-full">
                <TabsTrigger value="province" className="flex-1 gap-1.5">
                  <Map className="h-3.5 w-3.5 text-blue-500" />
                  Provinsi
                  {assignedProvinceIds.size > 0 && (
                    <Badge variant="default" className="h-4 px-1 text-xs ml-0.5">{assignedProvinceIds.size}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="district" className="flex-1 gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-green-500" />
                  Distrik
                  {assignedDistrictIds.size > 0 && (
                    <Badge variant="default" className="h-4 px-1 text-xs ml-0.5">{assignedDistrictIds.size}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="farmergroup" className="flex-1 gap-1.5">
                  <Tractor className="h-3.5 w-3.5 text-orange-500" />
                  Lembaga Petani
                  {assignedFarmerGroupIds.size > 0 && (
                    <Badge variant="default" className="h-4 px-1 text-xs ml-0.5">{assignedFarmerGroupIds.size}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Province tab */}
              <TabsContent value="province" className="mt-2">
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {filteredProvinces.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">Tidak ada data</p>
                  )}
                  {filteredProvinces.map((prov) => {
                    const isSaving = saving === `prov-${prov.id}`;
                    return (
                      <div key={prov.id} className="flex items-center gap-2 py-0.5">
                        {isSaving
                          ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                          : (
                            <Checkbox
                              id={`prov-${prov.id}`}
                              checked={assignedProvinceIds.has(prov.id)}
                              onCheckedChange={(v) => toggleProvince(prov.id, !!v)}
                              disabled={!!saving}
                            />
                          )}
                        <Label htmlFor={`prov-${prov.id}`} className="text-sm font-normal cursor-pointer">
                          {prov.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* District tab */}
              <TabsContent value="district" className="mt-2">
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {filteredDistricts.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">Tidak ada data</p>
                  )}
                  {filteredDistricts.map((dist) => {
                    const isSaving = saving === `dist-${dist.id}`;
                    return (
                      <div key={dist.id} className="flex items-center gap-2 py-0.5">
                        {isSaving
                          ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                          : (
                            <Checkbox
                              id={`dist-${dist.id}`}
                              checked={assignedDistrictIds.has(dist.id)}
                              onCheckedChange={(v) => toggleDistrict(dist.id, !!v)}
                              disabled={!!saving}
                            />
                          )}
                        <Label htmlFor={`dist-${dist.id}`} className="text-sm font-normal cursor-pointer leading-tight">
                          {dist.name}
                          <span className="text-xs text-muted-foreground ml-1">({dist.province.name})</span>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Farmer Group tab */}
              <TabsContent value="farmergroup" className="mt-2">
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {filteredFarmerGroups.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">Tidak ada data</p>
                  )}
                  {filteredFarmerGroups.map((fg) => {
                    const isSaving = saving === `fg-${fg.id}`;
                    return (
                      <div key={fg.id} className="flex items-center gap-2 py-0.5">
                        {isSaving
                          ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                          : (
                            <Checkbox
                              id={`fg-${fg.id}`}
                              checked={assignedFarmerGroupIds.has(fg.id)}
                              onCheckedChange={(v) => toggleFarmerGroup(fg.id, !!v)}
                              disabled={!!saving}
                            />
                          )}
                        <Label htmlFor={`fg-${fg.id}`} className="text-sm font-normal cursor-pointer leading-tight">
                          {fg.name}
                          {fg.abrv && <span className="text-xs font-mono text-muted-foreground ml-1">{fg.abrv}</span>}
                          <span className="text-xs text-muted-foreground ml-1">— {fg.district.name}</span>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t mt-2">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
