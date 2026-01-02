# My Circle Backend API

Private, finite social media backend built with Node.js, Express, and PostgreSQL.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Firebase project with Auth enabled

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` with your configuration:
   - Database credentials
   - Firebase project credentials
   - CORS origins

4. Run database migrations:
```bash
npm run db:migrate
```

5. (Optional) Seed test data:
```bash
npm run db:seed
```

6. Start the server:
```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

## API Endpoints

### Authentication

- `POST /v1/auth/register` - Register/login with Firebase token
- `GET /v1/me` - Get current user profile
- `PATCH /v1/me` - Update profile

### Users

- `GET /v1/users/search?q=query&limit=20` - Search users

### Invites

- `POST /v1/invites` - Create invite token
- `GET /v1/invites` - List your invites
- `GET /v1/invites/:token/validate` - Validate invite

## Database Schema

See `src/database/schema.sql` for complete schema.

## Development

The server auto-reloads on file changes when using `npm run dev`.

## Health Check

`GET /health` returns server status.
