import { Difficulty, QuestionType } from '@prisma/client';

export const getNewQuestions = (skills: any) => [
  {
    skillId: skills.bit_manipulation.id,
    title: 'Single Number',
    slug: 'single-number',
    description: 'Find the single element in an array where every other element appears twice.',
    problemStatement: '<p>Given a <strong>non-empty</strong> array of integers <code>nums</code>, every element appears twice except for one. Find that single one.</p><p>You must implement a solution with a linear runtime complexity and use only constant extra space.</p>',
    difficulty: Difficulty.easy,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst n = input[0];\nconst nums = input.slice(1, 1+n);\n\n// TODO: print the single number\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\nnums = [int(x) for x in data[1:1+n]]\n\n# TODO: print the single number\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for(int i=0; i<n; i++) cin >> nums[i];\n    // TODO: print the single number\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n        // TODO: print the single number\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function singleNumber(nums) {
  return nums.reduce((a, b) => a ^ b, 0);
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
console.log(singleNumber(input.slice(1, 1+input[0])));
`,
      python: `def singleNumber(nums):
    res = 0
    for n in nums:
        res ^= n
    return res
import sys
data = sys.stdin.read().split()
if data:
    n = int(data[0])
    nums = [int(x) for x in data[1:1+n]]
    print(singleNumber(nums))
`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\nint singleNumber(vector<int>& nums) {\n    int res = 0;\n    for(int n : nums) res ^= n;\n    return res;\n}\nint main() {\n    int n;\n    if (cin >> n) {\n        vector<int> nums(n);\n        for(int i=0; i<n; i++) cin >> nums[i];\n        cout << singleNumber(nums) << endl;\n    }\n    return 0;\n}\n`,
      java: `import java.util.*;\npublic class Main {\n    public static int singleNumber(int[] nums) {\n        int res = 0;\n        for(int n : nums) res ^= n;\n        return res;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            int[] nums = new int[n];\n            for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n            System.out.println(singleNumber(nums));\n        }\n    }\n}\n`,
    },
    hints: ['Think about the XOR bitwise operator.', 'A XOR A = 0, and A XOR 0 = A.'],
    testCases: [
      { input: '3\n2 2 1', expectedOutput: '1', isExample: true },
      { input: '5\n4 1 2 1 2', expectedOutput: '4', isExample: true },
      { input: '1\n1', expectedOutput: '1', isExample: false },
    ],
    constraints: ['1 <= nums.length <= 3 * 10^4', '-3 * 10^4 <= nums[i] <= 3 * 10^4'],
    followUpQuestions: [],
    companyTags: ['Amazon', 'Facebook', 'Google'],
    topicTags: ['array', 'bit-manipulation'],
    acceptanceRate: 72.3,
    totalAttempts: 1200,
    totalSolves: 867,
    explanation: '<p>Using XOR on all elements will cancel out the numbers that appear twice, leaving only the single number.</p>',
  },
  {
    skillId: skills.bit_manipulation.id,
    title: 'Number of 1 Bits',
    slug: 'number-of-1-bits',
    description: 'Calculate the number of set bits (1s) in the binary representation of an integer.',
    problemStatement: '<p>Write a function that takes the binary representation of a positive integer and returns the number of set bits it has (also known as the Hamming weight).</p>',
    difficulty: Difficulty.easy,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst n = Number(fs.readFileSync(0, 'utf8').trim());\n\n// TODO: print the number of 1 bits\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\n\n# TODO: print the number of 1 bits\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    long long n;\n    if (!(cin >> n)) return 0;\n    // TODO: print the number of 1 bits\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLong()) return;\n        long n = sc.nextLong();\n        // TODO: print the number of 1 bits\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function hammingWeight(n) {
  let count = 0;
  while (n !== 0) {
    count++;
    n &= (n - 1);
  }
  return count;
}
const fs = require('fs');
const n = Number(fs.readFileSync(0, 'utf8').trim());
console.log(hammingWeight(n));
`,
      python: `def hammingWeight(n):
    count = 0
    while n:
        count += 1
        n &= (n - 1)
    return count
import sys
data = sys.stdin.read().split()
if data:
    print(hammingWeight(int(data[0])))
`,
      cpp: `#include <iostream>\nusing namespace std;\nint hammingWeight(uint32_t n) {\n    int count = 0;\n    while (n) {\n        count++;\n        n &= (n - 1);\n    }\n    return count;\n}\nint main() {\n    uint32_t n;\n    if (cin >> n) {\n        cout << hammingWeight(n) << endl;\n    }\n    return 0;\n}\n`,
      java: `import java.util.*;\npublic class Main {\n    public static int hammingWeight(long n) {\n        int count = 0;\n        while (n != 0) {\n            count++;\n            n &= (n - 1);\n        }\n        return count;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLong()) {\n            System.out.println(hammingWeight(sc.nextLong()));\n        }\n    }\n}\n`,
    },
    hints: ['The expression n & (n - 1) drops the lowest set bit of n.'],
    testCases: [
      { input: '11', expectedOutput: '3', isExample: true },
      { input: '128', expectedOutput: '1', isExample: true },
      { input: '2147483645', expectedOutput: '30', isExample: false },
    ],
    constraints: ['1 <= n <= 2^31 - 1'],
    followUpQuestions: ['Can you optimize the solution to run in O(1) time?'],
    companyTags: ['Apple', 'Microsoft'],
    topicTags: ['bit-manipulation'],
    acceptanceRate: 67.5,
    totalAttempts: 950,
    totalSolves: 641,
    explanation: '<p>Continuously bitwise AND <code>n</code> with <code>n - 1</code> to flip the least significant <code>1</code> bit to <code>0</code>, keeping count until <code>n</code> is <code>0</code>.</p>',
  },
  {
    skillId: skills.bit_manipulation.id,
    title: 'Counting Bits',
    slug: 'counting-bits',
    description: 'Return an array of the number of 1s in the binary representation of every number up to n.',
    problemStatement: '<p>Given an integer <code>n</code>, return an array <code>ans</code> of length <code>n + 1</code> such that for each <code>i</code> (<code>0 <= i <= n</code>), <code>ans[i]</code> is the number of <code>1</code>s in the binary representation of <code>i</code>.</p>',
    difficulty: Difficulty.easy,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst n = parseInt(fs.readFileSync(0, 'utf8').trim());\n\n// TODO: print the space-separated array of counts\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\n\n# TODO: print the space-separated array of counts\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    // TODO: print the space-separated array of counts\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        // TODO: print the space-separated array of counts\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function countBits(n) {
  const ans = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    ans[i] = ans[i >> 1] + (i & 1);
  }
  return ans;
}
const fs = require('fs');
const n = parseInt(fs.readFileSync(0, 'utf8').trim());
console.log(countBits(n).join(' '));
`,
      python: `def countBits(n):
    ans = [0] * (n + 1)
    for i in range(1, n + 1):
        ans[i] = ans[i >> 1] + (i & 1)
    return ans
import sys
data = sys.stdin.read().split()
if data:
    res = countBits(int(data[0]))
    print(' '.join(map(str, res)))
`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\nvector<int> countBits(int n) {\n    vector<int> ans(n + 1, 0);\n    for(int i = 1; i <= n; i++) {\n        ans[i] = ans[i >> 1] + (i & 1);\n    }\n    return ans;\n}\nint main() {\n    int n;\n    if (cin >> n) {\n        vector<int> res = countBits(n);\n        for(int i=0; i<=n; i++) {\n            cout << res[i] << (i == n ? "" : " ");\n        }\n        cout << endl;\n    }\n    return 0;\n}\n`,
      java: `import java.util.*;\npublic class Main {\n    public static int[] countBits(int n) {\n        int[] ans = new int[n + 1];\n        for (int i = 1; i <= n; i++) {\n            ans[i] = ans[i >> 1] + (i & 1);\n        }\n        return ans;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            int[] res = countBits(n);\n            for(int i=0; i<=n; i++) {\n                System.out.print(res[i] + (i == n ? "" : " "));\n            }\n            System.out.println();\n        }\n    }\n}\n`,
    },
    hints: ['Is there a relationship between the number of 1s in x and x / 2?'],
    testCases: [
      { input: '2', expectedOutput: '0 1 1', isExample: true },
      { input: '5', expectedOutput: '0 1 1 2 1 2', isExample: true },
    ],
    constraints: ['0 <= n <= 10^5'],
    followUpQuestions: ['Can you do it in linear time O(n) and a single pass?'],
    companyTags: ['Amazon', 'Google'],
    topicTags: ['bit-manipulation', 'dynamic-programming'],
    acceptanceRate: 77.2,
    totalAttempts: 1500,
    totalSolves: 1158,
    explanation: '<p>Use DP: The number of set bits in <code>i</code> is the number of set bits in <code>i >> 1</code> (or i/2) plus 1 if <code>i</code> is odd.</p>',
  },
  {
    skillId: skills.bit_manipulation.id,
    title: 'Reverse Bits',
    slug: 'reverse-bits',
    description: 'Reverse the bits of a given 32-bit unsigned integer.',
    problemStatement: '<p>Reverse bits of a given 32-bit unsigned integer <code>n</code>.</p>',
    difficulty: Difficulty.easy,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst n = BigInt(fs.readFileSync(0, 'utf8').trim());\n\n// TODO: print the reversed integer\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\n\n# TODO: print the reversed integer\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    uint32_t n;\n    if (!(cin >> n)) return 0;\n    // TODO: print the reversed integer\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextLong()) return;\n        long n = sc.nextLong();\n        // TODO: print the reversed integer\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function reverseBits(n) {
  let res = 0n;
  for (let i = 0n; i < 32n; i++) {
    res = (res << 1n) | (n & 1n);
    n >>= 1n;
  }
  return res;
}
const fs = require('fs');
const n = BigInt(fs.readFileSync(0, 'utf8').trim());
console.log(reverseBits(n).toString());
`,
      python: `def reverseBits(n):
    res = 0
    for i in range(32):
        res = (res << 1) | (n & 1)
        n >>= 1
    return res
import sys
data = sys.stdin.read().split()
if data:
    print(reverseBits(int(data[0])))
`,
      cpp: `#include <iostream>\nusing namespace std;\nuint32_t reverseBits(uint32_t n) {\n    uint32_t res = 0;\n    for(int i=0; i<32; i++) {\n        res = (res << 1) | (n & 1);\n        n >>= 1;\n    }\n    return res;\n}\nint main() {\n    uint32_t n;\n    if (cin >> n) {\n        cout << reverseBits(n) << endl;\n    }\n    return 0;\n}\n`,
      java: `import java.util.*;\npublic class Main {\n    public static long reverseBits(long n) {\n        long res = 0;\n        for(int i = 0; i < 32; i++) {\n            res = (res << 1) | (n & 1);\n            n >>= 1;\n        }\n        return res;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLong()) {\n            System.out.println(reverseBits(sc.nextLong()));\n        }\n    }\n}\n`,
    },
    hints: ['Extract bits one by one from the right and push them into the result from the left.'],
    testCases: [
      { input: '43261596', expectedOutput: '964176192', isExample: true },
      { input: '4294967293', expectedOutput: '3221225471', isExample: true },
    ],
    constraints: ['The input must be a valid 32-bit unsigned integer.'],
    followUpQuestions: ['If this function is called many times, how would you optimize it?'],
    companyTags: ['Apple', 'Airbnb'],
    topicTags: ['bit-manipulation', 'divide-and-conquer'],
    acceptanceRate: 53.8,
    totalAttempts: 700,
    totalSolves: 376,
    explanation: '<p>Loop 32 times, shifting your result left by 1 and ORing it with the least significant bit of <code>n</code>, then shifting <code>n</code> right by 1.</p>',
  },
  {
    skillId: skills.bit_manipulation.id,
    title: 'Missing Number',
    slug: 'missing-number',
    description: 'Find the missing number in an array containing n distinct numbers in the range [0, n].',
    problemStatement: '<p>Given an array <code>nums</code> containing <code>n</code> distinct numbers in the range <code>[0, n]</code>, return the only number in the range that is missing from the array.</p>',
    difficulty: Difficulty.easy,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst n = input[0];\nconst nums = input.slice(1, 1+n);\n\n// TODO: print the missing number\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nn = int(data[0])\nnums = [int(x) for x in data[1:1+n]]\n\n# TODO: print the missing number\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> nums(n);\n    for(int i=0; i<n; i++) cin >> nums[i];\n    // TODO: print the missing number\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n        // TODO: print the missing number\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function missingNumber(nums) {
  let missing = nums.length;
  for (let i = 0; i < nums.length; i++) {
    missing ^= i ^ nums[i];
  }
  return missing;
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
console.log(missingNumber(input.slice(1, 1+input[0])));
`,
      python: `def missingNumber(nums):
    missing = len(nums)
    for i, num in enumerate(nums):
        missing ^= i ^ num
    return missing
import sys
data = sys.stdin.read().split()
if data:
    n = int(data[0])
    nums = [int(x) for x in data[1:1+n]]
    print(missingNumber(nums))
`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\nint missingNumber(vector<int>& nums) {\n    int missing = nums.size();\n    for(int i=0; i<nums.size(); i++) {\n        missing ^= i ^ nums[i];\n    }\n    return missing;\n}\nint main() {\n    int n;\n    if (cin >> n) {\n        vector<int> nums(n);\n        for(int i=0; i<n; i++) cin >> nums[i];\n        cout << missingNumber(nums) << endl;\n    }\n    return 0;\n}\n`,
      java: `import java.util.*;\npublic class Main {\n    public static int missingNumber(int[] nums) {\n        int missing = nums.length;\n        for (int i = 0; i < nums.length; i++) {\n            missing ^= i ^ nums[i];\n        }\n        return missing;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            int[] nums = new int[n];\n            for(int i=0; i<n; i++) nums[i] = sc.nextInt();\n            System.out.println(missingNumber(nums));\n        }\n    }\n}\n`,
    },
    hints: ['Calculate the expected sum of numbers from 0 to n and subtract the actual sum.', 'Alternatively, use XOR.'],
    testCases: [
      { input: '3\n3 0 1', expectedOutput: '2', isExample: true },
      { input: '2\n0 1', expectedOutput: '2', isExample: true },
      { input: '9\n9 6 4 2 3 5 7 0 1', expectedOutput: '8', isExample: false },
    ],
    constraints: ['n == nums.length', '1 <= n <= 10^4', '0 <= nums[i] <= n'],
    followUpQuestions: ['Can you implement a solution using only O(1) extra space complexity and O(n) runtime complexity?'],
    companyTags: ['Amazon', 'Microsoft'],
    topicTags: ['array', 'math', 'bit-manipulation'],
    acceptanceRate: 64.9,
    totalAttempts: 1600,
    totalSolves: 1038,
    explanation: '<p>XORing the indices and the array values together cancels everything out except the missing number.</p>',
  },
  {
    skillId: skills.bit_manipulation.id,
    title: 'Sum of Two Integers',
    slug: 'sum-of-two-integers',
    description: 'Calculate the sum of two integers without using the + or - operators.',
    problemStatement: '<p>Given two integers <code>a</code> and <code>b</code>, return the sum of the two integers without using the operators <code>+</code> and <code>-</code>.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconst a = input[0];\nconst b = input[1];\n\n// TODO: print the sum\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif len(data) < 2: sys.exit()\na = int(data[0])\nb = int(data[1])\n\n# TODO: print the sum\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    if (!(cin >> a >> b)) return 0;\n    // TODO: print the sum\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        // TODO: print the sum\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function getSum(a, b) {
  while (b !== 0) {
    let carry = (a & b) << 1;
    a = a ^ b;
    b = carry;
  }
  return a;
}
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
console.log(getSum(input[0], input[1]));
`,
      python: `def getSum(a, b):
    mask = 0xFFFFFFFF
    while b != 0:
        a, b = (a ^ b) & mask, ((a & b) << 1) & mask
    return a if a <= 0x7FFFFFFF else ~(a ^ mask)
import sys
data = sys.stdin.read().split()
if len(data) >= 2:
    print(getSum(int(data[0]), int(data[1])))
`,
      cpp: `#include <iostream>\nusing namespace std;\nint getSum(int a, int b) {\n    while (b != 0) {\n        unsigned carry = a & b;\n        a = a ^ b;\n        b = carry << 1;\n    }\n    return a;\n}\nint main() {\n    int a, b;\n    if (cin >> a >> b) {\n        cout << getSum(a, b) << endl;\n    }\n    return 0;\n}\n`,
      java: `import java.util.*;\npublic class Main {\n    public static int getSum(int a, int b) {\n        while (b != 0) {\n            int carry = (a & b) << 1;\n            a = a ^ b;\n            b = carry;\n        }\n        return a;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int a = sc.nextInt();\n            int b = sc.nextInt();\n            System.out.println(getSum(a, b));\n        }\n    }\n}\n`,
    },
    hints: ['How do you add two bits? A ^ B gives the sum without carry, and A & B gives the carry.'],
    testCases: [
      { input: '1 2', expectedOutput: '3', isExample: true },
      { input: '2 3', expectedOutput: '5', isExample: true },
    ],
    constraints: ['-1000 <= a, b <= 1000'],
    followUpQuestions: [],
    companyTags: ['Facebook'],
    topicTags: ['math', 'bit-manipulation'],
    acceptanceRate: 51.5,
    totalAttempts: 950,
    totalSolves: 489,
    explanation: '<p>Use bitwise XOR to find the sum without carry, and bitwise AND shifted left by 1 to find the carry. Repeat until the carry is 0.</p>',
  },
  {
    skillId: skills.bit_manipulation.id, 
    title: 'Reverse Integer',
    slug: 'reverse-integer',
    description: 'Reverse the digits of a 32-bit signed integer.',
    problemStatement: '<p>Given a signed 32-bit integer <code>x</code>, return <code>x</code> with its digits reversed. If reversing <code>x</code> causes the value to go outside the signed 32-bit integer range <code>[-2^31, 2^31 - 1]</code>, then return <code>0</code>.</p>',
    difficulty: Difficulty.medium,
    type: QuestionType.CODING,
    starterCode: {
      javascript: `const fs = require('fs');\nconst x = parseInt(fs.readFileSync(0, 'utf8').trim());\n\n// TODO: print the reversed integer\n`,
      python: `import sys\ndata = sys.stdin.read().split()\nif not data: sys.exit()\nx = int(data[0])\n\n# TODO: print the reversed integer\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int x;\n    if (!(cin >> x)) return 0;\n    // TODO: print the reversed integer\n    return 0;\n}\n`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int x = sc.nextInt();\n        // TODO: print the reversed integer\n    }\n}\n`,
    },
    solutionCode: {
      javascript: `function reverse(x) {
  let res = 0;
  let isNegative = x < 0;
  x = Math.abs(x);
  while (x > 0) {
    res = res * 10 + (x % 10);
    x = Math.floor(x / 10);
  }
  if (res > Math.pow(2, 31) - 1) return 0;
  return isNegative ? -res : res;
}
const fs = require('fs');
const x = parseInt(fs.readFileSync(0, 'utf8').trim());
console.log(reverse(x));
`,
      python: `def reverse(x):
    sign = -1 if x < 0 else 1
    res = int(str(abs(x))[::-1]) * sign
    if res < -2**31 or res > 2**31 - 1:
        return 0
    return res
import sys
data = sys.stdin.read().split()
if data:
    print(reverse(int(data[0])))
`,
      cpp: `#include <iostream>\nusing namespace std;\nint reverse(int x) {\n    long res = 0;\n    while (x != 0) {\n        res = res * 10 + x % 10;\n        x /= 10;\n    }\n    if (res < INT32_MIN || res > INT32_MAX) return 0;\n    return res;\n}\nint main() {\n    int x;\n    if (cin >> x) {\n        cout << reverse(x) << endl;\n    }\n    return 0;\n}\n`,
      java: `import java.util.*;\npublic class Main {\n    public static int reverse(int x) {\n        long res = 0;\n        while (x != 0) {\n            res = res * 10 + x % 10;\n            x /= 10;\n        }\n        if (res < Integer.MIN_VALUE || res > Integer.MAX_VALUE) return 0;\n        return (int)res;\n    }\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            System.out.println(reverse(sc.nextInt()));\n        }\n    }\n}\n`,
    },
    hints: ['Use modulo to get the last digit and division to remove it. Watch out for integer overflow.'],
    testCases: [
      { input: '123', expectedOutput: '321', isExample: true },
      { input: '-123', expectedOutput: '-321', isExample: true },
      { input: '120', expectedOutput: '21', isExample: true },
    ],
    constraints: ['-2^31 <= x <= 2^31 - 1'],
    followUpQuestions: [],
    companyTags: ['Apple', 'Bloomberg'],
    topicTags: ['math'],
    acceptanceRate: 27.6,
    totalAttempts: 1500,
    totalSolves: 414,
    explanation: '<p>Repeatedly extract the last digit with <code>x % 10</code> and add it to a reverse accumulator. Check bounds before returning to avoid overflow.</p>',
  }
];