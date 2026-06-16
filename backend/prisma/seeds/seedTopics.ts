import { Prisma, PrismaClient, SkillCategory } from '@prisma/client';

const prisma = new PrismaClient();

type TopicSeed = {
  name: string;
  slug: string;
  description: string;
  category: SkillCategory;
  difficultyLevel: number;
  colorCode: string;
  estimatedHours: number;
  displayOrder: number;
};

const topics: TopicSeed[] = [
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
    name: 'Strings',
    slug: 'strings',
    description: 'String parsing, pattern matching, and character frequency.',
    category: SkillCategory.DATA_STRUCTURES,
    difficultyLevel: 1,
    colorCode: '#0891b2',
    estimatedHours: 7,
    displayOrder: 2,
  },
  {
    name: 'Hash Tables',
    slug: 'hash-tables',
    description: 'Hash maps, frequency counting, and constant-time lookup patterns.',
    category: SkillCategory.DATA_STRUCTURES,
    difficultyLevel: 2,
    colorCode: '#16a34a',
    estimatedHours: 6,
    displayOrder: 3,
  },
  {
    name: 'Two Pointers',
    slug: 'two-pointers',
    description: 'Opposite-end scans, pair finding, partitioning, and sorted array patterns.',
    category: SkillCategory.ALGORITHMS,
    difficultyLevel: 2,
    colorCode: '#0f766e',
    estimatedHours: 6,
    displayOrder: 4,
  },
  {
    name: 'Sliding Window',
    slug: 'sliding-window',
    description: 'Fixed and variable window techniques for arrays and strings.',
    category: SkillCategory.ALGORITHMS,
    difficultyLevel: 2,
    colorCode: '#0284c7',
    estimatedHours: 7,
    displayOrder: 5,
  },
  {
    name: 'Binary Search',
    slug: 'binary-search',
    description: 'Search space reduction, lower/upper bounds, and answer binary search.',
    category: SkillCategory.ALGORITHMS,
    difficultyLevel: 2,
    colorCode: '#7c3aed',
    estimatedHours: 7,
    displayOrder: 6,
  },
  {
    name: 'Recursion',
    slug: 'recursion',
    description: 'Recursive decomposition, base cases, and call stack reasoning.',
    category: SkillCategory.ALGORITHMS,
    difficultyLevel: 2,
    colorCode: '#9333ea',
    estimatedHours: 7,
    displayOrder: 7,
  },
  {
    name: 'Backtracking',
    slug: 'backtracking',
    description: 'Search, pruning, permutations, combinations, and constraint exploration.',
    category: SkillCategory.ALGORITHMS,
    difficultyLevel: 3,
    colorCode: '#c026d3',
    estimatedHours: 10,
    displayOrder: 8,
  },
  {
    name: 'Dynamic Programming',
    slug: 'dynamic-programming',
    description: 'Memoization, tabulation, state transitions, and optimal substructure.',
    category: SkillCategory.ALGORITHMS,
    difficultyLevel: 4,
    colorCode: '#dc2626',
    estimatedHours: 16,
    displayOrder: 9,
  },
  {
    name: 'Greedy Algorithms',
    slug: 'greedy-algorithms',
    description: 'Local-choice strategies, scheduling, intervals, and proof intuition.',
    category: SkillCategory.ALGORITHMS,
    difficultyLevel: 3,
    colorCode: '#ea580c',
    estimatedHours: 9,
    displayOrder: 10,
  },
  {
    name: 'Trees',
    slug: 'trees',
    description: 'Binary trees, BSTs, traversal, recursion, and depth-based reasoning.',
    category: SkillCategory.DATA_STRUCTURES,
    difficultyLevel: 3,
    colorCode: '#65a30d',
    estimatedHours: 12,
    displayOrder: 11,
  },
  {
    name: 'Graphs',
    slug: 'graphs',
    description: 'BFS, DFS, shortest paths, topological sort, and connectivity.',
    category: SkillCategory.DATA_STRUCTURES,
    difficultyLevel: 4,
    colorCode: '#4f46e5',
    estimatedHours: 14,
    displayOrder: 12,
  },
  {
    name: 'Heaps & Priority Queues',
    slug: 'heaps-priority-queues',
    description: 'Priority queues, top-k problems, scheduling, and heap-based optimization.',
    category: SkillCategory.DATA_STRUCTURES,
    difficultyLevel: 3,
    colorCode: '#db2777',
    estimatedHours: 8,
    displayOrder: 13,
  },
  {
    name: 'Tries',
    slug: 'tries',
    description: 'Prefix trees, autocomplete, word search, and string indexing.',
    category: SkillCategory.DATA_STRUCTURES,
    difficultyLevel: 3,
    colorCode: '#059669',
    estimatedHours: 7,
    displayOrder: 14,
  },
  {
    name: 'Intervals',
    slug: 'intervals',
    description: 'Merging, overlap checks, sweep line, and scheduling ranges.',
    category: SkillCategory.ALGORITHMS,
    difficultyLevel: 3,
    colorCode: '#f59e0b',
    estimatedHours: 7,
    displayOrder: 15,
  },
  {
    name: 'Bit Manipulation',
    slug: 'bit-manipulation',
    description: 'XOR tricks, bit masks, subsets, and low-level integer operations.',
    category: SkillCategory.ALGORITHMS,
    difficultyLevel: 3,
    colorCode: '#475569',
    estimatedHours: 7,
    displayOrder: 16,
  },
];

async function main() {
  console.log('Seeding DSA topics...');

  for (const topic of topics) {
    const updateData: Prisma.SkillUpdateInput = {
      name: topic.name,
      description: topic.description,
      category: topic.category,
      difficultyLevel: topic.difficultyLevel,
      colorCode: topic.colorCode,
      estimatedHours: topic.estimatedHours,
      displayOrder: topic.displayOrder,
      isActive: true,
    };

    const createData: Prisma.SkillCreateInput = {
      ...topic,
      prerequisites: [],
      isActive: true,
    };

    await prisma.skill.upsert({
      where: { slug: topic.slug },
      update: updateData,
      create: createData,
    });

    await prisma.tag.upsert({
      where: { name: topic.slug },
      update: {},
      create: {
        name: topic.slug,
        category: 'practice',
      },
    });
  }

  console.log(`Seeded ${topics.length} DSA topics and matching tags.`);
}

main()
  .catch((error) => {
    console.error(error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
