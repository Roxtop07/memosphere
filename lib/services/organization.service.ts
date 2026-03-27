/**
 * Organization Service
 * Handles all organization-related operations
 */

import { db } from "@/lib/firebase"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import type { Organization, OrganizationMember, CreateOrganizationInput } from "@/lib/types/organization"

/**
 * Generate a unique organization code
 * Format: XXX-#### (e.g., TVL-5291, MSP-8729)
 */
export function generateOrgCode(companyName: string): string {
  // Extract first 3 letters of company name (uppercase)
  const prefix = companyName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, "X")

  // Generate 4 random digits
  const suffix = Math.floor(1000 + Math.random() * 9000)

  return `${prefix}-${suffix}`
}

/**
 * Check if an organization code already exists
 */
export async function orgCodeExists(orgCode: string): Promise<boolean> {
  try {
    const orgsRef = collection(db, "organizations")
    const q = query(orgsRef, where("orgCode", "==", orgCode))
    const snapshot = await getDocs(q)
    return !snapshot.empty
  } catch (error) {
    console.error("Error checking org code:", error)
    return false
  }
}

/**
 * Create a new organization
 */
export async function createOrganization(
  input: CreateOrganizationInput,
  adminUserId: string
): Promise<Organization> {
  try {
    // Generate unique org code
    let orgCode = generateOrgCode(input.name)
    let attempts = 0

    // Ensure code is unique (max 10 attempts)
    while (await orgCodeExists(orgCode) && attempts < 10) {
      orgCode = generateOrgCode(input.name)
      attempts++
    }

    if (attempts >= 10) {
      throw new Error("Failed to generate unique organization code")
    }

    const orgRef = doc(collection(db, "organizations"))
    const orgData: Organization = {
      ...input,
      id: orgRef.id,
      orgCode,
      createdBy: adminUserId,
      createdAt: new Date(),
      status: "trial",
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
    }

    await setDoc(orgRef, {
      ...orgData,
      createdAt: serverTimestamp(),
      trialEndsAt: Timestamp.fromDate(orgData.trialEndsAt!),
    })

    // Create admin member entry
    await addOrganizationMember(orgRef.id, {
      userId: adminUserId,
      email: input.createdBy, // Assuming email is passed here
      name: "", // Will be updated from user profile
      role: "admin",
      status: "active",
    })

    return orgData
  } catch (error) {
    console.error("Error creating organization:", error)
    throw error
  }
}

/**
 * Get organization by code
 */
export async function getOrganizationByCode(orgCode: string): Promise<Organization | null> {
  try {
    const orgsRef = collection(db, "organizations")
    const q = query(orgsRef, where("orgCode", "==", orgCode.toUpperCase()))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      trialEndsAt: data.trialEndsAt?.toDate(),
    } as Organization
  } catch (error) {
    console.error("Error getting organization:", error)
    return null
  }
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  try {
    const orgRef = doc(db, "organizations", orgId)
    const orgSnap = await getDoc(orgRef)

    if (!orgSnap.exists()) {
      return null
    }

    const data = orgSnap.data()
    return {
      ...data,
      id: orgSnap.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      trialEndsAt: data.trialEndsAt?.toDate(),
    } as Organization
  } catch (error) {
    console.error("Error getting organization:", error)
    return null
  }
}

/**
 * Add a member to an organization
 */
export async function addOrganizationMember(
  orgId: string,
  member: Omit<OrganizationMember, "id" | "orgId" | "joinedAt">
): Promise<void> {
  try {
    const memberRef = doc(collection(db, "organizationMembers"))
    await setDoc(memberRef, {
      ...member,
      id: memberRef.id,
      orgId,
      joinedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error adding organization member:", error)
    throw error
  }
}

/**
 * Get organization member by user ID
 */
export async function getOrganizationMember(
  orgId: string,
  userId: string
): Promise<OrganizationMember | null> {
  try {
    const membersRef = collection(db, "organizationMembers")
    const q = query(membersRef, where("orgId", "==", orgId), where("userId", "==", userId))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    return {
      ...data,
      joinedAt: data.joinedAt?.toDate() || new Date(),
    } as OrganizationMember
  } catch (error) {
    console.error("Error getting organization member:", error)
    return null
  }
}

/**
 * Check if user is admin of organization
 */
export async function isOrgAdmin(orgId: string, userId: string): Promise<boolean> {
  const member = await getOrganizationMember(orgId, userId)
  return member?.role === "admin"
}

/**
 * Get all members of an organization
 */
export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  try {
    const membersRef = collection(db, "organizationMembers")
    const q = query(membersRef, where("orgId", "==", orgId))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        joinedAt: data.joinedAt?.toDate() || new Date(),
      } as OrganizationMember
    })
  } catch (error) {
    console.error("Error getting organization members:", error)
    return []
  }
}

/**
 * Update organization member role
 */
export async function updateMemberRole(
  memberId: string,
  role: "admin" | "manager" | "member" | "viewer"
): Promise<void> {
  try {
    const memberRef = doc(db, "organizationMembers", memberId)
    await updateDoc(memberRef, { role })
  } catch (error) {
    console.error("Error updating member role:", error)
    throw error
  }
}
