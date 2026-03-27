"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Shield, 
  Users, 
  Building2, 
  Settings, 
  UserPlus, 
  Trash2, 
  Edit2,
  Key,
  Activity,
  BarChart3,
  Database,
  Lock
} from "lucide-react"
import { toast } from "sonner"
import BackupData from "@/components/backup/backup-data"
import SecuritySettings from "@/components/settings/security-settings"
import AuditTrailViewer from "@/components/audit/audit-trail-viewer"
import InviteDetailsDialog from "@/components/dialogs/invite-details-dialog"
import { sendInviteEmail } from "@/lib/email-service"

interface AdminPanelProps {
  user: {
    id?: string
    name: string
    email: string
    role: "admin" | "manager" | "viewer"
    orgId?: string
    orgCode?: string
    orgName?: string
  }
}

type ViewType = "dashboard" | "backup" | "security" | "audit"

export default function AdminPanel({ user }: AdminPanelProps) {
  const [currentView, setCurrentView] = useState<ViewType>("dashboard")
  const [members, setMembers] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalMembers: 0,
    admins: 0,
    managers: 0,
    viewers: 0,
    totalMeetings: 0,
    totalEvents: 0,
    totalPolicies: 0,
  })
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "manager" | "viewer">("viewer")
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [currentInvite, setCurrentInvite] = useState<any>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [isSendingInvite, setIsSendingInvite] = useState(false)

  useEffect(() => {
    loadOrganizationData()
  }, [user.orgId])

  const loadOrganizationData = () => {
    if (!user.orgId) return

    // Load organization data from localStorage
    const orgData = localStorage.getItem(`org-${user.orgId}`)
    if (orgData) {
      try {
        const org = JSON.parse(orgData)
        setMembers(org.members || [])
        
        // Calculate stats
        const adminCount = org.members?.filter((m: any) => m.role === "admin").length || 0
        const managerCount = org.members?.filter((m: any) => m.role === "manager").length || 0
        const viewerCount = org.members?.filter((m: any) => m.role === "viewer").length || 0
        
        setStats({
          totalMembers: org.members?.length || 0,
          admins: adminCount,
          managers: managerCount,
          viewers: viewerCount,
          totalMeetings: 0, // Will be populated from API
          totalEvents: 0,
          totalPolicies: 0,
        })
      } catch (e) {
        console.error("Error loading organization data:", e)
      }
    }
  }

  const handleInviteMember = async () => {
    if (!newMemberEmail) {
      toast.error("Please enter an email address")
      return
    }

    if (!user.orgId || !user.orgCode) {
      toast.error("Organization information not found")
      return
    }

    setIsSendingInvite(true)

    try {
      // Generate invitation code
      const inviteCode = `INV-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      
      // Store invitation
      const invitation = {
        code: inviteCode,
        email: newMemberEmail,
        role: newMemberRole,
        orgId: user.orgId,
        orgCode: user.orgCode,
        orgName: user.orgName || "Organization",
        invitedBy: user.email,
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      }

      localStorage.setItem(`invite-${inviteCode}`, JSON.stringify(invitation))

      // Try to send email
      const emailSuccess = await sendInviteEmail({
        toEmail: newMemberEmail,
        toName: newMemberEmail.split('@')[0],
        inviteCode: inviteCode,
        orgName: user.orgName || "Organization",
        orgCode: user.orgCode,
        role: newMemberRole,
        invitedBy: user.email,
        expiresAt: invitation.expiresAt,
      })

      setEmailSent(emailSuccess)
      setCurrentInvite(invitation)
      setShowInviteDialog(true)

      if (emailSuccess) {
        toast.success(`Invitation email sent to ${newMemberEmail}!`, {
          description: "The invitee will receive an email with the invite code.",
        })
      } else {
        toast.warning("Email service not configured", {
          description: "Please share the invite code manually with the invitee.",
        })
      }

      setNewMemberEmail("")
      setNewMemberRole("viewer")
    } catch (error) {
      console.error("Error creating invitation:", error)
      toast.error("Failed to create invitation")
    } finally {
      setIsSendingInvite(false)
    }
  }

  const handleRemoveMember = (memberId: string) => {
    if (!user.orgId) return

    if (!confirm("Are you sure you want to remove this member?")) return

    const orgData = localStorage.getItem(`org-${user.orgId}`)
    if (orgData) {
      try {
        const org = JSON.parse(orgData)
        org.members = org.members.filter((m: any) => m.id !== memberId)
        localStorage.setItem(`org-${user.orgId}`, JSON.stringify(org))
        loadOrganizationData()
        toast.success("Member removed successfully")
      } catch (e) {
        console.error("Error removing member:", e)
        toast.error("Failed to remove member")
      }
    }
  }

  const handleChangeRole = (memberId: string, newRole: "admin" | "manager" | "viewer") => {
    if (!user.orgId) return

    const orgData = localStorage.getItem(`org-${user.orgId}`)
    if (orgData) {
      try {
        const org = JSON.parse(orgData)
        const member = org.members.find((m: any) => m.id === memberId)
        if (member) {
          member.role = newRole
          localStorage.setItem(`org-${user.orgId}`, JSON.stringify(org))
          loadOrganizationData()
          toast.success("Member role updated successfully")
        }
      } catch (e) {
        console.error("Error updating member role:", e)
        toast.error("Failed to update member role")
      }
    }
  }

  // Conditional rendering based on current view
  if (currentView === "backup") {
    return <BackupData user={user} onBack={() => setCurrentView("dashboard")} />
  }

  if (currentView === "security") {
    return <SecuritySettings user={user} onBack={() => setCurrentView("dashboard")} />
  }

  if (currentView === "audit") {
    return <AuditTrailViewer user={user} onBack={() => setCurrentView("dashboard")} />
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Admin Control Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization, members, and settings
          </p>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2">
          <Shield className="w-4 h-4 mr-2" />
          Administrator
        </Badge>
      </div>

      {/* Organization Info */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Organization Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Organization Name</p>
              <p className="text-lg font-semibold">{user.orgName || "Not Set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Organization Code</p>
              <p className="text-lg font-mono font-semibold">{user.orgCode || "Not Set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Organization ID</p>
              <p className="text-sm font-mono">{user.orgId || "Not Set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admin Email</p>
              <p className="text-sm font-semibold">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.totalMembers}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{stats.admins}</p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-600 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.managers}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Managers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-600 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{stats.viewers}</p>
                <p className="text-sm text-orange-600 dark:text-orange-400">Viewers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite New Member */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite New Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="memberEmail">Email Address</Label>
              <Input
                id="memberEmail"
                type="email"
                placeholder="member@example.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberRole">Role</Label>
              <select
                id="memberRole"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <Button 
            onClick={handleInviteMember} 
            className="mt-4" 
            size="lg"
            disabled={isSendingInvite}
          >
            <Key className="w-4 h-4 mr-2" />
            {isSendingInvite ? "Sending Invitation..." : "Generate & Send Invitation"}
          </Button>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Organization Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{member.name}</p>
                    <Badge
                      variant={
                        member.role === "admin"
                          ? "default"
                          : member.role === "manager"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {member.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined: {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {member.id !== user.id && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newRole = prompt(
                            "Enter new role (admin/manager/viewer):",
                            member.role
                          ) as "admin" | "manager" | "viewer"
                          if (newRole && ["admin", "manager", "viewer"].includes(newRole)) {
                            handleChangeRole(member.id, newRole)
                          }
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No members found. Invite members to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950"
              onClick={() => setCurrentView("backup")}
            >
              <Database className="w-6 h-6 text-blue-600" />
              <span>Backup Data</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2 hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950"
              onClick={() => setCurrentView("security")}
            >
              <Lock className="w-6 h-6 text-purple-600" />
              <span>Security Settings</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2 hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-950"
              onClick={() => setCurrentView("audit")}
            >
              <Activity className="w-6 h-6 text-green-600" />
              <span>View Audit Logs</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invitation Details Dialog */}
      {currentInvite && (
        <InviteDetailsDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          inviteData={currentInvite}
          emailSent={emailSent}
        />
      )}
    </div>
  )
}
