"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Mail, Check, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface InviteDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inviteData: {
    code: string
    email: string
    role: string
    orgName: string
    orgCode: string
    invitedBy: string
    expiresAt: string
  }
  emailSent: boolean
}

export default function InviteDetailsDialog({ 
  open, 
  onOpenChange, 
  inviteData, 
  emailSent 
}: InviteDetailsDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteData.code)
    setCopied(true)
    toast.success("Invite code copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyFullInvite = () => {
    const inviteText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 You're Invited to Join ${inviteData.orgName}!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hello!

You've been invited to join ${inviteData.orgName} as a ${inviteData.role}.

📋 INVITATION DETAILS:
   • Invitation Code: ${inviteData.code}
   • Organization: ${inviteData.orgName}
   • Organization Code: ${inviteData.orgCode}
   • Your Role: ${inviteData.role}
   • Invited By: ${inviteData.invitedBy}
   • Expires: ${new Date(inviteData.expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}

🚀 TO ACCEPT THIS INVITATION:
   1. Visit the application
   2. Click "Join Organization"
   3. Enter invite code: ${inviteData.code}
   4. Complete your registration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you have any questions, please contact ${inviteData.invitedBy}.
    `.trim()

    navigator.clipboard.writeText(inviteText)
    toast.success("Full invitation details copied!", {
      description: "You can now paste this in any email or messaging app."
    })
  }

  const handleSendManualEmail = () => {
    const subject = encodeURIComponent(`Invitation to join ${inviteData.orgName}`)
    
    // Create email body without line breaks that might cause issues
    const bodyText = `Hello! You've been invited to join ${inviteData.orgName} as a ${inviteData.role}. Invitation Code: ${inviteData.code} | Organization Code: ${inviteData.orgCode} | Expires: ${new Date(inviteData.expiresAt).toLocaleDateString()} | To accept: (1) Visit the application (2) Click "Join Organization" (3) Enter the invitation code. Invited by: ${inviteData.invitedBy}`
    
    const body = encodeURIComponent(bodyText)
    
    const mailtoLink = `mailto:${inviteData.email}?subject=${subject}&body=${body}`
    
    // Try to open with window.location for better compatibility
    try {
      window.location.href = mailtoLink
    } catch (error) {
      // Fallback to window.open
      window.open(mailtoLink, '_blank')
    }
    
    toast.success("Opening email client...", {
      description: "If your email client doesn't open, please copy the invitation details manually."
    })
  }

  const handleSendViaGmail = () => {
    const subject = encodeURIComponent(`Invitation to join ${inviteData.orgName}`)
    
    const bodyText = `Hello!%0D%0A%0D%0AYou've been invited to join ${inviteData.orgName} as a ${inviteData.role}.%0D%0A%0D%0A━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%0D%0A%0D%0A🔑 INVITATION CODE: ${inviteData.code}%0D%0A🏢 ORGANIZATION CODE: ${inviteData.orgCode}%0D%0A👤 ROLE: ${inviteData.role}%0D%0A⏰ EXPIRES: ${new Date(inviteData.expiresAt).toLocaleDateString()}%0D%0A%0D%0A━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%0D%0A%0D%0ATO ACCEPT THIS INVITATION:%0D%0A%0D%0A1. Visit our application%0D%0A2. Click "Join Organization"%0D%0A3. Enter the invitation code: ${inviteData.code}%0D%0A4. Complete your registration%0D%0A%0D%0A━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━%0D%0A%0D%0AInvited by: ${inviteData.invitedBy}%0D%0A%0D%0AIf you have any questions, please contact the person who invited you.`
    
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${inviteData.email}&su=${subject}&body=${bodyText}`
    
    window.open(gmailUrl, '_blank')
    
    toast.success("Opening Gmail compose...", {
      description: "You can now send the invitation via Gmail."
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invitation Created Successfully!
          </DialogTitle>
          <DialogDescription>
            {emailSent ? (
              <span className="text-green-600 font-semibold">
                ✅ Email sent to {inviteData.email}
              </span>
            ) : (
              <span className="text-orange-600 font-semibold">
                ⚠️ Email service not configured. Please share the invite code manually.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invite Code */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-primary rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Invitation Code</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-2xl font-bold font-mono tracking-wider">
                {inviteData.code}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Invitation Details */}
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="text-sm font-semibold">{inviteData.email}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Role:</span>
              <Badge>{inviteData.role}</Badge>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Organization:</span>
              <span className="text-sm font-semibold">{inviteData.orgName}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Org Code:</span>
              <code className="text-sm font-mono">{inviteData.orgCode}</code>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Expires:</span>
              <span className="text-sm">
                {new Date(inviteData.expiresAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {!emailSent && (
              <>
                <Button
                  variant="default"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={handleSendViaGmail}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send via Gmail
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSendManualEmail}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Open Default Email Client
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCopyFullInvite}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Full Invitation Text
                </Button>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-900 dark:text-blue-100 font-semibold mb-2">
              📋 Instructions for the invitee:
            </p>
            <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Visit the application</li>
              <li>Click "Join Organization"</li>
              <li>Enter the invitation code</li>
              <li>Complete registration</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
