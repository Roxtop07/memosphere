/**
 * Demo Account Setup Script
 * Run this to create demo accounts for testing
 */

import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { createOrganization, addOrganizationMember } from "@/lib/services/organization.service"
import { doc, setDoc } from "firebase/firestore"

interface DemoAccount {
  email: string
  password: string
  name: string
  role: "admin" | "manager" | "member"
}

const DEMO_ORG_CODE = "MSD-9999"
const DEMO_ORG_NAME = "MemoSphere Demo"

const demoAccounts: DemoAccount[] = [
  {
    email: "admin@memodemo.com",
    password: "demo123",
    name: "Demo Admin",
    role: "admin",
  },
  {
    email: "manager@memodemo.com",
    password: "demo123",
    name: "Demo Manager",
    role: "manager",
  },
  {
    email: "member@memodemo.com",
    password: "demo123",
    name: "Demo Member",
    role: "member",
  },
]

export async function setupDemoAccounts() {
  console.log("🚀 Setting up demo accounts...")

  try {
    // Step 1: Create demo organization with fixed org code
    console.log("📦 Creating demo organization...")
    
    // Create the first admin account
    const adminCredential = await createUserWithEmailAndPassword(
      auth,
      demoAccounts[0].email,
      demoAccounts[0].password
    )
    
    await updateProfile(adminCredential.user, {
      displayName: demoAccounts[0].name,
    })

    // Manually create org with specific code
    const orgRef = doc(db, "organizations", "demo-org-id")
    await setDoc(orgRef, {
      id: "demo-org-id",
      name: DEMO_ORG_NAME,
      orgCode: DEMO_ORG_CODE,
      createdBy: adminCredential.user.uid,
      createdAt: new Date(),
      status: "active",
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
    })

    console.log("✅ Demo organization created:", DEMO_ORG_CODE)

    // Add admin as member
    await addOrganizationMember("demo-org-id", {
      userId: adminCredential.user.uid,
      email: demoAccounts[0].email,
      name: demoAccounts[0].name,
      role: "admin",
      status: "active",
    })

    console.log("✅ Admin account created")

    // Step 2: Create other demo accounts
    for (let i = 1; i < demoAccounts.length; i++) {
      const account = demoAccounts[i]
      console.log(`👤 Creating ${account.role} account...`)

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        account.email,
        account.password
      )

      await updateProfile(userCredential.user, {
        displayName: account.name,
      })

      await addOrganizationMember("demo-org-id", {
        userId: userCredential.user.uid,
        email: account.email,
        name: account.name,
        role: account.role,
        status: "active",
      })

      console.log(`✅ ${account.role} account created`)
    }

    console.log("\n🎉 Demo accounts setup complete!")
    console.log("\n📋 Login Credentials:")
    console.log("─────────────────────────────")
    demoAccounts.forEach((account) => {
      console.log(`${account.role.toUpperCase()}:`)
      console.log(`  Email: ${account.email}`)
      console.log(`  Password: ${account.password}`)
      console.log("")
    })
    console.log(`Organization Code: ${DEMO_ORG_CODE}`)

    return {
      success: true,
      orgCode: DEMO_ORG_CODE,
      accounts: demoAccounts,
    }
  } catch (error: any) {
    console.error("❌ Error setting up demo accounts:", error.message)
    
    // If accounts already exist, that's okay
    if (error.code === "auth/email-already-in-use") {
      console.log("\n✅ Demo accounts already exist!")
      console.log(`Organization Code: ${DEMO_ORG_CODE}`)
      return {
        success: true,
        orgCode: DEMO_ORG_CODE,
        accounts: demoAccounts,
      }
    }

    throw error
  }
}

// Export demo credentials for easy access
export const DEMO_CREDENTIALS = {
  orgCode: DEMO_ORG_CODE,
  admin: {
    email: "admin@memodemo.com",
    password: "demo123",
  },
  manager: {
    email: "manager@memodemo.com",
    password: "demo123",
  },
  member: {
    email: "member@memodemo.com",
    password: "demo123",
  },
}
