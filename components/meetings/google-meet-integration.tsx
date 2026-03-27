"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Video, Loader2, ExternalLink, Copy, CheckCircle2, AlertCircle, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface GoogleMeetIntegrationProps {
  meetingTitle: string
  meetingDate: string
  meetingTime: string
  meetingDescription?: string
  onMeetLinkGenerated: (meetLink: string) => void
}

export default function GoogleMeetIntegration({
  meetingTitle,
  meetingDate,
  meetingTime,
  meetingDescription,
  onMeetLinkGenerated,
}: GoogleMeetIntegrationProps) {
  const [manualLink, setManualLink] = useState("")
  const [meetLink, setMeetLink] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)

  const createGoogleMeetDirectly = () => {
    // Open Google Calendar to create a new event with Meet
    const startDate = meetingDate ? new Date(meetingDate) : new Date()
    if (meetingTime) {
      const [hours, minutes] = meetingTime.split(':')
      startDate.setHours(parseInt(hours), parseInt(minutes))
    }
    
    // Calculate end time (1 hour later)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
    
    // Format dates for Google Calendar
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }
    
    // Create Google Calendar URL with Meet enabled
    const calendarUrl = new URL('https://calendar.google.com/calendar/u/0/r/eventedit')
    calendarUrl.searchParams.set('text', meetingTitle || 'Team Meeting')
    calendarUrl.searchParams.set('dates', `${formatDate(startDate)}/${formatDate(endDate)}`)
    if (meetingDescription) {
      calendarUrl.searchParams.set('details', meetingDescription)
    }
    calendarUrl.searchParams.set('add', '') // This will prompt to add Google Meet
    
    window.open(calendarUrl.toString(), '_blank')
    
    toast.info("Create meeting in Google Calendar", {
      description: "After creating the event, copy the Meet link and paste it below.",
    })
    
    setShowManualInput(true)
  }

  const handleManualLinkSubmit = () => {
    if (!manualLink.trim()) {
      toast.error("Please enter a Google Meet link")
      return
    }

    // Validate Google Meet URL format
    const meetRegex = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/
    if (!meetRegex.test(manualLink.trim())) {
      toast.error("Invalid Google Meet link format", {
        description: "Link should be like: https://meet.google.com/abc-defg-hij"
      })
      return
    }

    setMeetLink(manualLink.trim())
    onMeetLinkGenerated(manualLink.trim())
    toast.success("Google Meet link added!", {
      description: "Meeting link has been saved to your meeting.",
    })
  }

  const copyToClipboard = () => {
    if (meetLink) {
      navigator.clipboard.writeText(meetLink)
      setIsCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const openMeetLink = () => {
    if (meetLink) {
      window.open(meetLink, "_blank")
    }
  }

  const createInstantMeeting = () => {
    // Open Google Meet directly to start an instant meeting
    window.open('https://meet.google.com/new', '_blank')
    toast.info("Creating instant meeting", {
      description: "Copy the meeting link from the new tab and paste it below.",
    })
    setShowManualInput(true)
  }

  return (
    <div className="space-y-3">
      {!meetLink ? (
        <>
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
              <strong>How to add Google Meet:</strong>
              <ol className="list-decimal ml-4 mt-2 space-y-1">
                <li>Click "Create Instant Google Meet" to start a new meeting</li>
                <li>Or click "Schedule in Google Calendar" to add Meet to a calendar event</li>
                <li>Copy the Meet link from the opened tab</li>
                <li>Paste it in the input field below</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-2">
            <Button
              type="button"
              onClick={createInstantMeeting}
              disabled={!meetingTitle || !meetingDate}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              <Video className="w-5 h-5 mr-2" />
              Create Instant Google Meet
            </Button>

            <Button
              type="button"
              onClick={createGoogleMeetDirectly}
              disabled={!meetingTitle || !meetingDate}
              variant="outline"
              size="lg"
              className="w-full"
            >
              <Video className="w-5 h-5 mr-2" />
              Schedule in Google Calendar
            </Button>
          </div>

          {showManualInput && (
            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
              <Label htmlFor="meetLink" className="text-sm font-semibold">
                Paste Google Meet Link
              </Label>
              <div className="flex gap-2">
                <Input
                  id="meetLink"
                  type="url"
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={manualLink}
                  onChange={(e) => setManualLink(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleManualLinkSubmit}
                  disabled={!manualLink.trim()}
                >
                  <LinkIcon className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Format: https://meet.google.com/abc-defg-hij
              </p>
            </div>
          )}

          {!showManualInput && (
            <Button
              type="button"
              onClick={() => setShowManualInput(true)}
              variant="ghost"
              className="w-full text-sm"
            >
              Or paste an existing Google Meet link
            </Button>
          )}

          {!meetingTitle || !meetingDate ? (
            <p className="text-xs text-muted-foreground text-center">
              Fill in meeting title and date first
            </p>
          ) : null}
        </>
      ) : (
        <div className="space-y-2">
          <div className="p-4 border-2 border-green-500 rounded-lg bg-green-50 dark:bg-green-950">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                  Google Meet Link Added
                </p>
                <p className="text-sm font-mono text-green-700 dark:text-green-300 break-all">
                  {meetLink}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={copyToClipboard}
              variant="outline"
              className="flex-1"
            >
              {isCopied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={openMeetLink}
              variant="outline"
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Meet
            </Button>
            <Button
              type="button"
              onClick={() => {
                setMeetLink(null)
                setManualLink("")
                setShowManualInput(false)
              }}
              variant="ghost"
              size="sm"
            >
              Change
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
