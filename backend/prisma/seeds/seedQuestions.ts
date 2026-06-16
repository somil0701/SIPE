import { Difficulty, QuestionType } from '@prisma/client';

export const getNewQuestions = (skills: any) => [
  {
    skillId: skills.arrays.id,
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    description: 'Determine if the input string has valid parentheses.',
    problemStatement: '<p>Given a string <code>s</code> containing just the characters <code>\'(\'</code>, <code>\')\'</code>, <code>\'{\'</code>, <code>\'}\'</code>, <code>\'[\'</code> and <code>\']\'</code>, determine if the input string is valid.</p>',
    difficulty: Difficulty.easy,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf8').trim();\n\n// TODO: print true or false\n`,
      python: `import sys\ns = sys.stdin.read().strip()\n\n# TODO: print True or False\n`,
      cpp: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s;\n    cin >> s;\n    // TODO: print true or false\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNext()) return;\n        String s = sc.next();\n        // TODO: print true or false\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const char of s) {
    if (!map[char]) stack.push(char);
    else if (stack.pop() !== map[char]) return false;
  }
  return stack.length === 0;
}
const fs = require('fs');
const s = fs.readFileSync(0, 'utf8').trim();
console.log(isValid(s));
`,
    },
    hints: ['Use a stack.'],
    testCases: [
      { input: '()', expectedOutput: 'true', isExample: true },
      { input: '()[]{}', expectedOutput: 'true', isExample: true },
      { input: '(]', expectedOutput: 'false', isExample: false },
    ],
    constraints: ['1 <= s.length <= 10^4'],
    followUpQuestions: [],
    companyTags: ['Amazon', 'Microsoft'],
    topicTags: ['stack', 'string'],
    acceptanceRate: 40.2,
    totalAttempts: 500,
    totalSolves: 201,
    explanation: '<p>Use a stack to keep track of opening brackets.</p>',
  },
  {
    skillId: skills.arrays.id,
    title: 'Contains Duplicate',
    slug: 'contains-duplicate',
    description: 'Find if the array contains any duplicates.',
    problemStatement: '<p>Given an integer array <code>nums</code>, return <code>true</code> if any value appears at least twice in the array, and return <code>false</code> if every element is distinct.</p>',
    difficulty: Difficulty.easy,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst n = input[0];\nconst nums = input.slice(1, 1+n);\n\n// TODO: print true or false\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\nnums = [int(x) for x in data[1:1+n]]\n\n# TODO: print True or False\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for(int i=0; i<n; i++) cin >> nums[i];\n    // TODO: print true or false\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n        // TODO: print true or false\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function containsDuplicate(nums) {
  return new Set(nums).size !== nums.length;
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
console.log(containsDuplicate(input.slice(1, 1+input[0])));
`,
    },
    hints: ['Use a hash set.'],
    testCases: [
      { input: '4\n1 2 3 1', expectedOutput: 'true', isExample: true },
      { input: '4\n1 2 3 4', expectedOutput: 'false', isExample: true },
      { input: '10\n1 1 1 3 3 4 3 2 4 2', expectedOutput: 'true', isExample: false },
    ],
    constraints: ['1 <= nums.length <= 10^5'],
    followUpQuestions: [],
    companyTags: ['Apple', 'Microsoft'],
    topicTags: ['array', 'hash-table'],
    acceptanceRate: 61.2,
    totalAttempts: 400,
    totalSolves: 245,
    explanation: '<p>A hash set can efficiently check for duplicates in O(n) time.</p>',
  },
  {
    skillId: skills.arrays.id,
    title: 'Maximum Subarray',
    slug: 'maximum-subarray',
    description: 'Find the contiguous subarray with the largest sum.',
    problemStatement: '<p>Given an integer array <code>nums</code>, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst n = input[0];\nconst nums = input.slice(1, 1+n);\n\n// TODO: print the maximum sum\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\nnums = [int(x) for x in data[1:1+n]]\n\n# TODO: print maximum sum\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for(int i=0; i<n; i++) cin >> nums[i];\n    // TODO: print the maximum sum\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n        // TODO: print the maximum sum\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function maxSubArray(nums) {
  let cur = nums[0], max = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    max = Math.max(max, cur);
  }
  return max;
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
console.log(maxSubArray(input.slice(1, 1+input[0])));
`,
    },
    hints: ["Kadane's Algorithm is useful here."],
    testCases: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', isExample: true },
      { input: '1\n1', expectedOutput: '1', isExample: true },
      { input: '5\n5 4 -1 7 8', expectedOutput: '23', isExample: false },
    ],
    constraints: ['1 <= nums.length <= 10^5'],
    followUpQuestions: [],
    companyTags: ['LinkedIn', 'Amazon'],
    topicTags: ['array', 'dynamic-programming'],
    acceptanceRate: 50.1,
    totalAttempts: 600,
    totalSolves: 300,
    explanation: "<p>Use Kadane's algorithm to find the max subarray sum in O(n) time.</p>",
  },
  {
    skillId: skills.arrays.id,
    title: 'Product of Array Except Self',
    slug: 'product-of-array-except-self',
    description: 'Return an array such that answer[i] is equal to the product of all the elements of nums except nums[i].',
    problemStatement: '<p>Given an integer array <code>nums</code>, return an array <code>answer</code> such that <code>answer[i]</code> is equal to the product of all the elements of <code>nums</code> except <code>nums[i]</code>.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst n = input[0];\nconst nums = input.slice(1, 1+n);\n\n// TODO: print the result array space-separated\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\nnums = [int(x) for x in data[1:1+n]]\n\n# TODO: print space-separated result\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for(int i=0; i<n; i++) cin >> nums[i];\n    // TODO: print space-separated result\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n        // TODO: print space-separated result\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function productExceptSelf(nums) {
  const res = new Array(nums.length).fill(1);
  let left = 1, right = 1;
  for (let i = 0; i < nums.length; i++) {
    res[i] *= left;
    left *= nums[i];
  }
  for (let i = nums.length - 1; i >= 0; i--) {
    res[i] *= right;
    right *= nums[i];
  }
  return res;
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
console.log(productExceptSelf(input.slice(1, 1+input[0])).join(' '));
`,
    },
    hints: ['Calculate prefix and suffix products.'],
    testCases: [
      { input: '4\n1 2 3 4', expectedOutput: '24 12 8 6', isExample: true },
      { input: '5\n-1 1 0 -3 3', expectedOutput: '0 0 9 0 0', isExample: true },
    ],
    constraints: ['2 <= nums.length <= 10^5'],
    followUpQuestions: ['Can you do this in O(1) extra space?'],
    companyTags: ['Apple', 'Amazon'],
    topicTags: ['array', 'prefix-sum'],
    acceptanceRate: 65.0,
    totalAttempts: 550,
    totalSolves: 357,
    explanation: '<p>Use two passes to multiply prefix and suffix products without using division.</p>',
  },
  {
    skillId: skills.arrays.id,
    title: 'Find Minimum in Rotated Sorted Array',
    slug: 'find-minimum-in-rotated-sorted-array',
    description: 'Find the minimum element in a sorted array that has been rotated.',
    problemStatement: '<p>Given the sorted rotated array <code>nums</code> of unique elements, return the minimum element of this array.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst n = input[0];\nconst nums = input.slice(1, 1+n);\n\n// TODO: print the minimum element\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\nnums = [int(x) for x in data[1:1+n]]\n\n# TODO: print the minimum element\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for(int i=0; i<n; i++) cin >> nums[i];\n    // TODO: print the minimum element\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n        // TODO: print the minimum element\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function findMin(nums) {
  let left = 0, right = nums.length - 1;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] > nums[right]) left = mid + 1;
    else right = mid;
  }
  return nums[left];
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
console.log(findMin(input.slice(1, 1+input[0])));
`,
    },
    hints: ['Use binary search.'],
    testCases: [
      { input: '5\n3 4 5 1 2', expectedOutput: '1', isExample: true },
      { input: '7\n4 5 6 7 0 1 2', expectedOutput: '0', isExample: true },
      { input: '4\n11 13 15 17', expectedOutput: '11', isExample: false },
    ],
    constraints: ['1 <= nums.length <= 5000'],
    followUpQuestions: [],
    companyTags: ['Microsoft', 'Bloomberg'],
    topicTags: ['array', 'binary-search'],
    acceptanceRate: 48.9,
    totalAttempts: 420,
    totalSolves: 205,
    explanation: '<p>A binary search comparing the middle element with the rightmost element finds the pivot.</p>',
  },
  {
    skillId: skills.arrays.id,
    title: 'Search in Rotated Sorted Array',
    slug: 'search-in-rotated-sorted-array',
    description: 'Search for a target value in a rotated sorted array.',
    problemStatement: '<p>Given the array <code>nums</code> after the possible rotation and an integer <code>target</code>, return the index of <code>target</code> if it is in <code>nums</code>, or <code>-1</code> if it is not in <code>nums</code>.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst n = input[0];\nconst nums = input.slice(1, 1+n);\nconst target = input[1+n];\n\n// TODO: print the index\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\nnums = [int(x) for x in data[1:1+n]]\ntarget = int(data[1+n])\n\n# TODO: print the index\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n, target;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for(int i=0; i<n; i++) cin >> nums[i];\n    cin >> target;\n    // TODO: print the index\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n        int target = sc.nextInt();\n        // TODO: print the index\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function search(nums, target) {
  let left = 0, right = nums.length - 1;
  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[left] <= nums[mid]) {
      if (nums[left] <= target && target < nums[mid]) right = mid - 1;
      else left = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[right]) left = mid + 1;
      else right = mid - 1;
    }
  }
  return -1;
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
const n = input[0];
console.log(search(input.slice(1, 1+n), input[1+n]));
`,
    },
    hints: ['Use binary search to determine which half is sorted.'],
    testCases: [
      { input: '7\n4 5 6 7 0 1 2\n0', expectedOutput: '4', isExample: true },
      { input: '7\n4 5 6 7 0 1 2\n3', expectedOutput: '-1', isExample: true },
      { input: '1\n1\n0', expectedOutput: '-1', isExample: false },
    ],
    constraints: ['1 <= nums.length <= 5000'],
    followUpQuestions: [],
    companyTags: ['LinkedIn', 'Apple'],
    topicTags: ['array', 'binary-search'],
    acceptanceRate: 39.1,
    totalAttempts: 520,
    totalSolves: 203,
    explanation: '<p>Check which half of the array is properly sorted, then decide if the target falls within that sorted half.</p>',
  },
  {
    skillId: skills.arrays.id,
    title: '3Sum',
    slug: '3sum',
    description: 'Find all unique triplets in the array which gives the sum of zero.',
    problemStatement: '<p>Given an integer array nums, return all the triplets <code>[nums[i], nums[j], nums[k]]</code> such that <code>i != j</code>, <code>i != k</code>, and <code>j != k</code>, and <code>nums[i] + nums[j] + nums[k] == 0</code>. Print each triplet on a new line, sorted ascending.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst n = input[0];\nconst nums = input.slice(1, 1+n);\n\n// TODO: print each triplet space-separated on a new line\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\nnums = [int(x) for x in data[1:1+n]]\n\n# TODO: print each triplet\n`,
      cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for(int i=0; i<n; i++) cin >> nums[i];\n    // TODO: print each triplet space-separated on a new line\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n        // TODO: print each triplet space-separated on a new line\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const res = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let l = i + 1, r = nums.length - 1;
    while (l < r) {
      const sum = nums[i] + nums[l] + nums[r];
      if (sum === 0) {
        res.push([nums[i], nums[l], nums[r]]);
        while (l < r && nums[l] === nums[l + 1]) l++;
        while (l < r && nums[r] === nums[r - 1]) r--;
        l++; r--;
      } else if (sum < 0) {
        l++;
      } else {
        r--;
      }
    }
  }
  return res;
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
const res = threeSum(input.slice(1, 1+input[0]));
if (res.length === 0) console.log("");
for(const triplet of res) console.log(triplet.join(" "));
`,
    },
    hints: ['Sort the array first.', 'Use two pointers.'],
    testCases: [
      { input: '6\n-1 0 1 2 -1 -4', expectedOutput: '-1 -1 2\n-1 0 1', isExample: true },
      { input: '3\n0 1 1', expectedOutput: '', isExample: true },
      { input: '3\n0 0 0', expectedOutput: '0 0 0', isExample: false },
    ],
    constraints: ['3 <= nums.length <= 3000'],
    followUpQuestions: [],
    companyTags: ['Facebook', 'Amazon'],
    topicTags: ['array', 'two-pointers'],
    acceptanceRate: 33.2,
    totalAttempts: 700,
    totalSolves: 232,
    explanation: '<p>Sort the array, then iterate through it, using two pointers to find pairs that sum to -nums[i].</p>',
  },
  {
    skillId: skills.arrays.id,
    title: 'Container With Most Water',
    slug: 'container-with-most-water',
    description: 'Find two lines that together with the x-axis form a container, such that the container contains the most water.',
    problemStatement: '<p>You are given an integer array <code>height</code> of length <code>n</code>. There are <code>n</code> vertical lines drawn such that the two endpoints of the <code>i</code>-th line are <code>(i, 0)</code> and <code>(i, height[i])</code>. Find two lines that together with the x-axis form a container, such that the container contains the most water.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst n = input[0];\nconst height = input.slice(1, 1+n);\n\n// TODO: print the max water\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\nheight = [int(x) for x in data[1:1+n]]\n\n# TODO: print the max water\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> height(n);\n    for(int i=0; i<n; i++) cin >> height[i];\n    // TODO: print the max water\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] height = new int[n];\n        for(int i=0; i<n; i++) height[i] = sc.nextInt();\n        // TODO: print the max water\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function maxArea(height) {
  let max = 0;
  let l = 0, r = height.length - 1;
  while (l < r) {
    max = Math.max(max, Math.min(height[l], height[r]) * (r - l));
    if (height[l] < height[r]) l++;
    else r--;
  }
  return max;
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
console.log(maxArea(input.slice(1, 1+input[0])));
`,
    },
    hints: ['Use two pointers starting from the ends.'],
    testCases: [
      { input: '9\n1 8 6 2 5 4 8 3 7', expectedOutput: '49', isExample: true },
      { input: '2\n1 1', expectedOutput: '1', isExample: true },
    ],
    constraints: ['n == height.length', '2 <= n <= 10^5'],
    followUpQuestions: [],
    companyTags: ['Google', 'Adobe'],
    topicTags: ['array', 'two-pointers'],
    acceptanceRate: 54.0,
    totalAttempts: 550,
    totalSolves: 297,
    explanation: '<p>Use two pointers. Always move the pointer that points to the shorter line.</p>',
  },
  {
    skillId: skills.arrays.id, // Using arrays as standard fallback for basic data structures
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    description: 'Find the length of the longest substring without repeating characters.',
    problemStatement: '<p>Given a string <code>s</code>, find the length of the longest substring without repeating characters.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf8').trim();\n\n// TODO: print the length\n`,
      python: `import sys\ns = sys.stdin.read().strip()\n\n# TODO: print the length\n`,
      cpp: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s;\n    cin >> s;\n    // TODO: print the length\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNext()) return;\n        String s = sc.next();\n        // TODO: print the length\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function lengthOfLongestSubstring(s) {
  let max = 0, l = 0;
  const set = new Set();
  for (let r = 0; r < s.length; r++) {
    while (set.has(s[r])) {
      set.delete(s[l]);
      l++;
    }
    set.add(s[r]);
    max = Math.max(max, r - l + 1);
  }
  return max;
}
const fs = require('fs');
const s = fs.readFileSync(0, 'utf8').trim();
console.log(lengthOfLongestSubstring(s));
`,
    },
    hints: ['Use a sliding window.'],
    testCases: [
      { input: 'abcabcbb', expectedOutput: '3', isExample: true },
      { input: 'bbbbb', expectedOutput: '1', isExample: true },
      { input: 'pwwkew', expectedOutput: '3', isExample: false },
    ],
    constraints: ['0 <= s.length <= 5 * 10^4'],
    followUpQuestions: [],
    companyTags: ['Amazon', 'Microsoft'],
    topicTags: ['string', 'sliding-window'],
    acceptanceRate: 34.0,
    totalAttempts: 900,
    totalSolves: 306,
    explanation: '<p>A sliding window with a hash set efficiently tracks the current characters without repeating.</p>',
  },
  {
    skillId: skills.arrays.id,
    title: 'Valid Anagram',
    slug: 'valid-anagram',
    description: 'Determine if two strings are anagrams of each other.',
    problemStatement: '<p>Given two strings <code>s</code> and <code>t</code>, return <code>true</code> if <code>t</code> is an anagram of <code>s</code>, and <code>false</code> otherwise.</p>',
    difficulty: Difficulty.easy,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\nconst s = input[0];\nconst t = input[1];\n\n// TODO: print true or false\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif len(data) < 2: sys.exit()\ns = data[0]\nt = data[1]\n\n# TODO: print True or False\n`,
      cpp: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s, t;\n    if (!(cin >> s >> t)) return 0;\n    // TODO: print true or false\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNext()) return;\n        String s = sc.next();\n        String t = sc.next();\n        // TODO: print true or false\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = {};
  for (const c of s) count[c] = (count[c] || 0) + 1;
  for (const c of t) {
    if (!count[c]) return false;
    count[c]--;
  }
  return true;
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);
console.log(isAnagram(input[0], input[1]));
`,
    },
    hints: ['Count character frequencies.'],
    testCases: [
      { input: 'anagram nagaram', expectedOutput: 'true', isExample: true },
      { input: 'rat car', expectedOutput: 'false', isExample: true },
    ],
    constraints: ['1 <= s.length, t.length <= 5 * 10^4'],
    followUpQuestions: ['What if the inputs contain unicode characters?'],
    companyTags: ['Uber', 'Yelp'],
    topicTags: ['string', 'hash-table'],
    acceptanceRate: 62.9,
    totalAttempts: 400,
    totalSolves: 251,
    explanation: '<p>Use a frequency map to count occurrences of each character.</p>',
  }
];
