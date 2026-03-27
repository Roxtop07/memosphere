"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Calendar, Video } from "lucide-react"
import GoogleMeetIntegration from "@/components/meetings/google-meet-integration"

interface MeetingFormData {
  title: string
  date?: string
  scheduledDate?: string
  time?: string
  startTime?: string
  endTime?: string
  location?: string
  attendees?: number
  participants?: string[]
  status: "upcoming" | "completed" | "scheduled"
  description?: string
  agenda?: string
  tags?: string[]
  meetLink?: string
}

interface MeetingFormProps {
  meeting?: {
    id: string | number
    title: string
    date?: string
    scheduledDate?: string
    startTime?: string
    endTime?: string
    attendees?: number
    participants?: string[]
    status: "upcoming" | "completed" | "scheduled"
    agenda?: string
    actions?: string
    description?: string
    location?: string
    time?: string
    userId?: string
    organizationId?: string
    tags?: string[]
  }
  onSubmit: (data: any) => void
  onCancel: () => void
}

export default function MeetingForm({ meeting, onSubmit, onCancel }: MeetingFormProps) {
  const [formData, setFormData] = useState<MeetingFormData>({
    title: meeting?.title || "",
    date: meeting?.scheduledDate ? new Date(meeting.scheduledDate).toISOString().split('T')[0] : "",
    time: meeting?.startTime ? new Date(meeting.startTime).toTimeString().slice(0, 5) : "",
    location: meeting?.location || "",
    attendees: meeting?.participants?.length || meeting?.attendees || 0,
    status: meeting?.status || "scheduled",
    description: meeting?.description || "",
    agenda: meeting?.agenda || "",
    meetLink: meeting?.location?.startsWith("https://meet.google.com/") ? meeting.location : "",
  })

  const handleMeetLinkGenerated = (meetLink: string) => {
    setFormData((prev) => ({
      ...prev,
      location: meetLink,
      meetLink: meetLink,
    }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "attendees" ? Number.parseInt(value) : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{meeting ? "Edit Meeting" : "Schedule New Meeting"}</h2>
            <p className="text-sm text-muted-foreground">Fill in the details to schedule a meeting</p>
          </div>
        </div>
        {!meeting && (
          <Button 
            type="button" 
            variant="outline"
            onClick={() => {
              const tomorrow = new Date()
              tomorrow.setDate(tomorrow.getDate() + 1)
              setFormData({
                title: "Team Sync Meeting",
                date: tomorrow.toISOString().split('T')[0],
                time: "10:00",
                location: "Conference Room A",
                attendees: 5,
                status: "scheduled",
                description: "Weekly team synchronization meeting to discuss progress and blockers.",
                agenda: "1. Project updates\n2. Blockers discussion\n3. Next week's planning\n4. Q&A",
              })
            }}
          >
            Load Demo Data
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Meeting Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-1">
                  Meeting Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Q2 Planning Session"
                  required
                  className="font-medium"
                />
                <p className="text-xs text-muted-foreground">Give your meeting a clear, descriptive title</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Conference Room A or Zoom Link"
                />
                <p className="text-xs text-muted-foreground">Physical location or virtual meeting link</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-1">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input id="date" name="date" type="date" value={formData.date} onChange={handleChange} required />
                <p className="text-xs text-muted-foreground">Select the meeting date</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Start Time</Label>
                <Input id="time" name="time" type="time" value={formData.time} onChange={handleChange} />
                <p className="text-xs text-muted-foreground">Meeting start time</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendees" className="flex items-center gap-1">
                  Expected Attendees <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="attendees"
                  name="attendees"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.attendees}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-muted-foreground">Number of people expected</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Meeting Status</Label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Meeting description and purpose..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agenda">Agenda</Label>
              <Textarea
                id="agenda"
                name="agenda"
                value={formData.agenda}
                onChange={handleChange}
                placeholder="Key agenda items (one per line)..."
                rows={3}
              />
            </div>

            {/* Google Meet Integration */}
            <div className="space-y-2 p-4 border-2 border-dashed rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
              <div className="flex items-center gap-2 mb-3">
                <Video className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Video Conference</Label>
              </div>
              <GoogleMeetIntegration
                meetingTitle={formData.title}
                meetingDate={formData.date || ""}
                meetingTime={formData.time || ""}
                meetingDescription={formData.description}
                onMeetLinkGenerated={handleMeetLinkGenerated}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {meeting ? "Update Meeting" : "Create Meeting"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
