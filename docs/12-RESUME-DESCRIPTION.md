# Smart Interview Preparation Engine - Resume / Portfolio Description

Use this document as a truthful source for describing the project in a resume, portfolio, or interview. Avoid claiming live traffic, uptime, user counts, revenue, or test coverage unless those metrics are measured and available.

## Short Resume Bullet Options

- Built a full-stack AI interview preparation platform with React, TypeScript, Express, Prisma, PostgreSQL, Redis, and Docker-based code execution.
- Implemented an adaptive coding practice workflow with Monaco editor, multi-language submissions, testcase results, AI feedback, submission history, and mistake memory.
- Designed backend services for personalized question recommendations, spaced repetition, learning paths, mock interviews, resume parsing, analytics, and admin operations.
- Added an admin Judge Reliability dashboard that surfaces verdict distribution, error signatures, language health, and recent failed submissions from persisted attempt data.
- Integrated Prisma-backed analytics for user skills, daily progress, weak topics, streaks, attempt accuracy, and review scheduling.

## Two-Line Project Summary

Smart Interview Preparation Engine is a full-stack platform for coding interview practice, mock interviews, resume analysis, adaptive learning paths, and spaced repetition. It combines a React/Vite frontend with a TypeScript Express backend, PostgreSQL/Prisma data model, Redis caching, AI-assisted feedback, and Docker-isolated code judging.

## Detailed Portfolio Description

Smart Interview Preparation Engine is an interview prep application designed around repeated practice and measurable improvement. Users can register, complete onboarding, choose skill levels, browse coding questions, write code in a Monaco-powered editor, run code against custom input, submit solutions, review testcase outcomes, and revisit a full submission timeline for each question.

The practice workflow includes Submission Timeline and Mistake Memory features. The timeline shows past attempts, verdict progression, pass rate, execution metrics, code snapshots, failed testcase details, and AI feedback. Mistake Memory summarizes recurring failure patterns so users can focus on the mistakes they repeatedly make instead of treating each failed submission as isolated.

The platform also includes spaced repetition, learning paths, analytics, mock interviews, and resume intelligence. Resume uploads are parsed for skills and experience signals, then used for skill-gap analysis, personalized question suggestions, and job description matching. Analytics pages show practice volume, accuracy, skill breakdowns, streaks, weak topics, and strong topics.

The backend is a modular TypeScript Express API using Prisma with PostgreSQL. It manages authentication, profile settings, questions, attempts, judge execution, analytics, learning paths, spaced repetition, interviews, resumes, and admin workflows. Code execution is isolated through Docker containers for JavaScript, Python, C++, and Java, with configured memory, CPU, timeout, and process limits.

The admin area includes user management, question management, interview monitoring, resume oversight, growth metrics, and a Judge Reliability dashboard. The reliability dashboard calculates failure rates, timeout rates, compilation/runtime error rates, verdict breakdowns, language health, top error signatures, and recent failed submissions from attempt and testcase data.

## Technical Highlights

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Zustand, Monaco Editor, Recharts, Lucide icons.
- Backend: Node.js 20, Express, TypeScript, Prisma, PostgreSQL, Redis, Socket.IO, Winston, Zod, JWT authentication.
- Judge: Docker-isolated execution with language-specific containers, compile/run timeouts, resource limits, testcase normalization, verdict mapping, and persisted testcase results.
- AI: Groq/OpenAI provider support for feedback, resume review, resume parsing assistance, interview evaluation, and fallback behavior when provider calls fail.
- Data model: users, skills, questions, attempts, testcase rows, attempt feedback, interviews, resumes, learning paths, spaced repetition, analytics, subscriptions, payments, tags, companies.

## Feature Coverage

### User Experience

- Register, login, refresh token, logout, and password change.
- Protected application shell with dashboard navigation.
- Profile page with personal settings and skill updates.
- Onboarding support through user skill initialization.

### Practice

- Question browsing, filtering, search, recommendations, company questions, and due reviews.
- Rich question page with description, constraints, hints, examples/testcases, editor, run, submit, feedback, and history.
- Multi-language judge support for JavaScript, Python, C++, and Java.
- Submission Timeline with attempt cards, verdict trend, selected attempt details, failed testcase inspection, feedback, and load-code action.
- Mistake Memory summary generated from historical verdicts, failed testcases, and AI feedback.

### Learning

- Spaced repetition queue, due reviews, review ratings, reset, removal, and review statistics.
- Learning path list/detail pages, progress state, item completion, pause/resume, and deletion.
- Personalized recommendations based on skill state and due review signals.

### Interviews

- Mock interview creation and listing.
- Interview session flow with start, current question, answer, skip, complete, cancel, and delete operations.
- AI scoring and feedback fields for interview responses.

### Resume Intelligence

- Resume upload for PDF/DOCX.
- Active resume selection through latest/current resume APIs.
- Parsed resume text/data and detected skills.
- Skill gap analysis.
- Personalized question generation from resume signals.
- Job description matching against current resume.

### Analytics

- Dashboard aggregates for recent interviews, spaced repetition summary, recommendations, and analytics cards.
- Analytics page for attempts, solves, accuracy, streaks, skill breakdown, daily progress, weak topics, and strong topics.
- Leaderboard endpoint for global or weekly ranking.

### Admin

- Platform stats and signup growth chart.
- User search, filtering, pagination, and admin updates.
- Question list, create, edit, and delete.
- Skills lookup for question forms.
- Interview monitoring.
- Resume listing and protected download.
- Judge Reliability dashboard.

## Suggested Resume Project Entry

**Smart Interview Preparation Engine**  
Full-stack AI interview preparation platform built with React, TypeScript, Express, Prisma, PostgreSQL, Redis, and Docker.

- Built an adaptive coding practice interface with Monaco Editor, multi-language Docker judge execution, custom runs, persisted submissions, testcase diagnostics, AI feedback, and code history.
- Implemented Submission Timeline and Mistake Memory features to help users inspect verdict progression, recurring failed testcase patterns, previous code snapshots, and improvement suggestions.
- Developed backend services for authentication, question recommendations, spaced repetition, learning paths, mock interviews, resume parsing, job matching, analytics, and admin workflows.
- Added an admin Judge Reliability dashboard that reports verdict breakdowns, language-level health, timeout/compile/runtime error rates, top error signatures, and recent failures.
- Modeled the application with Prisma/PostgreSQL across users, skills, questions, attempts, testcase results, feedback, interviews, resumes, learning paths, spaced repetition, analytics, subscriptions, and payments.

## Interview Talking Points

- Why Docker isolation was chosen for judge execution.
- How testcase results are normalized and mapped into verdicts.
- How attempt history powers both Submission Timeline and Mistake Memory without adding duplicate tables.
- How spaced repetition scheduling uses interval, repetitions, ease factor, and quality ratings.
- How Prisma relationships keep analytics, attempts, feedback, and review records connected.
- Why the admin reliability view derives telemetry from persisted attempts before introducing a separate event stream.

## Avoid Claiming Without Evidence

Do not claim the following unless measured and documented:

- live production user count;
- daily active users;
- request throughput;
- uptime percentage;
- cost savings;
- coverage percentage;
- public launch status;
- enterprise adoption;
- hiring outcome guarantees.
