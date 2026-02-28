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
import { Textarea } from "@/components/ui/textarea"
import { trainingTypeSchema, TrainingTypeFormValues } from "@/lib/zod/training-type"
import { upsertTrainingType } from "@/lib/actions/training-type"

interface TrainingTypeFormModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: TrainingTypeFormValues | null
}

export function TrainingTypeFormModal({
  isOpen,
  onClose,
  initialData,
}: TrainingTypeFormModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<TrainingTypeFormValues>({
    resolver: zodResolver(trainingTypeSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
    },
  })

  // Reset form when modal opens/closes or initialData changes
  React.useEffect(() => {
    if (isOpen) {
      form.reset(initialData || { name: "", description: "" })
    }
  }, [isOpen, initialData, form])

  async function onSubmit(data: TrainingTypeFormValues) {
    setIsLoading(true)
    const result = await upsertTrainingType(data)
    setIsLoading(false)

    if (result.success) {
      onClose()
    } else {
      // Typically you'd show a toast error here
      console.error(result.error)
      alert(result.error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit" : "Add"} Training Type</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Make changes to the training type here."
              : "Add a new master training type to the system."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Training Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g Good Agricultural Practices" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional description..." 
                      className="resize-none" 
                      {...field} 
                      value={field.value || ""}
                    />
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
