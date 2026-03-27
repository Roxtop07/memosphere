"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Eye, 
  Calendar, 
  FileText, 
  Clock,
  CheckCircle2,
  BookOpen,
  Bell,
  TrendingUp,
  Users,
  Activity
} from "lucide-react"

interface ViewerPanelProps {
  user: {
    id?: string
    name: string
    email: string
    role: "admin" | "manager" | "viewer"
    orgId?: string
    orgName?: string
  }
}

export default function ViewerPanel({ user }: ViewerPanelProps) {
  const [stats, setStats] = useState({
    upcomingMeetings: 0,
    unreadNotifications: 0,
    availablePolicies: 0,
    attendedMeetings: 0,
  })

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [recentUpdates, setRecentUpdates] = useState<any[]>([])

  useEffect(() => {
    loadViewerData()
  }, [user.id])

  const loadViewerData = () => {
    // Mock data for viewer
    setStats({
      upcomingMeetings: 2,
      unreadNotifications: 5,
      availablePolicies: 8,
      attendedMeetings: 15,
    })

    setUpcomingEvents([
      {
        id: 1,
        title: "Team Standup Meeting",
        date: "2025-11-09",
        time: "10:00 AM",
        type: "meeting",
        icon: Calendar,
      },
      {
        id: 2,
        title: "Project Review",
        date: "2025-11-10",
        time: "2:00 PM",
        type: "meeting",
        icon: Calendar,
      },
    ])

    setRecentUpdates([
      {
        id: 1,
        title: "New security policy published",
        description: "Review the updated data protection guidelines",
        time: "2 hours ago",
        icon: FileText,
        type: "policy",
      },
      {
        id: 2,
        title: "Meeting notes available",
        description: "Q4 Planning Session notes have been uploaded",
        time: "5 hours ago",
        icon: BookOpen,
        type: "notes",
      },
      {
        id: 3,
        title: "System maintenance scheduled",
        description: "Platform will be unavailable on Nov 15, 2:00 AM",
        time: "1 day ago",
        icon: Bell,
        type: "notification",
      },
    ])
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Eye className="w-8 h-8 text-primary" />
            Welcome, {user.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            View meetings, policies, and stay updated
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Eye className="w-4 h-4 mr-2" />
          Viewer
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.upcomingMeetings}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Upcoming Meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600 rounded-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{stats.unreadNotifications}</p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.availablePolicies}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Available Policies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-600 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{stats.attendedMeetings}</p>
                <p className="text-sm text-orange-600 dark:text-orange-400">Attended Meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingEvents.map((event) => {
                const Icon = event.icon
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{event.title}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-muted-foreground">{event.date}</p>
                        <p className="text-sm text-muted-foreground">{event.time}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                )
              })}
              {upcomingEvents.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No upcoming events
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Updates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUpdates.map((update) => {
                const Icon = update.icon
                return (
                  <div
                    key={update.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{update.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{update.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">{update.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Quick Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-blue-50 dark:hover:bg-blue-950">
              <Calendar className="w-6 h-6 text-blue-600" />
              <span>View Meetings</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-green-50 dark:hover:bg-green-950">
              <FileText className="w-6 h-6 text-green-600" />
              <span>Browse Policies</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2 hover:bg-purple-50 dark:hover:bg-purple-950">
              <Bell className="w-6 h-6 text-purple-600" />
              <span>Notifications</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organization Info */}
      <Card className="bg-gradient-to-br from-muted/30 to-muted/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Organization Name:</span>
              <span className="font-semibold">{user.orgName || "Not assigned"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Your Role:</span>
              <Badge variant="outline">Viewer</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Account Email:</span>
              <span className="text-sm">{user.email}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
