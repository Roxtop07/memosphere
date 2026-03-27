# Backend Setup Instructions

## Quick Start with Docker

### 1. Install Docker Desktop
Download and install Docker Desktop from: https://www.docker.com/products/docker-desktop

### 2. Start Database Services

```powershell
# Navigate to backend directory
cd backend

# Start PostgreSQL and Redis
docker-compose up -d

# Check if containers are running
docker-compose ps
```

You should see:
- memosphere-postgres (port 5432)
- memosphere-redis (port 6379)
- memosphere-pgadmin (port 5050) - Optional UI
- memosphere-redis-commander (port 8081) - Optional UI

### 3. Install Node.js Dependencies

```powershell
pnpm install
```

### 4. Setup Environment Variables

```powershell
# Copy the example env file
cp .env.example .env
```

The default `.env` values work with the Docker setup. You can keep them as-is for development.

### 5. Initialize Database

```powershell
# Generate Prisma client
pnpm db:generate

# Create database tables
pnpm db:push
```

### 6. Start Development Server

```powershell
pnpm dev
```

The backend will be available at: http://localhost:4000

API endpoints: http://localhost:4000/api/v1

Health check: http://localhost:4000/health

## Database Administration

### pgAdmin (PostgreSQL UI)
1. Open http://localhost:5050
2. Login with:
   - Email: admin@memosphere.com
   - Password: admin
3. Add server:
   - Host: postgres
   - Port: 5432
   - Username: memosphere
   - Password: memosphere_dev_password
   - Database: memosphere

### Prisma Studio (Alternative)
```powershell
pnpm db:studio
```
Opens at: http://localhost:5555

### Redis Commander (Redis UI)
Open http://localhost:8081 to view Redis data

## Troubleshooting

### Docker containers won't start
```powershell
# Check Docker is running
docker --version

# View logs
docker-compose logs

# Restart containers
docker-compose restart
```

### Port already in use
```powershell
# Check what's using the port
netstat -ano | findstr :5432
netstat -ano | findstr :6379

# Stop the process or change port in docker-compose.yml
```

### Database connection failed
```powershell
# Verify PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Prisma client errors
```powershell
# Regenerate Prisma client
pnpm db:generate

# Reset database (WARNING: deletes all data)
pnpm db:push --force-reset
```

## Stopping Services

```powershell
# Stop all containers
docker-compose down

# Stop and remove all data volumes
docker-compose down -v
```

## Next Steps

1. The backend is now running with all routes returning "501 Not Implemented"
2. Next phase: Implement authentication system
3. Then: Implement CRUD operations for meetings, events, and policies
4. Then: Add AI integration services
5. Finally: Add background jobs and advanced features

## Development Workflow

```powershell
# 1. Start Docker services
docker-compose up -d

# 2. Start dev server (auto-reload on changes)
pnpm dev

# 3. Make code changes in src/

# 4. Test changes at http://localhost:4000

# 5. When done, stop services
docker-compose down
```
