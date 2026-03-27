"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import AIGreeting from "@/components/dashboard/ai-greeting"
import { motion } from "framer-motion"
import { containerVariants, itemVariants } from "@/lib/animations"
import { useEffect, useState } from "react"

const meetingData = [
  { month: "Jan", meetings: 12, actions: 45 },
  { month: "Feb", meetings: 19, actions: 52 },
  { month: "Mar", meetings: 25, actions: 68 },
  { month: "Apr", meetings: 22, actions: 71 },
]

const eventData = [
  { month: "Jan", events: 8, attended: 220 },
  { month: "Feb", events: 12, attended: 298 },
  { month: "Mar", events: 10, attended: 350 },
  { month: "Apr", events: 14, attended: 420 },
]

export default function OverviewTab() {
  const [userName, setUserName] = useState("User")
  const [userRole, setUserRole] = useState<"admin" | "manager" | "viewer">("viewer")

  useEffect(() => {
    // Get user info from localStorage
    const userDataStr = localStorage.getItem("user")
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr)
        setUserName(userData.name)
        setUserRole(userData.role)
      } catch (e) {
        console.error("Error parsing user data:", e)
      }
    }
  }, [])

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={containerVariants}>
      <AIGreeting userName={userName} role={userRole} />

      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" variants={itemVariants}>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">78</div>
            <p className="text-xs text-accent mt-1">+12 this month</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">14</div>
            <p className="text-xs text-accent mt-1">Next week: 5 events</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">34</div>
            <p className="text-xs text-accent mt-1">2 pending review</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">156</div>
            <p className="text-xs text-accent mt-1">42 overdue</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Meeting Trends</CardTitle>
            <CardDescription>Meetings and action items per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={meetingData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="month" 
                  className="fill-foreground"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  className="fill-foreground"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    color: 'hsl(var(--popover-foreground))'
                  }}
                />
                <Legend 
                  wrapperStyle={{
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Bar dataKey="meetings" fill="hsl(var(--chart-1))" name="Meetings" radius={[8, 8, 0, 0]} />
                <Bar dataKey="actions" fill="hsl(var(--chart-2))" name="Actions" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Attendance</CardTitle>
            <CardDescription>Events and participation trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={eventData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="month" 
                  className="fill-foreground"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  className="fill-foreground"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    color: 'hsl(var(--popover-foreground))'
                  }}
                />
                <Legend 
                  wrapperStyle={{
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="events" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--chart-1))', r: 6 }}
                  activeDot={{ r: 8 }}
                  name="Events"
                />
                <Line 
                  type="monotone" 
                  dataKey="attended" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--chart-2))', r: 6 }}
                  activeDot={{ r: 8 }}
                  name="Attended"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
