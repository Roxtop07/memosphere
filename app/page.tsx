"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import LoginForm from "@/components/auth/login-form"
import SignupForm from "@/components/auth/signup-form"
import RegisterOrganizationForm from "@/components/auth/register-organization-form"
import Dashboard from "@/components/dashboard/dashboard"
import { NotificationProvider } from "@/components/notifications/notification-provider"
import NotificationToastsContainer from "@/components/notifications/notification-toasts-container"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type ViewType = "login" | "signup" | "register-org"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState<ViewType>("login")
  const [user, setUser] = useState<{
    id: string
    name: string
    email: string
    role: "admin" | "manager" | "viewer"
    orgId?: string
    orgCode?: string
    orgName?: string
  } | null>(null)

  // Check for existing authentication on mount and persist login across refreshes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, restore session from localStorage
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser)
            setUser(userData)
            setIsAuthenticated(true)
          } catch (e) {
            // Fallback to basic user data
            const role = firebaseUser.email?.includes("admin") 
              ? "admin" 
              : firebaseUser.email?.includes("manager") 
              ? "manager" 
              : "viewer"

            const userData = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              role: role as "admin" | "manager" | "viewer"
            }

            setUser(userData)
            setIsAuthenticated(true)
            localStorage.setItem("user", JSON.stringify(userData))
          }
        } else {
          // Create basic user data
          const role = firebaseUser.email?.includes("admin") 
            ? "admin" 
            : firebaseUser.email?.includes("manager") 
            ? "manager" 
            : "viewer"

          const userData = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            role: role as "admin" | "manager" | "viewer"
          }

          setUser(userData)
          setIsAuthenticated(true)
          localStorage.setItem("user", JSON.stringify(userData))
        }
      } else {
        // User is signed out
        setUser(null)
        setIsAuthenticated(false)
        localStorage.removeItem("user")
      }
      setIsLoading(false)
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [])

  const handleLogin = (userData: any) => {
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem("user", JSON.stringify(userData))
  }

  const handleLogout = async () => {
    try {
      await auth.signOut()
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem("user")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const handleOrgRegistrationSuccess = (userData: any) => {
    // After org registration, user is auto-logged in
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem("user", JSON.stringify(userData))
  }

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading Memosphere...</p>
        </div>
      </main>
    )
  }

  return (
    <NotificationProvider>
      <main className="min-h-screen bg-background">
        {isAuthenticated && user ? (
          <>
            <Dashboard user={user} onLogout={handleLogout} />
            <NotificationToastsContainer />
          </>
        ) : (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-6xl">
              {currentView === "register-org" ? (
                <RegisterOrganizationForm
                  onRegister={handleOrgRegistrationSuccess}
                  onSwitchToLogin={() => setCurrentView("login")}
                />
              ) : currentView === "signup" ? (
                <>
                  <SignupForm 
                    onSuccess={handleLogin} 
                    onSwitchToLogin={() => setCurrentView("login")} 
                  />
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Don't have an organization code?{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto font-semibold"
                        onClick={() => setCurrentView("register-org")}
                      >
                        Register your organization
                      </Button>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <LoginForm 
                    onLogin={handleLogin}
                    onSwitchToSignup={() => setCurrentView("signup")}
                  />
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      New organization?{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto font-semibold"
                        onClick={() => setCurrentView("register-org")}
                      >
                        Register here
                      </Button>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </NotificationProvider>
  )
}
