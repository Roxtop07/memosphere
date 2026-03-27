import { NextRequest, NextResponse } from "next/server"

// Mock database - replace with actual database later
const meetings: any[] = [
  {
    id: "meeting_1",
    title: "Q4 Planning Meeting",
    description: "Quarterly planning session to discuss goals, budgets, and strategies for Q4",
    agenda: "1. Review Q3 performance\n2. Set Q4 objectives\n3. Budget allocation\n4. Action items",
    scheduledDate: "2024-12-15T10:00:00Z",
    startTime: "2024-12-15T10:00:00Z",
    endTime: "2024-12-15T11:30:00Z",
    status: "scheduled",
    userId: "user_1",
    organizationId: "org_1",
    participants: ["Alice Johnson", "Bob Smith", "Carol Davis"],
    tags: ["planning", "quarterly", "strategy"],
    createdAt: "2024-11-01T08:00:00Z",
    updatedAt: "2024-11-01T08:00:00Z",
  },
  {
    id: "meeting_2",
    title: "Weekly Team Standup",
    description: "Regular weekly standup to sync on progress, blockers, and upcoming tasks",
    agenda: "1. What did you do last week?\n2. What will you do this week?\n3. Any blockers?",
    scheduledDate: "2024-12-10T09:00:00Z",
    startTime: "2024-12-10T09:00:00Z",
    endTime: "2024-12-10T09:30:00Z",
    status: "scheduled",
    userId: "user_1",
    organizationId: "org_1",
    participants: ["Alice Johnson", "David Lee", "Emma Wilson"],
    tags: ["standup", "weekly", "sync"],
    createdAt: "2024-11-02T08:00:00Z",
    updatedAt: "2024-11-02T08:00:00Z",
  },
  {
    id: "meeting_3",
    title: "Product Roadmap Review",
    description: "Review and discuss the product roadmap for the next 6 months",
    agenda: "1. Current product status\n2. Feature prioritization\n3. Timeline and milestones\n4. Resource allocation",
    scheduledDate: "2024-12-18T14:00:00Z",
    startTime: "2024-12-18T14:00:00Z",
    endTime: "2024-12-18T16:00:00Z",
    status: "scheduled",
    userId: "user_2",
    organizationId: "org_1",
    participants: ["Alice Johnson", "Bob Smith", "Frank Zhang", "Grace Kim"],
    tags: ["product", "roadmap", "planning"],
    createdAt: "2024-11-03T10:00:00Z",
    updatedAt: "2024-11-03T10:00:00Z",
  },
  {
    id: "meeting_4",
    title: "Customer Feedback Session",
    description: "Discussion about recent customer feedback and potential improvements",
    agenda: "1. Review customer surveys\n2. Analyze support tickets\n3. Identify pain points\n4. Brainstorm solutions",
    scheduledDate: "2024-11-20T11:00:00Z",
    startTime: "2024-11-20T11:00:00Z",
    endTime: "2024-11-20T12:00:00Z",
    status: "completed",
    userId: "user_2",
    organizationId: "org_1",
    participants: ["Carol Davis", "Emma Wilson", "Henry Brown"],
    tags: ["customer", "feedback", "improvement"],
    createdAt: "2024-10-15T08:00:00Z",
    updatedAt: "2024-11-20T12:00:00Z",
  },
  {
    id: "meeting_5",
    title: "Sprint Retrospective",
    description: "Team retrospective to reflect on the last sprint and identify improvements",
    agenda: "1. What went well?\n2. What could be improved?\n3. Action items for next sprint",
    scheduledDate: "2024-11-25T15:00:00Z",
    startTime: "2024-11-25T15:00:00Z",
    endTime: "2024-11-25T16:00:00Z",
    status: "completed",
    userId: "user_1",
    organizationId: "org_1",
    participants: ["Alice Johnson", "Bob Smith", "David Lee", "Emma Wilson"],
    tags: ["agile", "retrospective", "sprint"],
    createdAt: "2024-10-20T08:00:00Z",
    updatedAt: "2024-11-25T16:00:00Z",
  },
]

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    const meeting = {
      id: `meeting_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    meetings.push(meeting)

    console.log("[meetings] Created meeting:", meeting.id)

    return NextResponse.json({
      success: true,
      meetingId: meeting.id,
      meeting,
    })
  } catch (error: any) {
    console.error("[meetings] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create meeting" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const organizationId = searchParams.get("organizationId")
    const seriesId = searchParams.get("seriesId")

    let filtered = meetings

    // CRITICAL: Filter by user permissions
    // Users should only see meetings they created OR meetings they're invited to
    if (userId) {
      filtered = filtered.filter((m) => 
        m.userId === userId || // Created by user
        (m.participants && m.participants.some((p: string) => p.toLowerCase().includes(userId.toLowerCase()))) // Invited to meeting
      )
    }

    if (organizationId) {
      filtered = filtered.filter((m) => m.organizationId === organizationId)
    }

    if (seriesId) {
      filtered = filtered.filter((m) => m.seriesId === seriesId)
    }

    return NextResponse.json({
      success: true,
      meetings: filtered,
      count: filtered.length,
    })
  } catch (error: any) {
    console.error("[meetings] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch meetings" },
      { status: 500 }
    )
  }
}
