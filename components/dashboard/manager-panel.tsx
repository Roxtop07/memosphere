"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Briefcase, 
  Users, 
  Calendar, 
  FileText, 
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Activity,
  Target
} from "lucide-react"
import { toast } from "sonner"

interface ManagerPanelProps {
  user: {
    id?: string
    name: string
    email: string
    role: "admin" | "manager" | "viewer"
    orgId?: string
    orgName?: string
  }
}

export default function ManagerPanel({ user }: ManagerPanelProps) {
  const [stats, setStats] = useState({
    teamMembers: 0,
    activeMeetings: 0,
    completedTasks: 0,
    pendingApprovals: 0,
    thisWeekMeetings: 0,
    monthlyProgress: 75,
  })

  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    loadManagerData()
  }, [user.orgId])

  const loadManagerData = () => {
    // Load organization data
    if (user.orgId) {
      const orgData = localStorage.getItem(`org-${user.orgId}`)
      if (orgData) {
        try {
          const org = JSON.parse(orgData)
          const viewers = org.members?.filter((m: any) => m.role === "viewer") || []
          setTeamMembers(viewers)
          
          setStats({
            teamMembers: viewers.length,
            activeMeetings: 3,
            completedTasks: 12,
            pendingApprovals: 2,
            thisWeekMeetings: 5,
            monthlyProgress: 75,
          })
        } catch (e) {
          console.error("Error loading manager data:", e)
        }
      }
    }

    // Mock recent activity
    setRecentActivity([
      {
        id: 1,
        type: "meeting",
        title: "Team meeting scheduled",
        time: "2 hours ago",
        icon: Calendar,
      },
      {
        id: 2,
        type: "approval",
        title: "Policy review pending",
        time: "5 hours ago",
        icon: FileText,
      },
      {
        id: 3,
        type: "task",
        title: "Project milestone completed",
        time: "1 day ago",
        icon: CheckCircle2,
      },
    ])
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-primary" />
            Manager Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your team and oversee operations
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <BarChart3 className="w-4 h-4 mr-2" />
          Manager
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.teamMembers}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{stats.activeMeetings}</p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Active Meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-600 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.completedTasks}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Completed Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-600 rounded-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{stats.pendingApprovals}</p>
                <p className="text-sm text-orange-600 dark:text-orange-400">Pending Approvals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Monthly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overall Performance</span>
                <span className="text-2xl font-bold text-primary">{stats.monthlyProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all"
                  style={{ width: `${stats.monthlyProgress}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold text-primary">{stats.thisWeekMeetings}</p>
                  <p className="text-xs text-muted-foreground">Meetings This Week</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.completedTasks}</p>
                  <p className="text-xs text-muted-foreground">Tasks Completed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => {
                const Icon = activity.icon
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Your Team ({teamMembers.length} members)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {member.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                  <Badge variant="outline" className="mt-1">
                    {member.role}
                  </Badge>
                </div>
              </div>
            ))}
            {teamMembers.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">
                No team members assigned yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <Calendar className="w-6 h-6 text-primary" />
              <span>Schedule Meeting</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <FileText className="w-6 h-6 text-primary" />
              <span>Create Policy</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              <span>Approve Requests</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
