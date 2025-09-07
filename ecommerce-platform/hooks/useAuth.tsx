"use client"

import { useState, useEffect, createContext, useContext } from "react"
import type { ReactNode } from "react"
import { authService } from "@/lib/auth"

interface User {
  id: string
  email: string
  role: "ADMIN" | "WEBADMIN" | "PLAYER"
  firstName?: string
  lastName?: string
  isActive: boolean
}

interface RegisterResponse {
  user?: User
  accessToken?: string
  refreshToken?: string
  message?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: any) => Promise<RegisterResponse>
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
  isWebAdmin: boolean
  isPlayer: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount
    const savedUser = authService.getUser()
    if (savedUser && authService.isAuthenticated()) {
      setUser(savedUser)
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await authService.login(email, password)
      setUser(response.user)
    } catch (error) {
      throw error
    }
  }

  const register = async (userData: any): Promise<RegisterResponse> => {
    try {
      const response = await authService.register(userData)

      // If account needs activation, don't set user
      if (response.accessToken) {
        setUser(response.user)
      }

      return {
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        message: response.message,
      }
    } catch (error) {
      throw error
    }
  }

  const logout = (): void => {
    authService.logout()
    setUser(null)
  }

  const contextValue: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === "ADMIN",
    isWebAdmin: user?.role === "WEBADMIN",
    isPlayer: user?.role === "PLAYER",
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
