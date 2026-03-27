# MemoSphere Backend

Complete Node.js/TypeScript backend for MemoSphere - A centralized system for managing meetings, events, and policy records.

## 🚀 Features

### Core Modules
- **Meetings Management** - Schedule, track, transcribe, and analyze meetings
- **Events Management** - Create and manage events with RSVP and attendance tracking
- **Policy & Document Management** - Version control, approvals, and encrypted storage
- **AI Integration** - Meeting transcription, summarization, and key point extraction
- **Real-time Notifications** - Multi-channel notifications via WebSocket
- **Analytics & Reporting** - Comprehensive analytics and custom reports
- **Audit Logging** - Complete audit trail for compliance

### Technical Features
- RESTful API with Express.js
- PostgreSQL database with Prisma ORM
- Redis caching and session management
- Background job processing with Bull
- Real-time updates with Socket.io
- JWT authentication with 2FA support
- File upload and storage
- Rate limiting and security
- Comprehensive logging

## 📋 Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose (for PostgreSQL and Redis)
- Git

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
cd backend
pnpm install
```

### 2. Start PostgreSQL and Redis

```bash
# Start Docker containers
docker-compose up -d

# Verify containers are running
docker-compose ps
```

This will start:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- pgAdmin on `localhost:5050` (optional UI for database)
- Redis Commander on `localhost:8081` (optional UI for Redis)

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
# The default DATABASE_URL should work with docker-compose setup
```

### 4. Setup Database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (creates tables)
pnpm db:push

# Or run migrations (preferred for production)
pnpm db:migrate

# Optional: Seed database with sample data
pnpm db:seed
```

### 5. Start Development Server

```bash
pnpm dev
```

The API will be available at `http://localhost:4000/api/v1`

## 📚 Available Scripts

```bash
pnpm dev          # Start development server with hot reload
pnpm build        # Build TypeScript to JavaScript
pnpm start        # Start production server
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database (dev)
pnpm db:migrate   # Run migrations (production)
pnpm db:studio    # Open Prisma Studio (database UI)
pnpm db:seed      # Seed database with sample data
pnpm test         # Run tests
pnpm lint         # Lint code
pnpm format       # Format code with Prettier
```

## 🗄️ Database Schema

The database includes the following main entities:

- **Users** - User accounts with roles and organizations
- **Organizations** - Multi-tenant organization support
- **Departments** - Hierarchical department structure
- **Meetings** - Meeting records with transcription and AI analysis
- **Events** - Event management with RSVP
- **Policies** - Policy documents with version control
- **Notifications** - User notifications
- **Audit Logs** - Complete audit trail
- **Comments** - Comments on meetings, events, and policies
- **Tags** - Flexible tagging system
- **File Uploads** - File metadata and storage
- **API Keys & Webhooks** - API integration support

## 🔌 API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh access token

### Meetings
- `GET /api/v1/meetings` - List meetings
- `POST /api/v1/meetings` - Create meeting
- `GET /api/v1/meetings/:id` - Get meeting details
- `PUT /api/v1/meetings/:id` - Update meeting
- `DELETE /api/v1/meetings/:id` - Delete meeting

### Events
- `GET /api/v1/events` - List events
- `POST /api/v1/events` - Create event
- `GET /api/v1/events/:id` - Get event details
- `PUT /api/v1/events/:id` - Update event
- `DELETE /api/v1/events/:id` - Delete event

### Policies
- `GET /api/v1/policies` - List policies
- `POST /api/v1/policies` - Create policy
- `GET /api/v1/policies/:id` - Get policy details
- `PUT /api/v1/policies/:id` - Update policy
- `DELETE /api/v1/policies/:id` - Delete policy

### AI Services
- `POST /api/v1/ai/generate` - AI content generation

### And more...

## 🔧 Configuration

### Database
Configure PostgreSQL connection in `.env`:
```env
DATABASE_URL="postgresql://memosphere:memosphere_dev_password@localhost:5432/memosphere?schema=public"
```

### Redis
Configure Redis connection in `.env`:
```env
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
REDIS_DB=0
```

### JWT
Set secure JWT secrets in `.env`:
```env
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
```

## 🐳 Docker Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart a specific service
docker-compose restart postgres

# Remove all data (WARNING: destroys data)
docker-compose down -v
```

### Accessing Admin UIs

**pgAdmin** (PostgreSQL):
- URL: http://localhost:5050
- Email: admin@memosphere.com
- Password: admin

**Redis Commander**:
- URL: http://localhost:8081

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts  # Prisma database config
│   │   ├── redis.ts     # Redis config
│   │   └── queues.ts    # Bull queue config
│   ├── controllers/     # Route controllers (TODO)
│   ├── services/        # Business logic (TODO)
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts      # Authentication (TODO)
│   │   ├── error-handler.ts
│   │   ├── rate-limiter.ts
│   │   └── not-found.ts
│   ├── routes/          # API routes
│   ├── models/          # Database models (Prisma)
│   ├── jobs/            # Background job processors
│   │   └── processors/  # Job processor implementations
│   ├── utils/           # Utility functions
│   │   └── logger.ts    # Winston logger
│   ├── types/           # TypeScript type definitions (TODO)
│   └── server.ts        # Express server setup
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── migrations/      # Database migrations
│   └── seed.ts          # Database seed script (TODO)
├── docker-compose.yml   # Docker services setup
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── .env.example         # Example environment variables
└── README.md           # This file
```

## 🔐 Security

- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting on all endpoints
- Helmet.js for security headers
- CORS configuration
- Input validation
- SQL injection protection (Prisma)
- XSS protection

## 🚧 Development Status

✅ **Completed:**
- Project structure and configuration
- Database schema with Prisma
- Express server setup
- PostgreSQL and Redis with Docker
- Logging and error handling
- Rate limiting
- Health check endpoint
- Route placeholders

🔄 **In Progress:**
- Authentication and authorization
- CRUD operations for all entities
- AI integration services
- Background job processors
- File upload handling
- Search functionality
- Webhook system
- Testing suite

📋 **Planned:**
- API documentation (Swagger/OpenAPI)
- Comprehensive testing
- Deployment configuration
- Performance monitoring
- Backup automation

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

## 📖 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Bull Queue Documentation](https://optimalbits.github.io/bull/)
- [Socket.io Documentation](https://socket.io/docs/)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## 📝 License

MIT

## 👥 Team

MemoSphere Development Team

---

**Note:** This is a development setup. For production deployment, ensure you:
- Use strong passwords and secrets
- Enable SSL/TLS
- Configure proper backup strategies
- Set up monitoring and logging
- Use environment-specific configurations
- Implement proper error tracking
