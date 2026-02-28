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
import { subDistrictSchema, SubDistrictFormValues } from "@/lib/zod/sub-district"
import { upsertSubDistrict } from "@/lib/actions/sub-district"
import { District } from "@prisma/client"

interface SubDistrictFormModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: SubDistrictFormValues | null
  districts: District[]
}

export function SubDistrictFormModal({
  isOpen,
  onClose,
  initialData,
  districts,
}: SubDistrictFormModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<SubDistrictFormValues>({
    resolver: zodResolver(subDistrictSchema),
    defaultValues: initialData || {
      code: "",
      name: "",
      districtId: "",
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
        form.reset({ code: "", name: "", districtId: "" })
      }
    }
  }, [isOpen, initialData, form])

  async function onSubmit(data: SubDistrictFormValues) {
    setIsLoading(true)

    const parentNode = districts.find(d => d.id === data.districtId)
    const finalCode = parentNode && !data.code.includes(parentNode.code) 
      ? `${parentNode.code}.${data.code}` 
      : data.code

    const result = await upsertSubDistrict({ ...data, code: finalCode })
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
          <DialogTitle>{initialData ? "Edit" : "Add"} Sub District</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Make changes to the sub-district here."
              : "Add a new sub-district linked to a parent district."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="districtId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent District</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a district" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {districts.map((item) => (
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
              render={({ field }) => {
                const selectedDistId = form.watch("districtId")
                const selectedDist = districts.find(d => d.id === selectedDistId)
                
                return (
                  <FormItem>
                    <FormLabel>Sub-District Code</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        {selectedDist && (
                          <span className="text-sm text-muted-foreground bg-muted px-2 py-1.5 rounded-md border shrink-0">
                            {selectedDist.code}.
                          </span>
                        )}
                        <Input className="flex-1" placeholder="e.g. 06" {...field} />
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
                  <FormLabel>Sub-District Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Tebet" {...field} />
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
