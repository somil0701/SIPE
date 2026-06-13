# Smart Interview Preparation Engine - Backend Design

This document describes the current backend implementation. The backend is a TypeScript Express modular monolith with feature routers and service classes.

## 1. Backend Structure

```text
backend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   ├── seedQuestions.ts
│   └── migrations/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── env.ts
│   │   ├── logger.ts
│   │   └── redis.ts
│   ├── judge/
│   │   ├── docker/dockerRunner.ts
│   │   ├── runners/
│   │   ├── types.ts
│   │   └── judge.service.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   ├── requestId.ts
│   │   └── validate.ts
│   ├── routes/
│   │   ├── admin.routes.ts
│   │   ├── analytics.routes.ts
│   │   ├── attempt.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── dashboard.routes.ts
│   │   ├── interview.routes.ts
│   │   ├── learning-path.routes.ts
│   │   ├── question.routes.ts
│   │   ├── resume.routes.ts
│   │   ├── spaced-repetition.routes.ts
│   │   └── user.routes.ts
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── server.ts
├── tests/
├── uploads/
├── logs/
├── package.json
└── tsconfig.json
```

There is no active `controllers/` folder. Routes perform request parsing/validation and call services directly.

## 2. Server Setup

`src/server.ts` configures:

- Express app
- HTTP server
- Socket.IO server
- Helmet
- CORS
- general rate limiting
- stricter auth route rate limiting
- JSON and URL-encoded body parsing
- compression
- Morgan logging
- request IDs
- API request duration logging
- `/health`
- `/health/db`
- `/api/v1/*` route mounts
- 404 handler
- centralized error handler
- graceful shutdown

## 3. Core Middleware

### Authentication

Protected routes use `authenticate`, which validates JWT access tokens and attaches `req.user`.

### Authorization

Admin routes use `authorize('admin')` after authentication.

### Validation

`validate({ body, query, params })` validates route inputs with Zod. Routes define schemas close to the endpoint they protect.

### Error Handling

`ApiError` provides consistent API errors for bad requests, unauthorized access, forbidden access, missing resources, conflicts, validation errors, and rate limits. Unknown errors pass through the global error handler.

## 4. API Surface

### Authentication

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | No | Register user. |
| `POST` | `/api/v1/auth/login` | No | Login user. |
| `POST` | `/api/v1/auth/refresh` | No | Refresh tokens. |
| `GET` | `/api/v1/auth/me` | Yes | Current user. |
| `POST` | `/api/v1/auth/change-password` | Yes | Change password. |
| `POST` | `/api/v1/auth/logout` | Yes | Stateless logout response. |

### Dashboard

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/dashboard` | Yes | Aggregates analytics, recommendations, recent interviews, and spaced repetition summary. |

### Users

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/users/profile` | Yes | Profile and attempt count. |
| `PATCH` | `/api/v1/users/profile` | Yes | Update profile settings. |
| `GET` | `/api/v1/users/skills` | Yes | User skill list. |
| `PUT` | `/api/v1/users/skills` | Yes | Update skill proficiency during onboarding/settings. |
| `GET` | `/api/v1/users/stats` | Yes | User attempt/solve/time stats. |
| `DELETE` | `/api/v1/users/account` | Yes | Soft delete account. |

### Questions

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/questions` | Optional | List with filters and pagination. |
| `GET` | `/api/v1/questions/search` | No | Search by query. |
| `GET` | `/api/v1/questions/recommended` | Yes | Personalized recommendations. |
| `GET` | `/api/v1/questions/due-reviews` | Yes | Due spaced repetition questions. |
| `GET` | `/api/v1/questions/company/:company` | No | Company-tagged questions. |
| `GET` | `/api/v1/questions/slug/:slug` | Optional | Question by slug. |
| `GET` | `/api/v1/questions/:id` | Optional | Question by ID. |

### Attempts and Judge

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/attempts/run` | Yes | Run code with custom stdin without saving an attempt. |
| `POST` | `/api/v1/attempts` | Yes | Submit and persist an attempt. |
| `GET` | `/api/v1/attempts` | Yes | List attempts. |
| `GET` | `/api/v1/attempts/questions/:questionId/timeline` | Yes | Submission timeline and mistake memory. |
| `GET` | `/api/v1/attempts/:id` | Yes | Attempt with testcase results and feedback. |
| `GET` | `/api/v1/attempts/:id/feedback` | Yes | AI feedback for attempt. |

### Interviews

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/interviews` | Yes | Create interview. |
| `GET` | `/api/v1/interviews` | Yes | List interviews. |
| `GET` | `/api/v1/interviews/:id` | Yes | Get interview. |
| `POST` | `/api/v1/interviews/:id/start` | Yes | Start interview. |
| `GET` | `/api/v1/interviews/:id/current-question` | Yes | Current question. |
| `POST` | `/api/v1/interviews/:id/answer` | Yes | Submit answer. |
| `POST` | `/api/v1/interviews/:id/skip` | Yes | Skip question. |
| `POST` | `/api/v1/interviews/:id/complete` | Yes | Complete interview. |
| `POST` | `/api/v1/interviews/:id/cancel` | Yes | Cancel interview. |
| `DELETE` | `/api/v1/interviews/:id` | Yes | Delete interview. |

### Resume

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/resumes/upload` | Yes | Upload PDF/DOCX resume. |
| `GET` | `/api/v1/resumes` | Yes | List resumes. |
| `GET` | `/api/v1/resumes/current` | Yes | Active resume. |
| `GET` | `/api/v1/resumes/skills-gap/analysis` | Yes | Resume skill gap analysis. |
| `GET` | `/api/v1/resumes/personalized-questions/list` | Yes | Resume-based questions. |
| `POST` | `/api/v1/resumes/current/job-match` | Yes | Match resume against job description. |
| `GET` | `/api/v1/resumes/:id` | Yes | Resume by ID. |
| `DELETE` | `/api/v1/resumes/:id` | Yes | Delete resume. |

### Analytics

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/analytics` | Yes | Full analytics. |
| `GET` | `/api/v1/analytics/daily` | Yes | Daily analytics. |
| `GET` | `/api/v1/analytics/weak-topics` | Yes | Weak topics. |
| `GET` | `/api/v1/analytics/strong-topics` | Yes | Strong topics. |
| `GET` | `/api/v1/analytics/leaderboard` | No | Global or weekly leaderboard. |

### Learning Paths

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/learning-paths` | Yes | List paths. |
| `POST` | `/api/v1/learning-paths` | Yes | Create path. |
| `GET` | `/api/v1/learning-paths/:id` | Yes | Path details. |
| `PATCH` | `/api/v1/learning-paths/:id/items/:itemId` | Yes | Update item status. |
| `POST` | `/api/v1/learning-paths/:id/pause` | Yes | Pause path. |
| `POST` | `/api/v1/learning-paths/:id/resume` | Yes | Resume path. |
| `DELETE` | `/api/v1/learning-paths/:id` | Yes | Delete path. |

### Spaced Repetition

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/spaced-repetition` | Yes | List entries. |
| `GET` | `/api/v1/spaced-repetition/due` | Yes | Due reviews. |
| `GET` | `/api/v1/spaced-repetition/stats` | Yes | Review stats. |
| `GET` | `/api/v1/spaced-repetition/:id` | Yes | Entry details. |
| `POST` | `/api/v1/spaced-repetition/:id/review` | Yes | Submit quality rating. |
| `POST` | `/api/v1/spaced-repetition/questions/:questionId/add` | Yes | Add question. |
| `DELETE` | `/api/v1/spaced-repetition/:id` | Yes | Remove entry. |
| `POST` | `/api/v1/spaced-repetition/:id/reset` | Yes | Reset progress. |

### Admin

All admin endpoints require `admin` role.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/admin/stats` | Platform stats. |
| `GET` | `/api/v1/admin/growth-chart` | Signup chart data. |
| `GET` | `/api/v1/admin/judge-reliability` | Judge reliability dashboard data. |
| `GET` | `/api/v1/admin/users` | User search/filter/pagination. |
| `PATCH` | `/api/v1/admin/users/:id` | Update user role, premium, ban state. |
| `GET` | `/api/v1/admin/questions` | Question search/filter/pagination. |
| `POST` | `/api/v1/admin/questions` | Create question. |
| `PATCH` | `/api/v1/admin/questions/:id` | Update question. |
| `DELETE` | `/api/v1/admin/questions/:id` | Delete question. |
| `GET` | `/api/v1/admin/skills` | Skills for question form. |
| `GET` | `/api/v1/admin/interviews` | Interview monitoring. |
| `GET` | `/api/v1/admin/resumes` | Resume management. |
| `GET` | `/api/v1/admin/resumes/:id/download` | Protected resume download. |

## 5. Service Responsibilities

- `auth.service.ts`: registration, login, refresh, current user, password change.
- `question.service.ts`: question listing, lookup, recommendations, due reviews, company filters, stats updates.
- `attempt.service.ts`: run code, submit attempts, judge results, AI feedback, skill updates, analytics updates, spaced repetition updates, submission timeline, mistake memory.
- `judge.service.ts`: normalize testcases, compile when needed, run containers, map verdicts.
- `dockerRunner.ts`: isolated Docker execution with resource limits and cleanup.
- `analytics.service.ts`: user analytics, daily analytics, weak/strong topics, leaderboard.
- `interview.service.ts`: create/start/progress/complete/cancel/delete interview sessions.
- `resume.service.ts`: upload, parse, active resume, skills gap, personalized questions, job match.
- `resume-review.service.ts`: AI-driven resume quality review and fallback parsing.
- `admin.service.ts`: platform stats, growth, judge reliability, admin users/questions/interviews/resumes.

## 6. Judge Flow

1. Validate language and question ID.
2. Create temporary workspace.
3. Write submitted code to language-specific source file.
4. Compile for compiled languages.
5. Run each testcase in a Docker container.
6. Capture stdout, stderr, exit code, timeout, and execution time.
7. Compare stdout to expected output.
8. Store attempt and testcase results for full submissions.
9. Generate AI feedback.
10. Update skills, question stats, analytics, and spaced repetition.

## 7. Caching

Redis cache helpers support:

- user cache,
- question cache,
- question list cache,
- user skills cache,
- analytics cache,
- leaderboard cache,
- dashboard cache,
- pattern invalidation.

Caching is used selectively and invalidated after attempt, profile, and analytics updates.

## 8. Reliability Notes

- Prisma is a singleton in development to reduce hot-reload connection churn.
- `/health` and `/health/db` verify database connectivity.
- Supabase direct DB URLs can occasionally produce Prisma `P1001` connection errors; a pooler URL is preferred for production app traffic.
- Judge telemetry is currently inferred from attempts and testcase rows rather than a separate event stream.
- Frontend production builds can update `frontend/dist/index.html` asset hashes.

## 9. Scripts

```bash
npm run dev
npm run build
npm start
npm run typecheck
npm run lint
npm run lint:fix
npm run format
npm test
npm run test:watch
npm run test:coverage
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:seed
npm run db:studio
```

