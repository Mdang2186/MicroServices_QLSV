# Student Management System - Microservices Monorepo

A complete Microservices architecture Student Management System built with Turborepo, NestJS, Next.js, Postgres, and Redis.

## Tech Stack
- **Monorepo**: Turborepo, npm Workspaces
- **Backend**: NestJS (Auth Service, Student Service, API Gateway)
- **Frontend**: Next.js 14 (App Router), Tailwind CSS
- **Database**: PostgreSQL, Redis, Prisma ORM
- **Infrastructure**: Docker Compose

## Architecture
- `apps/api-gateway`: Entry point (Port 3000). Handles proxying and Auth Guards.
- `apps/auth-service`: JWT Authentication (Port 3001).
- `apps/student-service`: Student CRUD (Port 3002).
- `apps/web-client`: Frontend Dashboard (Port 3001 - *Note: Conflict if running locally alongside Auth Service, check turbo.json or change port*).
    - Next.js default is 3000, we changed to 3001 in package.json dev script, but Auth Service is on 3001. 
    - **Update**: Web Client runs on Port 3005 (configured below).

## Setup & Run

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   - Copy `.env.example` to `.env` in the root.
   - Files are already configured to look at the root `.env` or local defaults.

3. **Start Infrastructure (Postgres & Redis)**
   ```bash
   docker-compose up -d
   ```
   *Ensure Docker Desktop is running.*

4. **Initialize Database**
   ```bash
   npx prisma db push
   ```

5. **Run All Services**
   ```bash
   npm run dev
   ```
   This will start all apps in parallel using Turborepo.

## Access
- **Web Client**: http://localhost:3005 (See package.json config)
- **API Gateway**: http://localhost:3000
    - Login: POST `/api/auth/login`
    - Students: GET `/api/students`

## Default Credentials
- **Admin**: `admin@school.com` / `admin`
- **Students**: `student1@example.com`, etc.

## Development Notes
- Shared code is in `packages/`.
- `packages/database` exports the Prisma Client.
- `packages/shared-dto` exports TypeScript interfaces.
