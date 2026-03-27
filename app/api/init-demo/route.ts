import { NextResponse } from "next/server"
import { initializeDemoData } from "@/lib/init-demo-data"

export async function POST() {
  try {
    const result = await initializeDemoData()
    
    return NextResponse.json({
      success: true,
      message: "Demo data initialized in Firestore",
      data: result,
    })
  } catch (error: any) {
    console.error("Init error:", error)
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to initialize demo data",
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Demo Data Initialization Endpoint",
    instructions: "POST to this endpoint to initialize demo organization in Firestore",
    note: "You still need to create Firebase Auth accounts manually via signup",
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
