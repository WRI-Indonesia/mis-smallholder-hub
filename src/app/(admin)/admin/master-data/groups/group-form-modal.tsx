"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  farmerGroupSchema,
  FarmerGroupFormValues,
} from "@/validations/farmer-group.schema";
import {
  createFarmerGroup,
  updateFarmerGroup,
  type FarmerGroupRow,
  type DistrictDropdownItem,
} from "@/server/actions/farmer-group";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: FarmerGroupRow | null;
  districts: DistrictDropdownItem[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GroupFormModal({
  isOpen,
  onClose,
  group,
  districts,
}: GroupFormModalProps) {
  const [isPending, setIsPending] = useState(false);
  const isEditing = !!group;

  // ─── Group districts by province ──────────────────────────────────────

  const districtsByProvince = useMemo(() => {
    const map = new Map<
      string,
      { provinceName: string; districts: DistrictDropdownItem[] }
    >();
    for (const d of districts) {
      const key = d.province.id;
      if (!map.has(key)) {
        map.set(key, { provinceName: d.province.name, districts: [] });
      }
      map.get(key)!.districts.push(d);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.provinceName.localeCompare(b.provinceName)
    );
  }, [districts]);

  // ─── Form ─────────────────────────────────────────────────────────────

  const form = useForm<FarmerGroupFormValues>({
    resolver: zodResolver(farmerGroupSchema as any),
    defaultValues: {
      name: group?.name ?? "",
      code: group?.code ?? "",
      abrv: group?.abrv ?? "",
      abrv3id: group?.abrv3id ?? "",
      districtId: group?.districtId ?? "",
      locationLat: group?.locationLat ?? undefined,
      locationLong: group?.locationLong ?? undefined,
    },
  });

  async function onSubmit(data: FarmerGroupFormValues) {
    setIsPending(true);
    const result = isEditing
      ? await updateFarmerGroup(group!.id, data)
      : await createFarmerGroup(data);
    setIsPending(false);

    if (result.success) {
      toast.success(
        isEditing
          ? "Kelompok tani diperbarui."
          : "Kelompok tani berhasil dibuat."
      );
      onClose();
    } else {
      toast.error(result.error);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Edit Kelompok Tani"
              : "Tambah Kelompok Tani Baru"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-4"
          >
            {/* Kabupaten */}
            <FormField
              control={form.control}
              name="districtId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kabupaten *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kabupaten" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {districtsByProvince.map((group) => (
                        <SelectGroup key={group.provinceName}>
                          <SelectLabel>{group.provinceName}</SelectLabel>
                          {group.districts.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nama */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kelompok *</FormLabel>
                  <FormControl>
                    <Input placeholder="Kelompok Tani Makmur" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Kode & Singkatan Row */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode</FormLabel>
                    <FormControl>
                      <Input placeholder="KT001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="abrv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Singkatan</FormLabel>
                    <FormControl>
                      <Input placeholder="KTM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="abrv3id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Singkatan 3ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="3ID"
                        maxLength={50}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Koordinat Row */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="locationLat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-0.5332"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? undefined : e.target.value
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="locationLong"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="102.1455"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? undefined : e.target.value
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
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
