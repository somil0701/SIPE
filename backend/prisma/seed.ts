import {
  AttemptStatus,
  BillingCycle,
  Difficulty,
  InterviewStatus,
  InterviewType,
  PathItemStatus,
  PathItemType,
  PathStatus,
  PaymentStatus,
  PlanType,
  Prisma,
  PrismaClient,
  QuestionType,
  SkillCategory,
  SpacedRepetitionStatus,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const seedEmails = [
  'test@example.com',
  'admin@example.com',
  'premium@example.com',
  'alex.candidate@example.com',
];

const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

async function resetSeedUsers() {
  await prisma.user.deleteMany({
    where: { email: { in: seedEmails } },
  });
}

async function seedUsers(passwordHash: string) {
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash,
      fullName: 'Test User',
      role: UserRole.user,
      emailVerified: true,
      emailVerifiedAt: daysAgo(30),
      lastLoginAt: daysAgo(1),
      loginCount: 12,
      timezone: 'Asia/Calcutta',
      preferredLanguage: 'javascript',
      studyGoalMinutes: 75,
      onboardingCompleted: true,
    },
  });

  const premiumUser = await prisma.user.create({
    data: {
      email: 'premium@example.com',
      passwordHash,
      fullName: 'Priya Premium',
      role: UserRole.premium,
      isPremium: true,
      premiumExpiresAt: daysAgo(-45),
      emailVerified: true,
      preferredLanguage: 'typescript',
      studyGoalMinutes: 90,
      onboardingCompleted: true,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash,
      fullName: 'Admin Reviewer',
      role: UserRole.admin,
      isPremium: true,
      emailVerified: true,
      preferredLanguage: 'javascript',
      studyGoalMinutes: 60,
      onboardingCompleted: true,
    },
  });

  const candidateUser = await prisma.user.create({
    data: {
      email: 'alex.candidate@example.com',
      passwordHash,
      fullName: 'Alex Candidate',
      role: UserRole.user,
      emailVerified: true,
      preferredLanguage: 'python',
      studyGoalMinutes: 45,
      onboardingCompleted: true,
    },
  });

  return { testUser, premiumUser, adminUser, candidateUser };
}

async function seedSkills() {
  const skillInputs = [
    {
      name: 'Arrays',
      slug: 'arrays',
      description: 'Indexing, prefix sums, two pointers, and in-place operations.',
      category: SkillCategory.DATA_STRUCTURES,
      difficultyLevel: 1,
      colorCode: '#2563eb',
      estimatedHours: 8,
      displayOrder: 1,
    },
    {
      name: 'Hash Tables',
      slug: 'hash-tables',
      description: 'Frequency maps, lookup optimization, and collision-aware design.',
      category: SkillCategory.DATA_STRUCTURES,
      difficultyLevel: 2,
      colorCode: '#16a34a',
      estimatedHours: 6,
      displayOrder: 2,
    },
    {
      name: 'Dynamic Programming',
      slug: 'dynamic-programming',
      description: 'Memoization, tabulation, and optimal substructure.',
      category: SkillCategory.ALGORITHMS,
      difficultyLevel: 4,
      colorCode: '#dc2626',
      estimatedHours: 16,
      displayOrder: 3,
    },
    {
      name: 'System Design',
      slug: 'system-design',
      description: 'Scalable architecture, APIs, storage, caching, and trade-offs.',
      category: SkillCategory.SYSTEM_DESIGN,
      difficultyLevel: 4,
      colorCode: '#7c3aed',
      estimatedHours: 20,
      displayOrder: 4,
    },
    {
      name: 'Behavioral Interviews',
      slug: 'behavioral-interviews',
      description: 'Structured storytelling, ownership, conflict, and impact.',
      category: SkillCategory.BEHAVIORAL,
      difficultyLevel: 2,
      colorCode: '#ea580c',
      estimatedHours: 5,
      displayOrder: 5,
    },
    {
      name: 'JavaScript',
      slug: 'javascript',
      description: 'Language fundamentals, asynchronous code, and runtime behavior.',
      category: SkillCategory.LANGUAGE_SPECIFIC,
      difficultyLevel: 2,
      colorCode: '#ca8a04',
      estimatedHours: 10,
      displayOrder: 6,
    },
  ];

  const skills: Record<string, Awaited<ReturnType<typeof prisma.skill.upsert>>> = {};

  for (const skill of skillInputs) {
    skills[skill.slug] = await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: {
        name: skill.name,
        description: skill.description,
        category: skill.category,
        difficultyLevel: skill.difficultyLevel,
        colorCode: skill.colorCode,
        estimatedHours: skill.estimatedHours,
        displayOrder: skill.displayOrder,
        isActive: true,
      },
      create: {
        ...skill,
        prerequisites: [],
        isActive: true,
      },
    });
  }

  return skills;
}

async function seedCompanies() {
  const inputs = [
    {
      name: 'Google',
      slug: 'google',
      website: 'https://careers.google.com',
      difficultyRating: 4.7,
      interviewProcess: 'Recruiter screen, technical phone screen, virtual onsite, hiring committee.',
    },
    {
      name: 'Meta',
      slug: 'meta',
      website: 'https://www.metacareers.com',
      difficultyRating: 4.5,
      interviewProcess: 'Coding, product architecture, behavioral, and team matching.',
    },
    {
      name: 'Stripe',
      slug: 'stripe',
      website: 'https://stripe.com/jobs',
      difficultyRating: 4.4,
      interviewProcess: 'Technical screen, bug squash, integration design, manager interview.',
    },
  ];

  const companies: Record<string, Awaited<ReturnType<typeof prisma.company.upsert>>> = {};

  for (const company of inputs) {
    companies[company.slug] = await prisma.company.upsert({
      where: { slug: company.slug },
      update: company,
      create: company,
    });
  }

  return companies;
}

async function seedTags() {
  const names = [
    'array',
    'hash-map',
    'two-pointers',
    'sliding-window',
    'dynamic-programming',
    'api-design',
    'caching',
    'behavioral',
  ];

  const tags: Record<string, Awaited<ReturnType<typeof prisma.tag.upsert>>> = {};

  for (const name of names) {
    tags[name] = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name, category: name.includes('design') ? 'system-design' : 'practice' },
    });
  }

  return tags;
}

async function seedQuestions(
  skills: Awaited<ReturnType<typeof seedSkills>>,
  companies: Awaited<ReturnType<typeof seedCompanies>>,
  tags: Awaited<ReturnType<typeof seedTags>>
) {
  const starterTwoSum = `function twoSum(nums, target) {
  // Return the indices of two numbers that add up to target.
}`;

  const starterPalindrome = `function isPalindrome(s) {
  // Return true when s is a palindrome after removing non-alphanumeric characters.
}`;

  const starterMaxProfit = `function maxProfit(prices) {
  // Return the best profit from one buy and one sell.
}`;

  const starterClimb = `function climbStairs(n) {
  // Return how many distinct ways you can climb to the top.
}`;

  const questionInputs = [
    {
      skillId: skills.arrays.id,
      title: 'Two Sum',
      slug: 'two-sum',
      description: 'Find two numbers whose values add up to the target.',
      problemStatement: '<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to target.</p>',
      difficulty: Difficulty.easy,
      type: QuestionType.CODING,
      starterCode: {
        javascript: starterTwoSum,
        typescript: starterTwoSum,
        python: 'def two_sum(nums, target):\n    pass',
      },
      solutionCode: {
        javascript: 'function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}',
      },
      hints: ['Use a hash map to remember previous numbers.', 'For each number, check whether target - number has been seen.'],
      testCases: [
        { functionName: 'twoSum', args: [[2, 7, 11, 15], 9], expected: [0, 1], isExample: true },
        { functionName: 'twoSum', args: [[3, 2, 4], 6], expected: [1, 2], isExample: true },
        { functionName: 'twoSum', args: [[3, 3], 6], expected: [0, 1], isExample: false },
      ],
      constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Exactly one valid answer exists.'],
      followUpQuestions: ['How would you handle multiple valid pairs?', 'Can you solve this in one pass?'],
      companyTags: ['Google', 'Meta', 'Stripe'],
      topicTags: ['array', 'hash-map'],
      acceptanceRate: 79.4,
      totalAttempts: 128,
      totalSolves: 102,
      explanation: '<p>Track each value as you scan the array. When the complement exists in the map, return both indices.</p>',
    },
    {
      skillId: skills.arrays.id,
      title: 'Valid Palindrome',
      slug: 'valid-palindrome',
      description: 'Check whether a normalized string reads the same backward.',
      problemStatement: '<p>Return true if <code>s</code> is a palindrome after converting uppercase letters to lowercase and removing non-alphanumeric characters.</p>',
      difficulty: Difficulty.easy,
      type: QuestionType.CODING,
      starterCode: { javascript: starterPalindrome, typescript: starterPalindrome },
      solutionCode: {
        javascript: 'function isPalindrome(s) {\n  let left = 0;\n  let right = s.length - 1;\n  const isAlphaNum = (c) => /[a-z0-9]/i.test(c);\n  while (left < right) {\n    while (left < right && !isAlphaNum(s[left])) left++;\n    while (left < right && !isAlphaNum(s[right])) right--;\n    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;\n    left++;\n    right--;\n  }\n  return true;\n}',
      },
      hints: ['Use two pointers.', 'Skip characters that are not letters or digits.'],
      testCases: [
        { functionName: 'isPalindrome', args: ['A man, a plan, a canal: Panama'], expected: true, isExample: true },
        { functionName: 'isPalindrome', args: ['race a car'], expected: false, isExample: true },
      ],
      constraints: ['1 <= s.length <= 2 * 10^5'],
      followUpQuestions: ['What changes if Unicode normalization is required?'],
      companyTags: ['Meta'],
      topicTags: ['two-pointers', 'string'],
      acceptanceRate: 74.2,
      totalAttempts: 83,
      totalSolves: 62,
      explanation: '<p>Move inward from both ends while ignoring punctuation and spaces.</p>',
    },
    {
      skillId: skills.arrays.id,
      title: 'Best Time to Buy and Sell Stock',
      slug: 'best-time-to-buy-and-sell-stock',
      description: 'Calculate the maximum profit from one transaction.',
      problemStatement: '<p>You are given prices where <code>prices[i]</code> is the price on day i. Return the maximum profit from one buy and one sell.</p>',
      difficulty: Difficulty.easy,
      type: QuestionType.CODING,
      starterCode: { javascript: starterMaxProfit, typescript: starterMaxProfit },
      solutionCode: {
        javascript: 'function maxProfit(prices) {\n  let minPrice = Infinity;\n  let best = 0;\n  for (const price of prices) {\n    minPrice = Math.min(minPrice, price);\n    best = Math.max(best, price - minPrice);\n  }\n  return best;\n}',
      },
      hints: ['Track the lowest price seen so far.', 'Update the best profit at every step.'],
      testCases: [
        { functionName: 'maxProfit', args: [[7, 1, 5, 3, 6, 4]], expected: 5, isExample: true },
        { functionName: 'maxProfit', args: [[7, 6, 4, 3, 1]], expected: 0, isExample: true },
      ],
      constraints: ['1 <= prices.length <= 10^5'],
      followUpQuestions: ['How does the solution change with multiple transactions?'],
      companyTags: ['Google', 'Stripe'],
      topicTags: ['array'],
      acceptanceRate: 68.5,
      totalAttempts: 91,
      totalSolves: 63,
      explanation: '<p>A single pass is enough: buy at the minimum price seen before the current day.</p>',
    },
    {
      skillId: skills['dynamic-programming'].id,
      title: 'Climbing Stairs',
      slug: 'climbing-stairs',
      description: 'Count distinct ways to climb stairs taking 1 or 2 steps.',
      problemStatement: '<p>You can climb either 1 or 2 steps. Given <code>n</code>, return how many distinct ways you can reach the top.</p>',
      difficulty: Difficulty.easy,
      type: QuestionType.CODING,
      starterCode: { javascript: starterClimb, typescript: starterClimb },
      solutionCode: {
        javascript: 'function climbStairs(n) {\n  let a = 1;\n  let b = 1;\n  for (let i = 2; i <= n; i++) {\n    [a, b] = [b, a + b];\n  }\n  return b;\n}',
      },
      hints: ['The recurrence is the same as Fibonacci.', 'Keep only the previous two values.'],
      testCases: [
        { functionName: 'climbStairs', args: [2], expected: 2, isExample: true },
        { functionName: 'climbStairs', args: [3], expected: 3, isExample: true },
        { functionName: 'climbStairs', args: [5], expected: 8, isExample: false },
      ],
      constraints: ['1 <= n <= 45'],
      followUpQuestions: ['What if you can take up to k steps?'],
      companyTags: ['Google'],
      topicTags: ['dynamic-programming'],
      acceptanceRate: 71.8,
      totalAttempts: 77,
      totalSolves: 55,
      explanation: '<p>Ways(n) = Ways(n - 1) + Ways(n - 2).</p>',
    },
    {
      skillId: skills['system-design'].id,
      title: 'Design a Rate Limiter',
      slug: 'design-a-rate-limiter',
      description: 'Design a service that limits client requests by policy.',
      problemStatement: '<p>Design a distributed rate limiter for public APIs. Cover APIs, storage, consistency, hot keys, observability, and failure handling.</p>',
      difficulty: Difficulty.hard,
      type: QuestionType.SYSTEM_DESIGN,
      starterCode: {},
      solutionCode: {},
      hints: ['Compare token bucket and sliding window.', 'Discuss Redis, local caches, and failure modes.'],
      testCases: [],
      constraints: ['Supports per-user and per-IP policies', 'Low latency on the request path'],
      followUpQuestions: ['How would you handle a Redis outage?', 'How do you prevent clock skew issues?'],
      companyTags: ['Stripe', 'Google'],
      topicTags: ['api-design', 'caching'],
      acceptanceRate: 41.2,
      totalAttempts: 42,
      totalSolves: 17,
      explanation: '<p>A strong answer discusses algorithms, storage, atomic updates, replication, and degraded behavior.</p>',
    },
    {
      skillId: skills['behavioral-interviews'].id,
      title: 'Tell Me About a Conflict',
      slug: 'tell-me-about-a-conflict',
      description: 'Practice a structured behavioral answer about conflict.',
      problemStatement: '<p>Prepare a STAR-format answer for a time you disagreed with a teammate or stakeholder and resolved the issue constructively.</p>',
      difficulty: Difficulty.medium,
      type: QuestionType.BEHAVIORAL,
      starterCode: {},
      solutionCode: {},
      hints: ['Use Situation, Task, Action, Result.', 'Focus on what you learned and what changed.'],
      testCases: [],
      constraints: ['Answer should be specific and measurable.'],
      followUpQuestions: ['What would you do differently now?'],
      companyTags: ['Meta', 'Google', 'Stripe'],
      topicTags: ['behavioral'],
      acceptanceRate: 58.7,
      totalAttempts: 31,
      totalSolves: 18,
      explanation: '<p>Strong behavioral answers include context, personal ownership, and measurable outcome.</p>',
    },
  ];

  const questions: Record<string, Awaited<ReturnType<typeof prisma.question.upsert>>> = {};

  for (const question of questionInputs) {
    questions[question.slug] = await prisma.question.upsert({
      where: { slug: question.slug },
      update: {
        ...question,
        starterCode: question.starterCode as Prisma.InputJsonValue,
        solutionCode: question.solutionCode as Prisma.InputJsonValue,
        testCases: question.testCases as Prisma.InputJsonValue,
        isActive: true,
      },
      create: {
        ...question,
        starterCode: question.starterCode as Prisma.InputJsonValue,
        solutionCode: question.solutionCode as Prisma.InputJsonValue,
        testCases: question.testCases as Prisma.InputJsonValue,
        isActive: true,
      },
    });
  }

  const questionTagLinks: Array<[string, string]> = [
    ['two-sum', 'array'],
    ['two-sum', 'hash-map'],
    ['valid-palindrome', 'two-pointers'],
    ['best-time-to-buy-and-sell-stock', 'array'],
    ['climbing-stairs', 'dynamic-programming'],
    ['design-a-rate-limiter', 'api-design'],
    ['design-a-rate-limiter', 'caching'],
    ['tell-me-about-a-conflict', 'behavioral'],
  ];

  for (const [questionSlug, tagName] of questionTagLinks) {
    await prisma.questionTag.upsert({
      where: {
        questionId_tagId: {
          questionId: questions[questionSlug].id,
          tagId: tags[tagName].id,
        },
      },
      update: {},
      create: {
        questionId: questions[questionSlug].id,
        tagId: tags[tagName].id,
      },
    });
  }

  const companyLinks: Array<[string, string, number]> = [
    ['two-sum', 'google', 5],
    ['two-sum', 'meta', 4],
    ['two-sum', 'stripe', 3],
    ['best-time-to-buy-and-sell-stock', 'google', 3],
    ['valid-palindrome', 'meta', 4],
    ['design-a-rate-limiter', 'stripe', 5],
    ['design-a-rate-limiter', 'google', 4],
  ];

  for (const [questionSlug, companySlug, frequency] of companyLinks) {
    await prisma.questionCompany.upsert({
      where: {
        questionId_companyId: {
          questionId: questions[questionSlug].id,
          companyId: companies[companySlug].id,
        },
      },
      update: { frequency, lastAskedAt: daysAgo(20 - frequency) },
      create: {
        questionId: questions[questionSlug].id,
        companyId: companies[companySlug].id,
        frequency,
        lastAskedAt: daysAgo(20 - frequency),
      },
    });
  }

  return questions;
}

async function seedUserSkills(
  users: Awaited<ReturnType<typeof seedUsers>>,
  skills: Awaited<ReturnType<typeof seedSkills>>
) {
  const skillValues = Object.values(skills);
  const userProfiles = [
    { user: users.testUser, base: 58 },
    { user: users.premiumUser, base: 72 },
    { user: users.adminUser, base: 85 },
    { user: users.candidateUser, base: 36 },
  ];

  for (const profile of userProfiles) {
    for (const [index, skill] of skillValues.entries()) {
      const proficiencyLevel = Math.max(5, Math.min(95, profile.base - index * 7));
      const attempted = Math.max(0, Math.floor(proficiencyLevel / 18));
      const solved = Math.max(0, Math.floor(attempted * (proficiencyLevel / 100)));

      await prisma.userSkill.create({
        data: {
          userId: profile.user.id,
          skillId: skill.id,
          proficiencyLevel,
          xpPoints: proficiencyLevel * 12,
          questionsAttempted: attempted,
          questionsSolved: solved,
          accuracyRate: attempted > 0 ? Math.round((solved / attempted) * 100) : 0,
          avgTimePerQuestion: 900 - proficiencyLevel * 4,
          streakDays: Math.floor(proficiencyLevel / 20),
          lastPracticedAt: daysAgo(index),
        },
      });
    }
  }
}

async function seedAttempts(
  userId: string,
  questions: Awaited<ReturnType<typeof seedQuestions>>
) {
  const acceptedTwoSum = await prisma.attempt.create({
    data: {
      userId,
      questionId: questions['two-sum'].id,
      code: 'function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}',
      language: 'javascript',
      status: AttemptStatus.ACCEPTED,
      timeSpent: 420,
      executionTime: 12,
      memoryUsed: 41,
      testCasesPassed: 3,
      testCasesTotal: 3,
      aiScore: 88,
      submittedAt: daysAgo(5),
      attemptNumber: 1,
    },
  });

  await prisma.attemptTestCase.createMany({
    data: [
      {
        attemptId: acceptedTwoSum.id,
        testCaseIndex: 0,
        input: '[[2,7,11,15],9]',
        expectedOutput: '[0,1]',
        actualOutput: '[0,1]',
        passed: true,
        executionTime: 4,
      },
      {
        attemptId: acceptedTwoSum.id,
        testCaseIndex: 1,
        input: '[[3,2,4],6]',
        expectedOutput: '[1,2]',
        actualOutput: '[1,2]',
        passed: true,
        executionTime: 5,
      },
      {
        attemptId: acceptedTwoSum.id,
        testCaseIndex: 2,
        input: '[[3,3],6]',
        expectedOutput: '[0,1]',
        actualOutput: '[0,1]',
        passed: true,
        executionTime: 3,
      },
    ],
  });

  await prisma.attemptFeedback.create({
    data: {
      attemptId: acceptedTwoSum.id,
      userId,
      overallScore: 88,
      summary: 'Correct one-pass hash map solution with clear complexity.',
      codeQualityScore: 86,
      codeQualityFeedback: 'Readable implementation with good variable naming.',
      readabilityScore: 90,
      bestPracticesFollowed: true,
      timeComplexityActual: 'O(n)',
      timeComplexityCorrect: true,
      spaceComplexityActual: 'O(n)',
      spaceComplexityCorrect: true,
      strengths: ['One-pass solution', 'Handles duplicate values', 'Clear control flow'],
      weaknesses: ['Could include a final fallback comment'],
      improvementSuggestions: ['Mention assumptions about exactly one answer during explanation.'],
      recommendedResources: [
        { title: 'Hash map patterns', url: 'https://leetcode.com/tag/hash-table/', type: 'practice' },
      ],
      relatedQuestions: [questions['valid-palindrome'].id],
      modelVersion: 'seed-fallback-v1',
    },
  });

  const wrongPalindrome = await prisma.attempt.create({
    data: {
      userId,
      questionId: questions['valid-palindrome'].id,
      code: 'function isPalindrome(s) {\n  return s === s.split("").reverse().join("");\n}',
      language: 'javascript',
      status: AttemptStatus.WRONG_ANSWER,
      timeSpent: 260,
      executionTime: 8,
      memoryUsed: 37,
      testCasesPassed: 0,
      testCasesTotal: 2,
      aiScore: 42,
      submittedAt: daysAgo(3),
      attemptNumber: 1,
    },
  });

  await prisma.attemptFeedback.create({
    data: {
      attemptId: wrongPalindrome.id,
      userId,
      overallScore: 42,
      summary: 'The implementation misses normalization of case and non-alphanumeric characters.',
      codeQualityScore: 52,
      codeQualityFeedback: 'The code is concise but does not implement the full prompt.',
      strengths: ['Simple expression', 'Easy to read'],
      weaknesses: ['Does not ignore punctuation', 'Does not normalize letter case'],
      improvementSuggestions: ['Use two pointers and skip invalid characters.'],
      recommendedResources: [
        { title: 'Two pointer technique', url: 'https://leetcode.com/tag/two-pointers/', type: 'practice' },
      ],
      relatedQuestions: [questions['two-sum'].id],
      modelVersion: 'seed-fallback-v1',
    },
  });

  return { acceptedTwoSum, wrongPalindrome };
}

async function seedResume(userId: string, skills: Awaited<ReturnType<typeof seedSkills>>) {
  const parsedData = {
    name: 'Test User',
    email: 'test@example.com',
    summary: 'Full-stack engineer focused on React, Node.js, PostgreSQL, and system design.',
    experience: [
      {
        company: 'Acme Cloud',
        title: 'Software Engineer',
        startDate: '2022-01-01',
        endDate: '2025-12-31',
        description: 'Built interview scheduling and analytics workflows.',
      },
    ],
    education: [
      {
        institution: 'State University',
        degree: 'B.Tech',
        field: 'Computer Science',
        graduationDate: '2021',
      },
    ],
    projects: [
      {
        name: 'Interview Prep Engine',
        description: 'Adaptive interview practice platform with analytics.',
        technologies: ['React', 'Node.js', 'PostgreSQL', 'Redis'],
      },
    ],
    skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'System Design'],
  };

  const resume = await prisma.resume.create({
    data: {
      userId,
      fileName: 'test-user-resume.pdf',
      fileUrl: '/uploads/test-user-resume.pdf',
      fileType: 'application/pdf',
      fileSize: 184320,
      parsedText: 'Full-stack engineer with React, Node.js, PostgreSQL, Redis, and system design experience.',
      parsedData,
      skillsDetected: [
        { skillName: 'JavaScript', confidenceScore: 0.94, yearsExperience: 4 },
        { skillName: 'System Design', confidenceScore: 0.82, yearsExperience: 2 },
      ],
      experienceYears: 4,
      education: parsedData.education,
      projects: parsedData.projects,
      parsingStatus: 'completed',
      isActive: true,
      uploadedAt: daysAgo(10),
      parsedAt: daysAgo(10),
    },
  });

  await prisma.resumeSkill.createMany({
    data: [
      {
        resumeId: resume.id,
        skillId: skills.javascript.id,
        skillName: 'JavaScript',
        confidenceScore: 0.94,
        yearsExperience: 4,
        context: 'Frontend and backend services',
      },
      {
        resumeId: resume.id,
        skillId: skills['system-design'].id,
        skillName: 'System Design',
        confidenceScore: 0.82,
        yearsExperience: 2,
        context: 'Scalable API design and caching',
      },
    ],
  });
}

async function seedInterviews(
  userId: string,
  companies: Awaited<ReturnType<typeof seedCompanies>>
) {
  await prisma.interviewSession.create({
    data: {
      userId,
      title: 'Google Technical Warmup',
      interviewType: InterviewType.TECHNICAL,
      difficulty: Difficulty.medium,
      targetCompanyId: companies.google.id,
      scheduledAt: daysAgo(-1),
      durationMinutes: 45,
      status: InterviewStatus.SCHEDULED,
      aiInterviewerConfig: { mode: 'technical', focus: ['arrays', 'hash tables'] },
    },
  });

  await prisma.interviewSession.create({
    data: {
      userId,
      title: 'Stripe System Design Practice',
      interviewType: InterviewType.SYSTEM_DESIGN,
      difficulty: Difficulty.hard,
      targetCompanyId: companies.stripe.id,
      scheduledAt: daysAgo(1),
      startedAt: daysAgo(1),
      endedAt: daysAgo(1),
      durationMinutes: 60,
      status: InterviewStatus.COMPLETED,
      overallScore: 78,
      technicalScore: 80,
      communicationScore: 74,
      problemSolvingScore: 81,
      transcript: 'Q: Design a rate limiter.\nA: I would use token buckets backed by Redis with local fallback caches.',
      summaryFeedback: 'Strong architecture coverage with room for deeper failure mode discussion.',
      strengths: ['Clear API surface', 'Good caching trade-offs', 'Mentioned observability'],
      areasToImprove: ['Quantify capacity estimates', 'Discuss multi-region consistency'],
      interviewQuestions: {
        create: [
          {
            questionText: 'Design a rate limiter for a public API.',
            questionType: 'system-design',
            expectedTopics: ['token bucket', 'Redis', 'hot keys', 'observability'],
            userAnswer: 'I would use token buckets backed by Redis, with local fallback caches and per-policy keys.',
            answerSubmittedAt: daysAgo(1),
            aiEvaluation: 'Good coverage of algorithm and storage. Add consistency and capacity numbers.',
            score: 78,
            questionOrder: 1,
          },
        ],
      },
    },
  });
}

async function seedLearningPath(
  userId: string,
  skills: Awaited<ReturnType<typeof seedSkills>>,
  companies: Awaited<ReturnType<typeof seedCompanies>>,
  questions: Awaited<ReturnType<typeof seedQuestions>>,
  attempts: Awaited<ReturnType<typeof seedAttempts>>
) {
  await prisma.learningPath.create({
    data: {
      userId,
      name: 'Google Coding Readiness',
      description: 'A focused plan covering arrays, hash maps, and dynamic programming.',
      targetSkillId: skills.arrays.id,
      targetCompanyId: companies.google.id,
      totalItems: 4,
      completedItems: 1,
      progressPercentage: 25,
      estimatedHours: 8,
      startDate: daysAgo(7),
      targetCompletionDate: daysAgo(-14),
      status: PathStatus.ACTIVE,
      pathItems: {
        create: [
          {
            questionId: questions['two-sum'].id,
            itemType: PathItemType.QUESTION,
            title: 'Solve Two Sum',
            description: 'Practice one-pass hash map lookup.',
            orderIndex: 1,
            scheduledDate: daysAgo(6),
            estimatedMinutes: 30,
            status: PathItemStatus.COMPLETED,
            completedAt: daysAgo(5),
            attemptId: attempts.acceptedTwoSum.id,
          },
          {
            questionId: questions['valid-palindrome'].id,
            itemType: PathItemType.QUESTION,
            title: 'Review Two Pointers',
            description: 'Fix the normalization edge cases from the previous attempt.',
            orderIndex: 2,
            scheduledDate: daysAgo(1),
            estimatedMinutes: 30,
            status: PathItemStatus.IN_PROGRESS,
          },
          {
            questionId: questions['best-time-to-buy-and-sell-stock'].id,
            itemType: PathItemType.QUESTION,
            title: 'Greedy Array Scan',
            description: 'Practice single-pass minimum tracking.',
            orderIndex: 3,
            scheduledDate: daysAgo(-2),
            estimatedMinutes: 25,
            status: PathItemStatus.PENDING,
          },
          {
            itemType: PathItemType.MILESTONE,
            title: 'Mock Interview Checkpoint',
            description: 'Complete a 45-minute technical mock interview.',
            orderIndex: 4,
            scheduledDate: daysAgo(-4),
            estimatedMinutes: 45,
            status: PathItemStatus.PENDING,
          },
        ],
      },
    },
  });
}

async function seedSpacedRepetition(
  userId: string,
  questions: Awaited<ReturnType<typeof seedQuestions>>,
  attempts: Awaited<ReturnType<typeof seedAttempts>>
) {
  const twoSumCard = await prisma.spacedRepetition.create({
    data: {
      userId,
      questionId: questions['two-sum'].id,
      interval: 6,
      repetitions: 2,
      easeFactor: 2.6,
      nextReviewDate: daysAgo(0),
      lastReviewedAt: daysAgo(6),
      reviewCount: 2,
      successfulReviews: 2,
      failedReviews: 0,
      status: SpacedRepetitionStatus.ACTIVE,
    },
  });

  await prisma.spacedRepetitionReview.create({
    data: {
      srId: twoSumCard.id,
      attemptId: attempts.acceptedTwoSum.id,
      qualityRating: 4,
      reviewedAt: daysAgo(6),
      previousInterval: 1,
      newInterval: 6,
      previousEf: 2.5,
      newEf: 2.6,
    },
  });

  await prisma.spacedRepetition.create({
    data: {
      userId,
      questionId: questions['valid-palindrome'].id,
      interval: 1,
      repetitions: 0,
      easeFactor: 2.3,
      nextReviewDate: daysAgo(0),
      lastReviewedAt: daysAgo(1),
      reviewCount: 1,
      successfulReviews: 0,
      failedReviews: 1,
      status: SpacedRepetitionStatus.ACTIVE,
    },
  });

  await prisma.spacedRepetition.create({
    data: {
      userId,
      questionId: questions['climbing-stairs'].id,
      interval: 30,
      repetitions: 5,
      easeFactor: 2.8,
      nextReviewDate: daysAgo(-12),
      lastReviewedAt: daysAgo(18),
      reviewCount: 5,
      successfulReviews: 5,
      failedReviews: 0,
      status: SpacedRepetitionStatus.MASTERED,
    },
  });
}

async function seedAnalytics(userId: string) {
  for (let index = 13; index >= 0; index--) {
    const attempted = index % 3 === 0 ? 1 : 2;
    const solved = index % 4 === 0 ? 1 : attempted;

    await prisma.analyticsDaily.create({
      data: {
        userId,
        date: daysAgo(index),
        sessionCount: 1,
        totalTimeMinutes: 25 + index,
        questionsAttempted: attempted,
        questionsSolved: solved,
        accuracyRate: Math.round((solved / attempted) * 100),
        avgTimePerQuestion: 600 + index * 12,
        skillBreakdown: {
          arrays: { attempted, solved },
          hashTables: { attempted: 1, solved: index % 2 },
        },
        easyAttempted: attempted,
        easySolved: solved,
        mediumAttempted: index % 2,
        mediumSolved: index % 2,
        hardAttempted: index % 5 === 0 ? 1 : 0,
        hardSolved: 0,
        streakDay: 14 - index,
      },
    });
  }
}

async function seedActivity(userId: string) {
  await prisma.userActivity.createMany({
    data: [
      {
        userId,
        activityType: 'login',
        metadata: { source: 'seed' },
        createdAt: daysAgo(1),
      },
      {
        userId,
        activityType: 'attempt_submitted',
        metadata: { question: 'two-sum', status: 'ACCEPTED' },
        createdAt: daysAgo(5),
      },
      {
        userId,
        activityType: 'interview_completed',
        metadata: { title: 'Stripe System Design Practice', score: 78 },
        createdAt: daysAgo(1),
      },
    ],
  });
}

async function seedBilling(userId: string) {
  const subscription = await prisma.subscription.create({
    data: {
      userId,
      planType: PlanType.PREMIUM,
      billingCycle: BillingCycle.MONTHLY,
      status: SubscriptionStatus.ACTIVE,
      startDate: daysAgo(20),
      endDate: daysAgo(-10),
      paymentProvider: 'seed',
      paymentProviderSubscriptionId: 'sub_seed_premium_001',
      amount: 19,
      currency: 'USD',
    },
  });

  await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      userId,
      amount: 19,
      currency: 'USD',
      status: PaymentStatus.COMPLETED,
      paymentProvider: 'seed',
      paymentProviderChargeId: 'ch_seed_001',
      invoiceUrl: 'https://example.com/invoices/seed-001',
      completedAt: daysAgo(20),
    },
  });
}

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Password123', 10);

  await resetSeedUsers();
  const users = await seedUsers(passwordHash);
  const skills = await seedSkills();
  const companies = await seedCompanies();
  const tags = await seedTags();
  const questions = await seedQuestions(skills, companies, tags);

  await seedUserSkills(users, skills);
  const attempts = await seedAttempts(users.testUser.id, questions);
  await seedResume(users.testUser.id, skills);
  await seedInterviews(users.testUser.id, companies);
  await seedLearningPath(users.testUser.id, skills, companies, questions, attempts);
  await seedSpacedRepetition(users.testUser.id, questions, attempts);
  await seedAnalytics(users.testUser.id);
  await seedActivity(users.testUser.id);
  await seedBilling(users.premiumUser.id);

  console.log('Seed completed.');
  console.log('Accounts:');
  console.log('  test@example.com / Password123');
  console.log('  premium@example.com / Password123');
  console.log('  admin@example.com / Password123');
  console.log('  alex.candidate@example.com / Password123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
