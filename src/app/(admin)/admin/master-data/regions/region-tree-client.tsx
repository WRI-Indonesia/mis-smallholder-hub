"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronRight, ChevronDown, MoreHorizontal, Edit2, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  deleteProvince,
  deleteDistrict,
  deleteSubdistrict,
  deleteVillage,
  getSubdistricts,
  getVillages,
  searchRegions,
  type ProvinceRow,
  type DistrictRow,
  type SubdistrictRow,
  type VillageRow,
  type RegionSearchResult,
} from "@/server/actions/region";
import { ProvinceFormModal } from "./province-form-modal";
import { DistrictFormModal } from "./district-form-modal";
import { SubdistrictFormModal } from "./subdistrict-form-modal";
import { VillageFormModal } from "./village-form-modal";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface RegionTreeClientProps {
  initialProvinces: ProvinceRow[];
  initialDistricts: DistrictRow[];
}

export function RegionTreeClient({
  initialProvinces,
  initialDistricts,
}: RegionTreeClientProps) {
  // Modal states
  const [provinceModal, setProvinceModal] = useState<{ open: boolean; data?: any }>({ open: false });
  const [districtModal, setDistrictModal] = useState<{ open: boolean; data?: any; defaultProv?: string }>({ open: false });
  const [subdistrictModal, setSubdistrictModal] = useState<{ open: boolean; data?: any; defaultDist?: string }>({ open: false });
  const [villageModal, setVillageModal] = useState<{ open: boolean; data?: any; defaultSub?: string }>({ open: false });

  // Delete states
  const [deleteModal, setDeleteModal] = useState<{ type: string; id: string } | null>(null);

  // Tree states
  const [expandedProv, setExpandedProv] = useState<Set<string>>(new Set());
  const [expandedDist, setExpandedDist] = useState<Set<string>>(new Set());
  const [expandedSub, setExpandedSub] = useState<Set<string>>(new Set());

  // Cached data for lazy loading
  const [subdistrictsCache, setSubdistrictsCache] = useState<Record<string, SubdistrictRow[]>>({});
  const [villagesCache, setVillagesCache] = useState<Record<string, VillageRow[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RegionSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setIsSearching(true);
        const res = await searchRegions(searchQuery);
        if (res.success) {
          setSearchResults(res.data || []);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const toggleProv = (id: string) => {
    const newSet = new Set(expandedProv);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedProv(newSet);
  };

  const toggleDist = async (id: string) => {
    const newSet = new Set(expandedDist);
    if (newSet.has(id)) {
      newSet.delete(id);
      setExpandedDist(newSet);
    } else {
      newSet.add(id);
      setExpandedDist(newSet);
      if (!subdistrictsCache[id]) {
        setLoading(p => ({ ...p, [id]: true }));
        const res = await getSubdistricts(id);
        if (res.success) {
          setSubdistrictsCache(p => ({ ...p, [id]: res.data! }));
        }
        setLoading(p => ({ ...p, [id]: false }));
      }
    }
  };

  const toggleSub = async (id: string) => {
    const newSet = new Set(expandedSub);
    if (newSet.has(id)) {
      newSet.delete(id);
      setExpandedSub(newSet);
    } else {
      newSet.add(id);
      setExpandedSub(newSet);
      if (!villagesCache[id]) {
        setLoading(p => ({ ...p, [id]: true }));
        const res = await getVillages(id);
        if (res.success) {
          setVillagesCache(p => ({ ...p, [id]: res.data! }));
        }
        setLoading(p => ({ ...p, [id]: false }));
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    const { type, id } = deleteModal;
    let res;
    if (type === "province") res = await deleteProvince(id);
    else if (type === "district") res = await deleteDistrict(id);
    else if (type === "subdistrict") {
      res = await deleteSubdistrict(id);
      // Remove from cache locally to reflect changes
      if (res.success) {
        setSubdistrictsCache(p => {
          const np = { ...p };
          Object.keys(np).forEach(k => {
            np[k] = np[k].filter(x => x.id !== id);
          });
          return np;
        });
      }
    }
    else if (type === "village") {
      res = await deleteVillage(id);
      // Remove from cache
      if (res.success) {
        setVillagesCache(p => {
          const np = { ...p };
          Object.keys(np).forEach(k => {
            np[k] = np[k].filter(x => x.id !== id);
          });
          return np;
        });
      }
    }

    if (res?.success) {
      toast.success("Data berhasil dihapus.");
      setDeleteModal(null);
    } else {
      toast.error(res?.error || "Gagal menghapus data.");
    }
  };

  // Renderers
  const renderActions = (type: string, row: any, parentId?: string) => (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {type !== "village" && (
          <DropdownMenuItem
            onClick={() => {
              if (type === "province") setDistrictModal({ open: true, defaultProv: row.id });
              if (type === "district") setSubdistrictModal({ open: true, defaultDist: row.id });
              if (type === "subdistrict") setVillageModal({ open: true, defaultSub: row.id });
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> 
            {type === "province" && "Tambah Kabupaten"}
            {type === "district" && "Tambah Kecamatan"}
            {type === "subdistrict" && "Tambah Desa"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            if (type === "province") setProvinceModal({ open: true, data: row });
            if (type === "district") setDistrictModal({ open: true, data: row });
            if (type === "subdistrict") setSubdistrictModal({ open: true, data: row });
            if (type === "village") setVillageModal({ open: true, data: row });
          }}
        >
          <Edit2 className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={() => setDeleteModal({ type, id: row.id })}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Wilayah</h2>
          <p className="text-muted-foreground">Kelola hierarki wilayah (Provinsi &gt; Kabupaten &gt; Kecamatan &gt; Desa).</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari wilayah..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setProvinceModal({ open: true })}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Provinsi
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card text-sm">
        {searchQuery.length >= 3 ? (
          <div className="p-4">
            <h3 className="font-semibold mb-4 text-muted-foreground">Hasil Pencarian untuk "{searchQuery}"</h3>
            {isSearching ? (
              <div className="text-center py-8 text-muted-foreground">Mencari data...</div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Tidak ada wilayah yang cocok.</div>
            ) : (
              <div className="divide-y border rounded">
                {searchResults.map((res) => (
                  <div key={res.type + res.id} className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="uppercase text-[10px]">{res.type}</Badge>
                        <span className="font-mono text-xs text-primary bg-primary/10 px-1 rounded">{res.code}</span>
                        <span className="font-medium">{res.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">{res.path}</span>
                    </div>
                    {renderActions(res.type, res.data)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : initialProvinces.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Belum ada data wilayah.</div>
        ) : (
          <div className="divide-y">
            {initialProvinces.map((prov) => (
              <div key={prov.id} className="w-full">
                {/* PROVINCE LEVEL */}
                <div className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleProv(prov.id)}>
                    {expandedProv.has(prov.id) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-mono text-xs text-primary bg-primary/10 px-1 rounded">{prov.code}</span>
                    <span className="font-medium text-base">{prov.name}</span>
                    <Badge variant="secondary" className="ml-2">{prov._count.districts} Kabupaten</Badge>
                  </div>
                  {renderActions("province", prov)}
                </div>

                {/* DISTRICT LEVEL */}
                {expandedProv.has(prov.id) && (
                  <div className="bg-muted/10 border-t">
                    {initialDistricts.filter(d => d.provinceId === prov.id).length === 0 ? (
                      <div className="p-3 pl-10 text-muted-foreground italic">Tidak ada kabupaten.</div>
                    ) : (
                      <div className="divide-y border-l-2 ml-4">
                        {initialDistricts.filter(d => d.provinceId === prov.id).map(dist => (
                          <div key={dist.id} className="w-full">
                            <div className="flex items-center justify-between p-2 pl-4 hover:bg-accent/50 transition-colors">
                              <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleDist(dist.id)}>
                                {expandedDist.has(dist.id) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                <span className="font-mono text-xs text-primary bg-primary/10 px-1 rounded">{dist.code}</span>
                                <span className="font-medium">{dist.name}</span>
                                <Badge variant="secondary" className="ml-2">{dist._count.subdistricts} Kecamatan</Badge>
                                {dist._count.farmerGroups > 0 && <Badge variant="outline" className="ml-1">{dist._count.farmerGroups} Kelompok Tani</Badge>}
                              </div>
                              {renderActions("district", dist)}
                            </div>

                            {/* SUBDISTRICT LEVEL */}
                            {expandedDist.has(dist.id) && (
                              <div className="bg-muted/20 border-t">
                                {loading[dist.id] ? (
                                  <div className="p-2 pl-12 text-muted-foreground text-xs">Memuat kecamatan...</div>
                                ) : (subdistrictsCache[dist.id]?.length || 0) === 0 ? (
                                  <div className="p-2 pl-12 text-muted-foreground text-xs italic">Tidak ada kecamatan.</div>
                                ) : (
                                  <div className="divide-y border-l-2 ml-8">
                                    {subdistrictsCache[dist.id]?.map(sub => (
                                      <div key={sub.id} className="w-full">
                                        <div className="flex items-center justify-between p-2 pl-4 hover:bg-accent/50 transition-colors">
                                          <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => toggleSub(sub.id)}>
                                            {expandedSub.has(sub.id) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                            <span className="font-mono text-xs text-primary bg-primary/10 px-1 rounded">{sub.code}</span>
                                            <span className="text-sm">{sub.name}</span>
                                            <Badge variant="secondary" className="ml-2">{sub._count.villages} Desa</Badge>
                                          </div>
                                          {renderActions("subdistrict", sub)}
                                        </div>

                                        {/* VILLAGE LEVEL */}
                                        {expandedSub.has(sub.id) && (
                                          <div className="bg-muted/30 border-t">
                                            {loading[sub.id] ? (
                                              <div className="p-2 pl-14 text-muted-foreground text-xs">Memuat desa...</div>
                                            ) : (villagesCache[sub.id]?.length || 0) === 0 ? (
                                              <div className="p-2 pl-14 text-muted-foreground text-xs italic">Tidak ada desa.</div>
                                            ) : (
                                              <div className="divide-y border-l-2 ml-10">
                                                {villagesCache[sub.id]?.map(vill => (
                                                  <div key={vill.id} className="flex items-center justify-between p-1.5 pl-4 hover:bg-accent/50 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-mono text-[10px] text-muted-foreground bg-accent px-1 rounded">{vill.code}</span>
                                                      <span className="text-sm">{vill.name}</span>
                                                    </div>
                                                    {renderActions("village", vill)}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      {provinceModal.open && <ProvinceFormModal isOpen onClose={() => setProvinceModal({ open: false })} province={provinceModal.data} />}
      {districtModal.open && <DistrictFormModal isOpen onClose={() => setDistrictModal({ open: false })} district={districtModal.data} provinces={initialProvinces} defaultProvinceId={districtModal.defaultProv} />}
      {subdistrictModal.open && <SubdistrictFormModal isOpen onClose={() => setSubdistrictModal({ open: false })} subdistrict={subdistrictModal.data} districts={initialDistricts} defaultDistrictId={subdistrictModal.defaultDist} />}
      {villageModal.open && <VillageFormModal isOpen onClose={() => setVillageModal({ open: false })} village={villageModal.data} defaultSubdistrictId={villageModal.defaultSub} />}

      <DeleteDialog
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDelete}
        title="Hapus Wilayah"
        description="Apakah Anda yakin ingin menghapus data ini? Wilayah yang memiliki child data tidak dapat dihapus."
      />
    </div>
  );
}
