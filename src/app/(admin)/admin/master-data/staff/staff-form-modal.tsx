"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffSchema, type StaffFormValues } from "@/validations/staff.schema";
import {
  createStaff,
  updateStaff,
  type StaffDetail,
  type JobDeskDropdownItem,
  type StaffDropdownItem,
} from "@/server/actions/staff";
import type { DistrictDropdownItem } from "@/server/actions/farmer-group";
import type { FarmerGroupDropdownItem } from "@/server/actions/training";
import { toast } from "sonner";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── JobDesk Combobox ─────────────────────────────────────────────────────────

function JobDeskCombobox({
  value,
  onChange,
  jobDesks,
}: {
  value: string;
  onChange: (val: string) => void;
  jobDesks: JobDeskDropdownItem[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const label = jobDesks.find((j) => j.id === value)?.name ?? "Pilih job desk";

  const filtered = useMemo(() => {
    if (!search) return jobDesks;
    return jobDesks.filter((j) =>
      j.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [jobDesks, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
          />
        }
      >
        {label}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Cari job desk..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty>Job desk tidak ditemukan.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((j) => (
                  <CommandItem
                    key={j.id}
                    value={j.id}
                    onSelect={() => {
                      onChange(j.id);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", value === j.id ? "opacity-100" : "opacity-0")}
                    />
                    {j.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff?: StaffDetail | null;
  jobDesks: JobDeskDropdownItem[];
  districts: DistrictDropdownItem[];
  farmerGroups: FarmerGroupDropdownItem[];
  staffDropdown: StaffDropdownItem[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StaffFormModal({
  isOpen,
  onClose,
  staff,
  jobDesks,
  districts,
  farmerGroups,
  staffDropdown,
}: StaffFormModalProps) {
  const [isPending, setIsPending] = useState(false);
  const [openLineManager, setOpenLineManager] = useState(false);
  const isEditing = !!staff;

  // ─── Form ──────────────────────────────────────────────────────────────

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema as any),
    defaultValues: {
      staffCode: staff?.staffCode ?? "",
      name: staff?.name ?? "",
      jobDeskId: staff?.jobDeskId ?? "",
      emailWri: staff?.emailWri ?? "",
      lineManagerId: staff?.lineManagerId ?? "",
      districtIds: [],
      farmerGroupIds: [],
    },
  });

  // ─── District multi-select state ────────────────────────────────────────

  const [selectedDistrictIds, setSelectedDistrictIds] = useState<Set<string>>(
    () => new Set(staff?.districts?.map((sd) => sd.district.id) ?? [])
  );
  const [districtSearch, setDistrictSearch] = useState("");

  const filteredDistricts = useMemo(() => {
    const q = districtSearch.toLowerCase();
    if (!q) return districts;
    return districts.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.province.name.toLowerCase().includes(q)
    );
  }, [districts, districtSearch]);

  function toggleDistrict(id: string) {
    setSelectedDistrictIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllDistricts() {
    setSelectedDistrictIds(new Set(districts.map((d) => d.id)));
  }

  // ─── FarmerGroup multi-select state ─────────────────────────────────────

  const [selectedFarmerGroupIds, setSelectedFarmerGroupIds] = useState<Set<string>>(
    () => new Set(staff?.farmerGroups?.map((sfg) => sfg.farmerGroup.id) ?? [])
  );
  const [fgSearch, setFgSearch] = useState("");

  const filteredFarmerGroups = useMemo(() => {
    const q = fgSearch.toLowerCase();
    if (!q) return farmerGroups;
    return farmerGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.code?.toLowerCase().includes(q) ?? false)
    );
  }, [farmerGroups, fgSearch]);

  function toggleFarmerGroup(id: string) {
    setSelectedFarmerGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFarmerGroupsByDistrict(districtId: string) {
    const ids = farmerGroups
      .filter((g) => g.district.name === districts.find((d) => d.id === districtId)?.name)
      .map((g) => g.id);
    setSelectedFarmerGroupIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }

  // ─── Submit ────────────────────────────────────────────────────────────

  async function onSubmit(data: StaffFormValues) {
    setIsPending(true);
    const payload: StaffFormValues = {
      ...data,
      districtIds: Array.from(selectedDistrictIds),
      farmerGroupIds: Array.from(selectedFarmerGroupIds),
    };

    const result = isEditing
      ? await updateStaff(staff!.id, payload)
      : await createStaff(payload);
    setIsPending(false);

    if (result.success) {
      toast.success(
        isEditing ? "Data staff berhasil diperbarui." : "Staff berhasil ditambahkan."
      );
      onClose();
    } else {
      toast.error(result.error);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Staff WRI" : "Tambah Staff WRI"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">

            {/* Row: Kode + Nama */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="staffCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Staff *</FormLabel>
                    <FormControl>
                      <Input placeholder="SH-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama lengkap" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Job Desk */}
            <FormField
              control={form.control}
              name="jobDeskId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Job Desk *</FormLabel>
                  <JobDeskCombobox
                    value={field.value}
                    onChange={(val) => form.setValue("jobDeskId", val)}
                    jobDesks={jobDesks}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row: Email + Line Manager */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emailWri"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email WRI</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="nama@wri.org"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lineManagerId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Line Manager</FormLabel>
                    <Popover open={openLineManager} onOpenChange={setOpenLineManager}>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          />
                        }
                      >
                        {field.value
                          ? (staffDropdown.find((s) => s.id === field.value)?.name ?? "Pilih line manager")
                          : "Pilih line manager"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-[260px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Cari staff..." />
                          <CommandList>
                            <CommandEmpty>Staff tidak ditemukan.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="none"
                                onSelect={() => {
                                  form.setValue("lineManagerId", "");
                                  setOpenLineManager(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    !field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="text-muted-foreground">— Tidak ada —</span>
                              </CommandItem>
                              {staffDropdown
                                .filter((s) => !isEditing || s.id !== staff?.id)
                                .map((s) => (
                                  <CommandItem
                                    key={s.id}
                                    value={`${s.name} ${s.staffCode}`}
                                    onSelect={() => {
                                      form.setValue("lineManagerId", s.id);
                                      setOpenLineManager(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === s.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span>{s.name}</span>
                                    <span className="ml-2 text-xs font-mono text-muted-foreground">
                                      {s.staffCode}
                                    </span>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Distrik Assignment */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Distrik Penugasan
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    ({selectedDistrictIds.size === 0 ? "kosong = semua distrik" : `${selectedDistrictIds.size} dipilih`})
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={selectAllDistricts}
                  >
                    Pilih Semua
                  </Button>
                  {selectedDistrictIds.size > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => setSelectedDistrictIds(new Set())}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
              <div className="relative">
                <Input
                  placeholder="Cari distrik..."
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <ScrollArea className="h-36 rounded-md border">
                <div className="p-1">
                  {filteredDistricts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Distrik tidak ditemukan.
                    </p>
                  ) : (
                    filteredDistricts.map((d) => {
                      const checked = selectedDistrictIds.has(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDistrict(d.id)}
                          className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${checked ? "bg-primary/10" : ""}`}
                        >
                          <span
                            className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${checked ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="font-medium truncate block">{d.name}</span>
                            <span className="text-xs text-muted-foreground">{d.province.name}</span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              {selectedDistrictIds.size > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Array.from(selectedDistrictIds).map((id) => {
                    const d = districts.find((x) => x.id === id);
                    if (!d) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1">
                        {d.name}
                        <button
                          type="button"
                          onClick={() => toggleDistrict(id)}
                          className="rounded hover:bg-muted"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Kelompok Tani Assignment */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Kelompok Tani Penugasan
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    ({selectedFarmerGroupIds.size === 0 ? "kosong = semua KT" : `${selectedFarmerGroupIds.size} dipilih`})
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setSelectedFarmerGroupIds(new Set(farmerGroups.map((g) => g.id)))
                    }
                  >
                    Pilih Semua
                  </Button>
                  {selectedFarmerGroupIds.size > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => setSelectedFarmerGroupIds(new Set())}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
              <Input
                placeholder="Cari kelompok tani..."
                value={fgSearch}
                onChange={(e) => setFgSearch(e.target.value)}
                className="h-8 text-sm"
              />
              <ScrollArea className="h-36 rounded-md border">
                <div className="p-1">
                  {filteredFarmerGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Kelompok tani tidak ditemukan.
                    </p>
                  ) : (
                    filteredFarmerGroups.map((g) => {
                      const checked = selectedFarmerGroupIds.has(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => toggleFarmerGroup(g.id)}
                          className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${checked ? "bg-primary/10" : ""}`}
                        >
                          <span
                            className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${checked ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="font-medium truncate block">{g.name}</span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {g.code ?? g.district.name}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              {selectedFarmerGroupIds.size > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Array.from(selectedFarmerGroupIds).map((id) => {
                    const g = farmerGroups.find((x) => x.id === id);
                    if (!g) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1">
                        {g.name}
                        <button
                          type="button"
                          onClick={() => toggleFarmerGroup(id)}
                          className="rounded hover:bg-muted"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
