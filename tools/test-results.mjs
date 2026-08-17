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
  const score = { correct: 4, total: 5, byCategory: {} };
  const result = summarizeAttempt(score, flatBank);
  assert.deepEqual(result.overall, { correct: 4, total: 5, percent: 80 });
});

test("each category gets its real label from the flat tree", () => {
  const score = {
    correct: 2,
    total: 3,
    byCategory: { I: { correct: 1, total: 2 }, II: { correct: 1, total: 1 } },
  };
  const result = summarizeAttempt(score, flatBank);
  assert.deepEqual(result.categories, [
    { id: "I", label: "Number & Quantity and Algebra", correct: 1, total: 2, percent: 50 },
    { id: "II", label: "Functions and Calculus", correct: 1, total: 1, percent: 100 },
  ]);
});

test("a category id from a nested (variable-depth) tree still resolves its label", () => {
  const score = { correct: 1, total: 1, byCategory: { "I-B": { correct: 1, total: 1 } } };
  const result = summarizeAttempt(score, nestedBank);
  assert.equal(result.categories[0].label, "Algebra");
});

test("an unknown category id falls back to the id itself rather than throwing", () => {
  const score = { correct: 0, total: 1, byCategory: { "does-not-exist": { correct: 0, total: 1 } } };
  const result = summarizeAttempt(score, flatBank);
  assert.equal(result.categories[0].label, "does-not-exist");
});

test("a zero-total category (defensive -- shouldn't occur in practice) reports 0% rather than NaN", () => {
  const score = { correct: 0, total: 0, byCategory: { I: { correct: 0, total: 0 } } };
  const result = summarizeAttempt(score, flatBank);
  assert.equal(result.overall.percent, 0);
  assert.equal(result.categories[0].percent, 0);
});

test("no categoryTargets argument reports an empty shortfalls array", () => {
  const score = { correct: 1, total: 1, byCategory: { I: { correct: 1, total: 1 } } };
  const result = summarizeAttempt(score, flatBank);
  assert.deepEqual(result.shortfalls, []);
});

test("a category delivered fewer questions than its target is reported as a shortfall", () => {
  const score = { correct: 1, total: 1, byCategory: { I: { correct: 1, total: 1 } } };
  const categoryTargets = [{ categoryId: "I", target: 2 }];
  const result = summarizeAttempt(score, flatBank, categoryTargets);
  assert.deepEqual(result.shortfalls, [
    { categoryId: "I", label: "Number & Quantity and Algebra", wanted: 2, got: 1 },
  ]);
});

test("a category that met its target is not reported as a shortfall", () => {
  const score = { correct: 2, total: 2, byCategory: { I: { correct: 2, total: 2 } } };
  const categoryTargets = [{ categoryId: "I", target: 2 }];
  const result = summarizeAttempt(score, flatBank, categoryTargets);
  assert.deepEqual(result.shortfalls, []);
});

test("a category entirely absent from byCategory (100% shortfall) reports got: 0, not a throw", () => {
  const score = { correct: 0, total: 0, byCategory: {} };
  const categoryTargets = [{ categoryId: "II", target: 3 }];
  const result = summarizeAttempt(score, flatBank, categoryTargets);
  assert.deepEqual(result.shortfalls, [
    { categoryId: "II", label: "Functions and Calculus", wanted: 3, got: 0 },
  ]);
});

test("a categoryTargets entry with target: 0 is never flagged as a shortfall", () => {
  const score = { correct: 0, total: 0, byCategory: {} };
  const categoryTargets = [{ categoryId: "I", target: 0 }];
  const result = summarizeAttempt(score, flatBank, categoryTargets);
  assert.deepEqual(result.shortfalls, []);
});

test("shortfalls recompute is fresh, not read from any cached/stored field on the score", () => {
  // Same score, different categoryTargets -- proves the shortfall is derived from the
  // argument passed in, not memoized against the first call (score objects carry no
  // shortfall field of their own to begin with, but this guards against a future
  // regression that tries to cache off of it).
  const score = { correct: 1, total: 1, byCategory: { I: { correct: 1, total: 1 } } };
  const first = summarizeAttempt(score, flatBank, [{ categoryId: "I", target: 1 }]);
  const second = summarizeAttempt(score, flatBank, [{ categoryId: "I", target: 5 }]);
  assert.deepEqual(first.shortfalls, []);
  assert.deepEqual(second.shortfalls, [
    { categoryId: "I", label: "Number & Quantity and Algebra", wanted: 5, got: 1 },
  ]);
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
