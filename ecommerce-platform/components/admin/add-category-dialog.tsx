"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiService } from "@/lib/api"

interface AddCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCategoryAdded: () => void
}

export function AddCategoryDialog({ open, onOpenChange, onCategoryAdded }: AddCategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const categoryData = {
        name: formData.name,
        icon: formData.icon || "🏃",
      }

      await apiService.createCategory(categoryData)

      // Reset form
      setFormData({
        name: "",
        description: "",
        icon: "",
      })

      onCategoryAdded()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error creating category:", error)
      alert(error.message || "Failed to create category")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const popularIcons = ["🏃", "⚽", "🏀", "🎾", "🏈", "⚾", "🏐", "🏓", "🏸", "🥊", "🏋️", "🚴", "🏊", "⛷️", "🏂", "🧘"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
          <DialogDescription>Create a new category to organize your sports products.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Running Shoes, Basketball Equipment"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Coming Soon)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Description feature will be available soon..."
              rows={3}
              disabled
            />
            <p className="text-xs text-muted-foreground">Description field is not yet supported by the backend</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Input
              id="icon"
              value={formData.icon}
              onChange={(e) => handleChange("icon", e.target.value)}
              placeholder="🏃"
              maxLength={2}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <Label className="text-sm text-muted-foreground">Popular icons:</Label>
              {popularIcons.map((icon) => (
                <Button
                  key={icon}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 bg-transparent"
                  onClick={() => handleChange("icon", icon)}
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
