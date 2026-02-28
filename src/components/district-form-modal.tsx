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
import { districtSchema, DistrictFormValues } from "@/lib/zod/district"
import { upsertDistrict } from "@/lib/actions/district"
import { Province } from "@prisma/client"

interface DistrictFormModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: DistrictFormValues | null
  provinces: Province[] // We pass provinces here for the select dropdown
}

export function DistrictFormModal({
  isOpen,
  onClose,
  initialData,
  provinces,
}: DistrictFormModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<DistrictFormValues>({
    resolver: zodResolver(districtSchema),
    defaultValues: initialData || {
      code: "",
      name: "",
      provinceId: "",
    },
  })

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          ...initialData,
          code: initialData.code.split('.').pop() || ""
        })
      } else {
        form.reset({ code: "", name: "", provinceId: "" })
      }
    }
  }, [isOpen, initialData, form])

  async function onSubmit(data: DistrictFormValues) {
    setIsLoading(true)

    // Append the parent province's code prefix dynamically
    const parentNode = provinces.find(p => p.id === data.provinceId)
    const finalCode = parentNode && !data.code.includes(parentNode.code) 
      ? `${parentNode.code}.${data.code}` 
      : data.code

    const result = await upsertDistrict({ ...data, code: finalCode })
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
          <DialogTitle>{initialData ? "Edit" : "Add"} District</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Make changes to the district here."
              : "Add a new district linked to a parent province."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="provinceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Province</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a province" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {provinces.map((prov) => (
                        <SelectItem key={prov.id} value={prov.id}>
                          {prov.code} - {prov.name}
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
              render={({ field }) => {
                const selectedProvId = form.watch("provinceId")
                const selectedProv = provinces.find(p => p.id === selectedProvId)
                
                return (
                  <FormItem>
                    <FormLabel>District Code</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        {selectedProv && (
                          <span className="text-sm text-muted-foreground bg-muted px-2 py-1.5 rounded-md border shrink-0">
                            {selectedProv.code}.
                          </span>
                        )}
                        <Input className="flex-1" placeholder="e.g. 08" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Kota Jakarta Selatan" {...field} />
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
