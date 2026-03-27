"use client"

import type React from "react"

import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, LogIn, AlertCircle, Mail, Lock } from "lucide-react"
import { use2FA } from "@/hooks/use-2fa"
import TwoFAVerification from "@/components/auth/two-fa-verification"

interface LoginFormProps {
  onLogin: (user: { id: string; name: string; email: string; role: "admin" | "manager" | "viewer" }) => void
  onSwitchToSignup?: () => void
}

export default function LoginForm({ onLogin, onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"login" | "2fa">("login")
  const [tempUser, setTempUser] = useState<{
    id: string
    name: string
    email: string
    role: "admin" | "manager" | "viewer"
  } | null>(null)

  const { verififyCode, resetVerification } = use2FA()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user

      // Try to get user's organization membership from localStorage first
      let role: "admin" | "manager" | "viewer" = "viewer"
      let orgData = null

      // Check if user data exists in localStorage
      const storedUser = localStorage.getItem("user")
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          if (userData.orgId) {
            orgData = {
              orgId: userData.orgId,
              orgCode: userData.orgCode,
              orgName: userData.orgName,
            }
            role = userData.role
          }
        } catch (e) {
          console.log("No stored user data")
        }
      }

      // Fallback: Determine role based on email
      if (!orgData) {
        role = email.includes("admin") 
          ? "admin" 
          : email.includes("manager") 
          ? "manager" 
          : "viewer"
      }

      const user = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || email.split('@')[0],
        email: firebaseUser.email || email,
        role: role,
        ...(orgData || {}),
      }

      setTempUser(user)
      setStep("2fa")
    } catch (err: any) {
      console.error("Login error:", err)
      
      // Handle Firebase Auth errors
      switch (err.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Invalid email or password. Please check your credentials and try again.")
          break
        case "auth/invalid-email":
          setError("Invalid email address")
          break
        case "auth/user-disabled":
          setError("This account has been disabled")
          break
        case "auth/too-many-requests":
          setError("Too many failed login attempts. Please try again later.")
          break
        case "auth/network-request-failed":
          setError("Network error. Please check your connection.")
          break
        default:
          setError(err.message || "Failed to sign in. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handle2FAVerify = (code: string) => {
    const isValid = verififyCode(code)
    if (isValid && tempUser) {
      onLogin(tempUser)
      resetVerification()
    }
    return isValid
  }

  if (step === "2fa" && tempUser) {
    return (
      <TwoFAVerification
        email={tempUser.email}
        onVerify={handle2FAVerify}
        onCancel={() => {
          setStep("login")
          setTempUser(null)
          resetVerification()
        }}
        isLoading={isLoading}
      />
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-background via-secondary/20 to-background">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <img 
                src="/MEMOSPHERE.png" 
                alt="Memosphere Logo" 
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Welcome to Memosphere</CardTitle>
          <CardDescription className="text-center">Sign in to access your AI-powered dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>

            {/* Demo Account Button */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or try demo</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isLoading}
              onClick={() => {
                setEmail("admin@memodemo.com")
                setPassword("demo123")
              }}
            >
              🎮 Use Demo Account
            </Button>

            {onSwitchToSignup && (
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Don't have an account? </span>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={onSwitchToSignup}
                  disabled={isLoading}
                >
                  Sign Up
                </Button>
              </div>
            )}
          </form>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <p className="font-semibold mb-1">📝 Demo Credentials:</p>
            <p>Email: admin@memodemo.com</p>
            <p>Password: demo123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
