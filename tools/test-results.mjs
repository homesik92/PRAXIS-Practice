// Unit tests for js/results.js. Pure Node, no dependencies. Run: node tools/test-results.mjs
import assert from "node:assert/strict";
import { summarizeAttempt } from "../js/results.js";

const flatBank = {
  categories: [
    { id: "I", label: "Number & Quantity and Algebra", weight: { count: 2, percent: 30 } },
    { id: "II", label: "Functions and Calculus", weight: { count: 1, percent: 30 } },
  ],
};

const nestedBank = {
  categories: [
    {
      id: "I",
      label: "Number & Quantity and Algebra",
      weight: { count: 20, percent: 30 },
      children: [
        { id: "I-A", label: "Number and Quantity", weight: { count: 7, percent: 10 } },
        { id: "I-B", label: "Algebra", weight: { count: 13, percent: 20 } },
      ],
    },
  ],
};

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test("overall score is carried through with a rounded percent", () => {
  const attempt = { score: { correct: 4, total: 5, byCategory: {} } };
  const result = summarizeAttempt(attempt, flatBank);
  assert.deepEqual(result.overall, { correct: 4, total: 5, percent: 80 });
});

test("each category gets its real label from the flat tree", () => {
  const attempt = {
    score: {
      correct: 2,
      total: 3,
      byCategory: { I: { correct: 1, total: 2 }, II: { correct: 1, total: 1 } },
    },
  };
  const result = summarizeAttempt(attempt, flatBank);
  assert.deepEqual(result.categories, [
    { id: "I", label: "Number & Quantity and Algebra", correct: 1, total: 2, percent: 50 },
    { id: "II", label: "Functions and Calculus", correct: 1, total: 1, percent: 100 },
  ]);
});

test("a category id from a nested (variable-depth) tree still resolves its label", () => {
  const attempt = { score: { correct: 1, total: 1, byCategory: { "I-B": { correct: 1, total: 1 } } } };
  const result = summarizeAttempt(attempt, nestedBank);
  assert.equal(result.categories[0].label, "Algebra");
});

test("an unknown category id falls back to the id itself rather than throwing", () => {
  const attempt = { score: { correct: 0, total: 1, byCategory: { "does-not-exist": { correct: 0, total: 1 } } } };
  const result = summarizeAttempt(attempt, flatBank);
  assert.equal(result.categories[0].label, "does-not-exist");
});

test("a zero-total category (defensive -- shouldn't occur in practice) reports 0% rather than NaN", () => {
  const attempt = { score: { correct: 0, total: 0, byCategory: { I: { correct: 0, total: 0 } } } };
  const result = summarizeAttempt(attempt, flatBank);
  assert.equal(result.overall.percent, 0);
  assert.equal(result.categories[0].percent, 0);
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL  ${name}`);
    console.log(`      ${e.message}`);
  }
}

console.log(`\n${tests.length - failed}/${tests.length} passed.`);
process.exitCode = failed > 0 ? 1 : 0;
