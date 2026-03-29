# NEXUS – Smart College Event Management System

Modern full-stack event & symposium management.

## Frontend (Next.js)

```bash
npm install
npm run dev
```

## Backend (Express + PostgreSQL)

The production target backend lives in `backend/` and uses PostgreSQL via Prisma.

### 1) Start PostgreSQL (local)

From the repo root:

```bash
docker compose up -d
```

If `docker` is not installed, install Docker Desktop (Windows/macOS) or run PostgreSQL another way and set `DATABASE_URL` in `backend/.env`.

### 2) Configure backend env

Copy:
- `backend/.env.example` → `backend/.env`

### 3) Install + migrate + run backend

```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

Health check: `GET http://localhost:4000/health`

