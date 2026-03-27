"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, MapPin, Users, Calendar, Edit2, Trash2, TrendingUp, BarChart3 } from "lucide-react"
import EventForm from "@/components/events/event-form"
import EventDetail from "@/components/events/event-detail"

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

const initialEvents: Event[] = [
  {
    id: 1,
    title: "Company Quarterly Summit",
    date: "Dec 10-12",
    location: "Grand Ballroom",
    attendees: 350,
    status: "registered",
    description: "Annual company summit with keynotes and workshops",
    category: "Conference",
    startTime: "9:00 AM",
    endTime: "5:00 PM",
    capacity: 500,
  },
  {
    id: 2,
    title: "Leadership Workshop",
    date: "Dec 5",
    location: "Conference Room A",
    attendees: 45,
    status: "registered",
    description: "Professional development workshop for leaders",
    category: "Training",
    startTime: "10:00 AM",
    endTime: "4:00 PM",
    capacity: 50,
  },
  {
    id: 3,
    title: "Team Building Activity",
    date: "Dec 18",
    location: "Outdoor Venue",
    attendees: 120,
    status: "interested",
    description: "Fun team building activities and networking",
    category: "Team Building",
    startTime: "2:00 PM",
    endTime: "6:00 PM",
    capacity: 150,
  },
  {
    id: 4,
    title: "Policy Training Session",
    date: "Dec 20",
    location: "Virtual",
    attendees: 200,
    status: "open",
    description: "Mandatory policy and compliance training",
    category: "Training",
    startTime: "1:00 PM",
    endTime: "2:30 PM",
    capacity: 500,
  },
]

interface EventsTabProps {
  user: { role: "admin" | "manager" | "viewer" }
}

export default function EventsTab({ user }: EventsTabProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [showForm, setShowForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [filterStatus, setFilterStatus] = useState<"all" | "registered" | "interested" | "open">("all")

  const handleAddEvent = (formData: Omit<Event, "id">) => {
    const newEvent: Event = {
      ...formData,
      id: Math.max(...events.map((e) => e.id), 0) + 1,
    }
    setEvents([...events, newEvent])
    setShowForm(false)
  }

  const handleUpdateEvent = (formData: Omit<Event, "id">) => {
    if (!editingEvent) return
    const updated = events.map((e) => (e.id === editingEvent.id ? { ...formData, id: editingEvent.id } : e))
    setEvents(updated)
    setEditingEvent(null)
    setSelectedEvent(null)
  }

  const handleDeleteEvent = (id: number) => {
    setEvents(events.filter((e) => e.id !== id))
    setSelectedEvent(null)
  }

  const filteredEvents = filterStatus === "all" ? events : events.filter((e) => e.status === filterStatus)

  if (selectedEvent) {
    return (
      <EventDetail
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={() => {
          setEditingEvent(selectedEvent)
          setSelectedEvent(null)
        }}
        onDelete={() => handleDeleteEvent(selectedEvent.id)}
        canEdit={user.role === "admin" || user.role === "manager"}
      />
    )
  }

  if (showForm || editingEvent) {
    return (
      <EventForm
        event={editingEvent || undefined}
        onSubmit={editingEvent ? handleUpdateEvent : handleAddEvent}
        onCancel={() => {
          setShowForm(false)
          setEditingEvent(null)
        }}
      />
    )
  }

  // Calculate attendance metrics
  const attendanceData = events.map((event) => ({
    name: event.title.length > 15 ? event.title.substring(0, 15) + "..." : event.title,
    attendees: event.attendees,
    capacity: event.capacity || 0,
    fillRate: event.capacity ? Math.round((event.attendees / event.capacity) * 100) : 0,
  }))

  const totalAttendees = events.reduce((sum, event) => sum + event.attendees, 0)
  const avgAttendance = Math.round(totalAttendees / events.length) || 0
  const upcomingEvents = events.filter((e) => new Date(e.date) > new Date()).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Events</h2>
        {(user.role === "admin" || user.role === "manager") && (
          <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
        )}
      </div>

      {/* Attendance Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalAttendees}</p>
                <p className="text-sm text-muted-foreground">Total Attendees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{avgAttendance}</p>
                <p className="text-sm text-muted-foreground">Avg. Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{upcomingEvents}</p>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Event Attendance & Capacity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {attendanceData.map((event, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{event.name}</span>
                  <span className="text-muted-foreground">
                    {event.attendees}{event.capacity ? `/${event.capacity}` : ""} 
                    {event.capacity && (
                      <span className="ml-1 font-medium">({event.fillRate}%)</span>
                    )}
                  </span>
                </div>
                <div className="relative">
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        event.fillRate > 80 ? 'bg-green-500 dark:bg-green-600' : 
                        event.fillRate > 60 ? 'bg-yellow-500 dark:bg-yellow-600' : 'bg-primary dark:bg-chart-1'
                      }`}
                      style={{ 
                        width: event.capacity ? `${Math.min(event.fillRate, 100)}%` : '100%' 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterStatus === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("all")}
        >
          All Events
        </Button>
        <Button
          variant={filterStatus === "registered" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("registered")}
        >
          Registered
        </Button>
        <Button
          variant={filterStatus === "interested" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("interested")}
        >
          Interested
        </Button>
        <Button
          variant={filterStatus === "open" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterStatus("open")}
        >
          Open
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvents.map((event) => (
          <Card key={event.id} className="border-border/50 hover:border-border transition-colors overflow-hidden">
            <CardContent className="pt-6 pb-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    {event.category && <p className="text-xs text-muted-foreground mt-1">{event.category}</p>}
                  </div>
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {event.status}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-accent" />
                    {event.date}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-accent" />
                    {event.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" />
                    {event.attendees}
                    {event.capacity ? ` / ${event.capacity}` : ""} people
                  </div>
                </div>
                <div className="flex gap-2 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                    onClick={() => setSelectedEvent(event)}
                  >
                    View Details
                  </Button>
                  {(user.role === "admin" || user.role === "manager") && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => setEditingEvent(event)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-muted-foreground mb-4">No events found</p>
            {(user.role === "admin" || user.role === "manager") && (
              <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowForm(true)}>
                Create your first event
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
