// SERVER-ONLY encryption utilities - DO NOT USE IN CLIENT COMPONENTS
// This file is for server actions and API routes only
import crypto from "crypto"

export interface EncryptedData {
  iv: string
  encryptedData: string
  algorithm: string
}

// Create a deterministic key from the policy ID for consistent encryption/decryption
function generateEncryptionKey(policyId: number): Buffer {
  const SECRET = process.env.ENCRYPTION_SECRET || "memosphere-server-secret-2025"
  const combined = `${SECRET}-${policyId}`
  return crypto.createHash("sha256").update(combined).digest()
}

// Encrypt sensitive policy content - SERVER ONLY
export function encryptPolicyContent(content: string, policyId: number): EncryptedData {
  try {
    const key = generateEncryptionKey(policyId)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)

    let encrypted = cipher.update(content, "utf-8", "hex")
    encrypted += cipher.final("hex")

    return {
      iv: iv.toString("hex"),
      encryptedData: encrypted,
      algorithm: "aes-256-cbc",
    }
  } catch (error) {
    console.error("[Memosphere] Encryption failed:", error)
    throw new Error("Failed to encrypt policy content")
  }
}

// Decrypt sensitive policy content - SERVER ONLY
export function decryptPolicyContent(encryptedData: EncryptedData, policyId: number): string {
  try {
    const key = generateEncryptionKey(policyId)
    const iv = Buffer.from(encryptedData.iv, "hex")
    const decipher = crypto.createDecipheriv(encryptedData.algorithm, key, iv)

    let decrypted = decipher.update(encryptedData.encryptedData, "hex", "utf-8")
    decrypted += decipher.final("utf-8")

    return decrypted
  } catch (error) {
    console.error("[Memosphere] Decryption failed:", error)
    throw new Error("Failed to decrypt policy content")
  }
}
