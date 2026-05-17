# SkillPulse

SkillPulse is a full-stack learning tracker that helps you manage skills and log learning sessions.
It includes a CI/CD pipeline to build Docker images, publish them to Docker Hub, and deploy the app using Docker Compose.

## Problem it solves
- People lose track of what they learn and how much progress they make.
- Manually tracking sessions is time-consuming.
- Teams/students need a simple system to log learning progress consistently.

## Architecture (CI/CD Pipeline)
GitHub → GitHub Actions → Docker build → Docker Hub → Deployment (Docker Compose)

## Tech Stack
- Docker (backend + frontend + MySQL)
- Docker Compose (local orchestration)
- GitHub Actions (CI/CD automation)
- Backend: Go (Gin)
- Frontend: static assets served by Nginx
- Database: MySQL

## Step-by-step: How it was built & deployed
1. **Repository setup**: Backend (Go) and frontend (static UI) live in separate folders.
2. **Docker setup**:
   - `backend/Dockerfile` builds the Go API into a lightweight runtime image.
   - `frontend/Dockerfile` packages the frontend files into an Nginx image.
3. **Database initialization**:
   - `mysql/init.sql` creates schema/tables and seeds demo data.
4. **CI/CD pipeline (GitHub Actions)**:
   - On push, workflow builds backend and frontend Docker images.
   - Images are pushed to **Docker Hub**.
5. **Deployment**:
   - Docker Compose pulls/runs the images and connects backend to MySQL.
   - Nginx serves the frontend and reverse-proxies `/api/*` to the backend.

## How to run the project locally
1. **Clone the repo**
   ```bash
   git clone <your-repo-url>
   cd <repo>
   ```
2. **Create/configure environment variables**
   - Copy `.env.example` to `.env`
   - Set values for:
     - `DOCKERHUB_USERNAME`
     - `DB_USER`, `DB_PASSWORD`, `DB_NAME`
     - `MYSQL_ROOT_PASSWORD`
3. **Start containers**
   ```bash
   docker compose up -d --build
   ```

## CI/CD workflow explanation (push → build → test → deploy)
- **Push**: New commit pushed to GitHub.
- **Build**: GitHub Actions builds Docker images for backend and frontend.
- **Test**: (If configured) runs basic checks/tests before publishing.
- **Deploy**: Workflow deploys/runs containers using Docker Compose.

## Key features
- Skill CRUD (add skills, view skills, delete skills)
- Learning session logs per skill
- Dashboard summary (total hours, sessions, top skill)
- MySQL persistence with seeded demo data

## Future improvements
- Add production-grade security (non-root containers, stricter proxy settings)
- Add user authentication and per-user skill tracking

## Troubleshooting
- Containers won’t connect to DB:
  - Ensure `.env` values match your MySQL credentials.
  - Verify `DB_HOST` is `db` when running via Docker Compose.
- Frontend loads but API fails:
  - Ensure your browser is loading through the frontend container (nginx) so `/api/*` is proxied.
- Health endpoint:
  - Visit `http://localhost/health` when using Docker Compose locally.


