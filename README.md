# Smart Interview Preparation Engine

Smart Interview Preparation Engine (SIPE) is a full-stack, AI-assisted interview preparation platform. It combines coding practice, Docker-based code judging, adaptive recommendations, mock interviews, resume analysis, spaced repetition, learning paths, analytics, and admin operations in one application.

The product is built as a modular monolith: a React/Vite frontend talks to an Express/TypeScript API, Prisma manages PostgreSQL data, Redis supports caching, and Docker runs user code in isolated judge containers.

## Current Product Scope

SIPE currently supports:

- Account registration, login, JWT refresh, logout, and protected user sessions.
- Personalized dashboard with progress, recommended questions, recent interviews, and spaced repetition status.
- Practice question browsing with search, difficulty filters, type filters, pagination, and question detail pages.
- Monaco-powered coding workspace with starter code, multiple languages, custom stdin, run-only execution, and full submission judging.
- Submission Timeline and Mistake Memory for every question, including previous attempts, failed testcase evidence, AI feedback, and code snapshots that can be loaded back into the editor.
- Docker-based coding judge for JavaScript, Python, Java, and C++.
- AI feedback on submitted solutions.
- Mock interview creation, interview sessions, answer submission, skipping, completion, cancellation, and session feedback.
- Analytics dashboards for progress, weekly trends, difficulty breakdown, weak topics, strong topics, streaks, and leaderboards.
- Resume upload and AI review for PDF/DOCX resumes, including ATS scoring, strengths, weaknesses, project analysis, experience analysis, improvement suggestions, and job-description matching.
- Spaced repetition review scheduling using an SM-2 style algorithm.
- Learning paths generated from weak topics, with progress tracking, pause/resume, and item completion.
- Profile management, preferred language, study goal, timezone, skill levels, and account deletion.
- Admin dashboard for user growth, platform stats, question management, user management, resume management, interview monitoring, and judge reliability metrics.

## Tech Stack

### Backend

- Runtime: Node.js 20
- Framework: Express.js with TypeScript
- Database: PostgreSQL with Prisma ORM
- Cache: Redis through ioredis
- Authentication: JWT access tokens and refresh tokens
- Validation: Zod validation middleware
- Logging: Winston and Morgan
- Security middleware: Helmet, CORS, request IDs, rate limiting
- File uploads: Multer with local upload storage
- AI integrations: OpenAI-compatible services plus configured Groq model support for resume review flows
- Code judge: Docker containers with CPU, memory, PID, network, and filesystem restrictions
- Realtime foundation: Socket.IO server rooms for user and interview channels

### Frontend

- Framework: React 18 with TypeScript
- Build tool: Vite
- Routing: React Router
- Styling: Tailwind CSS
- Server state: TanStack Query
- Client state: Zustand with persistence
- Charts: Recharts
- Editor: Monaco Editor with optional Vim mode
- Notifications: React Hot Toast
- Icons: Lucide React

## Application Pages

### Authentication

The login and registration pages provide email/password authentication, validation feedback, loading states, success/error toasts, and redirects based on authentication state. Password creation requires a minimum length plus uppercase, lowercase, and numeric characters on the backend.

### Dashboard

The dashboard is the authenticated home screen. It displays user progress, quick actions, personalized recommended questions, recent mock interviews, and spaced repetition summary data. Dashboard data is aggregated through a backend endpoint and cached briefly in Redis.

### Practice Questions

The practice page lets users browse active questions. It supports:

- Search by text.
- Difficulty filtering.
- Question type filtering.
- Paginated results.
- Difficulty badges.
- Question skill/category metadata.
- Empty, loading, and retry states.

Question detail pages include:

- Problem statement rendered from stored HTML.
- Examples extracted from testcase data.
- Constraints.
- Toggleable hints.
- Solution explanation when available.
- Language selector.
- Monaco code editor.
- Optional Vim mode.
- Custom stdin panel.
- Output panel.
- Run Code action for one-off execution without saving an attempt.
- Submit action for full judging and attempt persistence.

### Submission Timeline and Mistake Memory

Every question now has a dedicated submissions tab that goes beyond a single latest result.

The timeline includes:

- Total attempts.
- Latest verdict.
- Best AI score.
- Average time spent.
- All recent attempts ordered by submission time.
- Per-attempt language, status, runtime, submitted time, testcase pass count, AI score, and feedback.
- First failing testcase evidence with input, expected output, actual output, and error message.
- Code snapshot for each attempt.
- Load Code action to restore an older attempt into the editor.

Mistake Memory summarizes recurring problems across attempts:

- Repeated verdict patterns such as wrong answers, timeouts, runtime errors, and compilation errors.
- Testcases that fail repeatedly.
- AI-identified weaknesses from feedback.
- Evidence from recent attempts.
- Short coaching suggestions for what to inspect next.

This feature is backed by:

- `GET /api/v1/attempts/questions/:questionId/timeline`
- Existing `attempts`, `attempt_test_cases`, and `attempt_feedback` data.

### Mock Interviews

The mock interview page lets users create and review interview sessions. Users can choose interview type and difficulty, then enter an interview session flow.

Supported interview types:

- Technical
- Behavioral
- Mixed
- System design

Interview session behavior includes:

- Starting a scheduled interview.
- Showing the current question.
- Text answer input.
- Answer submission.
- Skipping current question.
- Completion flow.
- Completed interview feedback and scores.
- Cancellation and deletion endpoints.

### Analytics

The analytics page shows performance data from attempts, user skills, and daily analytics. It includes:

- Summary analytics.
- Weekly progress chart.
- Difficulty breakdown.
- Weak topics.
- Strong topics.
- Accuracy and solved/attempted metrics.
- Empty states when the user has not practiced yet.
- Retry states when individual sections fail to load.

### Resume Review

The resume page supports PDF and DOCX upload. The backend stores the file locally, extracts text, runs analysis, and marks an active resume.

Implemented resume functionality includes:

- PDF/DOCX upload.
- File type validation.
- File size limit from `MAX_FILE_SIZE`.
- Active resume tracking.
- Parsed resume text and structured data.
- Skills detected from resume content.
- ATS score display.
- Overall resume scoring.
- Strengths and weaknesses.
- Skill categories.
- Priority improvements.
- Project analysis with quality score, strengths, weaknesses, measurable impact, and suggested descriptions.
- Experience analysis with weak bullets, action rewrites, quantification ideas, and suggestions.
- Parsed resume fallback view.
- Job description matching with resume-fit feedback and improvement suggestions.
- Resume deletion.

### Spaced Repetition

The spaced repetition page surfaces due reviews and review stats.

Implemented behavior:

- Show due review questions.
- Display total cards, mastered cards, due today, due this week, retention rate, and review history.
- Add questions to spaced repetition.
- Submit quality ratings from 0 to 5.
- Update next review date using an SM-2 style scheduling algorithm.
- Track repetitions, interval, ease factor, successful reviews, failed reviews, and mastery.
- Reset review progress.
- Remove a question from spaced repetition.

### Learning Paths

Learning paths organize practice around a goal. A path can target a skill or company and is generated from the user's weak topics.

Implemented behavior:

- List user learning paths.
- Create a path with name, description, target skill, target company, and estimated hours.
- Generate path items from weak topics and related easy questions.
- View path details and study items.
- Mark items as pending, in progress, completed, or skipped.
- Automatically update completed item count and progress percentage.
- Mark the whole path completed when all items are completed.
- Pause, resume, and delete paths.

### Profile

The profile page supports user account settings and stats:

- Full name.
- Email display.
- Role and premium status display.
- Preferred coding language.
- Study goal minutes.
- Timezone.
- Onboarding completion state.
- Attempt count.
- User skill list.
- Profile update.
- Logout.
- Account deletion endpoint.

### Admin Dashboard

Admin routes are protected by authentication and `admin` role authorization.

The admin overview shows:

- Total users.
- New signups today.
- Daily active users.
- Monthly active users.
- Problems solved today.
- Mock interviews today.
- Resumes uploaded today.
- Total completed payment revenue.
- User growth chart for the last 7 days.

### Admin Judge Reliability Dashboard

The admin dashboard includes live judge reliability metrics for the last 7 days.

It shows:

- Total judge submissions.
- Judge success rate.
- Failure rate.
- Timeout rate.
- Compilation error rate.
- Runtime error rate.
- Average execution time.
- Maximum execution time.
- Verdict mix with visual bars.
- Language health table with run count, average pass rate, and average runtime.
- Common judge error signatures from failing testcases.
- Recent judge failures with user, question, language, testcase count, failed testcase index, runtime, and error message.

This is backed by:

- `GET /api/v1/admin/judge-reliability?days=7`

### Admin User Management

Admins can:

- Search users by name or email.
- Filter users by role or premium state.
- View user account metadata.
- Change user role.
- Toggle premium.
- Soft-ban or unban users through `deletedAt`.
- Use paginated results.

### Admin Question Management

Admins can:

- Search questions by title or slug.
- Filter by difficulty.
- Create questions.
- Edit questions.
- Delete questions.
- Toggle question visibility.
- Manage basics such as title, slug, description, problem statement, difficulty, type, and skill.
- Manage coding data such as starter code and solution code.
- Manage testcase input, expected output, and example flags.
- Manage constraints, hints, topic tags, company tags, complexity metadata, premium state, active state, and explanations.
- Validate required coding fields before save.

### Admin Interview Monitoring

Admins can:

- View mock interview sessions.
- Filter by status.
- See user details and interview metadata.
- Page through interview history.

### Admin Resume Management

Admins can:

- View uploaded resumes.
- Filter by parsing status.
- See owner, file metadata, active state, parsing status, and parsing errors.
- Download stored resume files through a protected admin endpoint.
- Page through resume records.

## Project Structure

```text
interview-prep-engine/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   ├── seedQuestions.ts
│   │   └── migrations/
│   ├── src/
│   │   ├── config/
│   │   ├── judge/
│   │   │   ├── docker/
│   │   │   ├── runners/
│   │   │   ├── types.ts
│   │   │   └── judge.service.ts
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   └── server.ts
│   ├── uploads/
│   ├── logs/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   └── admin/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── docs/
├── docker-compose.yml
└── README.md
```

## Backend API

All normal API routes are mounted under `/api/v1`.

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Register a user with email, password, and full name. |
| `POST` | `/auth/login` | Log in and receive user data plus JWT tokens. |
| `POST` | `/auth/refresh` | Refresh access and refresh tokens. |
| `GET` | `/auth/me` | Return the current authenticated user. |
| `POST` | `/auth/change-password` | Change password after verifying the current password. |
| `POST` | `/auth/logout` | Stateless logout response; client discards tokens. |

### Dashboard

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/dashboard` | Aggregated authenticated dashboard data: analytics, recommendations, recent interviews, and spaced repetition summary. |

### Questions

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/questions` | List questions with difficulty, skill, type, company, search, premium, sort, and pagination filters. |
| `GET` | `/questions/search` | Search questions by query. |
| `GET` | `/questions/recommended` | Return personalized recommended questions for the authenticated user. |
| `GET` | `/questions/due-reviews` | Return due review questions from spaced repetition. |
| `GET` | `/questions/company/:company` | List questions tagged for a company. |
| `GET` | `/questions/slug/:slug` | Return a question by slug. |
| `GET` | `/questions/:id` | Return a question by ID. |

### Attempts and Judge

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/attempts/run` | Run code once with custom stdin without saving a persisted attempt. |
| `POST` | `/attempts` | Submit a solution, persist an attempt, run judge testcases, generate AI feedback, update skills, analytics, and spaced repetition. |
| `GET` | `/attempts` | List user attempts with question and status filters. |
| `GET` | `/attempts/questions/:questionId/timeline` | Return submission timeline and mistake memory for one question. |
| `GET` | `/attempts/:id` | Return one attempt with testcase results, feedback, and question metadata. |
| `GET` | `/attempts/:id/feedback` | Return AI feedback for an attempt. |

### Interviews

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/interviews` | Create a mock interview session. |
| `GET` | `/interviews` | List user interviews with status and pagination filters. |
| `GET` | `/interviews/:id` | Return an interview session. |
| `POST` | `/interviews/:id/start` | Start a scheduled interview. |
| `GET` | `/interviews/:id/current-question` | Return the current interview question. |
| `POST` | `/interviews/:id/answer` | Submit an answer for the current question. |
| `POST` | `/interviews/:id/skip` | Skip the current question. |
| `POST` | `/interviews/:id/complete` | Complete an interview and generate final session data. |
| `POST` | `/interviews/:id/cancel` | Cancel an interview. |
| `DELETE` | `/interviews/:id` | Delete an interview. |

### Analytics

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/analytics` | Return full user analytics. |
| `GET` | `/analytics/daily` | Return daily analytics for a configurable day range. |
| `GET` | `/analytics/weak-topics` | Return weakest topics by accuracy. |
| `GET` | `/analytics/strong-topics` | Return strongest topics by accuracy and solved count. |
| `GET` | `/analytics/leaderboard` | Return global or weekly leaderboard data. |

### Resume

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/resumes/upload` | Upload and parse a PDF/DOCX resume. |
| `GET` | `/resumes` | List user resumes. |
| `GET` | `/resumes/current` | Return active resume or `null`. |
| `GET` | `/resumes/skills-gap/analysis` | Return skill gap analysis based on resume skills. |
| `GET` | `/resumes/personalized-questions/list` | Generate resume-based interview questions. |
| `POST` | `/resumes/current/job-match` | Match active resume against a job description. |
| `GET` | `/resumes/:id` | Return one resume by ID. |
| `DELETE` | `/resumes/:id` | Delete a resume. |

### Users

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/users/profile` | Return user profile and attempt count. |
| `PATCH` | `/users/profile` | Update full name, preferred language, study goal, and timezone. |
| `GET` | `/users/skills` | Return user skill records with skill metadata. |
| `PUT` | `/users/skills` | Update onboarding skill proficiency levels. |
| `GET` | `/users/stats` | Return user totals for attempts, solved questions, time, skill count, and accuracy. |
| `DELETE` | `/users/account` | Soft delete the current account. |

### Learning Paths

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/learning-paths` | List user learning paths. |
| `POST` | `/learning-paths` | Create a personalized path from weak topics. |
| `GET` | `/learning-paths/:id` | Return path details and ordered items. |
| `PATCH` | `/learning-paths/:id/items/:itemId` | Update path item status. |
| `POST` | `/learning-paths/:id/pause` | Pause a path. |
| `POST` | `/learning-paths/:id/resume` | Resume a path. |
| `DELETE` | `/learning-paths/:id` | Delete a path. |

### Spaced Repetition

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/spaced-repetition` | List all user spaced repetition entries. |
| `GET` | `/spaced-repetition/due` | List due reviews. |
| `GET` | `/spaced-repetition/stats` | Return card, mastery, due, retention, and review history stats. |
| `GET` | `/spaced-repetition/:id` | Return a spaced repetition entry and recent review history. |
| `POST` | `/spaced-repetition/:id/review` | Submit quality rating and schedule next review. |
| `POST` | `/spaced-repetition/questions/:questionId/add` | Add a question to spaced repetition. |
| `DELETE` | `/spaced-repetition/:id` | Remove a spaced repetition entry. |
| `POST` | `/spaced-repetition/:id/reset` | Reset spaced repetition progress. |

### Admin

All admin routes require an authenticated user with role `admin`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/admin/stats` | Return platform stats for admin overview. |
| `GET` | `/admin/growth-chart` | Return user signup counts for the last 7 days. |
| `GET` | `/admin/judge-reliability` | Return judge health metrics for a configurable recent window. |
| `GET` | `/admin/users` | List users with search/filter/pagination. |
| `PATCH` | `/admin/users/:id` | Update role, premium state, or ban state. |
| `GET` | `/admin/questions` | List questions with search/filter/pagination. |
| `POST` | `/admin/questions` | Create a question. |
| `PATCH` | `/admin/questions/:id` | Update a question. |
| `DELETE` | `/admin/questions/:id` | Delete a question. |
| `GET` | `/admin/skills` | List skills for admin question forms. |
| `GET` | `/admin/interviews` | List mock interviews with status filtering. |
| `GET` | `/admin/resumes` | List uploaded resumes with parsing status filtering. |
| `GET` | `/admin/resumes/:id/download` | Download a stored resume file. |

## Code Judge

The judge runs submitted code inside Docker containers and compares stdout against stored testcase expected output.

Supported languages:

- JavaScript using Node.js
- Python
- C++
- Java

Judge protections:

- No network access inside judge container.
- Memory limit.
- CPU limit.
- PID limit.
- Dropped Linux capabilities.
- `no-new-privileges`.
- Read-only container root filesystem.
- Temporary `/tmp` filesystem.
- Per-submission temporary workspace.
- Output capture truncation to avoid huge logs.
- Timeout handling and container cleanup.

Verdicts:

- `ACCEPTED`
- `WRONG_ANSWER`
- `TIME_LIMIT_EXCEEDED`
- `RUNTIME_ERROR`
- `COMPILATION_ERROR`
- `PARTIALLY_ACCEPTED`
- `PENDING`
- `RUNNING`

### Test Case Format

Coding questions are judged with stdin/stdout test cases:

```json
[
  {
    "input": "4\n2 7 11 15\n9",
    "expectedOutput": "0 1",
    "isExample": true
  }
]
```

The judge trims surrounding whitespace before comparing stdout with `expectedOutput`.

## Data Model Highlights

Important Prisma models include:

- `User`: account, role, profile settings, premium state, and soft deletion.
- `Skill`: skill taxonomy, category, parent/child hierarchy, prerequisites, and display metadata.
- `UserSkill`: per-user proficiency, XP, accuracy, attempts, solved count, and last practice time.
- `Question`: question metadata, problem statement, starter code, solution code, testcase JSON, hints, constraints, tags, company tags, acceptance rate, and premium/active flags.
- `Attempt`: submitted code, language, status, runtime, memory, testcase counts, AI score, and attempt number.
- `AttemptTestCase`: per-testcase input, expected output, actual output, pass/fail, runtime, and error message.
- `AttemptFeedback`: AI scores, summary, code quality feedback, complexity feedback, strengths, weaknesses, suggestions, resources, and related questions.
- `InterviewSession`: interview type, status, difficulty, timing, scores, transcript, feedback, strengths, and improvement areas.
- `InterviewQuestion`: question text, user answer, AI evaluation, score, follow-up state, and order.
- `Resume`: uploaded file metadata, parsed text, parsed data, detected skills, projects, education, experience, parsing status, and active state.
- `LearningPath`: user path, target skill/company, item counts, progress, dates, and status.
- `LearningPathItem`: question/lesson/review/milestone items, order, status, estimated minutes, and completion.
- `SpacedRepetition`: interval, repetitions, ease factor, next review date, review counts, status, and question linkage.
- `SpacedRepetitionReview`: review rating and before/after scheduling values.
- `AnalyticsDaily`: daily sessions, time, attempts, solves, accuracy, difficulty counts, streak data, and skill breakdown.
- `UserActivity`: event log model for user actions.
- `Subscription` and `Payment`: premium and payment data models.

## Key Algorithms and Behaviors

### Adaptive Recommendations

Recommended questions combine user skill proficiency, weak topics, difficulty progression, active questions, and due spaced repetition work. The system prefers questions that match a user's current level while still nudging growth.

### Skill Updates

After submissions, the backend updates the user's related skill:

- Accepted attempts gain more XP.
- Incorrect attempts still record practice but may reduce proficiency slightly.
- Accuracy is recalculated from attempted and solved counts.
- Proficiency gains diminish as the user approaches 100.

### Spaced Repetition

The review scheduler follows an SM-2 style loop:

```typescript
if (qualityRating >= 3) {
  interval = repetitions === 0 ? 1 : repetitions === 1 ? 6 : Math.round(interval * easeFactor)
  repetitions += 1
} else {
  repetitions = 0
  interval = 1
}
```

The ease factor is adjusted by quality rating and never drops below `1.3`. Items become `MASTERED` after enough successful repetitions.

### Mistake Memory

Mistake Memory scans recent attempts for a question and groups:

- repeated failed statuses,
- repeated failing testcase indexes,
- repeated AI feedback weaknesses.

It returns compact evidence and coaching suggestions so users can see what keeps recurring instead of only seeing the newest verdict.

### Judge Reliability

Admin judge reliability aggregates recent attempt and testcase data:

- verdict rates,
- language-level pass/runtime behavior,
- top testcase error signatures,
- recent failures.

This helps identify broken judge images, problematic languages, bad testcases, timeouts, or widespread compile/runtime failures.

## Environment Variables

Backend variables are documented in `backend/.env.example`.

Required for normal local development:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://username:password@localhost:5432/interview_prep?schema=public"
DIRECT_URL="postgresql://username:password@localhost:5432/interview_prep?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-characters"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"
CORS_ORIGIN="http://localhost:5173"
RATE_LIMIT_MAX=100
MAX_FILE_SIZE=5242880
UPLOAD_DIR="uploads"
```

AI variables:

```env
OPENAI_API_KEY="sk-your-openai-api-key"
OPENAI_MODEL="gpt-4-turbo-preview"
GROQ_API_KEY="your-groq-api-key"
GROQ_MODEL="llama-3.3-70b-versatile"
```

Judge variables:

```env
DOCKER_BINARY="docker"
JUDGE_TEMP_DIR="tmp/judge"
JUDGE_RUN_TIMEOUT_MS=3000
JUDGE_COMPILE_TIMEOUT_MS=10000
JUDGE_MEMORY_LIMIT="128m"
JUDGE_CPU_LIMIT="0.5"
JUDGE_PIDS_LIMIT=64
JUDGE_IMAGE_JAVASCRIPT="node:20-alpine"
JUDGE_IMAGE_PYTHON="python:3.12-alpine"
JUDGE_IMAGE_CPP="gcc:13-bookworm"
JUDGE_IMAGE_JAVA="eclipse-temurin:21-jdk-alpine"
```

Optional integrations:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_S3_BUCKET="your-bucket-name"
AWS_REGION="us-east-1"
```

Frontend variables:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

## Local Development

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL 16+
- Redis 7+
- Docker Desktop if using the local judge
- API keys for AI-backed features

### Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Backend runs on `http://localhost:3000` by default.

Health checks:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/db
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` by default.

### Local Docker Services

To run PostgreSQL and Redis with Docker:

```bash
docker-compose up -d postgres redis
```

For the coding judge, keep Docker Desktop running and run the backend on the host machine so it can call the Docker CLI.

### Full Docker Compose

```bash
docker-compose up -d
```

The compose file includes PostgreSQL, Redis, backend, and frontend containers. The backend container uses internal service URLs for PostgreSQL and Redis.

## Scripts

### Backend

```bash
npm run dev           # Start backend in watch mode
npm run build         # Compile TypeScript to dist
npm start             # Run compiled backend
npm run typecheck     # TypeScript no-emit check
npm run lint          # ESLint
npm run lint:fix      # ESLint with autofix
npm run format        # Prettier on src/**/*.ts
npm test              # Jest tests
npm run test:watch    # Jest watch mode
npm run test:coverage # Jest coverage
npm run db:generate   # Prisma generate
npm run db:migrate    # Prisma migrate dev
npm run db:deploy     # Prisma migrate deploy
npm run db:seed       # Seed database
npm run db:studio     # Prisma Studio
```

### Frontend

```bash
npm run dev       # Start Vite dev server
npm run build     # TypeScript check and production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

The frontend currently does not define an `npm test` script.

## Security and Reliability Notes

- Passwords are hashed before storage.
- Protected routes require JWT authentication.
- Admin routes require both authentication and `admin` role authorization.
- Inputs are validated with Zod schemas before route handlers run.
- Global error handling formats API errors.
- General and auth-specific rate limits are configured.
- Request IDs are attached to requests.
- Helmet and CORS are configured at the Express layer.
- Redis is used for cached dashboard, analytics, leaderboard, and user-related data.
- Prisma is configured as a development singleton to reduce connection churn during hot reloads.
- The Docker judge runs submissions without network access and with resource limits.

## Deployment Notes

Suggested production architecture:

- Frontend: Vercel, Netlify, or static hosting behind CDN
- Backend: Render, Railway, AWS ECS, EC2 with PM2, or similar
- Database: Supabase PostgreSQL or AWS RDS PostgreSQL
- Cache: Upstash Redis, Redis Cloud, or self-hosted Redis
- File storage: S3 or compatible object storage for resumes
- AI: configured OpenAI/Groq-compatible provider keys

For Supabase, prefer a connection pooler URL for application traffic when possible. Direct database URLs can produce transient `P1001` connection errors during network or startup blips.

The repository includes `.github/workflows/deploy.yml`, which deploys the backend to EC2 by SSH, pulls `main`, installs dependencies, generates Prisma client, builds, restarts PM2, and checks `/health`.

## Current Known Gaps

- Email sending is not fully implemented for auth workflows.
- The frontend has no test script yet.
- Socket.IO rooms exist, but most interview interaction currently uses REST endpoints.
- Resume storage is local in development; production should move uploads to object storage.
- Docker judge reliability is visible in admin analytics, but historical judge events are inferred from attempts and testcase rows rather than a dedicated judge-event table.
- `frontend/dist/index.html` may change when running production builds because Vite updates asset hashes.

## Documentation

Additional docs are available in `docs/`:

- `01-SYSTEM-DESIGN.md`
- `02-DATABASE-DESIGN.md`
- `03-BACKEND-DESIGN.md`
- `09-DEPLOYMENT.md`
- `12-RESUME-DESCRIPTION.md`
- `PROJECT_ANALYSIS.md`

## License

MIT License.

