"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"

interface PolicyFormData {
  title: string
  category: string
  version: string
  department: string
  status: "active" | "review" | "draft"
  description: string
  fileSize: string
  lastReviewedBy: string
  nextReviewDate: string
  url: string
}

interface PolicyFormProps {
  policy?: {
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
  }
  onSubmit: (data: any) => void
  onCancel: () => void
}

export default function PolicyForm({ policy, onSubmit, onCancel }: PolicyFormProps) {
  const [formData, setFormData] = useState<PolicyFormData>({
    title: policy?.title || "",
    category: policy?.category || "",
    version: policy?.version || "v1.0",
    department: policy?.department || "",
    status: policy?.status || "draft",
    description: policy?.description || "",
    fileSize: policy?.fileSize || "",
    lastReviewedBy: policy?.lastReviewedBy || "",
    nextReviewDate: policy?.nextReviewDate || "",
    url: policy?.url || "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-2xl font-bold">{policy ? "Edit Policy" : "Upload New Policy"}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policy Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Policy Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Data Privacy Policy"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Compliance">Compliance</option>
                  <option value="HR">HR</option>
                  <option value="Governance">Governance</option>
                  <option value="Finance">Finance</option>
                  <option value="IT">IT</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  name="version"
                  value={formData.version}
                  onChange={handleChange}
                  placeholder="e.g., v1.0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g., Legal & Compliance"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="draft">Draft</option>
                  <option value="review">Under Review</option>
                  <option value="active">Active</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileSize">File Size</Label>
                <Input
                  id="fileSize"
                  name="fileSize"
                  value={formData.fileSize}
                  onChange={handleChange}
                  placeholder="e.g., 2.4 MB"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastReviewedBy">Last Reviewed By</Label>
                <Input
                  id="lastReviewedBy"
                  name="lastReviewedBy"
                  value={formData.lastReviewedBy}
                  onChange={handleChange}
                  placeholder="Name of reviewer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextReviewDate">Next Review Date</Label>
                <Input
                  id="nextReviewDate"
                  name="nextReviewDate"
                  type="date"
                  value={formData.nextReviewDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Document URL</Label>
              <Input
                id="url"
                name="url"
                type="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://example.com/policies/document.pdf"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Policy description and purpose..."
                rows={5}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" type="button" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {policy ? "Update Policy" : "Upload Policy"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
