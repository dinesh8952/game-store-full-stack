# Game Store Application

A full-stack web application designed for administrators to manage a catalog of games and for approved users to browse and interact with the platform.

---

## Technology Stack

### Frontend Architecture
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **State & Data Fetching**: React Query, Axios
- **Routing**: React Router DOM

### Backend Architecture
- **Environment**: Node.js, Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **In-Memory Cache**: Redis (ioredis)
- **Authentication**: JSON Web Tokens (JWT)

### Infrastructure
- **Containerization**: Docker, Docker Compose (Multi-stage build processes)

---

## Setup and Installation

### Prerequisites
- Docker and Docker Compose installed on the host machine.
- Node.js (Optional, for local development outside of Docker).

### Deployment via Docker

1. **Clone the repository**
2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   *Ensure that the `JWT_SECRET` and `SUPER_ADMIN_PASSWORD` are updated in the `.env` file for production security.*
3. **Initialize the application:**
   ```bash
   docker compose up --build
   ```

The application will be accessible at **`http://localhost:3000`**

### Startup Sequence
- The PostgreSQL database initializes and Prisma migrations are executed automatically.
- A default super administrator account is seeded using the `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` defined in the `.env` file.
- The React frontend is compiled and served as static assets by the Express backend.

### Default Administrator Credentials
If using the default `.env.example` configurations:
```text
Email:    admin@gamestore.com
Password: DevAdmin@2024!
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DB` | PostgreSQL database name |
| `REDIS_URL` | Redis connection string |
| `REDIS_PASSWORD` | Redis authentication password |
| `JWT_SECRET` | Cryptographic key for signing JWTs |
| `JWT_EXPIRES_IN` | JWT expiration duration |
| `PORT` | Application port (default: 3000) |
| `NODE_ENV` | Runtime environment (development / production) |
| `SUPER_ADMIN_EMAIL` | Email address for the initial seeded administrator |
| `SUPER_ADMIN_PASSWORD` | Password for the initial seeded administrator |

---

## System Architecture

### 1. Monorepo Configuration
The repository contains both the React frontend (`client/`) and the Node.js backend (`src/`). During the Docker compilation phase, the React application is built into static files and served directly by the Express framework, unifying the deployment process.

### 2. Redis Caching Strategy
User session and profile data are cached in Redis with a 60-second Time-To-Live (TTL) to mitigate redundant database queries. Administrative actions, such as user approval or rejection, trigger explicit cache invalidations to ensure state consistency.

### 3. Asynchronous Buffer Pattern
Game play counts are written directly to Redis (`INCR play_count:{gameId}`) rather than synchronously hitting the PostgreSQL database. A background worker periodically flushes these accumulated counts to the database using `DECRBY`, ensuring high throughput and preventing data loss during potential database write failures.

### 4. Multi-Stage Docker Builds
The containerization strategy utilizes multi-stage builds. A dedicated builder image compiles the React frontend, a secondary node builder compiles the TypeScript backend and Prisma client, and a final, minimal Alpine image runs the compiled artifacts. This reduces the final container size and minimizes the attack surface.

---

## Project Structure

```text
/
├── client/                 # React Application Directory
│   ├── src/                
│   │   ├── api/            # Axios interceptors and configuration
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React Context providers (Authentication)
│   │   ├── pages/          # View components and routing targets
│   │   └── App.tsx         # Application entry point
│   └── package.json
│
├── src/                    # Express Application Directory
│   ├── config/             # Database, Redis, and Logger configurations
│   ├── controllers/        # Request handling and response formatting
│   ├── middleware/         # Security, validation, and request interception
│   ├── routes/             # API endpoint definitions
│   ├── services/           # Core business logic and database interactions
│   ├── jobs/               # Asynchronous background tasks
│   └── app.ts              # Express application bootstrap
│
├── prisma/                 # Database Layer
│   ├── schema.prisma       # Entity relationship definitions
│   └── seed.ts             # Initial data population scripts
│
├── docker-compose.yml      # Service orchestration configuration
├── Dockerfile              # Multi-stage build definitions
└── package.json            # Backend dependency management
```
