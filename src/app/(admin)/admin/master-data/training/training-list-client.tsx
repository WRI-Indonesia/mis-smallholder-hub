"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Check, ChevronsUpDown, Building, GraduationCap, Users, UserCheck } from "lucide-react";
import { TrainingFormModal } from "./training-form-modal";
import { toggleTrainingActivityActive } from "@/server/actions/training";
import { toast } from "sonner";
import { TableActions, DataTable, type DataTableColumn } from "@/components/shared";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export const TRAINING_CATEGORY_LABELS: Record<string, string> = {
  PAKET_1_BMP_PC_RSPO_NKT: "Paket 1 - BMP + P&C RSPO + NKT",
  PAKET_2_MK: "Paket 2 - MK (Manajemen Kebun)",
  PAKET_2_K3: "Paket 2 - K3 (Keselamatan & Kesehatan Kerja)",
  PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: "Paket 3&4",
  OTHER: "Lainnya",
};

interface TrainingActivity {
  id: string;
  packageId: string;
  package: {
    id: string;
    code: string;
    name: string;
  };
  farmerGroupId: string;
  farmerGroup: {
    id: string;
    name: string;
    district: {
      id: string;
      name: string;
    };
  };
  location: string | null;
  trainingDate: Date | string;
  isActive: boolean;
  participants: {
    farmerId: string;
  }[];
  _count: {
    participants: number;
  };
}

interface TrainingPackage {
  id: string;
  code: string;
  name: string;
}

interface FarmerGroup {
  id: string;
  name: string;
}

interface District {
  id: string;
  name: string;
}

interface Props {
  initialActivities: TrainingActivity[];
  packages: TrainingPackage[];
  farmerGroups: FarmerGroup[];
  districts: District[];
  permissions: string[];
}

export function TrainingListClient({
  initialActivities,
  packages,
  farmerGroups,
  districts,
  permissions,
}: Props) {
  const [districtFilter, setDistrictFilter] = useState("all");
  const [districtComboOpen, setDistrictComboOpen] = useState(false);
  const [groupFilter, setGroupFilter] = useState("all");
  const [comboOpen, setComboOpen] = useState(false);
  const [packageFilter, setPackageFilter] = useState("all");
  const [packageComboOpen, setPackageComboOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editActivity, setEditActivity] = useState<TrainingActivity | null>(null);
  const router = useRouter();

  const filtered = initialActivities.filter((a) => {
    const matchGroup = groupFilter === "all" || a.farmerGroupId === groupFilter;
    const matchDistrict = districtFilter === "all" || a.farmerGroup.district.id === districtFilter;
    const matchPackage = packageFilter === "all" || a.packageId === packageFilter;
    return matchGroup && matchDistrict && matchPackage;
  });

  async function handleToggleActive(id: string) {
    const result = await toggleTrainingActivityActive(id);
    if (result.success) {
      toast.success("Status berhasil diubah");
      router.refresh();
    } else {
      toast.error("Gagal mengubah status");
    }
  }

  const columns: DataTableColumn<TrainingActivity>[] = [
    {
      key: "package",
      label: "Paket Pelatihan",
      sortable: true,
      cellClassName: "text-sm font-medium",
      render: (row) => TRAINING_CATEGORY_LABELS[row.package.code] || row.package.name,
    },
    {
      key: "farmerGroup",
      label: "Kelompok Tani",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.farmerGroup.name,
    },
    {
      key: "trainingDate",
      label: "Tanggal Pelatihan",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground tabular-nums",
      render: (row) => {
        const date = new Date(row.trainingDate);
        if (isNaN(date.getTime())) return "—";
        const day = String(date.getDate()).padStart(2, "0");
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const month = months[date.getMonth()];
        return `${day}/${month}/${date.getFullYear()}`;
      },
    },
    {
      key: "location",
      label: "Lokasi",
      sortable: true,
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => row.location ?? "—",
    },
    {
      key: "id",
      label: "Total Peserta",
      sortable: false,
      cellClassName: "text-sm tabular-nums text-muted-foreground",
      render: (row) => `${row._count.participants} orang`,
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      defaultVisible: false,
      render: (row) => (
        <Badge variant={row.isActive ? "default" : "outline"}>
          {row.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
  ];

  const getExportRow = (a: TrainingActivity) => {
    const date = new Date(a.trainingDate);
    let formattedDate = "—";
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      const month = months[date.getMonth()];
      formattedDate = `${day}/${month}/${date.getFullYear()}`;
    }

    return {
      package: TRAINING_CATEGORY_LABELS[a.package.code] || a.package.name,
      farmerGroup: a.farmerGroup.name,
      district: a.farmerGroup.district.name,
      location: a.location ?? "—",
      trainingDate: formattedDate,
      id: `${a._count.participants} orang`,
      isActive: a.isActive ? "Aktif" : "Nonaktif",
    };
  };

  const selectedGroup = farmerGroups.find((g) => g.id === groupFilter);
  const selectedDistrict = districts.find((d) => d.id === districtFilter);

  const toolbarLeft = (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={districtComboOpen} onOpenChange={setDistrictComboOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={districtComboOpen}
              className="w-[200px] justify-between h-9 font-normal text-left"
            >
              {districtFilter === "all" ? (
                <span>Semua Distrik</span>
              ) : (
                <span>{selectedDistrict?.name}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari distrik..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Distrik tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    setDistrictFilter("all");
                    setDistrictComboOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      districtFilter === "all" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Semua Distrik
                </CommandItem>
                {districts.map((d) => (
                  <CommandItem
                    key={d.id}
                    value={d.name}
                    onSelect={() => {
                      setDistrictFilter(d.id);
                      setDistrictComboOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        districtFilter === d.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {d.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Popover open={comboOpen} onOpenChange={setComboOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={comboOpen}
              className="w-[330px] justify-between h-9 font-normal text-left"
            >
              {groupFilter === "all" ? (
                <span>Semua Kelompok Tani</span>
              ) : (
                <span>{selectedGroup?.name}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[330px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari kelompok tani..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Kelompok Tani tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    setGroupFilter("all");
                    setComboOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      groupFilter === "all" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Semua Kelompok Tani
                </CommandItem>
                {farmerGroups.map((g) => (
                  <CommandItem
                    key={g.id}
                    value={g.name}
                    onSelect={() => {
                      setGroupFilter(g.id);
                      setComboOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        groupFilter === g.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {g.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Popover open={packageComboOpen} onOpenChange={setPackageComboOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={packageComboOpen}
              className="w-[230px] justify-between h-9 font-normal text-left"
            >
              {packageFilter === "all" ? (
                <span>Semua Paket Pelatihan</span>
              ) : (
                <span>
                  {TRAINING_CATEGORY_LABELS[packages.find((p) => p.id === packageFilter)?.code ?? ""] ||
                    packages.find((p) => p.id === packageFilter)?.name}
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[230px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Cari paket pelatihan..." />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>Paket pelatihan tidak ditemukan.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    setPackageFilter("all");
                    setPackageComboOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      packageFilter === "all" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Semua Paket Pelatihan
                </CommandItem>
                {packages.map((pkg) => (
                  <CommandItem
                    key={pkg.id}
                    value={TRAINING_CATEGORY_LABELS[pkg.code] || pkg.name}
                    onSelect={() => {
                      setPackageFilter(pkg.id);
                      setPackageComboOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        packageFilter === pkg.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {TRAINING_CATEGORY_LABELS[pkg.code] || pkg.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );

  const toolbarRight = permissions.includes("CREATE") ? (
    <Button size="sm" onClick={() => { setEditActivity(null); setShowForm(true); }} className="h-9">
      <Plus className="h-4 w-4 mr-2" />
      Tambah Pelatihan
    </Button>
  ) : undefined;

  const totalKelompokTani = new Set(filtered.map((a) => a.farmerGroupId)).size;
  const totalKegiatanTraining = filtered.length;
  const totalPeserta = filtered.reduce((sum, a) => sum + (a._count?.participants ?? 0), 0);
  const totalPesertaUnik = new Set(filtered.flatMap((a) => (a.participants ?? []).map((p) => p.farmerId))).size;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Kelompok Tani</p>
              <h3 className="text-2xl font-bold mt-1.5 tabular-nums">{totalKelompokTani}</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Building className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Kegiatan Training</p>
              <h3 className="text-2xl font-bold mt-1.5 tabular-nums">{totalKegiatanTraining}</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <GraduationCap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Peserta</p>
              <h3 className="text-2xl font-bold mt-1.5 tabular-nums">{totalPeserta} orang</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Peserta Unik</p>
              <h3 className="text-2xl font-bold mt-1.5 tabular-nums">{totalPesertaUnik} orang</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-4">
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(a) => a.id}
          searchPlaceholder="Cari lokasi, kelompok tani atau paket..."
          searchFn={(row, query) => {
            const packageName = (TRAINING_CATEGORY_LABELS[row.package.code] || row.package.name).toLowerCase();
            const location = (row.location || "").toLowerCase();
            const groupName = row.farmerGroup.name.toLowerCase();
            return packageName.includes(query) || location.includes(query) || groupName.includes(query);
          }}
          toolbarLeft={toolbarLeft}
          toolbarRight={toolbarRight}
          exportFilename="data-training-activities"
          getExportRow={getExportRow}
          renderActions={(activity) => (
            <TableActions
              permissions={permissions}
              actions={[
                {
                  type: "view",
                  onClick: () => router.push(`/admin/master-data/training/${activity.id}`),
                },
                {
                  type: "edit",
                  onClick: () => {
                    setEditActivity(activity);
                    setShowForm(true);
                  },
                },
                {
                  type: "delete",
                  isActive: activity.isActive,
                  onClick: () => handleToggleActive(activity.id),
                },
              ]}
            />
          )}
        />
      </Card>

      <TrainingFormModal
        key={editActivity?.id ?? "new"}
        open={showForm}
        onClose={() => { setShowForm(false); setEditActivity(null); }}
        activity={editActivity}
        packages={packages}
        farmerGroups={farmerGroups}
      />
    </>
  );
}
