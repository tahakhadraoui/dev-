interface LoginResponse {
  user: {
    id: string
    email: string
    role: "ADMIN" | "WEBADMIN" | "PLAYER"
    firstName?: string
    lastName?: string
    isActive: boolean
  }
  accessToken: string
  refreshToken: string
}

interface RegisterResponse {
  user: {
    id: string
    email: string
    role: "ADMIN" | "WEBADMIN" | "PLAYER"
    firstName?: string
    lastName?: string
    isActive: boolean
  }
  accessToken?: string
  refreshToken?: string
  message?: string
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: "PLAYER" | "ADMIN" | "WEBADMIN"
}

class AuthService {
  private tokenKey = "accessToken"
  private refreshTokenKey = "refreshToken"
  private userKey = "user"

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || "Login failed")
    }

    const data: LoginResponse = await response.json()

    // Store tokens and user info
    localStorage.setItem(this.tokenKey, data.accessToken)
    localStorage.setItem(this.refreshTokenKey, data.refreshToken)
    localStorage.setItem(this.userKey, JSON.stringify(data.user))

    return data
  }

  async register(userData: RegisterData): Promise<RegisterResponse> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...userData,
        role: userData.role || "PLAYER", // Default to PLAYER role
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || "Registration failed")
    }

    const data: RegisterResponse = await response.json()

    // Store tokens and user info if account is active and tokens are provided
    if (data.accessToken && data.refreshToken && data.user) {
      localStorage.setItem(this.tokenKey, data.accessToken)
      localStorage.setItem(this.refreshTokenKey, data.refreshToken)
      localStorage.setItem(this.userKey, JSON.stringify(data.user))
    }

    return data
  }

  getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(this.tokenKey)
  }

  getUser(): any | null {
    if (typeof window === "undefined") return null
    const user = localStorage.getItem(this.userKey)
    return user ? JSON.parse(user) : null
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.refreshTokenKey)
    localStorage.removeItem(this.userKey)
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem(this.refreshTokenKey)
    if (!refreshToken) return null

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        this.logout()
        return null
      }

      const data = await response.json()
      if (data.accessToken) {
        localStorage.setItem(this.tokenKey, data.accessToken)
        return data.accessToken
      }
      return null
    } catch (error) {
      this.logout()
      return null
    }
  }
}

export const authService = new AuthService()
