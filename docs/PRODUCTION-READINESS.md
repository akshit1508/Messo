# MESO — Production Readiness & Deployment Runbook

## 1. System Architecture & Topology

MESO operates as a multi-tier, decoupled architecture with Spring Boot acting as the single trusted API Gateway and authority over authentication and authorization.

```text
[ Browser / Client ]
        │
        │ HTTP/HTTPS (Port 3000 / 443)
        ▼
[ Next.js 14 Frontend ]
        │
        │ Authenticated REST via JSESSIONID + X-XSRF-TOKEN
        ▼
[ Spring Boot 3.2.5 Trusted Gateway (Port 8080) ]
        │                                  │
        │ JDBC (Port 3306)                 │ Internal HTTP Proxy (10s Timeout)
        ▼                                  ▼
[ MySQL 8.0 Database ]             [ FastAPI AI Microservice (Port 8000) ]
- Operational Tables:              - Root Cause Engine
  daily_menu, foods,               - Forecast Engine (Gradient Boosting)
  food_reviews, complaints,        - Simulation Engine (Monte Carlo)
  food_polls, poll_votes           - Zero Operational DB Mutation
- AI Audit Tables:                 - Persistence to ai_simulation
  ai_simulation
```

### Architectural Guarantees:
- **No Direct Browser Access to AI:** Public clients never connect to the Python AI service directly. All AI endpoints are routed via `/api/admin/ai/*`.
- **Session-Based Security:** Authentication strictly leverages `JSESSIONID` cookie sessions with `X-XSRF-TOKEN` CSRF token verification. No JWT is required or supported.
- **Zero Operational Mutation:** Simulations run counterfactually in-memory against feature vectors. They record audit entries into `ai_simulation` without modifying operational menus or reviews.

---

## 2. Services & Port Mapping

| Service | Technology | Default Port | Internal / External | Health Check Endpoint |
|---|---|:---:|:---:|---|
| **Frontend UI** | Next.js 14 (Node.js 20+) | `3000` | External | `/` or `/login` |
| **API Gateway & Core API** | Java 17 / Spring Boot 3.2.5 | `8080` | External | `/login` / `/api/auth/csrf` |
| **AI Microservice** | Python 3.10+ / FastAPI / Uvicorn | `8000` | Internal Only | `/health` |
| **Persistence Tier** | MySQL 8.0 | `3306` | Internal Only | `SELECT 1` |

---

## 3. Required Environment Variables

### A. Spring Boot Gateway
| Variable | Description | Default (Local Dev) | Production Example |
|---|---|---|---|
| `SPRING_DATASOURCE_URL` | JDBC Connection String | `jdbc:mysql://localhost:3306/messo` | `jdbc:mysql://db-prod.internal:3306/messo?useSSL=true` |
| `SPRING_DATASOURCE_USERNAME` | Database User | `root` | `messo_app_user` |
| `SPRING_DATASOURCE_PASSWORD` | Database Password | `root` | *[Secret Vault]* |
| `APP_CORS_ALLOWED_ORIGINS` | Permitted Frontend Origins | `http://localhost:3000,...` | `https://messo.hostel.edu` |
| `APP_AI_SERVICE_URL` | Internal FastAPI Service Base URL | `http://127.0.0.1:8000` | `http://ai-service.internal:8000` |

### B. Python AI Microservice (FastAPI)
| Variable | Description | Default (Local Dev) | Production Example |
|---|---|---|---|
| `MYSQL_HOST` | Database Hostname | `localhost` | `db-prod.internal` |
| `MYSQL_PORT` | Database Port | `3306` | `3306` |
| `MYSQL_USER` | Database User (Read-only on operational, Insert on `ai_simulation`) | `root` | `messo_ai_user` |
| `MYSQL_PASSWORD` | Database Password | `root` | *[Secret Vault]* |
| `MYSQL_DATABASE` | Database Name | `messo` | `messo` |

### C. Next.js Frontend
| Variable | Description | Default (Local Dev) | Production Example |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Public Spring Boot Gateway URL | `http://localhost:8080` | `https://api.messo.hostel.edu` |

---

## 4. Startup Order & Lifecycle

Services must be initialized in sequence:
1. **MySQL 8.0 Database:** Verify schemas and seed tables exist.
2. **FastAPI AI Service:** Starts up statistical and machine learning engines; exposes `/health`.
3. **Spring Boot Gateway:** Connects to MySQL, initializes security filters, verifies admin account.
4. **Next.js Frontend:** Starts SSR/Static node server pointing to Spring Boot.

### Development Startup Commands:
```bash
# 1. FastAPI AI Service
cd ai-service
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# 2. Spring Boot
./mvnw.cmd spring-boot:run

# 3. Next.js Frontend
cd frontend
npm run dev
```

### Production Startup Commands:
```bash
# 1. FastAPI AI Service
cd ai-service
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 60

# 2. Spring Boot (Packaged Fat JAR)
java -Xms512m -Xmx2048m -jar target/messo-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=production

# 3. Next.js Frontend
cd frontend
npm run build
npm run start -p 3000
```

---

## 5. Security & Authentication Model

### Session & Access Control:
- **`ROLE_ADMIN`:** Full access to `/admin/**` pages and `/api/admin/**` endpoints including AI intelligence.
- **`ROLE_STUDENT`:** Restricted to `/student/**` and `/api/student/**`. Prohibited from accessing `/api/admin/**` (returns HTTP 403 Forbidden).
- **Unauthenticated Users:** Any request to `/api/admin/**` or `/api/student/**` without an active session cookie returns HTTP 401 Unauthorized.
- **CSRF Token:** Non-idempotent HTTP methods (`POST`, `PUT`, `DELETE`) require the `X-XSRF-TOKEN` request header matching the session cookie.
- **Credential Safety:** Passwords are stored exclusively as salted BCrypt hashes (`$2a$10$...`). Raw passwords and session cookies are never logged.

---

## 6. Failure Handling & Circuit Protection

1. **AI Microservice Outage:**
   - When FastAPI is stopped or unreachable, Spring Boot's `AiGatewayService` returns HTTP 503 `SERVICE_UNAVAILABLE` with user-safe message: `"AI analysis service is temporarily unavailable. Please retry."`
   - Internal hostnames, ports, and stack traces are suppressed.
2. **AI Microservice 500 Error:**
   - Spring Boot intercepts 5xx responses and maps them to HTTP 502 `BAD_GATEWAY` with user-safe message: `"AI analysis service encountered an internal error. Please retry."`
3. **Simulation Audit Persistence Glitch:**
   - If writing to `ai_simulation` fails (e.g. transient table lock), the simulation computation finishes successfully, logs a structured error internally, and returns `audit_persistence_status: "FAILED"` with a degraded audit warning.

---

## 7. Health Checks & Monitoring

- **Spring Boot:** `GET http://localhost:8080/api/auth/csrf` (returns 200 OK with CSRF token).
- **FastAPI:** `GET http://localhost:8000/health` (returns `{"status":"UP","service":"meso-ai-service","version":"0.2.0"}`).
- **Next.js:** `GET http://localhost:3000/` (returns 200 OK).

---

## 8. Verified Test Suites

| Suite | Command | Result |
|---|---|:---:|
| Python AI Engines & API | `python -m pytest ai-service/tests/ -v` | **40 / 40 Passed** |
| Spring Boot Unit & Security | `./mvnw.cmd test` | **33 / 33 Passed** |
| Frontend TypeScript Typecheck | `npm run typecheck` | **0 Errors** |
| Frontend ESLint | `npm run lint` | **0 Warnings / 0 Errors** |
| Frontend Production Build | `npm run build` | **Passed (20/20 Routes Compiled)** |
| Live End-to-End Pipeline | `verify_e2e_live.py` | **Passed Across All 7 Steps** |

---

## 9. Deployment & Rollback Checklist

### Deployment Checklist:
- [x] Run database migrations on MySQL.
- [x] Verify operational tables: `daily_menu`, `foods`, `food_reviews`, `complaints`, `food_polls`, `poll_votes`.
- [x] Verify `ai_simulation` audit table exists.
- [x] Set production environment variables (`SPRING_DATASOURCE_*`, `APP_AI_SERVICE_URL`, `NEXT_PUBLIC_API_URL`).
- [x] Start FastAPI service and verify `GET /health` returns `UP`.
- [x] Start Spring Boot service and verify database connectivity.
- [x] Build and start Next.js production server.
- [x] Confirm admin login (`admin@messo.com`) loads `/admin/intelligence`.

### Rollback Checklist:
- [x] If frontend deployment fails, rollback to previous Next.js Docker image/build.
- [x] If Spring Boot gateway fails, revert to previous jar; database schema is backward-compatible (`ai_simulation` is strictly additive).
- [x] If AI microservice is stopped, existing MESO operational features (menu display, voting, complaints, ratings) continue functioning without interruption.
