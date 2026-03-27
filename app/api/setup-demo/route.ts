import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Import the setup function
    const { setupDemoAccounts } = await import("@/lib/setup-demo-accounts")
    
    const result = await setupDemoAccounts()
    
    return NextResponse.json({
      success: true,
      message: "Demo accounts created successfully",
      data: result,
    })
  } catch (error: any) {
    console.error("Setup error:", error)
    
    if (error.code === "auth/email-already-in-use") {
      return NextResponse.json({
        success: true,
        message: "Demo accounts already exist",
        data: {
          orgCode: "MSD-9999",
          accounts: [
            { email: "admin@memodemo.com", role: "admin" },
            { email: "manager@memodemo.com", role: "manager" },
            { email: "member@memodemo.com", role: "member" },
          ],
        },
      })
    }
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to setup demo accounts",
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Demo Account Setup Endpoint",
    instructions: "POST to this endpoint to create demo accounts",
    credentials: {
      orgCode: "MSD-9999",
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
    },
  })
}
