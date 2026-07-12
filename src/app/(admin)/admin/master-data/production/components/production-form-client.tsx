"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { createProductionRecord, updateProductionRecord, getFarmerParcels } from "@/server/actions/production";
import { toast } from "sonner";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { id } from "date-fns/locale";

interface FarmerSelect {
  id: string;
  name: string;
  farmerId: string;
}

interface ProductionRecordInput {
  id: string;
  farmerId: string;
  parcelId: string | null;
  period: string;
  harvestDate: Date | string;
  harvestNumber: number;
  yieldKg: number;
  notes: string | null;
}

interface Props {
  farmers: FarmerSelect[];
  initialRecord?: ProductionRecordInput;
}

export function ProductionFormClient({ farmers, initialRecord }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [selectedFarmerId, setSelectedFarmerId] = useState(initialRecord?.farmerId ?? "");
  const [farmerComboOpen, setFarmerComboOpen] = useState(false);
  
  const [parcels, setParcels] = useState<Awaited<ReturnType<typeof getFarmerParcels>>>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<string>(initialRecord?.parcelId ?? "");
  const [isLoadingParcels, setIsLoadingParcels] = useState(false);

  const [period, setPeriod] = useState(initialRecord?.period ?? "");
  const [harvestDate, setHarvestDate] = useState<Date>(
    initialRecord?.harvestDate ? new Date(initialRecord.harvestDate) : new Date()
  );
  const [harvestNumber, setHarvestNumber] = useState<string>(
    initialRecord?.harvestNumber ? String(initialRecord.harvestNumber) : "1"
  );
  
  const router = useRouter();
  const isEdit = !!initialRecord;

  const currentFarmer = farmers.find((f) => f.id === selectedFarmerId);

  // Fetch farmer parcels when farmer is selected
  useEffect(() => {
    if (!selectedFarmerId) {
      setParcels([]);
      return;
    }

    async function fetchParcels() {
      setIsLoadingParcels(true);
      try {
        const res = await getFarmerParcels(selectedFarmerId);
        setParcels(res);
      } catch (err) {
        console.error("Gagal memuat data lahan", err);
        toast.error("Gagal memuat data lahan petani");
      } finally {
        setIsLoadingParcels(false);
      }
    }

    fetchParcels();
  }, [selectedFarmerId]);

  const formatDisplayDate = (d: Date | null) => {
    if (!d) return "Pilih Tanggal";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "Pilih Tanggal";
    const day = String(date.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const month = months[date.getMonth()];
    return `${day} ${month} ${date.getFullYear()}`;
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFarmerId) {
      toast.error("Petani wajib dipilih");
      return;
    }

    setIsLoading(true);
    setErrors({});

    const form = new FormData(e.currentTarget);
    const yieldKgRaw = form.get("yieldKg") as string;

    const data = {
      farmerId: selectedFarmerId,
      parcelId: selectedParcelId && selectedParcelId !== "none" ? selectedParcelId : null,
      period,
      harvestDate,
      harvestNumber: parseInt(harvestNumber, 10),
      yieldKg: yieldKgRaw ? parseFloat(yieldKgRaw) : 0,
      notes: (form.get("notes") as string) || null,
    };

    const result = isEdit
      ? await updateProductionRecord(initialRecord!.id, data)
      : await createProductionRecord(data);

    setIsLoading(false);

    if (!result.success) {
      if (typeof result.error === "string") {
        toast.error(result.error);
      } else {
        setErrors((result.error as Record<string, string[]>) ?? {});
      }
      return;
    }

    toast.success(isEdit ? "Data produksi berhasil diubah" : "Data produksi berhasil ditambahkan");
    router.push(isEdit ? `/admin/master-data/production/${initialRecord!.id}` : "/admin/master-data/production");
    router.refresh();
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Section 1: Farmer & Lahan Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Informasi Petani & Lahan</h2>
          
          <div className="space-y-2 flex flex-col">
            <Label>Petani</Label>
            {isEdit ? (
              <Input
                value={`${currentFarmer?.name ?? ""} (${currentFarmer?.farmerId ?? ""})`}
                disabled
                className="bg-muted text-muted-foreground"
              />
            ) : (
              <Popover open={farmerComboOpen} onOpenChange={setFarmerComboOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={farmerComboOpen}
                      className="w-full justify-between h-10 font-normal text-left"
                    >
                      {selectedFarmerId ? (
                        <span>{currentFarmer?.name} ({currentFarmer?.farmerId})</span>
                      ) : (
                        <span className="text-muted-foreground">Pilih Petani</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[580px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari petani..." />
                    <CommandList className="max-h-[200px]">
                      <CommandEmpty>Petani tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {farmers.map((f) => (
                          <CommandItem
                            key={f.id}
                            value={`${f.name} ${f.farmerId}`}
                            onSelect={() => {
                              setSelectedFarmerId(f.id);
                              setSelectedParcelId("");
                              setFarmerComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedFarmerId === f.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {f.name} ({f.farmerId})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            {errors.farmerId && <p className="text-sm text-destructive">{errors.farmerId[0]}</p>}
            <Label htmlFor="parcelId">Lahan</Label>
            <Select
              value={selectedParcelId}
              onValueChange={(val) => setSelectedParcelId(val ?? "")}
              disabled={!selectedFarmerId || isLoadingParcels}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingParcels ? "Memuat lahan..." : "— Tidak terpetakan —"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak terpetakan —</SelectItem>
                {parcels.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.parcelId} ({p.area !== null ? p.area.toFixed(2) : "—"} ha)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.parcelId && <p className="text-sm text-destructive">{errors.parcelId[0]}</p>}
          </div>
        </div>

        {/* Section 2: Production Data */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Data Produksi</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Periode</Label>
              <Input
                id="period"
                name="period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
              />
              {errors.period && <p className="text-sm text-destructive">{errors.period[0]}</p>}
            </div>

            <div className="space-y-2 flex flex-col justify-end">
              <Label>Tanggal Panen</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-10 border-input bg-transparent"
                    >
                      <span className="flex-1">{formatDisplayDate(harvestDate)}</span>
                      <span className="text-muted-foreground">📅</span>
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={harvestDate}
                    onSelect={(date) => date && setHarvestDate(date)}
                    locale={id}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.harvestDate && <p className="text-sm text-destructive">{errors.harvestDate[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="harvestNumber">Panen Ke-</Label>
              <Select value={harvestNumber} onValueChange={(val) => setHarvestNumber(val ?? "1")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Panen Ke-1</SelectItem>
                  <SelectItem value="2">Panen Ke-2</SelectItem>
                  <SelectItem value="3">Panen Ke-3</SelectItem>
                  <SelectItem value="4">Panen Ke-4</SelectItem>
                </SelectContent>
              </Select>
              {errors.harvestNumber && <p className="text-sm text-destructive">{errors.harvestNumber[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="yieldKg">Hasil Panen (kg)</Label>
              <Input
                id="yieldKg"
                name="yieldKg"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="Contoh: 1250.5"
                defaultValue={initialRecord?.yieldKg ?? ""}
                required
              />
              {errors.yieldKg && <p className="text-sm text-destructive">{errors.yieldKg[0]}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Catatan tambahan..."
              defaultValue={initialRecord?.notes ?? ""}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes[0]}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(isEdit ? `/admin/master-data/production/${initialRecord!.id}` : "/admin/master-data/production")}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Simpan Perubahan" : "Simpan"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
