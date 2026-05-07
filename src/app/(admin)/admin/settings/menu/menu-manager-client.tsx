"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { menuItemSchema, type MenuItemFormValues } from "@/validations/menu.schema";
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderMenuItems,
  type MenuItemRow,
} from "@/server/actions/menu";
import { toast } from "sonner";

// DnD Kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import {
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuManagerClientProps {
  initialItems: MenuItemRow[];
  rootItems: { id: string; key: string; title: string }[];
}

// ─── Sortable Row ─────────────────────────────────────────────────────────────

function SortableMenuRow({
  item,
  onEdit,
  onDelete,
}: {
  item: MenuItemRow;
  onEdit: (item: MenuItemRow) => void;
  onDelete: (item: MenuItemRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b last:border-0 hover:bg-muted/40 transition-colors"
    >
      {/* Drag handle */}
      <td className="w-8 px-2 py-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>
      </td>

      {/* Order */}
      <td className="w-12 px-3 py-3 text-sm text-muted-foreground tabular-nums">
        {item.order}
      </td>

      {/* Title + key */}
      <td className="px-3 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            {item.parentKey && (
              <span className="text-muted-foreground mr-1">└─</span>
            )}
            {item.title}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{item.key}</span>
        </div>
      </td>

      {/* URL */}
      <td className="px-3 py-3 text-sm text-muted-foreground font-mono hidden md:table-cell">
        {item.url}
      </td>

      {/* Parent */}
      <td className="px-3 py-3 text-sm text-muted-foreground hidden lg:table-cell">
        {item.parentKey ?? <span className="italic text-xs">root</span>}
      </td>

      {/* Status badges */}
      <td className="px-3 py-3">
        <div className="flex gap-1 flex-wrap">
          <Badge variant={item.isActive ? "default" : "secondary"} className="text-xs">
            {item.isActive ? "Active" : "Inactive"}
          </Badge>
          {!item.isVisible && (
            <Badge variant="outline" className="text-xs gap-1">
              <EyeOff className="size-3" />
              Hidden
            </Badge>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-3 text-right">
        <div className="inline-flex items-center gap-1">
          <button
            onClick={() => onEdit(item)}
            className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Edit"
          >
            <Edit2 className="size-4" />
            <span className="sr-only">Edit</span>
          </button>
          <button
            onClick={() => onDelete(item)}
            className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-sm transition-colors hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
            aria-label="Hapus"
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Hapus</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function MenuFormModal({
  isOpen,
  onClose,
  editItem,
  rootItems,
}: {
  isOpen: boolean;
  onClose: () => void;
  editItem: MenuItemRow | null;
  rootItems: { id: string; key: string; title: string }[];
}) {
  const [isPending, setIsPending] = useState(false);
  const isEditing = !!editItem;

  const form = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      key: "",
      parentKey: null,
      title: "",
      url: "",
      icon: "",
      order: 0,
      isActive: true,
      isVisible: true,
      roles: "all",
      groups: "all",
      jobDescs: "all",
      regions: "all",
    },
  });

  // Reset form with editItem data whenever modal opens or editItem changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        key: editItem?.key ?? "",
        parentKey: editItem?.parentKey ?? null,
        title: editItem?.title ?? "",
        url: editItem?.url ?? "",
        icon: editItem?.icon ?? "",
        order: editItem?.order ?? 0,
        isActive: editItem?.isActive ?? true,
        isVisible: editItem?.isVisible ?? true,
        roles: editItem?.roles ?? "all",
        groups: editItem?.groups ?? "all",
        jobDescs: editItem?.jobDescs ?? "all",
        regions: editItem?.regions ?? "all",
      });
    }
  }, [isOpen, editItem]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  async function onSubmit(data: MenuItemFormValues) {
    setIsPending(true);
    let result;

    if (isEditing && editItem) {
      result = await updateMenuItem(editItem.id, data);
    } else {
      result = await createMenuItem(data);
    }

    setIsPending(false);

    if (result.success) {
      toast.success(isEditing ? "Menu berhasil diperbarui" : "Menu berhasil dibuat");
      form.reset();
      onClose();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Menu Item" : "Tambah Menu Item"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Key */}
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key (slug unik)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="contoh: dashboard-training"
                      disabled={isEditing}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Nama menu" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* URL */}
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="/admin/dashboard atau #"
                      disabled={isEditing}
                      {...field}
                    />
                  </FormControl>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">
                      URL tidak dapat diubah. Buat menu baru jika membutuhkan URL berbeda.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Parent + Order row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="parentKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Menu</FormLabel>
                    <Select
                      value={field.value ?? "__none__"}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? null : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Root (tidak ada parent)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">— Root —</SelectItem>
                        {rootItems
                          .filter((r) => r.key !== editItem?.key)
                          .map((r) => (
                            <SelectItem key={r.key} value={r.key}>
                              {r.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Icon */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon (opsional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="contoh: LayoutDashboardIcon"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* isActive + isVisible */}
            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Aktif</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isVisible"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">
                      <Eye className="size-3.5 inline mr-1" />
                      Visible
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Menu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MenuManagerClient({ initialItems, rootItems }: MenuManagerClientProps) {
  const [items, setItems] = useState<MenuItemRow[]>(initialItems);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItemRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItemRow | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Filtered items — search across title, key, url, parentKey
  const filteredItems = search.trim()
    ? items.filter((item) => {
        const q = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.key.toLowerCase().includes(q) ||
          item.url.toLowerCase().includes(q) ||
          (item.parentKey ?? "").toLowerCase().includes(q)
        );
      })
    : items;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCreate = () => {
    setEditItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: MenuItemRow) => {
    setEditItem(item);
    setIsFormOpen(true);
  };

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setEditItem(null);
    // Refresh by reloading — Next.js revalidatePath handles server-side cache
    window.location.reload();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const result = await deleteMenuItem(deleteTarget.id);
    if (result.success) {
      toast.success(
        deleteTarget ? `Menu "${deleteTarget.title}" berhasil dihapus` : "Menu dihapus"
      );
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      toast.error(result.error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    // Optimistic update
    setItems(reordered);

    // Persist new order
    setIsSavingOrder(true);
    const orderPayload = reordered.map((item, idx) => ({
      id: item.id,
      order: idx * 10, // use multiples of 10 for easy insertion later
    }));

    const result = await reorderMenuItems(orderPayload);
    setIsSavingOrder(false);

    if (result.success) {
      toast.success("Urutan menu disimpan");
      // Update local order values
      setItems((prev) =>
        prev.map((item, idx) => ({ ...item, order: idx * 10 }))
      );
    } else {
      toast.error(result.error);
      // Revert on failure
      setItems(initialItems);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base shrink-0">
            Daftar Menu ({filteredItems.length}{search ? ` dari ${items.length}` : ""} item)
            {isSavingOrder && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                Menyimpan urutan...
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Cari title, key, URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button size="sm" onClick={handleCreate} className="shrink-0">
              <Plus className="size-4 mr-2" />
              Tambah Menu
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-8 px-2 py-2" />
                  <th className="w-12 px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    Order
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    Title / Key
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">
                    URL
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">
                    Parent
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                    Aksi
                  </th>
                </tr>
              </thead>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={search ? undefined : handleDragEnd}
              >
                <SortableContext
                  items={filteredItems.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-8 text-center text-sm text-muted-foreground"
                        >
                          {search ? `Tidak ada menu yang cocok dengan "${search}".` : "Belum ada menu item."}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <SortableMenuRow
                          key={item.id}
                          item={item}
                          onEdit={handleEdit}
                          onDelete={setDeleteTarget}
                        />
                      ))
                    )}
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Form Modal */}
      <MenuFormModal
        isOpen={isFormOpen}
        onClose={handleFormClose}
        editItem={editItem}
        rootItems={rootItems}
      />

      {/* Delete Confirmation */}
      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Menu Item"
        description={
          deleteTarget
            ? `Hapus menu "${deleteTarget.title}"? ${
                deleteTarget.key
                  ? "Jika menu ini memiliki sub-menu, menu akan disembunyikan (soft delete)."
                  : ""
              }`
            : undefined
        }
      />
    </>
  );
}
