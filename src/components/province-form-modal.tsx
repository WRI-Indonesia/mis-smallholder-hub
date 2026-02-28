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
import { provinceSchema, ProvinceFormValues } from "@/lib/zod/province"
import { upsertProvince } from "@/lib/actions/province"

interface ProvinceFormModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: ProvinceFormValues | null
}

export function ProvinceFormModal({
  isOpen,
  onClose,
  initialData,
}: ProvinceFormModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<ProvinceFormValues>({
    resolver: zodResolver(provinceSchema),
    defaultValues: initialData || {
      code: "",
      name: "",
    },
  })

  React.useEffect(() => {
    if (isOpen) {
      form.reset(initialData || { code: "", name: "" })
    }
  }, [isOpen, initialData, form])

  async function onSubmit(data: ProvinceFormValues) {
    setIsLoading(true)
    const result = await upsertProvince(data)
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
          <DialogTitle>{initialData ? "Edit" : "Add"} Province</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Make changes to the province here."
              : "Add a new province to the regional matrix."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Province Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 31" {...field} />
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
                  <FormLabel>Province Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. DKI Jakarta" {...field} />
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
