"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit2, Trash2, Clock, MapPin, Users, Video, ExternalLink } from "lucide-react"

interface Meeting {
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

interface MeetingDetailProps {
  meeting: Meeting
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}

export default function MeetingDetail({ meeting, onClose, onEdit, onDelete, canEdit }: MeetingDetailProps) {
  const isGoogleMeetLink = meeting.location?.startsWith("https://meet.google.com/")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-2xl font-bold">{meeting.title}</h2>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive bg-transparent"
              onClick={() => {
                if (confirm("Are you sure you want to delete this meeting?")) {
                  onDelete()
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Google Meet Join Button - Prominent */}
      {isGoogleMeetLink && (
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-lg">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Google Meet Conference</p>
                  <p className="text-sm text-white/80">Join the video call</p>
                </div>
              </div>
              <Button
                onClick={() => window.open(meeting.location, "_blank")}
                className="bg-white text-blue-600 hover:bg-white/90"
                size="lg"
              >
                <Video className="w-5 h-5 mr-2" />
                Join Meeting
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Meeting Details</CardTitle>
              <Badge
                variant={
                  meeting.status === "completed" ? "default" : meeting.status === "upcoming" ? "secondary" : "outline"
                }
              >
                {meeting.status === "completed"
                  ? "Completed"
                  : meeting.status === "upcoming"
                    ? "Upcoming"
                    : "Scheduled"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {meeting.time && (
              <div className="flex items-start gap-4">
                <Clock className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{meeting.time}</p>
                </div>
              </div>
            )}
            {meeting.location && (
              <div className="flex items-start gap-4">
                {isGoogleMeetLink ? (
                  <Video className="w-5 h-5 text-blue-600 mt-0.5" />
                ) : (
                  <MapPin className="w-5 h-5 text-accent mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {isGoogleMeetLink ? "Video Conference" : "Location"}
                  </p>
                  {isGoogleMeetLink ? (
                    <a
                      href={meeting.location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {meeting.location}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <p className="font-medium">{meeting.location}</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-start gap-4">
              <Users className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Attendees</p>
                <p className="font-medium">{meeting.attendees} people</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {meeting.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{meeting.description}</p>
            </CardContent>
          </Card>
        )}

        {meeting.agenda && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Agenda</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{meeting.agenda}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
