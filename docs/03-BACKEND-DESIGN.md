# Smart Interview Preparation Engine - Backend Design

## 1. Folder Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.ts   # Prisma client setup
│   │   ├── env.ts        # Environment validation
│   │   ├── logger.ts     # Winston logger config
│   │   └── redis.ts      # Redis client & cache helpers
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Express middleware
│   │   ├── auth.ts       # JWT authentication
│   │   ├── errorHandler.ts
│   │   ├── requestId.ts
│   │   └── validate.ts   # Zod validation
│   ├── models/           # Data models (if not using Prisma)
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   │   ├── ai.service.ts
│   │   ├── analytics.service.ts
│   │   ├── attempt.service.ts
│   │   ├── auth.service.ts
│   │   ├── interview.service.ts
│   │   ├── question.service.ts
│   │   └── resume.service.ts
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   └── server.ts         # Entry point
├── prisma/
│   └── schema.prisma     # Database schema
├── tests/                # Test files
├── package.json
├── tsconfig.json
└── .env.example
```

## 2. API Design

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login user | No |
| POST | `/api/v1/auth/refresh` | Refresh access token | No |
| GET | `/api/v1/auth/me` | Get current user | Yes |
| POST | `/api/v1/auth/change-password` | Change password | Yes |
| POST | `/api/v1/auth/logout` | Logout user | Yes |

### User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/users/profile` | Get user profile | Yes |
| PATCH | `/api/v1/users/profile` | Update profile | Yes |
| GET | `/api/v1/users/skills` | Get user skills | Yes |
| PUT | `/api/v1/users/skills` | Update skills | Yes |
| GET | `/api/v1/users/stats` | Get user stats | Yes |
| DELETE | `/api/v1/users/account` | Delete account | Yes |

### Questions Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/questions` | List questions | Optional |
| GET | `/api/v1/questions/search` | Search questions | Optional |
| GET | `/api/v1/questions/recommended` | Get recommended | Yes |
| GET | `/api/v1/questions/due-reviews` | Get due reviews | Yes |
| GET | `/api/v1/questions/company/:company` | Company questions | No |
| GET | `/api/v1/questions/:id` | Get question by ID | Optional |
| GET | `/api/v1/questions/slug/:slug` | Get question by slug | Optional |

### Attempts Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/attempts` | Submit attempt | Yes |
| GET | `/api/v1/attempts` | List attempts | Yes |
| GET | `/api/v1/attempts/:id` | Get attempt | Yes |
| GET | `/api/v1/attempts/:id/feedback` | Get feedback | Yes |

### Mock Interview Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/interviews` | Create interview | Yes |
| GET | `/api/v1/interviews` | List interviews | Yes |
| GET | `/api/v1/interviews/:id` | Get interview | Yes |
| POST | `/api/v1/interviews/:id/start` | Start interview | Yes |
| GET | `/api/v1/interviews/:id/current-question` | Get question | Yes |
| POST | `/api/v1/interviews/:id/answer` | Submit answer | Yes |
| POST | `/api/v1/interviews/:id/skip` | Skip question | Yes |
| POST | `/api/v1/interviews/:id/complete` | Complete interview | Yes |
| POST | `/api/v1/interviews/:id/cancel` | Cancel interview | Yes |
| DELETE | `/api/v1/interviews/:id` | Delete interview | Yes |

### Analytics Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/analytics` | Get user analytics | Yes |
| GET | `/api/v1/analytics/daily` | Get daily analytics | Yes |
| GET | `/api/v1/analytics/weak-topics` | Get weak topics | Yes |
| GET | `/api/v1/analytics/strong-topics` | Get strong topics | Yes |
| GET | `/api/v1/analytics/leaderboard` | Get leaderboard | No |

### Resume Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/resumes/upload` | Upload resume | Yes |
| GET | `/api/v1/resumes` | List resumes | Yes |
| GET | `/api/v1/resumes/current` | Get current resume | Yes |
| GET | `/api/v1/resumes/:id` | Get resume by ID | Yes |
| GET | `/api/v1/resumes/skills-gap/analysis` | Skills gap analysis | Yes |
| GET | `/api/v1/resumes/personalized-questions/list` | Personalized questions | Yes |
| DELETE | `/api/v1/resumes/:id` | Delete resume | Yes |

### Learning Path Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/learning-paths` | List paths | Yes |
| POST | `/api/v1/learning-paths` | Create path | Yes |
| GET | `/api/v1/learning-paths/:id` | Get path | Yes |
| PATCH | `/api/v1/learning-paths/:id/items/:itemId` | Update item | Yes |
| POST | `/api/v1/learning-paths/:id/pause` | Pause path | Yes |
| POST | `/api/v1/learning-paths/:id/resume` | Resume path | Yes |
| DELETE | `/api/v1/learning-paths/:id` | Delete path | Yes |

### Spaced Repetition Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/spaced-repetition` | List entries | Yes |
| GET | `/api/v1/spaced-repetition/due` | Get due reviews | Yes |
| GET | `/api/v1/spaced-repetition/stats` | Get stats | Yes |
| GET | `/api/v1/spaced-repetition/:id` | Get entry | Yes |
| POST | `/api/v1/spaced-repetition/:id/review` | Submit review | Yes |
| POST | `/api/v1/spaced-repetition/questions/:questionId/add` | Add question | Yes |
| DELETE | `/api/v1/spaced-repetition/:id` | Delete entry | Yes |
| POST | `/api/v1/spaced-repetition/:id/reset` | Reset progress | Yes |

## 3. Middleware

### Authentication Middleware

```typescript
// middleware/auth.ts
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw ApiError.unauthorized('Access token required');
  
  const decoded = jwt.verify(token, env.JWT_SECRET);
  req.user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  next();
};
```

### Error Handler Middleware

```typescript
// middleware/errorHandler.ts
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err);
  
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details }
    });
  }
  
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
  });
};
```

### Validation Middleware

```typescript
// middleware/validate.ts
export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      next(ApiError.validation('Validation failed', error.errors));
    }
  };
};
```

## 4. Business Logic

### Skill Tracking Algorithm

```typescript
// services/attempt.service.ts
private calculateProficiencyDelta(
  currentProficiency: number,
  status: AttemptStatus,
  score: number
): number {
  if (status === 'ACCEPTED') {
    // Diminishing returns at higher levels
    const gain = Math.max(1, (100 - currentProficiency) / 20);
    return Math.floor(gain);
  } else {
    return -1; // Small loss for incorrect answers
  }
}
```

### Adaptive Question Selection

```typescript
// services/question.service.ts
async getRecommendedQuestions(userId: string, limit: number = 5): Promise<Question[]> {
  // Get weak skills (proficiency < 50)
  const weakSkills = await prisma.userSkill.findMany({
    where: { userId, proficiencyLevel: { lt: 50 } },
    orderBy: { proficiencyLevel: 'asc' },
  });

  // Get questions for weak skills
  const questions = [];
  for (const skill of weakSkills.slice(0, 3)) {
    const skillQuestions = await prisma.question.findMany({
      where: {
        skillId: skill.skillId,
        difficulty: this.mapProficiencyToDifficulty(skill.proficiencyLevel),
        NOT: { attempts: { some: { userId, status: 'ACCEPTED' } } },
      },
      take: Math.ceil(limit / weakSkills.length),
    });
    questions.push(...skillQuestions);
  }
  
  return questions.slice(0, limit);
}
```

## 5. Redis Caching Strategy

### Cache Keys

```typescript
// config/redis.ts
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  question: (questionId: string) => `question:${questionId}`,
  questionsList: (params: string) => `questions:list:${params}`,
  userSkills: (userId: string) => `user:${userId}:skills`,
  userAnalytics: (userId: string) => `user:${userId}:analytics`,
  leaderboard: (type: string) => `leaderboard:${type}`,
  dueReviews: (userId: string) => `user:${userId}:due-reviews`,
};
```

### Cache TTL

```typescript
export const cacheTTL = {
  user: 60 * 60,           // 1 hour
  question: 60 * 60 * 24,  // 24 hours
  questionsList: 60 * 5,   // 5 minutes
  userSkills: 60 * 15,     // 15 minutes
  analytics: 60 * 5,       // 5 minutes
  leaderboard: 60 * 60,    // 1 hour
};
```

### Cache Usage Example

```typescript
async getQuestionById(questionId: string): Promise<Question> {
  // Try cache first
  const cached = await cache.get<Question>(cacheKeys.question(questionId));
  if (cached) return cached;

  // Get from database
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  
  // Cache result
  await cache.set(cacheKeys.question(questionId), question, cacheTTL.question);
  
  return question;
}
```

## 6. Security Best Practices

1. **Password Hashing**: bcrypt with 12 salt rounds
2. **JWT Tokens**: Short-lived access tokens (7 days), refresh tokens (30 days)
3. **Rate Limiting**: 100 requests per 15 minutes per IP
4. **Input Validation**: Zod schemas for all inputs
5. **SQL Injection Prevention**: Prisma ORM with parameterized queries
6. **CORS**: Configured for specific origins only
7. **Helmet**: Security headers (XSS, CSRF protection)
8. **Request ID**: For tracing and logging

## 7. Error Handling

### Custom Error Classes

```typescript
class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
  }

  static badRequest(message: string) {
    return new ApiError(400, message, 'BAD_REQUEST');
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static notFound(message: string = 'Not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }
}
```

## 8. Logging

```typescript
// Structured logging with Winston
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});

logger.error('Database connection failed', {
  error: err.message,
  stack: err.stack,
});
```

## 9. Testing Strategy

### Unit Tests
- Service methods
- Utility functions
- Middleware

### Integration Tests
- API endpoints
- Database operations
- External service calls

### Test Example

```typescript
// tests/auth.test.ts
describe('Auth Service', () => {
  it('should register a new user', async () => {
    const result = await authService.register({
      email: 'test@example.com',
      password: 'Password123!',
      fullName: 'Test User',
    });

    expect(result.user).toBeDefined();
    expect(result.tokens).toBeDefined();
  });
});
```

---

This backend design provides a solid foundation for the Smart Interview Preparation Engine with:
- Clean architecture with separation of concerns
- Comprehensive API coverage
- Efficient caching strategy
- Robust error handling
- Security best practices
