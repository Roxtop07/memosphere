"use client"

import OverviewTab from "@/components/tabs/overview-tab"
import MeetingsTab from "@/components/tabs/meetings-tab"
import EventsTab from "@/components/tabs/events-tab"
import PoliciesTab from "@/components/tabs/policies-tab"
import AuditTrailViewer from "@/components/audit/audit-trail-viewer"
import Settings from "@/components/settings/settings"
import AdminPanel from "@/components/dashboard/admin-panel"
import ManagerPanel from "@/components/dashboard/manager-panel"
import ViewerPanel from "@/components/dashboard/viewer-panel"

interface DashboardContentProps {
  activeTab: "overview" | "meetings" | "events" | "policies" | "audit" | "settings" | "admin" | "manage" | "home"
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

export default function DashboardContent({ activeTab, user }: DashboardContentProps) {
  return (
    <div className="space-y-6">
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "meetings" && <MeetingsTab user={user} />}
      {activeTab === "events" && <EventsTab user={user} />}
      {activeTab === "policies" && <PoliciesTab user={user} />}
      {activeTab === "audit" && <AuditTrailViewer />}
      {activeTab === "settings" && <Settings user={user} />}
      {activeTab === "admin" && user.role === "admin" && <AdminPanel user={user} />}
      {activeTab === "manage" && user.role === "manager" && <ManagerPanel user={user} />}
      {activeTab === "home" && user.role === "viewer" && <ViewerPanel user={user} />}
    </div>
  )
}
