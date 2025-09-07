"use client"

import type React from "react"
import type { ReactElement } from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { CreditCard, Truck, Shield, ArrowLeft, HandHeart, MapPin } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useCart } from "@/hooks/useCart"
import { useAuth } from "@/hooks/useAuth"
import { apiService } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"

export default function CheckoutPage(): ReactElement {
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [isProcessing, setIsProcessing] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardName: "",
    meetingLocation: "",
    meetingTime: "",
    notes: "",
  })
  const { state: cartState, clearCart } = useCart()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Initialize form data with user email if available and not already set
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData((prev) => ({ ...prev, email: user.email }))
    }
  }, [user?.email, formData.email])

  // Fix: Use 0.01 instead of 0 for hand_to_hand to satisfy @IsPositive validation
  const shipping = paymentMethod === "hand_to_hand" ? 0.01 : 15
  const tax = cartState.total * 0.08
  const total = cartState.total + shipping + tax

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      alert("Please login to place an order")
      router.push("/auth/login")
      return
    }
    if (cartState.items.length === 0) {
      alert("Your cart is empty")
      return
    }

    setIsProcessing(true)
    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

      // Prepare order data to match your backend DTO
      const orderData = {
        orderNumber,
        subtotal: Number(cartState.total.toFixed(2)),
        shipping: Number(shipping.toFixed(2)), // This will be 0.01 for hand_to_hand, 15.00 for card
        tax: Number(tax.toFixed(2)),
        total: Number(total.toFixed(2)),
        status: paymentMethod === "hand_to_hand" ? "pending" : "pending",
        shippingAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email || user?.email || "",
          address: paymentMethod === "card" ? formData.address : formData.meetingLocation,
          city: paymentMethod === "card" ? formData.city : "Meeting Location",
          zipCode: paymentMethod === "card" ? formData.zipCode : "00000",
        },
        paymentMethod: {
          type: paymentMethod === "card" ? "credit_card" : "hand_to_hand",
          ...(paymentMethod === "card" &&
            formData.cardNumber && {
              last4: formData.cardNumber.slice(-4),
            }),
        },
        items: cartState.items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
      }

      console.log("Creating order with data:", orderData)
      const order = await apiService.createOrder(orderData)
      console.log("Order created:", order)

      // Clear cart after successful order
      clearCart()

      // Show success message
      alert(`Order ${order.orderNumber || order.id} created successfully!`)

      // Redirect to order confirmation - handle both possible ID formats
      const orderIdForUrl = order.id || order.orderNumber
      router.push(`/orders/${orderIdForUrl}`)
    } catch (error: any) {
      console.error("Error creating order:", error)

      // More detailed error handling
      let errorMessage = "Failed to create order"
      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      alert(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  if (cartState.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground mb-8">Add some products to your cart before checking out.</p>
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
        <div className="mb-8">
          <Link href="/products" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
          <h1 className="text-3xl font-bold mt-2">Checkout</h1>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Checkout Form */}
            <div className="space-y-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="mr-2 h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+216 12 345 678"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </CardContent>
              </Card>
              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Payment & Delivery Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            <div>
                              <span className="font-medium">Credit/Debit Card</span>
                              <p className="text-sm text-muted-foreground">Pay online with card + shipping</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center">
                              VISA
                            </div>
                            <div className="w-8 h-5 bg-red-600 rounded text-white text-xs flex items-center justify-center">
                              MC
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="hand_to_hand" id="hand_to_hand" />
                      <Label htmlFor="hand_to_hand" className="flex-1 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <HandHeart className="h-5 w-5 text-green-600" />
                          <div>
                            <span className="font-medium">Hand to Hand</span>
                            <p className="text-sm text-muted-foreground">Meet in person + pay cash (No shipping fee)</p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                  {paymentMethod === "card" && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium">Card Details</h4>
                      <div className="space-y-2">
                        <Label htmlFor="address">Shipping Address *</Label>
                        <Input
                          id="address"
                          name="address"
                          placeholder="123 Main St"
                          value={formData.address}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            name="city"
                            placeholder="Tunis"
                            value={formData.city}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zipCode">ZIP Code *</Label>
                          <Input
                            id="zipCode"
                            name="zipCode"
                            placeholder="1000"
                            value={formData.zipCode}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number *</Label>
                        <Input
                          id="cardNumber"
                          name="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={formData.cardNumber}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiry Date *</Label>
                          <Input
                            id="expiry"
                            name="expiry"
                            placeholder="MM/YY"
                            value={formData.expiry}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv">CVV *</Label>
                          <Input
                            id="cvv"
                            name="cvv"
                            placeholder="123"
                            value={formData.cvv}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Name on Card *</Label>
                        <Input
                          id="cardName"
                          name="cardName"
                          placeholder="John Doe"
                          value={formData.cardName}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                  )}
                  {paymentMethod === "hand_to_hand" && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium flex items-center">
                        <MapPin className="mr-2 h-4 w-4" />
                        Meeting Details
                      </h4>
                      <div className="space-y-2">
                        <Label htmlFor="meetingLocation">Meeting Location *</Label>
                        <Input
                          id="meetingLocation"
                          name="meetingLocation"
                          placeholder="e.g., Avenue Habib Bourguiba, Centre Ville, etc."
                          value={formData.meetingLocation}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meetingTime">Preferred Meeting Time *</Label>
                        <Input
                          id="meetingTime"
                          name="meetingTime"
                          type="datetime-local"
                          value={formData.meetingTime}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Additional Notes</Label>
                        <Textarea
                          id="notes"
                          name="notes"
                          placeholder="Any special instructions or notes for the meeting..."
                          value={formData.notes}
                          onChange={handleChange}
                          rows={3}
                        />
                      </div>
                      <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          <strong>Note:</strong> We'll contact you to confirm the meeting details. Please ensure your
                          phone number is correct.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            {/* Order Summary */}
            <div className="space-y-6">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cart Items */}
                  <div className="space-y-4">
                    {cartState.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          width={60}
                          height={60}
                          className="rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{(item.price * item.quantity).toFixed(2)} DT</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  {/* Price Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{cartState.total.toFixed(2)} DT</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>{paymentMethod === "hand_to_hand" ? "Free" : `${shipping.toFixed(2)} DT`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{tax.toFixed(2)} DT</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{total.toFixed(2)} DT</span>
                    </div>
                  </div>
                  {/* Payment Method Info */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-center space-x-2">
                      {paymentMethod === "card" ? (
                        <>
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-800 dark:text-blue-200">Card payment with shipping</span>
                        </>
                      ) : (
                        <>
                          <HandHeart className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-800 dark:text-green-200">
                            Hand-to-hand meeting (No shipping fee)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Security Badge */}
                  <div className="flex items-center justify-center space-x-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-300">Secure transaction</span>
                  </div>
                  {/* Place Order Button */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    size="lg"
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? "Processing..."
                      : paymentMethod === "hand_to_hand"
                        ? `Schedule Meeting - ${total.toFixed(2)} DT`
                        : `Place Order - ${total.toFixed(2)} DT`}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    By placing your order, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
