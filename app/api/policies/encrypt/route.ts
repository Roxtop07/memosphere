// API route for encrypting policy content - SERVER ONLY
import { encryptPolicyContent } from "@/lib/encryption-server"

export async function POST(request: Request) {
  try {
    const { content, policyId } = await request.json()

    if (!content || !policyId) {
      return Response.json({ error: "Missing content or policyId" }, { status: 400 })
    }

    const encrypted = encryptPolicyContent(content, policyId)
    return Response.json({ encrypted })
  } catch (error) {
    console.error("[Memosphere] Encryption API error:", error)
    return Response.json({ error: "Encryption failed" }, { status: 500 })
  }
}
