import { authService } from "./auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

class ApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const token = authService.getToken()
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    let response = await fetch(`${API_BASE_URL}${endpoint}`, config)

    // If token expired, try to refresh
    if (response.status === 401 && token) {
      const newToken = await authService.refreshToken()
      if (newToken) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${newToken}`,
        }
        response = await fetch(`${API_BASE_URL}${endpoint}`, config)
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("API Error Details:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
        endpoint,
        method: options.method || "GET",
      })
      throw new Error(errorData.message || errorData.error || `API Error: ${response.statusText}`)
    }
    return response.json()
  }

  // Products
  async getProducts(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ""
    return this.request(`/api/products${queryString}`)
  }

  async getProduct(id: number) {
    return this.request(`/api/products/${id}`)
  }

  async createProduct(productData: any) {
    return this.request("/api/products", {
      method: "POST",
      body: JSON.stringify(productData),
    })
  }

  async updateProduct(id: number, productData: any) {
    return this.request(`/api/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(productData),
    })
  }

  async deleteProduct(id: number) {
    return this.request(`/api/products/${id}`, {
      method: "DELETE",
    })
  }

  // Categories
  async getCategories() {
    return this.request("/api/categories")
  }

  async createCategory(categoryData: any) {
    return this.request("/api/categories", {
      method: "POST",
      body: JSON.stringify(categoryData),
    })
  }

  async updateCategory(id: number, categoryData: any) {
    return this.request(`/api/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(categoryData),
    })
  }

  async deleteCategory(id: number) {
    return this.request(`/api/categories/${id}`, {
      method: "DELETE",
    })
  }

  // Orders
  async createOrder(orderData: any) {
    console.log("ApiService.createOrder called with:", orderData)
    console.log("API_BASE_URL:", API_BASE_URL)

    // Transform the order data to match your CreateOrderDto exactly
    const transformedOrderData = {
      orderNumber: orderData.orderNumber,
      subtotal: Number(orderData.subtotal),
      shipping: Number(orderData.shipping),
      tax: Number(orderData.tax),
      total: Number(orderData.total),
      status: orderData.status || "pending",
      shippingAddress: {
        firstName: orderData.shippingAddress.firstName,
        lastName: orderData.shippingAddress.lastName,
        email: orderData.shippingAddress.email,
        address: orderData.shippingAddress.address,
        city: orderData.shippingAddress.city,
        zipCode: orderData.shippingAddress.zipCode,
      },
      paymentMethod: {
        type: orderData.paymentMethod.type,
        ...(orderData.paymentMethod.last4 && { last4: orderData.paymentMethod.last4 }),
      },
      items: orderData.items.map((item: any) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
    }

    console.log("Transformed order data:", transformedOrderData)
    console.log("Making request to: /orders (no /api prefix)")

    // POST to /orders (matches your @Controller('orders'))
    return this.request("/orders", {
      method: "POST",
      body: JSON.stringify(transformedOrderData),
    })
  }

  async getUserOrders() {
    // Note: You don't have this endpoint in your controller
    // You might need to add it or use a different endpoint
    return this.request("/orders/user")
  }

  async getAllOrders() {
    // This matches your /orders/admin/all endpoint
    return this.request("/orders/admin/all")
  }

  async getOrder(id: number) {
    console.log("ApiService.getOrder called with ID:", id)
    // GET /orders/:id (matches your NestJS controller)
    return this.request(`/orders/${id}`)
  }

  async updateOrderStatus(id: number, status: string) {
    console.log("ApiService.updateOrderStatus called with:", { id, status })
    // PUT /orders/:id (matches your NestJS controller)
    return this.request(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
  }

  async updateOrder(id: number, orderData: any) {
    console.log("ApiService.updateOrder called with:", { id, orderData })
    // PUT /orders/:id (matches your NestJS controller)
    return this.request(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(orderData),
    })
  }

  async deleteOrder(id: number) {
    console.log("ApiService.deleteOrder called with ID:", id)
    // DELETE /orders/:id (matches your NestJS controller)
    return this.request(`/orders/${id}`, {
      method: "DELETE",
    })
  }

  // Helper methods for admin
  async addProduct(productData: {
    name: string
    description: string
    price: number
    stock: number
    category: string
    imageUrl: string
  }) {
    return this.createProduct(productData)
  }

  async addCategory(categoryData: {
    name: string
    description: string
    icon: string
  }) {
    return this.createCategory(categoryData)
  }
}

export const apiService = new ApiService()
