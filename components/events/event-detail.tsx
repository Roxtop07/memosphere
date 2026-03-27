"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit2, Trash2, Calendar, MapPin, Users, Clock, Zap } from "lucide-react"
import { fadeInUpVariants, progressVariants } from "@/lib/animations"

interface Event {
  id: number
  title: string
  date: string
  location: string
  attendees: number
  status: "registered" | "interested" | "open"
  description?: string
  category?: string
  startTime?: string
  endTime?: string
  capacity?: number
}

interface EventDetailProps {
  event: Event
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}

export default function EventDetail({ event, onClose, onEdit, onDelete, canEdit }: EventDetailProps) {
  const capacityPercentage = event.capacity ? Math.round((event.attendees / event.capacity) * 100) : 0

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={fadeInUpVariants}>
      <motion.div className="flex items-center justify-between" variants={fadeInUpVariants}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-2xl font-bold">{event.title}</h2>
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
                if (confirm("Are you sure you want to delete this event?")) {
                  onDelete()
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </motion.div>

      <motion.div className="grid gap-6" variants={fadeInUpVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Event Information</CardTitle>
              <Badge variant="secondary">{event.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.category && (
              <motion.div className="flex items-start gap-4" variants={fadeInUpVariants}>
                <Zap className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{event.category}</p>
                </div>
              </motion.div>
            )}
            <motion.div className="flex items-start gap-4" variants={fadeInUpVariants}>
              <Calendar className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{event.date}</p>
              </div>
            </motion.div>
            {(event.startTime || event.endTime) && (
              <motion.div className="flex items-start gap-4" variants={fadeInUpVariants}>
                <Clock className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {event.startTime} {event.endTime && `- ${event.endTime}`}
                  </p>
                </div>
              </motion.div>
            )}
            <motion.div className="flex items-start gap-4" variants={fadeInUpVariants}>
              <MapPin className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{event.location}</p>
              </div>
            </motion.div>
            <motion.div className="flex items-start gap-4" variants={fadeInUpVariants}>
              <Users className="w-5 h-5 text-accent mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Attendees</p>
                <p className="font-medium">
                  {event.attendees}
                  {event.capacity ? ` / ${event.capacity}` : ""} people
                </p>
                {event.capacity && (
                  <motion.div className="mt-2">
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="bg-accent h-2 rounded-full"
                        custom={capacityPercentage}
                        variants={progressVariants}
                        initial="initial"
                        animate="animate"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{capacityPercentage}% capacity</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </CardContent>
        </Card>

        {event.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{event.description}</p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  )
}
