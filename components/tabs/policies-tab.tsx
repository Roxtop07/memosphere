"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Clock, AlertCircle, Edit2, Trash2 } from "lucide-react"
import PolicyForm from "@/components/policies/policy-form"
import PolicyDetail from "@/components/policies/policy-detail"
import { EncryptionBadge } from "@/components/policies/encryption-badge"
import { shouldEncryptPolicy } from "@/lib/encryption"

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

const initialPolicies: Policy[] = [
  {
    id: 1,
    title: "Data Privacy Policy",
    category: "Compliance",
    updated: "2 months ago",
    status: "active",
    version: "v2.3",
    description: "Comprehensive data privacy and protection guidelines for all employees",
    fileSize: "2.4 MB",
    url: "/policies/data-privacy.pdf",
    lastReviewedBy: "Sarah Johnson",
    nextReviewDate: "2025-06-15",
    department: "Legal & Compliance",
    isEncrypted: true,
  },
  {
    id: 2,
    title: "Work-From-Home Guidelines",
    category: "HR",
    updated: "1 week ago",
    status: "active",
    version: "v1.2",
    description: "Policy for remote work arrangements and expectations",
    fileSize: "1.8 MB",
    url: "/policies/wfh-guidelines.pdf",
    lastReviewedBy: "HR Manager",
    nextReviewDate: "2025-07-01",
    department: "Human Resources",
    isEncrypted: false,
  },
  {
    id: 3,
    title: "Code of Conduct",
    category: "Governance",
    updated: "3 months ago",
    status: "review",
    version: "v1.8",
    description: "Professional conduct and ethical guidelines for the organization",
    fileSize: "3.1 MB",
    url: "/policies/code-of-conduct.pdf",
    lastReviewedBy: "Ethics Officer",
    nextReviewDate: "2025-05-20",
    department: "Governance",
    isEncrypted: true,
  },
  {
    id: 4,
    title: "Expense Policy",
    category: "Finance",
    updated: "5 days ago",
    status: "active",
    version: "v3.1",
    description: "Guidelines for employee expenses and reimbursement procedures",
    fileSize: "1.5 MB",
    url: "/policies/expense-policy.pdf",
    lastReviewedBy: "Finance Director",
    nextReviewDate: "2025-08-10",
    department: "Finance",
    isEncrypted: true,
  },
  {
    id: 5,
    title: "Leave Policy",
    category: "HR",
    updated: "1 month ago",
    status: "active",
    version: "v2.0",
    description: "Annual leave, sick leave, and other time-off policies",
    fileSize: "2.0 MB",
    url: "/policies/leave-policy.pdf",
    lastReviewedBy: "HR Manager",
    nextReviewDate: "2025-09-15",
    department: "Human Resources",
    isEncrypted: false,
  },
  {
    id: 6,
    title: "Security Guidelines",
    category: "IT",
    updated: "Today",
    status: "draft",
    version: "v1.0",
    description: "Information security and data protection procedures",
    fileSize: "2.7 MB",
    url: "/policies/security-guidelines.pdf",
    department: "IT Security",
    isEncrypted: true,
  },
]

interface PoliciesTabProps {
  user: { role: "admin" | "manager" | "viewer" }
}

export default function PoliciesTab({ user }: PoliciesTabProps) {
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies)
  const [showForm, setShowForm] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>("all")

  const categories = ["all", ...new Set(policies.map((p) => p.category))]

  const handleAddPolicy = (formData: Omit<Policy, "id">) => {
    const newPolicy: Policy = {
      ...formData,
      id: Math.max(...policies.map((p) => p.id), 0) + 1,
      isEncrypted: shouldEncryptPolicy(formData.category),
    }
    setPolicies([...policies, newPolicy])
    setShowForm(false)
  }

  const handleUpdatePolicy = (formData: Omit<Policy, "id">) => {
    if (!editingPolicy) return
    const updated = policies.map((p) =>
      p.id === editingPolicy.id
        ? { ...formData, id: editingPolicy.id, isEncrypted: shouldEncryptPolicy(formData.category) }
        : p,
    )
    setPolicies(updated)
    setEditingPolicy(null)
    setSelectedPolicy(null)
  }

  const handleDeletePolicy = (id: number) => {
    setPolicies(policies.filter((p) => p.id !== id))
    setSelectedPolicy(null)
  }

  const filteredPolicies = filterCategory === "all" ? policies : policies.filter((p) => p.category === filterCategory)

  if (selectedPolicy) {
    return (
      <PolicyDetail
        policy={selectedPolicy}
        onClose={() => setSelectedPolicy(null)}
        onEdit={() => {
          setEditingPolicy(selectedPolicy)
          setSelectedPolicy(null)
        }}
        onDelete={() => handleDeletePolicy(selectedPolicy.id)}
        canEdit={user.role === "admin"}
      />
    )
  }

  if (showForm || editingPolicy) {
    return (
      <PolicyForm
        policy={editingPolicy || undefined}
        onSubmit={editingPolicy ? handleUpdatePolicy : handleAddPolicy}
        onCancel={() => {
          setShowForm(false)
          setEditingPolicy(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Policies</h2>
        {user.role === "admin" && (
          <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Upload Policy
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={filterCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterCategory(cat)}
          >
            {cat === "all" ? "All Policies" : cat}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredPolicies.map((policy) => (
          <Card key={policy.id} className="border-border/50 hover:border-border transition-colors">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{policy.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {policy.category}
                      </Badge>
                      <Badge
                        variant={
                          policy.status === "active" ? "default" : policy.status === "review" ? "secondary" : "outline"
                        }
                      >
                        {policy.status}
                      </Badge>
                      <EncryptionBadge isEncrypted={policy.isEncrypted || false} />
                    </div>
                    {policy.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{policy.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <Clock className="w-3.5 h-3.5" />
                      Updated {policy.updated} • Version {policy.version}
                      {policy.fileSize && (
                        <>
                          <span>•</span>
                          <span>{policy.fileSize}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setSelectedPolicy(policy)}>
                    View
                  </Button>
                  {user.role === "admin" && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => setEditingPolicy(policy)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeletePolicy(policy.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {policy.status === "review" && (
                    <Button variant="ghost" size="icon" className="text-yellow-600">
                      <AlertCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPolicies.length === 0 && (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-muted-foreground mb-4">No policies found</p>
            {user.role === "admin" && (
              <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowForm(true)}>
                Upload your first policy
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
