"use client"

import { useState } from "react"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, UserPlus, AlertCircle, Mail, Lock, User, Building2, Key } from "lucide-react"
import { getOrganizationByCode, addOrganizationMember } from "@/lib/services/organization.service"
import { Badge } from "@/components/ui/badge"

interface SignupFormProps {
  onSuccess: (user: any) => void
  onSwitchToLogin: () => void
}

export default function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [orgCode, setOrgCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [verifyingOrgCode, setVerifyingOrgCode] = useState(false)
  const [orgVerified, setOrgVerified] = useState(false)
  const [orgName, setOrgName] = useState("")
  const [error, setError] = useState("")

  const handleVerifyOrgCode = async () => {
    if (!orgCode.trim()) {
      setError("Please enter an organization code")
      return
    }

    setError("")
    setVerifyingOrgCode(true)
    setOrgVerified(false)

    try {
      const org = await getOrganizationByCode(orgCode.trim().toUpperCase())
      
      if (!org) {
        setError("Invalid organization code. Please check and try again.")
        setVerifyingOrgCode(false)
        return
      }

      if (org.status === "suspended") {
        setError("This organization is currently suspended. Please contact support.")
        setVerifyingOrgCode(false)
        return
      }

      // Success!
      setOrgVerified(true)
      setOrgName(org.name)
      setError("")
    } catch (err) {
      console.error("Error verifying org code:", err)
      setError("Failed to verify organization code. Please try again.")
    } finally {
      setVerifyingOrgCode(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!orgVerified) {
      setError("Please verify your organization code first")
      return
    }

    if (!name.trim()) {
      setError("Please enter your name")
      return
    }

    if (!email.trim()) {
      setError("Please enter your email")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      // Get organization details
      const org = await getOrganizationByCode(orgCode.trim().toUpperCase())
      
      if (!org) {
        throw new Error("Organization not found")
      }

      // Check email domain restriction if set
      if (org.settings.allowedEmailDomains && org.settings.allowedEmailDomains.length > 0) {
        const emailDomain = email.split("@")[1]
        if (!org.settings.allowedEmailDomains.includes(emailDomain)) {
          throw new Error(`Only emails from ${org.settings.allowedEmailDomains.join(", ")} are allowed`)
        }
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Update user profile with name
      await updateProfile(userCredential.user, {
        displayName: name
      })

      // Add user to organization as member
      await addOrganizationMember(org.id, {
        userId: userCredential.user.uid,
        email: email,
        name: name,
        role: "member", // Default role for new signups
        status: "active",
      })

      const userData = {
        id: userCredential.user.uid,
        name: name,
        email: userCredential.user.email || email,
        role: "member" as "admin" | "manager" | "viewer",
        orgId: org.id,
        orgCode: org.orgCode,
        orgName: org.name,
      }

      onSuccess(userData)
    } catch (err: any) {
      console.error("Signup error:", err)
      
      // Handle Firebase Auth errors
      switch (err.code) {
        case "auth/email-already-in-use":
          setError("This email is already registered. Please login instead.")
          break
        case "auth/invalid-email":
          setError("Invalid email address")
          break
        case "auth/weak-password":
          setError("Password is too weak. Please use a stronger password.")
          break
        case "auth/network-request-failed":
          setError("Network error. Please check your connection.")
          break
        default:
          setError(err.message || "Failed to create account. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <img 
              src="/MEMOSPHERE.png" 
              alt="Memosphere Logo" 
              className="w-12 h-12 object-contain"
            />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center">Join Your Organization</CardTitle>
        <CardDescription className="text-center">
          Enter your organization code to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Organization Code */}
          <div className="space-y-2">
            <Label htmlFor="orgCode">Organization Code</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="orgCode"
                  type="text"
                  placeholder="e.g., MSP-8729"
                  value={orgCode}
                  onChange={(e) => {
                    setOrgCode(e.target.value.toUpperCase())
                    setOrgVerified(false)
                  }}
                  className="pl-10 font-mono uppercase"
                  disabled={isLoading || verifyingOrgCode || orgVerified}
                  maxLength={8}
                />
              </div>
              <Button
                type="button"
                variant={orgVerified ? "default" : "outline"}
                onClick={handleVerifyOrgCode}
                disabled={isLoading || verifyingOrgCode || orgVerified || !orgCode.trim()}
              >
                {verifyingOrgCode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : orgVerified ? (
                  "Verified"
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
            {orgVerified && orgName && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-green-50 dark:bg-green-950 border-green-600 text-green-700 dark:text-green-400">
                  ✓ {orgName}
                </Badge>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Ask your admin for your organization code
            </p>
          </div>

          {orgVerified && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                    autoComplete="new-password"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !orgVerified}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up
                  </>
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={onSwitchToLogin}
                  disabled={isLoading}
                >
                  Sign In
                </Button>
              </div>
            </>
          )}
        </form>

        <div className="mt-6 text-xs text-center text-muted-foreground">
          <p>By signing up, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </CardContent>
    </Card>
  )
}