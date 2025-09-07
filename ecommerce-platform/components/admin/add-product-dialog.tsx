"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, X } from "lucide-react"
import { apiService } from "@/lib/api"
import Image from "next/image"

interface AddProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Array<{ id: number; name: string }>
  onProductAdded: () => void
}

export function AddProductDialog({ open, onOpenChange, categories, onProductAdded }: AddProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [imageMethod, setImageMethod] = useState<"url" | "upload">("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    originalPrice: "",
    categoryId: "0",
    stock: "",
    imageUrl: "",
    imageFile: null as File | null,
    badge: "",
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file")
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB")
        return
      }

      setFormData((prev) => ({ ...prev, imageFile: file }))

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUrlChange = (url: string) => {
    setFormData((prev) => ({ ...prev, imageUrl: url }))
    setImagePreview(url)
  }

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, imageFile: null, imageUrl: "" }))
    setImagePreview("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (categories.length === 0) {
      alert("Please create at least one category before adding products.")
      return
    }
    if (formData.categoryId === "0" || !formData.categoryId) {
      alert("Please select a category.")
      return
    }

    setIsSubmitting(true)
    try {
      let imageUrl = formData.imageUrl || "/placeholder.svg?height=300&width=300"

      // If user uploaded a file, convert to base64
      if (formData.imageFile) {
        imageUrl = await convertFileToBase64(formData.imageFile)
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        price: Number.parseFloat(formData.price),
        originalPrice: formData.originalPrice ? Number.parseFloat(formData.originalPrice) : undefined,
        categoryId: Number.parseInt(formData.categoryId),
        stock: Number.parseInt(formData.stock),
        image: imageUrl,
        badge: formData.badge || undefined,
        rating: 0,
        reviewCount: 0,
        salesCount: 0,
      }

      await apiService.createProduct(productData)

      // Reset form
      setFormData({
        name: "",
        description: "",
        price: "",
        originalPrice: "",
        categoryId: "0",
        stock: "",
        imageUrl: "",
        imageFile: null,
        badge: "",
      })
      setImagePreview("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      onProductAdded()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error creating product:", error)
      alert(error.message || "Failed to create product")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>Create a new product for your e-commerce store.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Nike Air Max Running Shoes"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              {categories.length > 0 ? (
                <Select value={formData.categoryId} onValueChange={(value) => handleChange("categoryId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md">
                  No categories available. Please create a category first.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe the product features, benefits, and specifications..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (DT) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                placeholder="99.99"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="originalPrice">Original Price (DT)</Label>
              <Input
                id="originalPrice"
                type="number"
                step="0.01"
                value={formData.originalPrice}
                onChange={(e) => handleChange("originalPrice", e.target.value)}
                placeholder="129.99"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity *</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => handleChange("stock", e.target.value)}
                placeholder="50"
                required
              />
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="space-y-4">
            <Label>Product Image</Label>
            <Tabs value={imageMethod} onValueChange={(value) => setImageMethod(value as "url" | "upload")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload Image</TabsTrigger>
                <TabsTrigger value="url">Image URL</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  {!imagePreview ? (
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                          Choose Image
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-500">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <Image
                        src={imagePreview || "/placeholder.svg"}
                        alt="Product preview"
                        width={200}
                        height={200}
                        className="mx-auto rounded-lg object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={formData.imageUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                  />
                  {formData.imageUrl && (
                    <div className="relative mt-4">
                      <Image
                        src={formData.imageUrl || "/placeholder.svg"}
                        alt="Product preview"
                        width={200}
                        height={200}
                        className="mx-auto rounded-lg object-cover"
                        onError={() => setImagePreview("")}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label htmlFor="badge">Badge (Optional)</Label>
            <Select value={formData.badge} onValueChange={(value) => handleChange("badge", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select badge" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="No Badge">No Badge</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Best Seller">Best Seller</SelectItem>
                <SelectItem value="Hot Deal">Hot Deal</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
                <SelectItem value="Sale">Sale</SelectItem>
                <SelectItem value="Limited">Limited</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || categories.length === 0}>
              {isSubmitting ? "Creating..." : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
