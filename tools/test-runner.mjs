// Unit tests for js/runner.js. Pure Node, no dependencies. Run: node tools/test-runner.mjs
import assert from "node:assert/strict";
import {
  scoreAttempt,
  isCorrect,
  excerptStem,
  buildReviewRows,
  countReviewStatus,
  initialAnnouncedThresholds,
  crossedThresholds,
} from "../js/runner.js";

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

// --- excerptStem (Phase 3.1, finding #16) ---

test("excerptStem returns short text unchanged", () => {
  assert.equal(excerptStem("Short stem.", 80), "Short stem.");
});

test("excerptStem truncates long text and appends an ellipsis", () => {
  const text = "a".repeat(100);
  const result = excerptStem(text, 80);
  assert.equal(result, `${"a".repeat(80)}…`);
});

test("excerptStem trims a trailing space left by a cut landing right after a word, before the ellipsis", () => {
  const text = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen";
  const result = excerptStem(text, 19); // slice(0, 19) lands exactly on the space after "four"
  assert.equal(result.endsWith(" …"), false);
  assert.equal(result, "one two three four…");
});

test("excerptStem defaults maxLength to 80", () => {
  const text = "b".repeat(90);
  assert.equal(excerptStem(text), `${"b".repeat(80)}…`);
});

// --- buildReviewRows (Phase 3.1, D-11, finding #16) ---

const reviewBank = {
  questions: [
    { id: "q1", stem: { value: "First stem." }, categoryId: "I" },
    { id: "q2", stem: { value: "Second stem." }, categoryId: "II" },
    { id: "q3", stem: { value: "Third stem." }, categoryId: "I" },
  ],
};
const reviewLabels = new Map([
  ["I", "Category One"],
  ["II", "Category Two"],
]);

test("buildReviewRows returns rows in question order, not answer-array order", () => {
  const answers = [
    { questionId: "q3", chosen: ["c"], correct: true, flagged: false },
    { questionId: "q1", chosen: ["b"], correct: false, flagged: true },
    { questionId: "q2", chosen: ["a"], correct: true, flagged: false },
  ];
  const rows = buildReviewRows(reviewBank.questions, answers, reviewLabels);
  assert.deepEqual(rows.map((r) => r.questionId), ["q1", "q2", "q3"]);
});

test("buildReviewRows carries stem excerpt, category label, chosen/correct/flagged from the matching answer", () => {
  const answers = [{ questionId: "q1", chosen: ["b"], correct: false, flagged: true }];
  const [row] = buildReviewRows([reviewBank.questions[0]], answers, reviewLabels);
  assert.deepEqual(row, {
    questionId: "q1",
    stemExcerpt: "First stem.",
    categoryLabel: "Category One",
    answered: true,
    chosen: ["b"],
    correct: false,
    flagged: true,
  });
});

test("buildReviewRows reports answered: false and null chosen/correct for a question with no stored answer", () => {
  const [row] = buildReviewRows([reviewBank.questions[0]], [], reviewLabels);
  assert.equal(row.answered, false);
  assert.equal(row.chosen, null);
  assert.equal(row.correct, null);
  assert.equal(row.flagged, false);
});

test("buildReviewRows falls back to the raw categoryId when no label is found", () => {
  const question = { id: "q9", stem: { value: "Stem." }, categoryId: "unknown-cat" };
  const [row] = buildReviewRows([question], [], new Map());
  assert.equal(row.categoryLabel, "unknown-cat");
});

// --- countReviewStatus (Phase 3.2, finding #11) ---

test("countReviewStatus is zero/zero for rows that are all answered and unflagged", () => {
  const rows = [
    { answered: true, flagged: false },
    { answered: true, flagged: false },
  ];
  assert.deepEqual(countReviewStatus(rows), { unanswered: 0, flagged: 0 });
});

test("countReviewStatus counts unanswered and flagged independently -- a row can be both", () => {
  const rows = [
    { answered: false, flagged: true },
    { answered: true, flagged: true },
    { answered: false, flagged: false },
  ];
  assert.deepEqual(countReviewStatus(rows), { unanswered: 2, flagged: 2 });
});

test("countReviewStatus returns zero/zero for an empty row list", () => {
  assert.deepEqual(countReviewStatus([]), { unanswered: 0, flagged: 0 });
});

// --- initialAnnouncedThresholds / crossedThresholds (Phase 3.4, finding #12) ---

const THRESHOLDS = [10 * 60_000, 5 * 60_000, 1 * 60_000];

test("initialAnnouncedThresholds is always empty for a fresh start, regardless of remainingMs", () => {
  assert.deepEqual(initialAnnouncedThresholds(10 * 60_000, THRESHOLDS, false), new Set());
});

test("initialAnnouncedThresholds pre-marks a threshold already behind us on résumé", () => {
  // 8 minutes left -- the 10-minute threshold has passed, 5 and 1 haven't.
  const result = initialAnnouncedThresholds(8 * 60_000, THRESHOLDS, true);
  assert.deepEqual(result, new Set([10 * 60_000]));
});

test("initialAnnouncedThresholds on résumé landing exactly at a threshold pre-marks it (not retroactively announced)", () => {
  const result = initialAnnouncedThresholds(5 * 60_000, THRESHOLDS, true);
  assert.deepEqual(result, new Set([10 * 60_000, 5 * 60_000]));
});

test("initialAnnouncedThresholds does not pre-mark anything on résumé with the full duration still remaining", () => {
  assert.deepEqual(initialAnnouncedThresholds(15 * 60_000, THRESHOLDS, true), new Set());
});

test("crossedThresholds returns nothing already in alreadyAnnounced", () => {
  const result = crossedThresholds(5 * 60_000, THRESHOLDS, new Set([10 * 60_000, 5 * 60_000]));
  assert.deepEqual(result, []);
});

test("crossedThresholds returns every newly-crossed threshold when remainingMs jumps past more than one at once", () => {
  // A large time jump (tab backgrounded/slept) can cross 5-min and 1-min in one tick.
  const result = crossedThresholds(30_000, THRESHOLDS, new Set([10 * 60_000]));
  assert.deepEqual(result, [5 * 60_000, 1 * 60_000]);
});

test("crossedThresholds returns nothing once every threshold has already fired", () => {
  const result = crossedThresholds(0, THRESHOLDS, new Set(THRESHOLDS));
  assert.deepEqual(result, []);
});

test("crossedThresholds does not mutate the alreadyAnnounced set it's given", () => {
  const alreadyAnnounced = new Set();
  crossedThresholds(5 * 60_000, THRESHOLDS, alreadyAnnounced);
  assert.deepEqual(alreadyAnnounced, new Set());
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
