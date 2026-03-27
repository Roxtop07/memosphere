"use client"

import type React from "react"

import { useState } from "react"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Building2, AlertCircle, Mail, Lock, User, Hash, Users } from "lucide-react"
import { toast } from "sonner"

interface RegisterOrganizationFormProps {
  onRegister: (user: { id: string; name: string; email: string; role: "admin" | "manager" | "viewer"; orgId: string; orgCode: string; orgName: string }) => void
  onSwitchToLogin?: () => void
}

export default function RegisterOrganizationForm({ onRegister, onSwitchToLogin }: RegisterOrganizationFormProps) {
  const [formData, setFormData] = useState({
    organizationName: "",
    organizationCode: "",
    adminName: "",
    adminEmail: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const generateOrgCode = () => {
    const code = `ORG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    setFormData(prev => ({ ...prev, organizationCode: code }))
    toast.success("Organization code generated!")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    if (!formData.organizationCode) {
      setError("Please generate an organization code")
      setIsLoading(false)
      return
    }

    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.adminEmail,
        formData.password
      )
      const firebaseUser = userCredential.user

      // Update profile with display name
      await updateProfile(firebaseUser, {
        displayName: formData.adminName,
      })

      // Generate organization ID
      const orgId = `org-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      // Create user object with organization details
      const user = {
        id: firebaseUser.uid,
        name: formData.adminName,
        email: formData.adminEmail,
        role: "admin" as const,
        orgId: orgId,
        orgCode: formData.organizationCode,
        orgName: formData.organizationName,
      }

      // Store organization data in localStorage
      localStorage.setItem("user", JSON.stringify(user))
      localStorage.setItem(`org-${orgId}`, JSON.stringify({
        id: orgId,
        name: formData.organizationName,
        code: formData.organizationCode,
        adminEmail: formData.adminEmail,
        createdAt: new Date().toISOString(),
        members: [
          {
            id: firebaseUser.uid,
            name: formData.adminName,
            email: formData.adminEmail,
            role: "admin",
            joinedAt: new Date().toISOString(),
          }
        ]
      }))

      toast.success("Organization registered successfully!")
      onRegister(user)
    } catch (err: any) {
      console.error("Registration error:", err)
      
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
          setError(err.message || "Failed to register. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-2xl shadow-lg border-primary/10">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Register Your Organization
          </CardTitle>
          <CardDescription className="text-center text-base">
            Create your organization account and become the admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Organization Details */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organization Details
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="organizationName" className="flex items-center gap-1">
                  Organization Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  placeholder="e.g., Acme Corporation"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationCode" className="flex items-center gap-1">
                  Organization Code <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="organizationCode"
                    name="organizationCode"
                    value={formData.organizationCode}
                    onChange={handleChange}
                    placeholder="ORG-XXXXXX"
                    required
                    disabled={isLoading}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateOrgCode}
                    disabled={isLoading}
                  >
                    <Hash className="w-4 h-4 mr-1" />
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Members will use this code to join your organization
                </p>
              </div>
            </div>

            {/* Admin Details */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Admin Account Details
              </h3>

              <div className="space-y-2">
                <Label htmlFor="adminName" className="flex items-center gap-1">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="adminName"
                    name="adminName"
                    value={formData.adminName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail" className="flex items-center gap-1">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="adminEmail"
                    name="adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    placeholder="admin@example.com"
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-1">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="flex items-center gap-1">
                    Confirm Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Organization...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-5 w-5" />
                  Register Organization
                </>
              )}
            </Button>

            {onSwitchToLogin && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={onSwitchToLogin}
                  disabled={isLoading}
                >
                  Already have an account? Login here
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
