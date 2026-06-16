import { Difficulty, QuestionType } from '@prisma/client';

export const getNewQuestions = (skills: any) => [
  {
    skillId: skills['dynamic-programming'].id,
    title: 'Climbing Stairs',
    slug: 'climbing-stairs',
    description: 'Count the number of distinct ways to climb to the top of a staircase.',
    problemStatement: '<p>You are climbing a staircase. It takes <code>n</code> steps to reach the top.</p><p>Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?</p>',
    difficulty: Difficulty.easy,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst n = parseInt(fs.readFileSync(0, 'utf8').trim());\n\n// TODO: print the number of ways\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\n\n# TODO: print the number of ways\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    // TODO: print the number of ways\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        // TODO: print the number of ways\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function climbStairs(n) {
  if (n <= 2) return n;
  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) {
    let temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}
const fs = require('fs');
const n = parseInt(fs.readFileSync(0, 'utf8').trim());
console.log(climbStairs(n));
`,
    },
    hints: ['To reach the nth step, you must jump from either the (n-1)th step or the (n-2)th step.'],
    testCases: [
      { input: '2', expectedOutput: '2', isExample: true },
      { input: '3', expectedOutput: '3', isExample: true },
      { input: '5', expectedOutput: '8', isExample: false },
    ],
    constraints: ['1 <= n <= 45'],
    followUpQuestions: ['Can you solve it in O(1) space complexity?'],
    companyTags: ['Amazon', 'Google', 'Apple'],
    topicTags: ['math', 'dynamic-programming', 'memoization'],
    acceptanceRate: 52.3,
    totalAttempts: 1500,
    totalSolves: 785,
    explanation: '<p>This is a Fibonacci sequence variation. The number of ways to reach step <code>n</code> is the sum of ways to reach step <code>n-1</code> and step <code>n-2</code>.</p>',
  },
  {
    skillId: skills['dynamic-programming'].id,
    title: 'House Robber',
    slug: 'house-robber',
    description: 'Find the maximum amount of money you can rob from houses along a street without alerting the police.',
    problemStatement: '<p>You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security systems connected and <b>it will automatically contact the police if two adjacent houses were broken into on the same night</b>.</p><p>Given an integer array <code>nums</code> representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst n = input[0];\nconst nums = input.slice(1, 1+n);\n\n// TODO: print the maximum amount\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\nnums = [int(x) for x in data[1:1+n]]\n\n# TODO: print the maximum amount\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for(int i=0; i<n; i++) cin >> nums[i];\n    // TODO: print the maximum amount\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n        // TODO: print the maximum amount\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function rob(nums) {
  let rob1 = 0, rob2 = 0;
  for (let n of nums) {
    let temp = Math.max(n + rob1, rob2);
    rob1 = rob2;
    rob2 = temp;
  }
  return rob2;
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
console.log(rob(input.slice(1, 1+input[0])));
`,
    },
    hints: ['If you rob house i, you cannot rob house i-1 or i+1.', 'Keep track of the max money up to the previous house and the house before that.'],
    testCases: [
      { input: '4\n1 2 3 1', expectedOutput: '4', isExample: true },
      { input: '5\n2 7 9 3 1', expectedOutput: '12', isExample: true },
    ],
    constraints: ['1 <= nums.length <= 100', '0 <= nums[i] <= 400'],
    followUpQuestions: [],
    companyTags: ['Google', 'Amazon', 'Microsoft'],
    topicTags: ['array', 'dynamic-programming'],
    acceptanceRate: 50.1,
    totalAttempts: 1200,
    totalSolves: 601,
    explanation: '<p>At each step, decide whether to rob the current house (adding its value to the max from two houses ago) or skip it (keeping the max from the previous house).</p>',
  },
  {
    skillId: skills['dynamic-programming'].id,
    title: 'House Robber II',
    slug: 'house-robber-ii',
    description: 'Find the maximum amount of money you can rob when the houses are arranged in a circle.',
    problemStatement: '<p>You are a professional robber planning to rob houses along a street. All houses at this place are <b>arranged in a circle</b>. That means the first house is the neighbor of the last one. Meanwhile, adjacent houses have a security system connected, and it will automatically contact the police if two adjacent houses were broken into on the same night.</p><p>Given an integer array <code>nums</code> representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst n = input[0];\nconst nums = input.slice(1, 1+n);\n\n// TODO: print the maximum amount\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\nnums = [int(x) for x in data[1:1+n]]\n\n# TODO: print the maximum amount\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for(int i=0; i<n; i++) cin >> nums[i];\n    // TODO: print the maximum amount\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n        // TODO: print the maximum amount\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function rob2(nums) {
  if (nums.length === 1) return nums[0];
  function helper(arr) {
    let rob1 = 0, rob2 = 0;
    for (let n of arr) {
      let temp = Math.max(n + rob1, rob2);
      rob1 = rob2;
      rob2 = temp;
    }
    return rob2;
  }
  return Math.max(helper(nums.slice(0, -1)), helper(nums.slice(1)));
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
console.log(rob2(input.slice(1, 1+input[0])));
`,
    },
    hints: ['Since the houses form a circle, you cannot rob both the first and the last house.', 'Run the standard House Robber algorithm twice: once skipping the first house, and once skipping the last house.'],
    testCases: [
      { input: '3\n2 3 2', expectedOutput: '3', isExample: true },
      { input: '4\n1 2 3 1', expectedOutput: '4', isExample: true },
      { input: '3\n1 2 3', expectedOutput: '3', isExample: false },
    ],
    constraints: ['1 <= nums.length <= 100', '0 <= nums[i] <= 1000'],
    followUpQuestions: [],
    companyTags: ['Microsoft', 'ByteDance'],
    topicTags: ['array', 'dynamic-programming'],
    acceptanceRate: 41.5,
    totalAttempts: 950,
    totalSolves: 394,
    explanation: '<p>The circle means the first and last houses are adjacent. We can solve this by taking the max of two linear house robber problems: one excluding the first house, and one excluding the last.</p>',
  },
  {
    skillId: skills['dynamic-programming'].id,
    title: 'Unique Paths',
    slug: 'unique-paths',
    description: 'Find the number of possible unique paths from the top-left to the bottom-right of a grid.',
    problemStatement: '<p>There is a robot on an <code>m x n</code> grid. The robot is initially located at the top-left corner (i.e., <code>grid[0][0]</code>). The robot tries to move to the bottom-right corner (i.e., <code>grid[m - 1][n - 1]</code>). The robot can only move either down or right at any point in time.</p><p>Given the two integers <code>m</code> and <code>n</code>, return the number of possible unique paths that the robot can take to reach the bottom-right corner.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst m = input[0];\nconst n = input[1];\n\n// TODO: print the number of unique paths\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif len(data) < 2: sys.exit()\nm = int(data[0])\nn = int(data[1])\n\n# TODO: print the number of unique paths\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int m, n;\n    if (!(cin >> m >> n)) return 0;\n    // TODO: print the number of unique paths\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int m = sc.nextInt();\n        int n = sc.nextInt();\n        // TODO: print the number of unique paths\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function uniquePaths(m, n) {
  const row = new Array(n).fill(1);
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      row[j] += row[j - 1];
    }
  }
  return row[n - 1];
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
console.log(uniquePaths(input[0], input[1]));
`,
    },
    hints: ['Can you use dynamic programming?', 'The number of paths to cell (i, j) is the sum of paths to (i-1, j) and (i, j-1).'],
    testCases: [
      { input: '3 7', expectedOutput: '28', isExample: true },
      { input: '3 2', expectedOutput: '3', isExample: true },
    ],
    constraints: ['1 <= m, n <= 100'],
    followUpQuestions: ['Can you optimize the space complexity to O(n)?'],
    companyTags: ['Amazon', 'Facebook'],
    topicTags: ['math', 'dynamic-programming', 'combinatorics'],
    acceptanceRate: 63.8,
    totalAttempts: 1100,
    totalSolves: 701,
    explanation: '<p>Calculate the paths iteratively. Since you can only move right or down, <code>paths[i][j] = paths[i-1][j] + paths[i][j-1]</code>. This can be space-optimized to use a 1D array.</p>',
  },
  {
    skillId: skills['dynamic-programming'].id,
    title: 'Unique Paths II',
    slug: 'unique-paths-ii',
    description: 'Find the number of possible unique paths in a grid with obstacles.',
    problemStatement: '<p>You are given an <code>m x n</code> integer array <code>grid</code>. There is a robot initially located at the top-left corner. The robot tries to move to the bottom-right corner. The robot can only move either down or right at any point in time.</p><p>An obstacle and space are marked as <code>1</code> or <code>0</code> respectively in <code>grid</code>. A path that the robot takes cannot include any square that is an obstacle. Return the number of possible unique paths that the robot can take to reach the bottom-right corner.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst m = input[0];\nconst n = input[1];\nconst grid = [];\nlet idx = 2;\nfor(let i=0; i<m; i++) { grid.push(input.slice(idx, idx+n)); idx+=n; }\n\n// TODO: print the number of paths\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif len(data) < 2: sys.exit()\nm = int(data[0])\nn = int(data[1])\ngrid = []\nidx = 2\nfor i in range(m):\n    grid.append([int(x) for x in data[idx:idx+n]])\n    idx += n\n\n# TODO: print the number of paths\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int m, n;\n    if (!(cin >> m >> n)) return 0;\n    vector<vector<int>> grid(m, vector<int>(n));\n    for(int i=0; i<m; i++) {\n        for(int j=0; j<n; j++) {\n            cin >> grid[i][j];\n        }\n    }\n    // TODO: print the number of paths\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int m = sc.nextInt();\n        int n = sc.nextInt();\n        int[][] grid = new int[m][n];\n        for(int i=0; i<m; i++) {\n            for(int j=0; j<n; j++) {\n                grid[i][j] = sc.nextInt();\n            }\n        }\n        // TODO: print the number of paths\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function uniquePathsWithObstacles(obstacleGrid) {
  const m = obstacleGrid.length;
  const n = obstacleGrid[0].length;
  if (obstacleGrid[0][0] === 1) return 0;
  
  const dp = new Array(n).fill(0);
  dp[0] = 1;
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (obstacleGrid[i][j] === 1) {
        dp[j] = 0;
      } else if (j > 0) {
        dp[j] += dp[j - 1];
      }
    }
  }
  return dp[n - 1];
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
const m = input[0], n = input[1];
const grid = [];
let idx = 2;
for(let i=0; i<m; i++) { grid.push(input.slice(idx, idx+n)); idx+=n; }
console.log(uniquePathsWithObstacles(grid));
`,
    },
    hints: ['If a cell contains an obstacle, the number of paths to reach it is 0.'],
    testCases: [
      { input: '3 3\n0 0 0\n0 1 0\n0 0 0', expectedOutput: '2', isExample: true },
      { input: '2 2\n0 1\n0 0', expectedOutput: '1', isExample: true },
    ],
    constraints: ['m == obstacleGrid.length', 'n == obstacleGrid[i].length', '1 <= m, n <= 100', 'obstacleGrid[i][j] is 0 or 1'],
    followUpQuestions: [],
    companyTags: ['Bloomberg', 'Google'],
    topicTags: ['array', 'dynamic-programming', 'matrix'],
    acceptanceRate: 40.5,
    totalAttempts: 800,
    totalSolves: 324,
    explanation: '<p>Similar to Unique Paths, but when you encounter a <code>1</code> (obstacle), you set the paths for that cell to <code>0</code>.</p>',
  },
  {
    skillId: skills['dynamic-programming'].id,
    title: 'Minimum Path Sum',
    slug: 'minimum-path-sum',
    description: 'Find a path from top-left to bottom-right that minimizes the sum of numbers along its path.',
    problemStatement: '<p>Given a <code>m x n</code> <code>grid</code> filled with non-negative numbers, find a path from top left to bottom right, which minimizes the sum of all numbers along its path.</p><p><b>Note:</b> You can only move either down or right at any point in time.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst m = input[0];\nconst n = input[1];\nconst grid = [];\nlet idx = 2;\nfor(let i=0; i<m; i++) { grid.push(input.slice(idx, idx+n)); idx+=n; }\n\n// TODO: print the minimum sum\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif len(data) < 2: sys.exit()\nm = int(data[0])\nn = int(data[1])\ngrid = []\nidx = 2\nfor i in range(m):\n    grid.append([int(x) for x in data[idx:idx+n]])\n    idx += n\n\n# TODO: print the minimum sum\n`,
      cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    int m, n;\n    if (!(cin >> m >> n)) return 0;\n    vector<vector<int>> grid(m, vector<int>(n));\n    for(int i=0; i<m; i++) {\n        for(int j=0; j<n; j++) {\n            cin >> grid[i][j];\n        }\n    }\n    // TODO: print the minimum sum\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int m = sc.nextInt();\n        int n = sc.nextInt();\n        int[][] grid = new int[m][n];\n        for(int i=0; i<m; i++) {\n            for(int j=0; j<n; j++) {\n                grid[i][j] = sc.nextInt();\n            }\n        }\n        // TODO: print the minimum sum\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function minPathSum(grid) {
  const m = grid.length;
  const n = grid[0].length;
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (i === 0 && j === 0) continue;
      if (i === 0) grid[i][j] += grid[i][j - 1];
      else if (j === 0) grid[i][j] += grid[i - 1][j];
      else grid[i][j] += Math.min(grid[i - 1][j], grid[i][j - 1]);
    }
  }
  return grid[m - 1][n - 1];
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
const m = input[0], n = input[1];
const grid = [];
let idx = 2;
for(let i=0; i<m; i++) { grid.push(input.slice(idx, idx+n)); idx+=n; }
console.log(minPathSum(grid));
`,
    },
    hints: ['Modify the input grid in-place to store the minimum sum to reach each cell.'],
    testCases: [
      { input: '3 3\n1 3 1\n1 5 1\n4 2 1', expectedOutput: '7', isExample: true },
      { input: '2 3\n1 2 3\n4 5 6', expectedOutput: '12', isExample: true },
    ],
    constraints: ['m == grid.length', 'n == grid[i].length', '1 <= m, n <= 200', '0 <= grid[i][j] <= 200'],
    followUpQuestions: [],
    companyTags: ['Amazon', 'Goldman Sachs'],
    topicTags: ['array', 'dynamic-programming', 'matrix'],
    acceptanceRate: 62.1,
    totalAttempts: 1050,
    totalSolves: 652,
    explanation: '<p>Update each cell to be the current cell value plus the minimum of the cell above it and the cell to its left.</p>',
  },
  {
    skillId: skills['dynamic-programming'].id,
    title: 'Triangle',
    slug: 'triangle',
    description: 'Find the minimum path sum from top to bottom of a triangle.',
    problemStatement: '<p>Given a <code>triangle</code> array, return the minimum path sum from top to bottom.</p><p>For each step, you may move to an adjacent number of the row below. More formally, if you are on index <code>i</code> on the current row, you may move to either index <code>i</code> or index <code>i + 1</code> on the next row.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst rows = input[0];\nconst triangle = [];\nlet idx = 1;\nfor(let i=1; i<=rows; i++) { triangle.push(input.slice(idx, idx+i)); idx+=i; }\n\n// TODO: print the minimum path sum\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nrows = int(data[0])\ntriangle = []\nidx = 1\nfor i in range(1, rows + 1):\n    triangle.append([int(x) for x in data[idx:idx+i]])\n    idx += i\n\n# TODO: print the minimum path sum\n`,
      cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    int rows;\n    if (!(cin >> rows)) return 0;\n    vector<vector<int>> triangle;\n    for(int i=1; i<=rows; i++) {\n        vector<int> row(i);\n        for(int j=0; j<i; j++) cin >> row[j];\n        triangle.push_back(row);\n    }\n    // TODO: print the minimum path sum\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int rows = sc.nextInt();\n        List<List<Integer>> triangle = new ArrayList<>();\n        for(int i=1; i<=rows; i++) {\n            List<Integer> row = new ArrayList<>();\n            for(int j=0; j<i; j++) row.add(sc.nextInt());\n            triangle.add(row);\n        }\n        // TODO: print the minimum path sum\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function minimumTotal(triangle) {
  const n = triangle.length;
  const dp = [...triangle[n - 1]];
  
  for (let i = n - 2; i >= 0; i--) {
    for (let j = 0; j <= i; j++) {
      dp[j] = triangle[i][j] + Math.min(dp[j], dp[j + 1]);
    }
  }
  return dp[0];
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
const rows = input[0];
const triangle = [];
let idx = 1;
for(let i=1; i<=rows; i++) { triangle.push(input.slice(idx, idx+i)); idx+=i; }
console.log(minimumTotal(triangle));
`,
    },
    hints: ['It is easier to solve this problem from the bottom up rather than top down.'],
    testCases: [
      { input: '4\n2\n3 4\n6 5 7\n4 1 8 3', expectedOutput: '11', isExample: true },
      { input: '1\n-10', expectedOutput: '-10', isExample: true },
    ],
    constraints: ['1 <= triangle.length <= 200', 'triangle[0].length == 1', 'triangle[i].length == triangle[i - 1].length + 1', '-10^4 <= triangle[i][j] <= 10^4'],
    followUpQuestions: ['Could you do this using only O(n) extra space, where n is the total number of rows in the triangle?'],
    companyTags: ['Amazon', 'Apple'],
    topicTags: ['array', 'dynamic-programming'],
    acceptanceRate: 55.4,
    totalAttempts: 700,
    totalSolves: 388,
    explanation: '<p>Working from the bottom row upwards, the minimum path sum to an element is its value plus the minimum of the two adjacent elements directly below it.</p>',
  }
];