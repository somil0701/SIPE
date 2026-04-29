设计的本质，是消除一切不必要的差异后，那个不得不存在的差异。
# Smart Interview Preparation Engine - Deployment Guide

## 1. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │   Vercel    │      │   Render    │      |  PostgreSQL |     │
│  │  (Frontend) │      │  (Backend)  │      |    + Redis  |     │
│  │             │      │             │      |   (Supabase |     │
│  │  React App  │◄────►│  Node.js    │◄────►│   + Upstash)|     │
│  │             │      │   API       │      |             |     │
│  └─────────────┘      └─────────────┘      └─────────────┘     │
│         │                    │                                   │
│         └────────────────────┘                                   │
│              Custom Domain + SSL                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Environment Variables

### Backend (.env)

```bash
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public

# Redis
REDIS_URL=redis://host:port

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters
JWT_REFRESH_EXPIRES_IN=30d

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_MAX=100
```

### Frontend (.env)

```bash
VITE_API_URL=https://your-backend-domain.com/api/v1
```

## 3. Docker Deployment (Local/Development)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

## 4. Vercel Deployment (Frontend)

### Steps:

1. **Create Vercel Account**: https://vercel.com

2. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

3. **Deploy**:
   ```bash
   cd frontend
   vercel --prod
   ```

4. **Configure Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add `VITE_API_URL`

5. **Custom Domain** (optional):
   - Go to Project Settings → Domains
   - Add your domain

## 5. Render Deployment (Backend)

### Steps:

1. **Create Render Account**: https://render.com

2. **Create New Web Service**:
   - Connect your GitHub repo
   - Select the backend directory
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm start`

3. **Add Environment Variables**:
   - Go to Environment tab
   - Add all required variables

4. **Create PostgreSQL Database**:
   - New → PostgreSQL
   - Copy connection string to `DATABASE_URL`

5. **Create Redis Instance** (optional):
   - Use Upstash: https://upstash.com
   - Copy Redis URL to `REDIS_URL`

## 6. Supabase Deployment (Database)

### Steps:

1. **Create Supabase Account**: https://supabase.com

2. **Create New Project**

3. **Get Connection String**:
   - Settings → Database → Connection String
   - Copy URI for Prisma

4. **Run Migrations**:
   ```bash
   npx prisma migrate deploy
   ```

## 7. AWS Deployment (Alternative)

### Architecture:

```
┌─────────────────────────────────────────────────────────┐
│                         AWS                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐      ┌─────────────┐                  │
│  │   Route 53  │      │ CloudFront  │                  │
│  │   (DNS)     │─────►│    (CDN)    │                  │
│  └─────────────┘      └──────┬──────┘                  │
│                              │                          │
│                         ┌────┴────┐                     │
│                         │   S3    │                     │
│                         │(Static) │                     │
│                         └─────────┘                     │
│                                                          │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────┐ │
│  │     ALB     │◄────►│    ECS      │◄────►│  RDS    │ │
│  │  (Load Bal) │      │  (Backend)  │      │(Postgres)│ │
│  └─────────────┘      └─────────────┘      └─────────┘ │
│                                                          │
│  ┌─────────────┐                                        │
│  │ ElastiCache │                                        │
│  │   (Redis)   │                                        │
│  └─────────────┘                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Services:

- **ECS Fargate**: Container orchestration for backend
- **RDS PostgreSQL**: Managed database
- **ElastiCache Redis**: Managed cache
- **S3 + CloudFront**: Static hosting with CDN
- **Route 53**: DNS management
- **ALB**: Application Load Balancer

## 8. CI/CD Pipeline (GitHub Actions)

### Backend Workflow:

```yaml
# .github/workflows/backend.yml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: cd backend && npm ci
      - run: cd backend && npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Render
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

### Frontend Workflow:

```yaml
# .github/workflows/frontend.yml
name: Frontend CI/CD

on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action-deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 9. Monitoring & Logging

### Tools:

- **Sentry**: Error tracking (https://sentry.io)
- **LogRocket**: Session replay (https://logrocket.com)
- **Datadog**: APM and monitoring (https://datadoghq.com)

### Setup:

```typescript
// Sentry initialization
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

## 10. SSL/TLS Configuration

### Let's Encrypt (Manual):

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Auto-renewal
echo "0 0 * * * certbot renew --quiet" | sudo crontab -
```

## 11. Backup Strategy

### Database Backups:

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
pg_dump $DATABASE_URL > backup_$DATE.sql
gzip backup_$DATE.sql
aws s3 cp backup_$DATE.sql.gz s3://your-backup-bucket/
```

## 12. Scaling Strategy

### Horizontal Scaling:

1. **Load Balancer**: Distribute traffic across instances
2. **Auto-scaling**: Scale based on CPU/memory usage
3. **Database Read Replicas**: For read-heavy workloads
4. **CDN**: Cache static assets globally

### Vertical Scaling:

1. **Database**: Upgrade instance size
2. **Cache**: Increase Redis memory
3. **Backend**: More CPU/memory per instance

## 13. Cost Optimization

### Tips:

1. **Use serverless where possible** (Vercel, AWS Lambda)
2. **Reserved instances** for predictable workloads
3. **CDN caching** to reduce origin requests
4. **Database connection pooling** with PgBouncer
5. **Image optimization** and lazy loading

## 14. Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Database credentials rotated regularly
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma)
- [ ] XSS protection (Helmet)
- [ ] Regular dependency updates
- [ ] Security headers configured

---

## Quick Start Commands

```bash
# Local development
cd backend && npm run dev
cd frontend && npm run dev

# Docker deployment
docker-compose up -d

# Database migrations
cd backend && npx prisma migrate dev

# Production build
cd backend && npm run build
cd frontend && npm run build
```
