const { judgeService } = require('./src/judge/judge.service');

const userCode = `
const fs = require('fs');
let data;
try {
  data = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
} catch (e) {
  console.log("ERROR", e.message);
  process.exit(1);
}
const n = data[0];
const prices = data.slice(1, 1 + n);

function maxProfit(prices) {
  let minPrice = Infinity;
  let best = 0;
  for (const price of prices) {
    minPrice = Math.min(minPrice, price);
    best = Math.max(best, price - minPrice);
  }
  return best;
}

console.log(maxProfit(prices));
`;

judgeService.runCustomInput(
  userCode,
  'javascript',
  '5\n7 6 4 3 1'
).then(console.log).catch(console.error);
