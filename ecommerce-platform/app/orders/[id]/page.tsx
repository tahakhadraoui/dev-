"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, CreditCard, HandHeart, MapPin, Clock, Package, Truck, AlertCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { apiService } from "@/lib/api"
import { Header } from "@/components/header"
import { useParams } from "next/navigation"

interface OrderItem {
  id: number
  productId: number
  quantity: number
  price: number
  product?: {
    id: number
    name: string
    image?: string
    description?: string
  }
}

interface Order {
  id: number
  orderNumber: string
  status: string
  subtotal: number
  shipping: number
  tax: number
  total: number
  createdAt: string
  updatedAt: string
  shippingAddress: {
    firstName: string
    lastName: string
    email: string
    address: string
    city: string
    zipCode: string
  }
  paymentMethod: {
    type: string
    last4?: string
  }
  items: OrderItem[]
}

export default function OrderConfirmationPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const params = useParams()
  const orderId = params.id as string

  const formatCurrency = (value: any): string => {
    const numValue = Number(value)
    if (isNaN(numValue)) {
      console.warn("Invalid currency value:", value)
      return "0.00 DT"
    }
    return `${numValue.toFixed(2)} DT`
  }

  const fetchOrder = async () => {
    try {
      setLoading(true)
      setError(null)

      const orderResponse = await apiService.getOrder(Number(orderId))
      console.log("Order response:", orderResponse)

      // Handle the case where the API might return the order directly
      // or where items might not be populated with product details
      if (orderResponse) {
        // Transform and validate numeric fields
        const processedOrder = {
          ...orderResponse,
          // Ensure all numeric fields are properly converted
          subtotal: Number(orderResponse.subtotal) || 0,
          shipping: Number(orderResponse.shipping) || 0,
          tax: Number(orderResponse.tax) || 0,
          total: Number(orderResponse.total) || 0,
          items:
            orderResponse.items?.map((item: any) => ({
              ...item,
              quantity: Number(item.quantity) || 0,
              price: Number(item.price) || 0,
              product: item.product || {
                id: item.productId,
                name: `Product #${item.productId}`,
                image: `/placeholder.svg?height=60&width=60&text=Product`,
                description: "Product details not available",
              },
            })) || [],
        }

        console.log("Processed order with numeric fields:", processedOrder)
        setOrder(processedOrder)
      } else {
        setError("Order not found")
      }
    } catch (error: any) {
      console.error("Error fetching order:", error)
      setError(error.message || "Failed to load order details")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orderId && !isNaN(Number(orderId))) {
      fetchOrder()
    } else {
      setError("Invalid order ID")
      setLoading(false)
    }
  }, [orderId])

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      pending: {
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        label: "Pending",
      },
      completed: {
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        label: "Completed",
      },
      shipped: {
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        label: "Shipped",
      },
      cancelled: {
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        label: "Cancelled",
      },
    }

    const config = statusConfig[status] || statusConfig.pending
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case "credit_card":
        return <CreditCard className="h-4 w-4 text-blue-600" />
      case "hand_to_hand":
        return <HandHeart className="h-4 w-4 text-green-600" />
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />
    }
  }

  const formatPaymentMethod = (paymentMethod: Order["paymentMethod"]) => {
    const typeLabel = paymentMethod.type.replace("_", " ")
    const capitalizedLabel = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)

    if (paymentMethod.last4) {
      return `${capitalizedLabel} ****${paymentMethod.last4}`
    }

    return capitalizedLabel
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  const getProductImage = (item: OrderItem) => {
    if (item.product?.image) {
      return item.product.image
    }
    return `/placeholder.svg?height=60&width=60&text=${encodeURIComponent(item.product?.name || "Product")}`
  }

  const getProductName = (item: OrderItem) => {
    return item.product?.name || `Product #${item.productId}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading order details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">Error Loading Order</h1>
            <p className="text-muted-foreground mb-8">{error}</p>
            <div className="space-x-4">
              <Button onClick={() => window.location.reload()}>Try Again</Button>
              <Button variant="outline" asChild>
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Order Not Found</h1>
            <p className="text-muted-foreground mb-8">The order you're looking for doesn't exist.</p>
            <Button asChild>
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {order.paymentMethod.type === "hand_to_hand" ? "Meeting Scheduled!" : "Order Confirmed!"}
          </h1>
          <p className="text-muted-foreground">
            {order.paymentMethod.type === "hand_to_hand"
              ? "We'll contact you soon to confirm the meeting details."
              : "Thank you for your order. We'll process it shortly."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order #{order.orderNumber}</span>
                  {getStatusBadge(order.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Order Date</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Payment Method</span>
                  <div className="flex items-center space-x-2">
                    {getPaymentMethodIcon(order.paymentMethod.type)}
                    <span>{formatPaymentMethod(order.paymentMethod)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">{formatCurrency(order.total)}</span>
                </div>
                {order.updatedAt !== order.createdAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="text-sm">{formatDate(order.updatedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {order.paymentMethod.type === "hand_to_hand" ? (
                    <>
                      <MapPin className="mr-2 h-5 w-5" />
                      Meeting Details
                    </>
                  ) : (
                    <>
                      <Truck className="mr-2 h-5 w-5" />
                      Shipping Information
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-muted-foreground block mb-1">
                    {order.paymentMethod.type === "hand_to_hand" ? "Contact Information" : "Delivery Address"}
                  </span>
                  <p className="font-medium">
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{order.shippingAddress.email}</p>
                  <p className="mt-2">{order.shippingAddress.address}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.zipCode}
                  </p>
                </div>

                {order.paymentMethod.type === "hand_to_hand" ? (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <Clock className="inline h-4 w-4 mr-1" />
                      We'll contact you within 24 hours to confirm the meeting details.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <Package className="inline h-4 w-4 mr-1" />
                      {order.status === "shipped"
                        ? "Your order is on its way!"
                        : order.status === "completed"
                          ? "Your order has been delivered!"
                          : "Estimated delivery: 3-5 business days"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Items ({order.items?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.items && order.items.length > 0 ? (
                  <>
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                        <Image
                          src={getProductImage(item) || "/placeholder.svg"}
                          alt={getProductName(item)}
                          width={60}
                          height={60}
                          className="rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{getProductName(item)}</h3>
                          {item.product?.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{item.product.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                            <p className="text-sm text-muted-foreground">{item.price.toFixed(2)} DT each</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No items found in this order</p>
                  </div>
                )}

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{order.shipping === 0 ? "Free" : `${formatCurrency(order.shipping)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>{formatCurrency(order.tax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-4">
              <Button asChild className="w-full">
                <Link href="/products">Continue Shopping</Link>
              </Button>
              <Button variant="outline" asChild className="w-full bg-transparent">
                <Link href="/orders">View All Orders</Link>
              </Button>
              {order.status === "pending" && (
                <Button variant="destructive" className="w-full" disabled>
                  Cancel Order (Coming Soon)
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
