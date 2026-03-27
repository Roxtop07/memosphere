"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit2, Trash2, Download, Calendar, AlertCircle } from "lucide-react"
import { EncryptionBadge } from "@/components/policies/encryption-badge"

interface Policy {
  id: number
  title: string
  category: string
  updated: string
  status: "active" | "review" | "draft"
  version: string
  description?: string
  fileSize?: string
  url?: string
  lastReviewedBy?: string
  nextReviewDate?: string
  department?: string
  isEncrypted?: boolean
}

interface PolicyDetailProps {
  policy: Policy
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}

export default function PolicyDetail({ policy, onClose, onEdit, onDelete, canEdit }: PolicyDetailProps) {
  const handlePolicyDownload = async (policy: Policy) => {
    try {
      if (policy.isEncrypted) {
        // Decrypt and download
        const response = await fetch('/api/policies/decrypt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ policyId: policy.id, url: policy.url })
        })
        
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${policy.title.replace(/[^a-z0-9]/gi, '_')}_decrypted.pdf`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      } else {
        // Direct download
        window.open(policy.url, "_blank")
      }
    } catch (error) {
      console.error('Download failed:', error)
      alert('Download failed. Please try again.')
    }
  }

  const generatePolicyPDF = async (policy: Policy) => {
    try {
      const response = await fetch('/api/policies/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          policy: {
            title: policy.title,
            description: policy.description,
            category: policy.category,
            version: policy.version,
            updated: policy.updated,
            department: policy.department,
            isEncrypted: policy.isEncrypted
          }
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${policy.title.replace(/[^a-z0-9]/gi, '_')}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('PDF generation failed. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-2xl font-bold">{policy.title}</h2>
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
                if (confirm("Are you sure you want to delete this policy?")) {
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

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Policy Information</CardTitle>
              <div className="flex gap-2">
                <Badge
                  variant={
                    policy.status === "active" ? "default" : policy.status === "review" ? "secondary" : "outline"
                  }
                >
                  {policy.status === "active" ? "Active" : policy.status === "review" ? "Under Review" : "Draft"}
                </Badge>
                <EncryptionBadge isEncrypted={policy.isEncrypted || false} size="md" />
                {policy.status === "review" && <AlertCircle className="w-5 h-5 text-yellow-600" />}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{policy.category}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="font-medium">{policy.version}</p>
              </div>
              {policy.department && (
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{policy.department}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="font-medium">{policy.updated}</p>
              </div>
            </div>

            {policy.fileSize && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground">File Size</p>
                <p className="font-medium">{policy.fileSize}</p>
              </div>
            )}

            {policy.isEncrypted && (
              <div className="pt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">This policy document is encrypted for security</p>
              </div>
            )}
          </CardContent>
        </Card>

        {policy.lastReviewedBy && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Last Reviewed By</p>
                <p className="font-medium">{policy.lastReviewedBy}</p>
              </div>
              {policy.nextReviewDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-sm text-muted-foreground">Next Review Date</p>
                    <p className="font-medium">{policy.nextReviewDate}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {policy.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{policy.description}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {policy.url ? (
                <Button
                  className="w-full bg-primary hover:bg-primary/90 gap-2"
                  onClick={() => handlePolicyDownload(policy)}
                >
                  <Download className="w-4 h-4" />
                  Download Policy Document {policy.isEncrypted && "(Encrypted)"}
                </Button>
              ) : (
                <Button
                  className="w-full bg-primary hover:bg-primary/90 gap-2"
                  onClick={() => generatePolicyPDF(policy)}
                >
                  <Download className="w-4 h-4" />
                  Generate & Download PDF {policy.isEncrypted && "(Encrypted)"}
                </Button>
              )}
              
              {policy.isEncrypted && (
                <div className="text-sm text-muted-foreground text-center">
                  Document will be decrypted automatically upon download
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
