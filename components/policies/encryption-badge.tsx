// Badge component to indicate encrypted policies
import { LockKeyhole } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface EncryptionBadgeProps {
  isEncrypted: boolean
  size?: "sm" | "md" | "lg"
}

export function EncryptionBadge({ isEncrypted, size = "sm" }: EncryptionBadgeProps) {
  if (!isEncrypted) return null

  const iconSize = size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5"

  return (
    <Badge
      variant="secondary"
      className="bg-green-100 text-green-800 border-green-300 gap-1"
      title="This policy is encrypted for security"
    >
      <LockKeyhole className={iconSize} />
      {size !== "sm" && <span>Encrypted</span>}
    </Badge>
  )
}
