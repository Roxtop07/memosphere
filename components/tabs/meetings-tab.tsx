"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Clock, Users, CheckCircle2, Edit2, Trash2, Loader2, Calendar, TrendingUp, Video } from "lucide-react"
import MeetingForm from "@/components/meetings/meeting-form"
import MeetingDetail from "@/components/meetings/meeting-detail"
import { containerVariants, itemVariants, cardHoverVariants } from "@/lib/animations"
import { auditLogger } from "@/lib/audit-logger"
import { toast } from "sonner"

interface Meeting {
  id: string
  title: string
  description?: string
  scheduledDate?: string
  startTime?: string
  endTime?: string
  status: "upcoming" | "completed" | "scheduled"
  userId?: string
  organizationId?: string
  participants?: string[]
  tags?: string[]
  agenda?: string
  location?: string
  date?: string
  attendees?: number
  time?: string
}

interface MeetingsTabProps {
  user: { id?: string; name: string; email: string; role: "admin" | "manager" | "viewer"; orgId?: string }
}

export default function MeetingsTab({ user }: MeetingsTabProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)

  // Fetch meetings from API
  useEffect(() => {
    fetchMeetings()
  }, [])

  const fetchMeetings = async () => {
    try {
      setIsLoading(true)
      const userId = user.id || user.email
      const orgId = user.orgId || "org_1"
      
      const response = await fetch(`/api/meetings?userId=${userId}&organizationId=${orgId}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch meetings")
      }
      
      const data = await response.json()
      
      if (data.success && data.meetings) {
        setMeetings(data.meetings)
      }
    } catch (error) {
      console.error("[MeetingsTab] Error fetching meetings:", error)
      toast.error("Failed to load meetings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMeeting = async (formData: any) => {
    try {
      const userId = user.id || user.email
      const orgId = user.orgId || "org_1"
      
      const meetingData = {
        ...formData,
        userId,
        organizationId: orgId,
        participants: formData.participants || [],
        tags: formData.tags || []
      }

      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meetingData)
      })

      if (!response.ok) {
        throw new Error("Failed to create meeting")
      }

      const data = await response.json()
      
      if (data.success) {
        // Log audit trail
        auditLogger.log(
          user.id || user.email,
          user.name,
          "create_meeting",
          "meeting",
          {
            resourceId: data.meeting.id,
            resourceName: data.meeting.title
          }
        )
        
        toast.success("Meeting created successfully")
        setShowForm(false)
        fetchMeetings() // Refresh list
      }
    } catch (error) {
      console.error("[MeetingsTab] Error creating meeting:", error)
      toast.error("Failed to create meeting")
    }
  }

  const handleUpdateMeeting = async (formData: any) => {
    if (!editingMeeting) return
    
    try {
      const response = await fetch("/api/meetings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          id: editingMeeting.id
        })
      })

      if (!response.ok) {
        throw new Error("Failed to update meeting")
      }

      const data = await response.json()
      
      if (data.success) {
        // Log audit trail
        auditLogger.log(
          user.id || user.email,
          user.name,
          "update_meeting",
          "meeting",
          {
            resourceId: editingMeeting.id,
            resourceName: formData.title
          }
        )
        
        toast.success("Meeting updated successfully")
        setEditingMeeting(null)
        setSelectedMeeting(null)
        fetchMeetings() // Refresh list
      }
    } catch (error) {
      console.error("[MeetingsTab] Error updating meeting:", error)
      toast.error("Failed to update meeting")
    }
  }

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meeting?")) return
    
    try {
      const response = await fetch(`/api/meetings?id=${id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        throw new Error("Failed to delete meeting")
      }

      const data = await response.json()
      
      if (data.success) {
        // Log audit trail
        auditLogger.log(
          user.id || user.email,
          user.name,
          "delete_meeting",
          "meeting",
          {
            resourceId: id
          }
        )
        
        toast.success("Meeting deleted successfully")
        setSelectedMeeting(null)
        fetchMeetings() // Refresh list
      }
    } catch (error) {
      console.error("[MeetingsTab] Error deleting meeting:", error)
      toast.error("Failed to delete meeting")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (selectedMeeting) {
    return (
      <MeetingDetail
        meeting={selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        onEdit={() => {
          setEditingMeeting(selectedMeeting)
          setSelectedMeeting(null)
        }}
        onDelete={() => handleDeleteMeeting(selectedMeeting.id)}
        canEdit={user.role === "admin" || user.role === "manager"}
      />
    )
  }

  if (showForm || editingMeeting) {
    return (
      <MeetingForm
        meeting={editingMeeting || undefined}
        onSubmit={editingMeeting ? handleUpdateMeeting : handleAddMeeting}
        onCancel={() => {
          setShowForm(false)
          setEditingMeeting(null)
        }}
      />
    )
  }

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div className="flex items-center justify-between" variants={itemVariants}>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Meeting Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule, track, and manage all your team meetings
          </p>
        </div>
        {(user.role === "admin" || user.role === "manager") && (
          <div className="flex gap-2">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2 shadow-lg" 
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-5 h-5" />
              Schedule New Meeting
            </Button>
          </div>
        )}
      </motion.div>

      {/* Meeting Stats Dashboard */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{meetings.length}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600 rounded-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                  {meetings.filter((m) => m.status === "scheduled" || m.status === "upcoming").length}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-600 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                  {meetings.filter((m) => m.status === "completed").length}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-600 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                  {meetings.filter((m) => {
                    if (!m.scheduledDate) return false
                    const date = new Date(m.scheduledDate)
                    const now = new Date()
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
                  }).length}
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div className="grid gap-4" variants={containerVariants} initial="hidden" animate="visible">
        {meetings.map((meeting) => (
          <motion.div key={meeting.id} variants={itemVariants}>
            <motion.div initial="rest" whileHover="hover" variants={cardHoverVariants} layoutId={`card-${meeting.id}`}>
              <Card className="border-border/50 hover:shadow-lg transition-all duration-200 hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3 cursor-pointer" onClick={() => setSelectedMeeting(meeting)}>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg hover:text-primary transition-colors">{meeting.title}</h3>
                        <Badge
                          variant={
                            meeting.status === "completed"
                              ? "default"
                              : meeting.status === "upcoming"
                                ? "secondary"
                                : "outline"
                          }
                          className={
                            meeting.status === "completed"
                              ? "bg-green-500 hover:bg-green-600"
                              : meeting.status === "upcoming"
                                ? "bg-blue-500 hover:bg-blue-600"
                                : "border-purple-500 text-purple-700 dark:text-purple-300"
                          }
                        >
                          {meeting.status === "completed"
                            ? "Completed"
                            : meeting.status === "upcoming"
                              ? "Upcoming"
                              : "Scheduled"}
                        </Badge>
                      </div>
                      
                      {meeting.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {meeting.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">
                            {meeting.scheduledDate 
                              ? new Date(meeting.scheduledDate).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })
                              : meeting.date || "TBD"}
                          </span>
                          {meeting.time && <span className="text-blue-600 dark:text-blue-400">at {meeting.time}</span>}
                          {meeting.startTime && <span className="text-blue-600 dark:text-blue-400">at {meeting.startTime}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                          <Users className="w-4 h-4 text-purple-500" />
                          <span className="font-medium">{meeting.participants?.length || meeting.attendees || 0}</span>
                          <span>participants</span>
                        </div>
                        {meeting.location && (
                          <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                            {meeting.location.startsWith("https://meet.google.com/") ? (
                              <>
                                <Video className="w-4 h-4 text-green-500" />
                                <span className="font-medium text-green-600 dark:text-green-400">Google Meet</span>
                              </>
                            ) : (
                              <>
                                <span className="text-orange-500">📍</span>
                                <span className="font-medium">{meeting.location}</span>
                              </>
                            )}
                          </div>
                        )}
                        {meeting.status === "completed" && (
                          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-medium">Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedMeeting(meeting)
                        }}
                      >
                        View
                      </Button>
                      {(user.role === "admin" || user.role === "manager") && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingMeeting(meeting)
                            }}
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm(`Are you sure you want to delete "${meeting.title}"?`)) {
                                handleDeleteMeeting(meeting.id)
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {meetings.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No meetings scheduled</h3>
              <p className="text-muted-foreground mb-6">
                Get started by scheduling your first team meeting
              </p>
              {(user.role === "admin" || user.role === "manager") && (
                <Button 
                  className="bg-primary hover:bg-primary/90 gap-2" 
                  size="lg"
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="w-5 h-5" />
                  Schedule Meeting
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
