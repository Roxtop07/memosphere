/**
 * Initialize Demo Data in Firestore
 * Run this script once to create demo organization and accounts
 */

import { db } from "./firebase"
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore"

export async function initializeDemoData() {
  console.log("🚀 Initializing demo data in Firestore...")

  try {
    // Create demo organization
    const orgRef = doc(db, "organizations", "demo-org-id")
    await setDoc(orgRef, {
      id: "demo-org-id",
      name: "MemoSphere Demo",
      orgCode: "MSD-9999",
      domain: "memodemo.com",
      industry: "Technology",
      size: "small",
      createdBy: "demo-admin",
      createdAt: serverTimestamp(),
      status: "active",
      settings: {
        allowPublicSignup: true,
        requireEmailVerification: false,
        allowedEmailDomains: [],
        features: {
          meetings: true,
          events: true,
          policies: true,
          aiFeatures: true,
          analytics: true,
        },
      },
    })

    console.log("✅ Demo organization created: MSD-9999")

    // Create demo organization members (will be linked after Firebase Auth accounts are created)
    const members = [
      {
        id: "demo-admin-member",
        userId: "demo-admin", // Will be updated with real Firebase UID
        email: "admin@memodemo.com",
        name: "Demo Admin",
        role: "admin",
        status: "active",
      },
      {
        id: "demo-manager-member",
        userId: "demo-manager",
        email: "manager@memodemo.com",
        name: "Demo Manager",
        role: "manager",
        status: "active",
      },
      {
        id: "demo-member-member",
        userId: "demo-member",
        email: "member@memodemo.com",
        name: "Demo Member",
        role: "member",
        status: "active",
      },
    ]

    for (const member of members) {
      const memberRef = doc(db, "organizationMembers", member.id)
      await setDoc(memberRef, {
        ...member,
        orgId: "demo-org-id",
        joinedAt: serverTimestamp(),
      })
      console.log(`✅ Demo member created: ${member.email}`)
    }

    console.log("\n🎉 Demo data initialized successfully!")
    console.log("\n📋 Demo Credentials:")
    console.log("─────────────────────────────────────")
    console.log("Organization Code: MSD-9999")
    console.log("\nAccounts:")
    console.log("1. Admin: admin@memodemo.com / demo123")
    console.log("2. Manager: manager@memodemo.com / demo123")
    console.log("3. Member: member@memodemo.com / demo123")
    console.log("─────────────────────────────────────")

    return {
      success: true,
      orgCode: "MSD-9999",
    }
  } catch (error: any) {
    console.error("❌ Error initializing demo data:", error)
    throw error
  }
}
