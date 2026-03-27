import { NextRequest, NextResponse } from "next/server"

// Mock database - replace with actual database later
const policies: any[] = [
  {
    id: "policy_1",
    title: "Remote Work Policy",
    description: "Guidelines and expectations for employees working remotely",
    content: "This policy outlines the company's approach to remote work, including eligibility, equipment provisions, work hours expectations, communication requirements, and security protocols. All remote workers must maintain a dedicated workspace, be available during core hours (9 AM - 3 PM local time), and use company-approved security measures.",
    version: "2.1.0",
    status: "active",
    type: "HR",
    effectiveDate: "2024-01-01T00:00:00Z",
    userId: "user_1",
    organizationId: "org_1",
    tags: ["remote", "work", "HR", "policy"],
    createdAt: "2023-12-01T08:00:00Z",
    updatedAt: "2024-01-01T08:00:00Z",
  },
  {
    id: "policy_2",
    title: "Data Security and Privacy Policy",
    description: "Company standards for protecting sensitive data and customer privacy",
    content: "This policy establishes requirements for handling, storing, and transmitting sensitive data. All employees must use encrypted connections, strong passwords, multi-factor authentication, and follow data classification guidelines. Customer data must never be shared externally without proper authorization.",
    version: "3.0.0",
    status: "active",
    type: "Security",
    effectiveDate: "2024-03-01T00:00:00Z",
    userId: "user_2",
    organizationId: "org_1",
    tags: ["security", "privacy", "data", "compliance"],
    createdAt: "2023-11-15T08:00:00Z",
    updatedAt: "2024-03-01T08:00:00Z",
  },
  {
    id: "policy_3",
    title: "Code of Conduct",
    description: "Expected behavior and ethical standards for all employees",
    content: "All employees are expected to maintain professional conduct, treat colleagues with respect, avoid conflicts of interest, and report any violations of company policies. Harassment, discrimination, and unethical behavior will not be tolerated.",
    version: "1.5.0",
    status: "active",
    type: "HR",
    effectiveDate: "2023-06-01T00:00:00Z",
    userId: "user_1",
    organizationId: "org_1",
    tags: ["conduct", "ethics", "HR", "behavior"],
    createdAt: "2023-05-01T08:00:00Z",
    updatedAt: "2023-06-01T08:00:00Z",
  },
  {
    id: "policy_4",
    title: "Expense Reimbursement Policy",
    description: "Guidelines for submitting and approving business expenses",
    content: "Employees may be reimbursed for reasonable business expenses including travel, meals, and supplies. All expenses must be submitted within 30 days with receipts, and require manager approval. Travel must follow company guidelines for booking and cost limits.",
    version: "1.2.0",
    status: "active",
    type: "Finance",
    effectiveDate: "2024-02-01T00:00:00Z",
    userId: "user_3",
    organizationId: "org_1",
    tags: ["expense", "reimbursement", "finance", "travel"],
    createdAt: "2023-12-10T08:00:00Z",
    updatedAt: "2024-02-01T08:00:00Z",
  },
  {
    id: "policy_5",
    title: "Time Off and Vacation Policy",
    description: "PTO accrual, request process, and usage guidelines",
    content: "Full-time employees accrue 15 days of PTO annually, increasing with tenure. Time off requests should be submitted at least 2 weeks in advance when possible. Unused PTO may roll over up to 5 days per year. Sick leave is separate and available as needed.",
    version: "2.0.0",
    status: "active",
    type: "HR",
    effectiveDate: "2024-01-01T00:00:00Z",
    userId: "user_1",
    organizationId: "org_1",
    tags: ["PTO", "vacation", "time-off", "HR"],
    createdAt: "2023-11-01T08:00:00Z",
    updatedAt: "2024-01-01T08:00:00Z",
  },
  {
    id: "policy_6",
    title: "Software Development Standards",
    description: "Coding standards, review process, and deployment guidelines",
    content: "All code must follow the company style guide, include unit tests with >80% coverage, pass automated linting, and be peer-reviewed before merging. Production deployments require QA approval and must follow the change management process.",
    version: "1.8.0",
    status: "active",
    type: "Engineering",
    effectiveDate: "2024-04-01T00:00:00Z",
    userId: "user_2",
    organizationId: "org_1",
    tags: ["development", "coding", "engineering", "standards"],
    createdAt: "2024-03-01T08:00:00Z",
    updatedAt: "2024-04-01T08:00:00Z",
  },
]

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    const policy = {
      id: `policy_${Date.now()}`,
      ...data,
      version: data.version || "1.0.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    policies.push(policy)

    console.log("[policies] Created policy:", policy.id)

    return NextResponse.json({
      success: true,
      policyId: policy.id,
      policy,
    })
  } catch (error: any) {
    console.error("[policies] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create policy" },
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
    const type = searchParams.get("type")
    const userRole = searchParams.get("userRole") || "viewer"

    let filtered = policies

    // CRITICAL: Filter by user permissions based on role
    // - Admins can see ALL policies
    // - Managers can see active policies in their department  
    // - Viewers can only see active, published policies
    if (userRole === "viewer") {
      filtered = filtered.filter((p) => p.status === "active")
    } else if (userRole === "manager") {
      filtered = filtered.filter((p) => p.status === "active" || p.userId === userId)
    }
    // Admins see everything (no additional filter)

    if (userId && userRole !== "admin") {
      // Filter to show policies created by user or public active policies
      filtered = filtered.filter((p) => 
        p.userId === userId || 
        p.status === "active"
      )
    }

    if (organizationId) {
      filtered = filtered.filter((p) => p.organizationId === organizationId)
    }

    if (status && userRole === "admin") {
      // Only admins can filter by status
      filtered = filtered.filter((p) => p.status === status)
    }

    if (type) {
      filtered = filtered.filter((p) => p.type === type)
    }

    return NextResponse.json({
      success: true,
      policies: filtered,
      count: filtered.length,
    })
  } catch (error: any) {
    console.error("[policies] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch policies" },
      { status: 500 }
    )
  }
}
