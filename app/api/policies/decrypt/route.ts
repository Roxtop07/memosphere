// API route for decrypting policy content - SERVER ONLY
import { decryptPolicyContent } from "@/lib/encryption-server"

export async function POST(request: Request) {
  try {
    const { encryptedData, policyId } = await request.json()

    if (!encryptedData || !policyId) {
      return Response.json({ error: "Missing encryptedData or policyId" }, { status: 400 })
    }

    const decrypted = decryptPolicyContent(encryptedData, policyId)
    return Response.json({ decrypted })
  } catch (error) {
    console.error("[Memosphere] Decryption API error:", error)
    return Response.json({ error: "Decryption failed" }, { status: 500 })
  }
}
