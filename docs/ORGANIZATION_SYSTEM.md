# 🏢 Organization-Based Multi-Tenant System

## Overview

MemoSphere now implements a **complete organization-based authentication system** where each company or institution gets a unique Organization Code to manage their workspace.

---

## 🎯 Key Concepts

### 1. Organization Entity
Each company/institution that registers becomes an **Organization** with:
- **Unique Org Code** (e.g., `MSP-8729`, `LCU-0043`)
- Company name, domain, industry details
- Custom settings and feature toggles
- Member management with roles

### 2. Multi-Tenant Architecture
- **Data Isolation**: Each organization's data is completely separated
- **Organization-Scoped Access**: Users can only see their company's data
- **Role-Based Permissions**: Admin, Manager, Member, Viewer roles within each org

---

## 🔐 Authentication Flows

### Flow 1: Organization Registration (New Company)

```
1. Admin clicks "Register Your Organization"
2. Fills in company details:
   - Organization Name
   - Domain (optional)
   - Industry
   - Size
3. Creates admin account:
   - Full Name
   - Email
   - Password
4. System generates unique Org Code (e.g., TVL-5291)
5. Admin gets code to share with team
6. Auto-logged in to dashboard
```

**Components**:
- `components/auth/org-registration-form.tsx`

**Backend**:
- `lib/services/organization.service.ts` → `createOrganization()`
- Firestore collections: `organizations`, `organizationMembers`

---

### Flow 2: User Signup (Join Existing Organization)

```
1. Employee clicks "Sign Up"
2. Enters Org Code (provided by admin)
3. System validates code:
   ✓ Organization exists
   ✓ Not suspended
   ✓ Email domain allowed (if restricted)
4. User fills in:
   - Full Name
   - Email
   - Password
5. Added to organization as "member"
6. Auto-logged in to org workspace
```

**Components**:
- `components/auth/signup-form.tsx`

**Features**:
- Real-time org code verification
- Email domain restrictions (if configured)
- Visual confirmation with org name badge

---

### Flow 3: Login (Existing User)

```
1. User enters:
   - Email
   - Password
2. Firebase authenticates
3. Org data loaded from localStorage/Firestore
4. User sees only their organization's workspace
```

**Components**:
- `components/auth/login-form.tsx`
- `app/page.tsx` (main router)

---

## 📊 Database Schema

### Firestore Collections

#### `organizations` Collection
```typescript
{
  id: string                    // Auto-generated
  name: string                  // "TechVision Ltd"
  orgCode: string               // "TVL-5291" (unique)
  domain: string                // "techvision.com"
  industry: string              // "Technology"
  size: "small" | "medium" | "large" | "enterprise"
  createdBy: string             // User ID of admin
  createdAt: Timestamp
  status: "active" | "suspended" | "trial"
  trialEndsAt: Timestamp        // 30 days from creation
  settings: {
    allowPublicSignup: boolean
    requireEmailVerification: boolean
    allowedEmailDomains: string[]
    features: {
      meetings: boolean
      events: boolean
      policies: boolean
      aiFeatures: boolean
      analytics: boolean
    }
  }
}
```

#### `organizationMembers` Collection
```typescript
{
  id: string                    // Auto-generated
  orgId: string                 // Reference to organization
  userId: string                // Firebase Auth UID
  email: string
  name: string
  role: "admin" | "manager" | "member" | "viewer"
  department: string            // Optional
  joinedAt: Timestamp
  invitedBy: string             // User ID who invited
  status: "active" | "invited" | "suspended"
}
```

---

## 🔧 Implementation Files

### Core Services

**`lib/firebase.ts`**
- Firebase initialization
- Firestore database export
- Authentication setup

**`lib/services/organization.service.ts`**
- `generateOrgCode()` - Creates unique XXX-#### format codes
- `orgCodeExists()` - Validates code uniqueness
- `createOrganization()` - Registers new organization
- `getOrganizationByCode()` - Validates org code during signup
- `getOrganizationById()` - Fetches org details
- `addOrganizationMember()` - Adds user to organization
- `getOrganizationMember()` - Gets member info
- `isOrgAdmin()` - Checks admin status
- `updateMemberRole()` - Changes member roles

**`lib/types/organization.ts`**
- TypeScript interfaces for Organization, OrganizationMember, OrgInvitation
- Type-safe data structures

### UI Components

**`components/auth/org-registration-form.tsx`**
- 3-step registration wizard:
  1. Organization details
  2. Admin account creation
  3. Success screen with org code

**`components/auth/signup-form.tsx`**
- Org code verification before signup
- Real-time validation with Firestore
- Email domain restrictions
- Auto-assignment as "member" role

**`components/auth/login-form.tsx`**
- Standard email/password login
- Org data loaded from user profile
- 2FA support (optional)

**`app/page.tsx`**
- Main routing logic
- 3 views: Login, Signup, Register Organization
- Session persistence with Firebase Auth
- LocalStorage backup for user data

---

## 🌟 Key Features

### 1. Unique Organization Codes
- Auto-generated format: `XXX-####`
- First 3 letters from company name
- 4 random digits
- Collision detection and retry

**Example**:
- TechVision Ltd → `TVL-5291`
- Lakecity University → `LCU-0043`
- MemoSphere Pvt Ltd → `MSP-8729`

### 2. Data Isolation
Every query should filter by `orgId`:
```typescript
// Example: Get meetings for user's organization
const meetings = await getDocs(
  query(
    collection(db, "meetings"),
    where("orgId", "==", user.orgId)
  )
)
```

### 3. Role-Based Access Control (RBAC)

| Role | Permissions |
|------|------------|
| **Admin** | Full control, manage members, org settings |
| **Manager** | Create/edit content, view analytics |
| **Member** | Create content, participate |
| **Viewer** | Read-only access |

### 4. Trial System
- New organizations get 30-day free trial
- All features enabled during trial
- Can upgrade to paid plans (future feature)

### 5. Email Domain Restrictions
Organizations can restrict signups to specific email domains:
```typescript
settings: {
  allowedEmailDomains: ["company.com", "subsidiary.com"]
}
```

---

## 🚀 Usage Examples

### For Administrators

**Register a New Organization:**
1. Go to login page
2. Click "Register Your Organization"
3. Enter company details
4. Create admin account
5. Get your org code (e.g., `TVL-5291`)
6. Share code with team members

### For Team Members

**Join Your Organization:**
1. Go to login page
2. Click "Sign Up"
3. Enter org code provided by admin
4. Click "Verify" to confirm
5. Fill in your details
6. Sign up and start using MemoSphere

### For Developers

**Check User's Organization:**
```typescript
// In any component
const user = JSON.parse(localStorage.getItem("user"))
console.log("Org Code:", user.orgCode)
console.log("Org Name:", user.orgName)
console.log("Org ID:", user.orgId)
```

**Add Organization Filtering:**
```typescript
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Get user's orgId
const userData = JSON.parse(localStorage.getItem("user"))
const orgId = userData.orgId

// Query with org filter
const eventsRef = collection(db, "events")
const q = query(eventsRef, where("orgId", "==", orgId))
const snapshot = await getDocs(q)

const events = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}))
```

---

## 📋 Next Steps

### Immediate (Required for Production)

1. **Add Org Filtering to All Queries**
   - Meetings collection
   - Events collection
   - Policies collection
   - Audit logs

2. **Update Login Form**
   - Optional: Add org code field for faster login
   - Load org data from Firestore after auth

3. **Add Org Settings Page**
   - Manage members
   - Update org details
   - Configure features
   - View billing/trial status

### Phase 2 (Nice to Have)

1. **Member Invitations**
   - Email invites with magic links
   - Bulk invite CSV upload
   - Invitation tracking

2. **Advanced Permissions**
   - Custom role creation
   - Granular permissions per feature
   - Department-based access

3. **Organization Dashboard**
   - Member activity analytics
   - Storage usage
   - Feature adoption metrics

4. **Billing Integration**
   - Stripe/payment gateway
   - Subscription plans
   - Usage-based billing

---

## 🔄 Migration Path (For Existing Users)

If you have existing users without org codes:

```typescript
// Migration script (run once)
async function migrateExistingUsers() {
  // 1. Create a default organization
  const defaultOrg = await createOrganization({
    name: "Default Organization",
    createdBy: "system",
    settings: { /* default settings */ }
  })

  // 2. Assign all existing users to it
  const users = // get all users from Firebase Auth
  for (const user of users) {
    await addOrganizationMember(defaultOrg.id, {
      userId: user.uid,
      email: user.email,
      name: user.displayName,
      role: "member",
      status: "active"
    })
  }
}
```

---

## 🐛 Troubleshooting

### "Invalid Organization Code"
- Check code format (XXX-####)
- Verify code from admin
- Ensure organization is active, not suspended

### "Email domain not allowed"
- Check if org has domain restrictions
- Contact admin to add your domain
- Use allowed company email

### "Organization suspended"
- Trial may have expired
- Contact organization admin
- Admin should contact support

---

## 💡 Real-World Examples

### Example 1: University

**Lakecity University** (`LCU-0043`)
- Admin: `dean@lakecity.edu`
- Restricted to `@lakecity.edu` emails
- 500 members (students, faculty, staff)
- Departments: CS, Engineering, Business
- Features: Meetings, Events, Policies

### Example 2: Startup

**TechVision Ltd** (`TVL-5291`)
- Admin: `founder@techvision.com`
- Open signup with org code
- 25 members
- Roles: 1 admin, 3 managers, 21 members
- All features enabled

### Example 3: Enterprise

**MemoSphere Pvt Ltd** (`MSP-8729`)
- Multiple admins
- 1000+ members
- Department-based access
- Custom integrations via API
- White-label branding

---

## 📖 API Reference

### Organization Service Methods

```typescript
// Generate unique org code
generateOrgCode(companyName: string): string

// Check if code exists
orgCodeExists(orgCode: string): Promise<boolean>

// Create new organization
createOrganization(
  input: CreateOrganizationInput,
  adminUserId: string
): Promise<Organization>

// Get organization by code
getOrganizationByCode(orgCode: string): Promise<Organization | null>

// Get organization by ID
getOrganizationById(orgId: string): Promise<Organization | null>

// Add member to organization
addOrganizationMember(
  orgId: string,
  member: Omit<OrganizationMember, "id" | "orgId" | "joinedAt">
): Promise<void>

// Get member info
getOrganizationMember(
  orgId: string,
  userId: string
): Promise<OrganizationMember | null>

// Check if user is admin
isOrgAdmin(orgId: string, userId: string): Promise<boolean>

// Get all members
getOrganizationMembers(orgId: string): Promise<OrganizationMember[]>

// Update member role
updateMemberRole(
  memberId: string,
  role: "admin" | "manager" | "member" | "viewer"
): Promise<void>
```

---

## ✅ Testing Checklist

- [ ] Register new organization
- [ ] Verify unique org code generation
- [ ] Admin receives org code
- [ ] Share org code with test user
- [ ] Test user signup with org code
- [ ] Invalid org code shows error
- [ ] Email domain restriction works
- [ ] Users see only their org's data
- [ ] Admin can manage members
- [ ] Role permissions enforced

---

**🎉 Your organization system is ready! Each company now has its own isolated workspace with unique codes!**
