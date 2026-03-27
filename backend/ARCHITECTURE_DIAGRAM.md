# 🏗️ System Architecture Diagram

## Complete Multi-Tenant Enterprise System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                 │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Next.js Frontend (Port 3000)                                  │    │
│  │  ┌──────────────┬──────────────┬──────────────┬─────────────┐ │    │
│  │  │ Dashboard    │ Meetings     │ Events       │ Policies    │ │    │
│  │  └──────────────┴──────────────┴──────────────┴─────────────┘ │    │
│  │                                                                 │    │
│  │  ┌───────────────────────────────────────────────────────────┐│    │
│  │  │ GlobalSearch Component (Cmd+K)                            ││    │
│  │  │ - AI Semantic Search (@xenova/transformers)               ││    │
│  │  │ - all-MiniLM-L6-v2 model                                  ││    │
│  │  │ - Real-time debouncing (300ms)                            ││    │
│  │  │ - Relevance scoring with badges                           ││    │
│  │  └───────────────────────────────────────────────────────────┘│    │
│  │                                                                 │    │
│  │  Authorization: Bearer <JWT with {sub, orgId, role, email}>   │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY / LOAD BALANCER                      │
│                         (Rate Limiting, SSL Termination)                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS BACKEND (Port 5001)                     │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ MIDDLEWARE CHAIN (Applied to Every Request)                    │    │
│  │                                                                 │    │
│  │  1. helmet          → Security headers                         │    │
│  │  2. cors            → Cross-origin resource sharing            │    │
│  │  3. body-parser     → Parse JSON request body                  │    │
│  │  4. compression     → Gzip response compression                │    │
│  │  5. morgan          → HTTP request logging                     │    │
│  │  6. rate-limiter    → Prevent abuse (100 req/15min)           │    │
│  │  7. withTenant      → ⭐ JWT verify + set org context          │    │
│  │  8. requireRole     → ⭐ RBAC permission check                 │    │
│  │  9. auditLog        → ⭐ Log all actions                       │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ withTenant Middleware (Critical for Multi-Tenancy)             │    │
│  │                                                                 │    │
│  │  1. Extract JWT from Authorization header                      │    │
│  │  2. Verify token signature and expiry                          │    │
│  │  3. Extract payload: {sub, orgId, role, email}                 │    │
│  │  4. Execute SQL: SELECT set_config(                            │    │
│  │                    'app.current_org_id', '<ORG_UUID>', true    │    │
│  │                  )                                              │    │
│  │  5. Attach user info to req.user                               │    │
│  │  6. Continue to next middleware                                │    │
│  │                                                                 │    │
│  │  ⚡ Result: All subsequent DB queries automatically            │    │
│  │            filtered by org_id via RLS policies                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ ENCRYPTION LAYER (Field-Level Security)                        │    │
│  │                                                                 │    │
│  │  ┌──────────────────────────────────────────────────────────┐ │    │
│  │  │ Envelope Encryption Flow:                                │ │    │
│  │  │                                                          │ │    │
│  │  │  1. Master KEK (from env) ───────────────┐              │ │    │
│  │  │                                           │              │ │    │
│  │  │  2. Org DEK (per org, random 256-bit) ◄──┘              │ │    │
│  │  │     Encrypted with KEK → store in DB                    │ │    │
│  │  │                                                          │ │    │
│  │  │  3. Field Encryption:                                   │ │    │
│  │  │     plaintext ──────┐                                   │ │    │
│  │  │                     │                                   │ │    │
│  │  │                     ▼                                   │ │    │
│  │  │     AES-256-GCM(plaintext, DEK, random IV)             │ │    │
│  │  │                     │                                   │ │    │
│  │  │                     ▼                                   │ │    │
│  │  │     {ciphertext, iv, authTag} → store in DB            │ │    │
│  │  │                                                          │ │    │
│  │  │  4. Blind Index (for search):                          │ │    │
│  │  │     HMAC-SHA256(plaintext, SEARCH_KEY) → deterministic │ │    │
│  │  │                                                          │ │    │
│  │  └──────────────────────────────────────────────────────────┘ │    │
│  │                                                                 │    │
│  │  Functions:                                                     │    │
│  │  - generateDEK()              → Create 256-bit random key      │    │
│  │  - encryptDEK(dek)            → Encrypt DEK with master KEK    │    │
│  │  - encryptField(text, dek)    → AES-256-GCM encryption         │    │
│  │  - decryptField(cipher, dek)  → Decrypt with auth tag verify   │    │
│  │  - createBlindIndex(term)     → HMAC for searchable encrypt    │    │
│  │  - getCachedOrgDEK(orgId)     → Get DEK with Redis caching     │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ RBAC LAYER (Role-Based Access Control)                         │    │
│  │                                                                 │    │
│  │  Roles:                          Permissions:                  │    │
│  │  ┌────────────┐                  - org:manage                  │    │
│  │  │ ADMIN      │────────────────► - user:create/update/delete   │    │
│  │  │ Full Org   │                  - meeting:view_all            │    │
│  │  └────────────┘                  - audit:view/export           │    │
│  │                                   - settings:update            │    │
│  │  ┌────────────┐                  + 50+ more permissions        │    │
│  │  │ ORGANIZER  │────────────────► - meeting:create/update       │    │
│  │  │ Create/Edit│                  - event:create/update         │    │
│  │  └────────────┘                  - policy:create/update        │    │
│  │                                                                 │    │
│  │  ┌────────────┐                  - meeting:view (invited)      │    │
│  │  │ MEMBER     │────────────────► - event:view                  │    │
│  │  │ View Only  │                  - policy:view                 │    │
│  │  └────────────┘                                                 │    │
│  │                                                                 │    │
│  │  ┌────────────┐                  - meeting:view (shared)       │    │
│  │  │ GUEST      │────────────────► - Limited access              │    │
│  │  │ Very Limited│                                                │    │
│  │  └────────────┘                                                 │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ AUTO-STRUCTURING PIPELINE (AI-Powered)                         │    │
│  │                                                                 │    │
│  │  Triggered when meeting ends:                                  │    │
│  │                                                                 │    │
│  │  1. Decrypt transcript ────────► Get org DEK from cache        │    │
│  │                                   Decrypt cipher with DEK       │    │
│  │                                                                 │    │
│  │  2. AI Summarization ──────────► OpenAI API (GPT-4)            │    │
│  │                                   Extract key points            │    │
│  │                                   Identify decisions            │    │
│  │                                   Generate summary              │    │
│  │                                                                 │    │
│  │  3. Series Detection ──────────► Pattern matching              │    │
│  │                                   Find similar meetings         │    │
│  │                                   Detect recurring pattern      │    │
│  │                                   Link to series               │    │
│  │                                                                 │    │
│  │  4. Extract Action Items ──────► NLP parsing                   │    │
│  │                                   Detect assignees (@mentions)  │    │
│  │                                   Extract due dates             │    │
│  │                                   Create action records         │    │
│  │                                                                 │    │
│  │  5. Encrypt Results ───────────► Encrypt summary with DEK      │    │
│  │                                   Create blind indexes          │    │
│  │                                   Store in database             │    │
│  │                                                                 │    │
│  │  6. Generate PDF ──────────────► PDFKit professional template  │    │
│  │                                   Upload to cloud storage       │    │
│  │                                   Return URL                    │    │
│  │                                                                 │    │
│  │  7. Send Notifications ────────► Email to all attendees        │    │
│  │                                   In-app notifications          │    │
│  │                                   Slack/Teams webhooks          │    │
│  │                                                                 │    │
│  │  8. Audit Log ─────────────────► Log pipeline execution        │    │
│  │                                   Track success/failure         │    │
│  │                                   Anomaly detection             │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ API ROUTES (12 Modules)                                        │    │
│  │                                                                 │    │
│  │  /api/auth          - Login, register, 2FA, refresh           │    │
│  │  /api/users         - CRUD, profile, roles                     │    │
│  │  /api/meetings      - CRUD, attendees, transcripts, search     │    │
│  │  /api/events        - CRUD, RSVP, calendar sync               │    │
│  │  /api/policies      - CRUD, versions, approvals, acknowledge   │    │
│  │  /api/notifications - List, mark read, preferences             │    │
│  │  /api/analytics     - Dashboards, reports, insights            │    │
│  │  /api/upload        - Files, images, documents                 │    │
│  │  /api/search        - Global search, semantic, filters         │    │
│  │  /api/webhooks      - External integrations                    │    │
│  │  /api/audit         - Audit logs, export, anomalies            │    │
│  │  /api/ai            - Summarization, insights, suggestions     │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ BACKGROUND JOBS (Bull Queues)                                  │    │
│  │                                                                 │    │
│  │  - Email Queue        → Send emails via SMTP                   │    │
│  │  - Transcription Queue → Convert audio to text                 │    │
│  │  - AI Queue           → Summarization, extraction              │    │
│  │  - Report Queue       → Generate PDFs, exports                 │    │
│  │  - Notification Queue → Push notifications                     │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                    │                             │
                    │                             │
                    ▼                             ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│   REDIS (Port 6379)          │   │  POSTGRESQL (Port 5432)      │
│                              │   │                              │
│  - Session storage           │   │  ┌────────────────────────┐ │
│  - DEK caching (1h TTL)     │   │  │ RLS ENABLED TABLES:    │ │
│  - Rate limiting            │   │  │                        │ │
│  - Job queue state          │   │  │ ✓ organizations       │ │
│  - Real-time pub/sub        │   │  │ ✓ users               │ │
│                              │   │  │ ✓ meetings            │ │
│  Redis Commander:            │   │  │ ✓ events              │ │
│  http://localhost:8081       │   │  │ ✓ policies            │ │
└──────────────────────────────┘   │  │ ✓ meeting_notes       │ │
                                    │  │ ✓ actions             │ │
                                    │  │ ✓ audit_logs          │ │
                                    │  │ + 15 more tables      │ │
                                    │  └────────────────────────┘ │
                                    │                              │
                                    │  ┌────────────────────────┐ │
                                    │  │ RLS POLICY (Example):  │ │
                                    │  │                        │ │
                                    │  │ CREATE POLICY          │ │
                                    │  │   org_isolation        │ │
                                    │  │ ON meetings USING (    │ │
                                    │  │   org_id::text =       │ │
                                    │  │   current_setting(     │ │
                                    │  │     'app.current_org_id'│ │
                                    │  │   )                    │ │
                                    │  │ );                     │ │
                                    │  └────────────────────────┘ │
                                    │                              │
                                    │  Extensions:                 │
                                    │  ✓ pgcrypto (UUID, crypto)  │
                                    │  ✓ pg_trgm (text search)    │
                                    │                              │
                                    │  pgAdmin:                    │
                                    │  http://localhost:5050       │
                                    └──────────────────────────────┘
                                                 │
                                                 │
                                                 ▼
                                    ┌──────────────────────────────┐
                                    │ SAMPLE DATA STRUCTURE:       │
                                    │                              │
                                    │ meetings table:              │
                                    │ ┌──────────────────────────┐│
                                    │ │ id: uuid                 ││
                                    │ │ org_id: uuid (RLS key)   ││
                                    │ │ title_cipher: text       ││
                                    │ │ title_iv: text           ││
                                    │ │ title_tag: text          ││
                                    │ │ title_index: text (HMAC) ││
                                    │ │ transcript_cipher: text  ││
                                    │ │ transcript_iv: text      ││
                                    │ │ transcript_tag: text     ││
                                    │ │ summary_cipher: text     ││
                                    │ │ summary_iv: text         ││
                                    │ │ summary_tag: text        ││
                                    │ │ series_id: uuid          ││
                                    │ │ status: enum             ││
                                    │ │ start_time: timestamp    ││
                                    │ │ end_time: timestamp      ││
                                    │ └──────────────────────────┘│
                                    └──────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                               │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │
│  │ OpenAI API     │  │ Cloud Storage  │  │ Email (SMTP)   │           │
│  │ - GPT-4        │  │ - GCS/S3/Azure │  │ - SendGrid     │           │
│  │ - Summarization│  │ - PDF storage  │  │ - Notifications│           │
│  └────────────────┘  └────────────────┘  └────────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                                    │
│                                                                          │
│  Layer 1: Network      → HTTPS/TLS, WAF, DDoS protection               │
│  Layer 2: Authentication → JWT with org_id, refresh tokens             │
│  Layer 3: Authorization → RBAC (4 roles, 60+ permissions)              │
│  Layer 4: Data Isolation → PostgreSQL RLS (org boundary)               │
│  Layer 5: Encryption   → AES-256-GCM (field-level)                     │
│  Layer 6: Searchable   → HMAC blind indexes                            │
│  Layer 7: Audit        → All actions logged, anomaly detection         │
│  Layer 8: Rate Limiting → Prevent abuse                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      DATA FLOW EXAMPLE                                  │
│                                                                          │
│  User creates meeting:                                                  │
│                                                                          │
│  1. Frontend sends POST /api/meetings with JWT                          │
│  2. withTenant middleware extracts orgId from JWT                       │
│  3. Sets app.current_org_id = orgId in DB session                      │
│  4. Get org DEK from cache (or DB + decrypt with KEK)                  │
│  5. Encrypt title: {cipher, iv, tag} = encryptField(title, dek)       │
│  6. Create blind index: titleIndex = createBlindIndex(title)          │
│  7. Insert into DB: INSERT INTO meetings (org_id, title_cipher, ...)  │
│  8. RLS policy automatically enforces org_id match                      │
│  9. auditLog middleware logs action                                     │
│  10. Return meeting ID to frontend                                      │
│                                                                          │
│  User searches meetings:                                                │
│                                                                          │
│  1. Frontend sends GET /api/meetings/search?q=planning with JWT        │
│  2. withTenant sets org context                                         │
│  3. Create search index: searchIndex = createBlindIndex('planning')    │
│  4. Query: SELECT * FROM meetings WHERE title_index = searchIndex      │
│  5. RLS automatically filters by org_id                                 │
│  6. Decrypt titles: decryptField(cipher, iv, tag, dek)                │
│  7. Return decrypted results to frontend                                │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Multi-Tenancy Enforcement
- **RLS**: Database-level org isolation
- **Session Variable**: `app.current_org_id` set per request
- **Automatic Filtering**: All queries filtered by org

### 2. Encryption Architecture
- **Envelope Encryption**: Master KEK → Org DEK → Field encryption
- **AES-256-GCM**: AEAD with authentication
- **Blind Indexes**: HMAC-based searchable encryption

### 3. Access Control
- **JWT**: Contains `{sub, orgId, role, email}`
- **RBAC**: 4 roles with 60+ permissions
- **Resource Checks**: Ownership and attendance validation

### 4. AI Pipeline
- **Auto-Structure**: Decrypt → Summarize → Extract → Encrypt → PDF → Notify
- **Series Detection**: Pattern recognition for recurring meetings
- **Action Extraction**: NLP-based with assignees and due dates

### 5. Audit & Security
- **All Actions Logged**: IP, user agent, metadata
- **Anomaly Detection**: Excessive actions, multiple IPs
- **Admin Alerts**: Security notifications

---

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Jobs**: Bull queues
- **Logging**: Winston
- **PDF**: PDFKit

### Frontend
- **Framework**: Next.js 14
- **Language**: TypeScript
- **UI**: shadcn/ui
- **Search**: @xenova/transformers
- **Styling**: Tailwind CSS

### Infrastructure
- **Container**: Docker
- **Database UI**: pgAdmin
- **Cache UI**: Redis Commander
- **Cloud Storage**: GCS/S3/Azure Blob

---

## Security Guarantees

✅ **Organization A cannot see Organization B's data**
- Enforced at database level (RLS)
- Session-based context per request
- Automatic query filtering

✅ **Sensitive data is encrypted at rest**
- AES-256-GCM field-level encryption
- Per-org encryption keys
- Master key from secure environment

✅ **Data is searchable without decryption**
- HMAC-based blind indexes
- Deterministic for exact match
- Privacy-preserving search

✅ **Fine-grained access control**
- 4 roles with clear separation
- 60+ granular permissions
- Resource-level checks

✅ **Complete audit trail**
- All actions logged
- Anomaly detection
- Admin alerts on suspicious activity

---

*This diagram represents the complete implementation as of the current build.*
