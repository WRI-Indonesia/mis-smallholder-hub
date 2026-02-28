"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { menuSchema, MenuFormValues } from "@/lib/zod/menu"
import { upsertMenu } from "@/lib/actions/menu"
import { Menu } from "@prisma/client"

interface MenuFormModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: MenuFormValues | null
  menus: Menu[] // All existing menus to select as parent
}

export function MenuFormModal({
  isOpen,
  onClose,
  initialData,
  menus,
}: MenuFormModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuSchema),
    defaultValues: initialData || {
      title: "",
      url: "",
      icon: "",
      parentId: "none", // use "none" as a frontend placeholder for null
      order: 0,
    },
  })

  React.useEffect(() => {
    if (isOpen) {
      form.reset(initialData || { 
        title: "", 
        url: "", 
        icon: "", 
        parentId: "none", 
        order: (menus.length + 1) * 10 
      })
    }
  }, [isOpen, initialData, form, menus])

  async function onSubmit(data: MenuFormValues) {
    setIsLoading(true)
    
    // Convert "none" string back to null before sending to backend
    const payload = {
      ...data,
      parentId: data.parentId === "none" ? null : data.parentId 
    }

    const result = await upsertMenu(payload)
    setIsLoading(false)

    if (result.success) {
      onClose()
    } else {
      alert(result.error)
    }
  }

  // Filter out the current menu from being its own parent in the dropdown
  const availableParents = menus.filter(m => m.id !== initialData?.id)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit" : "Add"} Menu Item</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Make changes to the sidebar menu here."
              : "Add a new menu routing link to the sidebar."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Dashboard" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Path</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. /dashboard/stats" {...field} />
                  </FormControl>
                  <FormDescription>Use `#` if this menu is just a Parent wrapper for submenus.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lucide Icon Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Home" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Menu (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || "none"} value={field.value || "none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a parent menu" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">-- Top Level Menu --</SelectItem>
                      {availableParents.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title} ({item.url})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
