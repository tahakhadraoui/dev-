"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Eye, Package, Settings, ShoppingBag, AlertCircle } from "lucide-react"
import { AddProductDialog } from "@/components/admin/add-product-dialog"
import { AddCategoryDialog } from "@/components/admin/add-category-dialog"
import { apiService } from "@/lib/api"
import { useEffect } from "react"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("products")
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [realProducts, setRealProducts] = useState([])
  const [realCategories, setRealCategories] = useState([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        apiService.getProducts(),
        apiService.getCategories(),
      ])
      setRealProducts(productsResponse.products || productsResponse)
      setRealCategories(categoriesResponse)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true)
      setError(null)

      // Try to fetch orders from your backend
      const ordersResponse = await apiService.getAllOrders()
      console.log("Orders response:", ordersResponse)

      // Transform orders to ensure proper data types
      const transformedOrders = ordersResponse.map((order: any) => ({
        ...order,
        subtotal: Number(order.subtotal) || 0,
        shipping: Number(order.shipping) || 0,
        tax: Number(order.tax) || 0,
        total: Number(order.total) || 0,
        createdAt: order.createdAt || new Date().toISOString(),
      }))

      setOrders(transformedOrders)
    } catch (error: any) {
      console.error("Error fetching orders:", error)
      setError(`Failed to load orders: ${error.message}`)
      setOrders([]) // Set empty array on error
    } finally {
      setOrdersLoading(false)
    }
  }

  // Fetch orders when the orders tab is selected
  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders()
    }
  }, [activeTab])

  const formatCurrency = (value: any): string => {
    const numValue = Number(value)
    if (isNaN(numValue)) {
      return "0.00 DT"
    }
    return `${numValue.toFixed(2)} DT`
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      shipped: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      out_of_stock: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    }
    return <Badge className={variants[status] || variants.pending}>{status.replace("_", " ")}</Badge>
  }

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm("Are you sure you want to delete this order?")) {
      return
    }

    try {
      await apiService.deleteOrder(orderId)
      // Refresh orders list
      fetchOrders()
      alert("Order deleted successfully")
    } catch (error: any) {
      console.error("Error deleting order:", error)
      alert(`Failed to delete order: ${error.message}`)
    }
  }

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      await apiService.updateOrderStatus(orderId, newStatus)
      // Refresh orders list
      fetchOrders()
      alert("Order status updated successfully")
    } catch (error: any) {
      console.error("Error updating order status:", error)
      alert(`Failed to update order status: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your e-commerce platform</p>
          </div>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Products ({realProducts.length})</CardTitle>
                  <CardDescription>Manage your product catalog</CardDescription>
                </div>
                <Button onClick={() => setShowAddProduct(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div>Loading products...</div>
                ) : realProducts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {realProducts.map((product: any) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.price} DT</TableCell>
                          <TableCell>{product.stock}</TableCell>
                          <TableCell>{getStatusBadge(product.stock > 0 ? "active" : "out_of_stock")}</TableCell>
                          <TableCell>{product.salesCount || 0}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No products found. Create your first product!</p>
                    <Button onClick={() => setShowAddProduct(true)} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    All Orders ({orders.length})
                  </CardTitle>
                  <CardDescription>Manage all customer orders</CardDescription>
                </div>
                <Button onClick={fetchOrders} disabled={ordersLoading}>
                  {ordersLoading ? "Loading..." : "Refresh"}
                </Button>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="flex items-center space-x-2 p-4 bg-red-50 dark:bg-red-950 rounded-lg mb-4">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-800 dark:text-red-200">{error}</span>
                  </div>
                )}

                {ordersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading orders...</p>
                  </div>
                ) : orders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber || `#${order.id}`}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">{order.shippingAddress?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            <span className="text-sm">{order.paymentMethod?.type?.replace("_", " ") || "N/A"}</span>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(order.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/orders/${order.id}`, "_blank")}
                                title="View Order"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newStatus = prompt(
                                    "Enter new status (pending, shipped, completed, cancelled):",
                                    order.status,
                                  )
                                  if (newStatus && newStatus !== order.status) {
                                    handleUpdateOrderStatus(order.id, newStatus)
                                  }
                                }}
                                title="Update Status"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteOrder(order.id)}
                                title="Delete Order"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No orders found</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Orders will appear here when customers place them
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Categories ({realCategories.length})</CardTitle>
                  <CardDescription>Manage product categories</CardDescription>
                </div>
                <Button onClick={() => setShowAddCategory(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div>Loading categories...</div>
                ) : realCategories.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {realCategories.map((category: any) => (
                      <Card key={category.id} className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="text-4xl">{category.icon || "📦"}</div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{category.name}</h3>
                            <p className="text-sm text-muted-foreground">{category.description || "No description"}</p>
                            <p className="text-xs text-muted-foreground mt-1">{category.productCount || 0} products</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No categories found. Create your first category!</p>
                    <Button onClick={() => setShowAddCategory(true)} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Category
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AddProductDialog
          open={showAddProduct}
          onOpenChange={setShowAddProduct}
          categories={realCategories}
          onProductAdded={fetchData}
        />
        <AddCategoryDialog open={showAddCategory} onOpenChange={setShowAddCategory} onCategoryAdded={fetchData} />
      </div>
    </div>
  )
}
