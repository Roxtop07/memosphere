// Client-side utility for policy encryption status
// All actual encryption/decryption happens server-side through API routes

// Check if a policy should be encrypted based on its category
export function shouldEncryptPolicy(category: string): boolean {
  const sensitiveCategories = ["Compliance", "Finance", "Governance", "IT"]
  return sensitiveCategories.includes(category)
}

// Type definition for encrypted data (used when fetching from server)
export interface EncryptedData {
  iv: string
  encryptedData: string
  algorithm: string
}
