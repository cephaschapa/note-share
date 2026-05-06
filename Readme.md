# Note Tasking System

An open-source note sharing and versioning platform with a TypeScript backend, a modern Next.js frontend, and asynchronous processing powered by Redis + BullMQ.

## What this project does

- Upload and manage notes with metadata (title, subject, visibility, description)
- Track note versions and restore previous versions
- Browse and search public notes
- JWT-based authentication and user profile pages
- Local file storage or S3-backed storage via configurable storage driver
- Background job processing for note-related tasks

## Tech stack

- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL
- Frontend: Next.js (App Router), React, Tailwind CSS
- Queue: BullMQ + Redis
- Storage: Local filesystem or AWS S3 (presigned URLs)
- Infra: Docker Compose (dev and production variants), Nginx (production)

## Repository structure

- `src/` - backend API, worker, routes, services, middleware
- `prisma/` - schema and migrations
- `web/` - Next.js frontend
- `docker-compose.yml` - local development stack
- `docker-compose.prod.yml` - production stack (with Nginx)
- `Dockerfile.api`, `Dockerfile.worker`, `web/Dockerfile` - container builds

## Prerequisites

- Node.js 22+
- npm 10+
- Docker + Docker Compose (for containerized workflows)

## Local development (without Docker)

1. Install dependencies:

```bash
npm install
cd web && npm install
```

2. Configure environment:
- Create/update root `.env` with database, auth, redis, and storage values.
- Set `STORAGE_DRIVER=local` for local filesystem storage, or `s3` for S3.
- If using S3, ensure `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` are set.

3. Prepare database:

```bash
npx prisma migrate dev
npx prisma generate
```

4. Run services in separate terminals:

```bash
# API
npm run dev

# Worker
npm run worker

# Frontend
cd web
npm run dev
```

5. Open:
- Frontend: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:4000/health](http://localhost:4000/health)

## Docker development

Run the full stack from the repo root:

```bash
docker compose up --build
```

Services:
- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Production deployment

This repo includes:
- `docker-compose.prod.yml` for production service orchestration
- `nginx.conf` for reverse proxying web + API traffic
- `deploy.sh` helper script
- `.env.production.example` as a configuration template

Typical flow:

1. Copy `.env.production.example` to `.env.production`
2. Fill all required secrets and URLs
3. Run production compose:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Environment variables (core)

- `DATABASE_URL` - Prisma/PostgreSQL connection string
- `PORT` - API port (default `4000`)
- `JWT_SECRET` - token signing secret
- `UPLOAD_DIR` - local upload path for `local` storage driver
- `REDIS_HOST`, `REDIS_PORT` - queue backend connection
- `STORAGE_DRIVER` - `local` or `s3`
- `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - required when `STORAGE_DRIVER=s3`
- `NEXT_PUBLIC_API_URL` - frontend API base URL (should include `/api`)

## API overview

Base path: `/api`

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/notes`
- `GET /api/notes/:id`
- `POST /api/notes`
- `POST /api/notes/:id/versions`
- `POST /api/notes/:id/versions/:versionId/restore`
- `GET /api/notes/:id/download`

## Open-source contribution guide

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Make focused changes with clear commit messages
4. Run relevant checks/tests locally
5. Open a pull request with:
   - what changed
   - why it changed
   - how you verified it

## Security notes

- Never commit real credentials or production secrets
- Use `.env.production` (ignored) for deployment secrets
- Rotate any leaked keys immediately

## License

This project is open-source. Add a `LICENSE` file (for example MIT) to define reuse terms explicitly.
