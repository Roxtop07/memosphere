/**
 * Organization Types for Multi-Tenant System
 * Each company/institution gets a unique org code
 */

export interface Organization {
  id: string // Firestore document ID
  name: string // Company/Institution name (e.g., "TechVision Ltd")
  orgCode: string // Unique code (e.g., "TVL-5291")
  domain?: string // Email domain (e.g., "techvision.com")
  industry?: string // Industry type
  size?: "small" | "medium" | "large" | "enterprise"
  logoUrl?: string
  createdAt: Date
  createdBy: string // User ID of admin who created it
  settings: OrganizationSettings
  status: "active" | "suspended" | "trial"
  trialEndsAt?: Date
}

export interface OrganizationSettings {
  allowPublicSignup: boolean // Can anyone with org code join?
  requireEmailVerification: boolean
  allowedEmailDomains?: string[] // Restrict to specific domains
  maxMembers?: number
  features: {
    meetings: boolean
    events: boolean
    policies: boolean
    aiFeatures: boolean
    analytics: boolean
  }
}

export interface OrganizationMember {
  id: string
  orgId: string // Reference to organization
  userId: string // Firebase Auth UID
  email: string
  name: string
  role: "admin" | "manager" | "member" | "viewer"
  department?: string
  joinedAt: Date
  invitedBy?: string
  status: "active" | "invited" | "suspended"
  permissions?: string[] // Custom permissions
}

export interface OrgInvitation {
  id: string
  orgId: string
  email: string
  role: "admin" | "manager" | "member" | "viewer"
  invitedBy: string
  invitedAt: Date
  expiresAt: Date
  status: "pending" | "accepted" | "expired" | "revoked"
  token: string
}

// Utility types for forms
export type CreateOrganizationInput = Omit<Organization, "id" | "createdAt" | "orgCode" | "status">
export type UpdateOrganizationInput = Partial<Omit<Organization, "id" | "orgCode" | "createdAt" | "createdBy">>
