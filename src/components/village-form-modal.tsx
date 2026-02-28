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
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { villageSchema, VillageFormValues } from "@/lib/zod/village"
import { upsertVillage } from "@/lib/actions/village"
import { SubDistrict } from "@prisma/client"

interface VillageFormModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: VillageFormValues | null
  subDistricts: SubDistrict[]
}

export function VillageFormModal({
  isOpen,
  onClose,
  initialData,
  subDistricts,
}: VillageFormModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<VillageFormValues>({
    resolver: zodResolver(villageSchema),
    defaultValues: initialData || {
      code: "",
      name: "",
      subDistrictId: "",
    },
  })

  React.useEffect(() => {
    if (isOpen) {
      form.reset(initialData || { code: "", name: "", subDistrictId: "" })
    }
  }, [isOpen, initialData, form])

  async function onSubmit(data: VillageFormValues) {
    setIsLoading(true)
    const result = await upsertVillage(data)
    setIsLoading(false)

    if (result.success) {
      onClose()
    } else {
      alert(result.error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit" : "Add"} Village</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Make changes to the village here."
              : "Add a new village linked to a parent sub-district."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subDistrictId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Sub-District</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a sub-district" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subDistricts.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.code} - {item.name}
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
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Village Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 3171011001" {...field} />
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
                  <FormLabel>Village Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Tebet Barat" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
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
