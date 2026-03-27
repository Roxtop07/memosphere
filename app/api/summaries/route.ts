import { NextRequest, NextResponse } from "next/server"

// Mock database - replace with actual database
const summaries: any[] = []

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    const summary = {
      id: `summary_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    summaries.push(summary)

    console.log("[summaries] Created summary:", summary.id)

    return NextResponse.json({
      success: true,
      summaryId: summary.id,
      summary,
    })
  } catch (error: any) {
    console.error("[summaries] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save summary" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const organizationId = searchParams.get("organizationId")
    const type = searchParams.get("type")

    let filtered = summaries

    if (userId) {
      filtered = filtered.filter((s) => s.userId === userId)
    }

    if (organizationId) {
      filtered = filtered.filter((s) => s.organizationId === organizationId)
    }

    if (type) {
      filtered = filtered.filter((s) => s.type === type)
    }

    return NextResponse.json({
      success: true,
      summaries: filtered,
      count: filtered.length,
    })
  } catch (error: any) {
    console.error("[summaries] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch summaries" },
      { status: 500 }
    )
  }
}
