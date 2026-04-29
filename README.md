# Smart Interview Preparation Engine

A comprehensive AI-driven adaptive interview preparation platform that personalizes learning, generates dynamic questions, simulates real interview environments, and continuously improves using feedback loops and analytics.

## Features

### Core Features

- **User Profiling System**: Track skill levels per topic (arrays, graphs, DP, etc.) with dynamic updates after each attempt
- **Smart Question Engine**: Recommend questions based on weak topics, past mistakes, and difficulty progression
- **AI Mock Interviewer**: Interactive AI-powered mock interviews with real-time feedback
- **Performance Analytics Dashboard**: Visualize strengths/weaknesses and track improvement over time
- **Resume-Based Question Generator**: Parse resumes and generate personalized interview questions

### Advanced Features

- **Adaptive Learning System**: Automatically adjusts question difficulty based on performance
- **Spaced Repetition**: SM-2 algorithm for optimal review scheduling
- **Company-Specific Preparation**: Targeted practice for companies like Google, Amazon, Meta
- **Real-time Mock Interviews**: WebSocket-based interactive interview sessions
- **Learning Paths**: Structured study plans with progress tracking

## Tech Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **AI Integration**: OpenAI GPT-4
- **Authentication**: JWT with refresh tokens
- **Documentation**: Comprehensive inline comments

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Charts**: Recharts
- **Code Editor**: Monaco Editor

## Project Structure

```
interview-prep-engine/
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── config/         # Database, Redis, Logger
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── server.ts       # Entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
├── frontend/                # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API clients
│   │   ├── store/          # State management
│   │   ├── types/          # TypeScript types
│   │   └── App.tsx         # Main app
│   └── package.json
├── docs/                    # Documentation
└── docker-compose.yml       # Docker orchestration
```

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/smart-interview-prep.git
   cd smart-interview-prep
   ```

2. **Setup Backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your credentials
   npm install
   npx prisma migrate dev
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

4. **Using Docker**
   ```bash
   docker-compose up -d
   ```

## API Documentation

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user

### Questions
- `GET /api/v1/questions` - List questions with filters
- `GET /api/v1/questions/recommended` - Get personalized recommendations
- `GET /api/v1/questions/:id` - Get question details

### Attempts
- `POST /api/v1/attempts` - Submit solution
- `GET /api/v1/attempts/:id/feedback` - Get AI feedback

### Mock Interviews
- `POST /api/v1/interviews` - Create interview
- `POST /api/v1/interviews/:id/start` - Start interview
- `POST /api/v1/interviews/:id/answer` - Submit answer

### Analytics
- `GET /api/v1/analytics` - Get user analytics
- `GET /api/v1/analytics/weak-topics` - Identify weak areas

## Key Algorithms

### Adaptive Difficulty
```typescript
// Adjusts question difficulty based on user proficiency
const difficulty = mapProficiencyToDifficulty(proficiencyLevel)
// 0-25: easy, 25-50: medium, 50-75: hard, 75-100: expert
```

### Spaced Repetition (SM-2)
```typescript
// Calculates next review interval based on performance
if (quality >= 3) {
  interval = repetitions === 0 ? 1 : repetitions === 1 ? 6 : interval * easeFactor
} else {
  interval = 1
}
```

### Skill Tracking
```typescript
// Updates proficiency with diminishing returns at higher levels
const gain = Math.max(1, (100 - currentProficiency) / 20)
```

## Database Schema

### Core Tables
- `users` - User accounts and profiles
- `skills` - Technical skills and topics
- `user_skills` - User proficiency per skill
- `questions` - Question bank
- `attempts` - User submissions
- `interview_sessions` - Mock interview sessions
- `spaced_repetition` - Review scheduling

See [Database Design](docs/02-DATABASE-DESIGN.md) for complete schema.

## Deployment

### Production Architecture
- **Frontend**: Vercel/Netlify
- **Backend**: Render/Railway/AWS ECS
- **Database**: Supabase/RDS PostgreSQL
- **Cache**: Upstash Redis
- **AI**: OpenAI API

See [Deployment Guide](docs/09-DEPLOYMENT.md) for detailed instructions.

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- OpenAI for GPT-4 API
- LeetCode for question inspiration
- The open-source community

---

Built with passion for helping developers ace their technical interviews!
