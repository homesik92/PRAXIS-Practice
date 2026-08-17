// Unit tests for js/runner.js. Pure Node, no dependencies. Run: node tools/test-runner.mjs
import assert from "node:assert/strict";
import { scoreAttempt, isCorrect } from "../js/runner.js";

const bank = {
  questions: [
    { id: "q1", type: "single", categoryId: "I", correct: ["b"] },
    { id: "q2", type: "single", categoryId: "I", correct: ["a"] },
    { id: "q3", type: "single", categoryId: "II", correct: ["c"] },
  ],
};

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test("isCorrect matches a single-select question's correct option", () => {
  assert.equal(isCorrect({ type: "single", correct: ["b"] }, ["b"]), true);
  assert.equal(isCorrect({ type: "single", correct: ["b"] }, ["a"]), false);
});

test("isCorrect is always false for a non-single type", () => {
  assert.equal(isCorrect({ type: "multi", correct: ["a", "b"] }, ["a"]), false);
});

test("all correct answers score every question and every category", () => {
  const result = scoreAttempt(bank, [
    { questionId: "q1", chosen: ["b"] },
    { questionId: "q2", chosen: ["a"] },
    { questionId: "q3", chosen: ["c"] },
  ]);
  assert.deepEqual(result, {
    correct: 3,
    total: 3,
    byCategory: { I: { correct: 2, total: 2 }, II: { correct: 1, total: 1 } },
  });
});

test("a wrong answer counts toward total but not correct, in the right category bucket", () => {
  const result = scoreAttempt(bank, [
    { questionId: "q1", chosen: ["z"] },
    { questionId: "q2", chosen: ["a"] },
  ]);
  assert.equal(result.correct, 1);
  assert.equal(result.total, 2);
  assert.deepEqual(result.byCategory.I, { correct: 1, total: 2 });
});

test("a partial attempt (fewer answers than questions) scores only what was answered", () => {
  const result = scoreAttempt(bank, [{ questionId: "q3", chosen: ["c"] }]);
  assert.equal(result.total, 1);
  assert.deepEqual(result.byCategory, { II: { correct: 1, total: 1 } });
});

test("an answer for a question id not in the bank is ignored rather than throwing", () => {
  const result = scoreAttempt(bank, [{ questionId: "does-not-exist", chosen: ["a"] }]);
  assert.deepEqual(result, { correct: 0, total: 0, byCategory: {} });
});

test("a non-single question type is counted in total but never scored correct", () => {
  const multiBank = {
    questions: [{ id: "q1", type: "multi", categoryId: "I", correct: ["a", "b"] }],
  };
  const result = scoreAttempt(multiBank, [{ questionId: "q1", chosen: ["a"] }]);
  assert.equal(result.correct, 0);
  assert.equal(result.total, 1);
});

test("an empty answers array scores as zero/zero with no category buckets", () => {
  assert.deepEqual(scoreAttempt(bank, []), { correct: 0, total: 0, byCategory: {} });
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
