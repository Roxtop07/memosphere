import { NextRequest, NextResponse } from "next/server"

// Mock database - replace with actual database later
const events: any[] = [
  {
    id: "event_1",
    title: "Company All-Hands Meeting",
    description: "Quarterly all-hands meeting to share company updates, celebrate wins, and align on vision",
    date: "2024-12-20T13:00:00Z",
    startTime: "2024-12-20T13:00:00Z",
    endTime: "2024-12-20T14:30:00Z",
    location: "Main Conference Room / Zoom",
    status: "scheduled",
    type: "company-wide",
    userId: "user_1",
    organizationId: "org_1",
    attendees: ["All Employees"],
    tags: ["all-hands", "quarterly", "company"],
    createdAt: "2024-11-01T08:00:00Z",
    updatedAt: "2024-11-01T08:00:00Z",
  },
  {
    id: "event_2",
    title: "Holiday Party 2024",
    description: "Annual company holiday celebration with food, drinks, and team activities",
    date: "2024-12-22T18:00:00Z",
    startTime: "2024-12-22T18:00:00Z",
    endTime: "2024-12-22T22:00:00Z",
    location: "Downtown Event Center",
    status: "scheduled",
    type: "social",
    userId: "user_2",
    organizationId: "org_1",
    attendees: ["All Employees", "Plus Ones Welcome"],
    tags: ["holiday", "party", "social"],
    createdAt: "2024-10-15T08:00:00Z",
    updatedAt: "2024-10-15T08:00:00Z",
  },
  {
    id: "event_3",
    title: "Product Launch Webinar",
    description: "Public webinar to announce and demonstrate our new product features",
    date: "2024-12-12T15:00:00Z",
    startTime: "2024-12-12T15:00:00Z",
    endTime: "2024-12-12T16:00:00Z",
    location: "Virtual (Zoom Webinar)",
    status: "scheduled",
    type: "webinar",
    userId: "user_2",
    organizationId: "org_1",
    attendees: ["Public", "Customers", "Prospects"],
    tags: ["product", "launch", "webinar"],
    createdAt: "2024-11-05T10:00:00Z",
    updatedAt: "2024-11-05T10:00:00Z",
  },
  {
    id: "event_4",
    title: "Training: New Software Tools",
    description: "Hands-on training session for the new project management and collaboration tools",
    date: "2024-11-28T10:00:00Z",
    startTime: "2024-11-28T10:00:00Z",
    endTime: "2024-11-28T12:00:00Z",
    location: "Training Room B",
    status: "completed",
    type: "training",
    userId: "user_3",
    organizationId: "org_1",
    attendees: ["Engineering Team", "Product Team"],
    tags: ["training", "software", "tools"],
    createdAt: "2024-10-20T08:00:00Z",
    updatedAt: "2024-11-28T12:00:00Z",
  },
]

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    const event = {
      id: `event_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    events.push(event)

    console.log("[events] Created event:", event.id)

    return NextResponse.json({
      success: true,
      eventId: event.id,
      event,
    })
  } catch (error: any) {
    console.error("[events] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create event" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const organizationId = searchParams.get("organizationId")
    const status = searchParams.get("status")

    let filtered = events

    // CRITICAL: Filter by user permissions
    // Users should only see events they created OR public/company-wide events OR events they're invited to
    if (userId) {
      filtered = filtered.filter((e) => 
        e.userId === userId || // Created by user
        e.type === "company-wide" || // Public events
        e.type === "webinar" || // Public webinars
        (e.attendees && e.attendees.some((a: string) => a.toLowerCase().includes(userId.toLowerCase()))) // Invited to event
      )
    }

    if (organizationId) {
      filtered = filtered.filter((e) => e.organizationId === organizationId)
    }

    if (status) {
      filtered = filtered.filter((e) => e.status === status)
    }

    return NextResponse.json({
      success: true,
      events: filtered,
      count: filtered.length,
    })
  } catch (error: any) {
    console.error("[events] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    )
  }
}
