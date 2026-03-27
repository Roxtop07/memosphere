"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Loader2, Check, Copy, ArrowLeft } from "lucide-react"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { createOrganization } from "@/lib/services/organization.service"
import type { CreateOrganizationInput } from "@/lib/types/organization"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface OrgRegistrationFormProps {
  onSuccess: (orgCode: string, orgName: string) => void
  onBack?: () => void
}

export default function OrgRegistrationForm({ onSuccess, onBack }: OrgRegistrationFormProps) {
  const [step, setStep] = useState<"org-details" | "admin-account" | "success">("org-details")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [generatedOrgCode, setGeneratedOrgCode] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)

  // Organization details
  const [orgName, setOrgName] = useState("")
  const [orgDomain, setOrgDomain] = useState("")
  const [orgIndustry, setOrgIndustry] = useState("")
  const [orgSize, setOrgSize] = useState<"small" | "medium" | "large" | "enterprise">("small")

  // Admin account details
  const [adminName, setAdminName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleOrgDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!orgName.trim()) {
      setError("Organization name is required")
      return
    }

    setStep("admin-account")
  }

  const handleAdminAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Validate passwords
      if (adminPassword.length < 6) {
        throw new Error("Password must be at least 6 characters")
      }

      if (adminPassword !== confirmPassword) {
        throw new Error("Passwords do not match")
      }

      // Create Firebase admin user
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword)
      const user = userCredential.user

      // Update user profile with name
      await updateProfile(user, { displayName: adminName })

      // Create organization in Firestore
      const orgInput: CreateOrganizationInput = {
        name: orgName,
        domain: orgDomain || undefined,
        industry: orgIndustry || undefined,
        size: orgSize,
        createdBy: adminEmail,
        settings: {
          allowPublicSignup: true,
          requireEmailVerification: false,
          features: {
            meetings: true,
            events: true,
            policies: true,
            aiFeatures: true,
            analytics: true,
          },
        },
      }

      const organization = await createOrganization(orgInput, user.uid)

      // Success!
      setGeneratedOrgCode(organization.orgCode)
      setStep("success")
    } catch (err: any) {
      console.error("Organization registration error:", err)
      
      // Handle Firebase errors
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please use a different email or login.")
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address")
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please use a stronger password.")
      } else {
        setError(err.message || "Failed to register organization. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopyOrgCode = () => {
    navigator.clipboard.writeText(generatedOrgCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleContinue = () => {
    onSuccess(generatedOrgCode, orgName)
  }

  // Success screen
  if (step === "success") {
    return (
      <Card className="w-full max-w-2xl mx-auto border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600 dark:text-green-500" />
          </div>
          <div>
            <CardTitle className="text-3xl">Organization Created!</CardTitle>
            <CardDescription className="text-base mt-2">
              {orgName} is now registered on MemoSphere
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-primary bg-primary/5">
            <AlertDescription className="space-y-4">
              <div className="font-semibold text-lg">Your Organization Code:</div>
              <div className="flex items-center gap-3 p-4 bg-background rounded-lg border-2 border-primary">
                <Badge variant="outline" className="text-2xl font-mono px-6 py-3 bg-primary/10 border-primary">
                  {generatedOrgCode}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyOrgCode}
                  className="ml-auto"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Important:</strong> Share this code with your team members. They will need it to sign up
                and join your organization workspace.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold">What's Next?</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Your organization is on a 30-day free trial with full access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Invite team members using the organization code</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Configure settings and customize your workspace</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Start managing meetings, events, and policies</span>
              </li>
            </ul>
          </div>

          <Button onClick={handleContinue} className="w-full" size="lg">
            Continue to Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Admin account form
  if (step === "admin-account") {
    return (
      <Card className="w-full max-w-xl mx-auto border-border/50 shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setStep("org-details")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle>Create Admin Account</CardTitle>
              <CardDescription>Set up the administrator account for {orgName}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdminAccountSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="adminName">Full Name *</Label>
              <Input
                id="adminName"
                type="text"
                placeholder="John Doe"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email Address *</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@example.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">This will be your login email</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminPassword">Password *</Label>
              <Input
                id="adminPassword"
                type="password"
                placeholder="Min. 6 characters"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Organization...
                </>
              ) : (
                "Create Organization"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  // Organization details form
  return (
    <Card className="w-full max-w-xl mx-auto border-border/50 shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              <CardTitle>Register Your Organization</CardTitle>
            </div>
            <CardDescription className="mt-2">
              Create a MemoSphere workspace for your company or institution
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleOrgDetailsSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name *</Label>
            <Input
              id="orgName"
              type="text"
              placeholder="e.g., TechVision Ltd, Lakecity University"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              This will be used to generate your unique organization code
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgDomain">Email Domain (Optional)</Label>
            <Input
              id="orgDomain"
              type="text"
              placeholder="e.g., company.com"
              value={orgDomain}
              onChange={(e) => setOrgDomain(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">Restrict signups to specific email domain</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgIndustry">Industry (Optional)</Label>
            <Input
              id="orgIndustry"
              type="text"
              placeholder="e.g., Technology, Education, Healthcare"
              value={orgIndustry}
              onChange={(e) => setOrgIndustry(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgSize">Organization Size *</Label>
            <Select value={orgSize} onValueChange={(value: any) => setOrgSize(value)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (1-50 employees)</SelectItem>
                <SelectItem value="medium">Medium (51-200 employees)</SelectItem>
                <SelectItem value="large">Large (201-1000 employees)</SelectItem>
                <SelectItem value="enterprise">Enterprise (1000+ employees)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" size="lg">
            Continue to Admin Setup
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
