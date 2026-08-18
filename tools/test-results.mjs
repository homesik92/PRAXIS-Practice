// Unit tests for js/results.js. Pure Node, no dependencies. Run: node tools/test-results.mjs
import assert from "node:assert/strict";
import {
  summarizeAttempt,
  formatElapsed,
  buildFullReview,
  flattenCategoryLabels,
  categoriesNeedingPractice,
} from "../js/results.js";

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

// --- categoriesNeedingPractice (Phase 6.5) ---

test("categoriesNeedingPractice excludes a category with 0 or 1 missed questions by default", () => {
  const summary = {
    categories: [
      { id: "I", label: "Algebra", correct: 5, total: 5 }, // 0 missed
      { id: "II", label: "Geometry", correct: 4, total: 5 }, // 1 missed
    ],
  };
  assert.deepEqual(categoriesNeedingPractice(summary), []);
});

test("categoriesNeedingPractice includes a category with more than 1 missed question by default", () => {
  const summary = {
    categories: [
      { id: "I", label: "Algebra", correct: 3, total: 5 }, // 2 missed
      { id: "II", label: "Geometry", correct: 5, total: 5 }, // 0 missed
    ],
  };
  assert.deepEqual(categoriesNeedingPractice(summary), [{ id: "I", label: "Algebra", missed: 2 }]);
});

test("categoriesNeedingPractice honors a custom threshold", () => {
  const summary = {
    categories: [{ id: "I", label: "Algebra", correct: 4, total: 5 }], // 1 missed
  };
  assert.deepEqual(categoriesNeedingPractice(summary, 0), [{ id: "I", label: "Algebra", missed: 1 }]);
  assert.deepEqual(categoriesNeedingPractice(summary, 1), []);
});

test("categoriesNeedingPractice returns an empty array for a perfect score", () => {
  const summary = { categories: [{ id: "I", label: "Algebra", correct: 5, total: 5 }] };
  assert.deepEqual(categoriesNeedingPractice(summary), []);
});

// --- formatElapsed (Phase 4.2) ---

test("formatElapsed reports minutes under an hour", () => {
  assert.equal(formatElapsed("2026-08-17T14:00:00.000Z", "2026-08-17T14:45:00.000Z"), "45 minutes");
});

test("formatElapsed uses singular 'minute' for exactly one", () => {
  assert.equal(formatElapsed("2026-08-17T14:00:00.000Z", "2026-08-17T14:01:00.000Z"), "1 minute");
});

test("formatElapsed reports whole hours with no dangling '0m'", () => {
  assert.equal(formatElapsed("2026-08-17T14:00:00.000Z", "2026-08-17T16:00:00.000Z"), "2h");
});

test("formatElapsed reports hours and minutes together", () => {
  assert.equal(formatElapsed("2026-08-17T14:00:00.000Z", "2026-08-17T16:22:00.000Z"), "2h 22m");
});

test("formatElapsed rounds to the nearest minute", () => {
  // 44.6 minutes rounds up to 45, not truncates to 44.
  assert.equal(formatElapsed("2026-08-17T14:00:00.000Z", "2026-08-17T14:44:40.000Z"), "45 minutes");
});

test("formatElapsed reports a sub-minute span as 'less than a minute' rather than '0 minutes'", () => {
  assert.equal(formatElapsed("2026-08-17T14:00:00.000Z", "2026-08-17T14:00:20.000Z"), "less than a minute");
});

test("formatElapsed reports 'time unavailable' rather than a negative span when finishedAt precedes startedAt", () => {
  // Realistic trigger: a system clock adjusted backward mid-attempt (NTP correction,
  // DST, sleep/wake drift) -- both timestamps are client-side with no server authority.
  assert.equal(formatElapsed("2026-08-17T16:00:00.000Z", "2026-08-17T14:00:00.000Z"), "time unavailable");
});

test("formatElapsed reports 'time unavailable' rather than 'NaN minutes' for an unparseable timestamp", () => {
  assert.equal(formatElapsed("not-a-date", "2026-08-17T14:00:00.000Z"), "time unavailable");
});

// --- buildFullReview (Phase 4.2) ---

const categoryLabels = flattenCategoryLabels(flatBank.categories);

function reviewQuestion(id, overrides = {}) {
  return {
    id,
    type: "single",
    categoryId: "I",
    stem: { format: "text", value: `Stem for ${id}` },
    options: [
      { id: "a", content: { format: "text", value: "Option A" } },
      { id: "b", content: { format: "text", value: "Option B" } },
    ],
    correct: ["a"],
    explanation: { format: "text", value: `Why ${id} is a` },
    ...overrides,
  };
}

test("buildFullReview marks the chosen-and-correct option and reports correct: true", () => {
  const form = { questions: [reviewQuestion("q1")] };
  const answers = [{ questionId: "q1", chosen: ["a"] }];
  const [row] = buildFullReview(form, answers, categoryLabels);
  assert.equal(row.answered, true);
  assert.equal(row.correct, true);
  assert.equal(row.categoryLabel, "Number & Quantity and Algebra");
  assert.equal(row.stem, "Stem for q1");
  assert.equal(row.explanation, "Why q1 is a");
  assert.deepEqual(
    row.options.map((o) => [o.id, o.isChosen, o.isCorrectOption]),
    [
      ["a", true, true],
      ["b", false, false],
    ],
  );
});

test("buildFullReview marks a chosen-but-wrong option and reports correct: false", () => {
  const form = { questions: [reviewQuestion("q1")] };
  const answers = [{ questionId: "q1", chosen: ["b"] }];
  const [row] = buildFullReview(form, answers, categoryLabels);
  assert.equal(row.correct, false);
  assert.deepEqual(
    row.options.map((o) => [o.id, o.isChosen, o.isCorrectOption]),
    [
      ["a", false, true],
      ["b", true, false],
    ],
  );
});

test("buildFullReview recomputes correct from the stored chosen answer, not a trusted 'correct' field", () => {
  // A deliberately wrong cached `correct: true` on the answer record -- the row must
  // still report false, since scoring is recomputed via isCorrect, never trusted
  // (SCHEMA.md §2.7's self-verifying principle, same as summarizeAttempt/scoreAttempt).
  const form = { questions: [reviewQuestion("q1")] };
  const answers = [{ questionId: "q1", chosen: ["b"], correct: true }];
  const [row] = buildFullReview(form, answers, categoryLabels);
  assert.equal(row.correct, false);
});

test("buildFullReview reports answered: false and correct: null for an unanswered question", () => {
  const form = { questions: [reviewQuestion("q1")] };
  const [row] = buildFullReview(form, [], categoryLabels);
  assert.equal(row.answered, false);
  assert.equal(row.correct, null);
  assert.ok(row.options.every((o) => o.isChosen === false));
  // The correct option is still marked, so an unanswered question's review still shows
  // what the right answer was.
  assert.equal(row.options.find((o) => o.id === "a").isCorrectOption, true);
});

test("buildFullReview reports answered: false for a skipped question (D-20) -- a real answer record with empty chosen, not a missing one", () => {
  const form = { questions: [reviewQuestion("q1")] };
  const answers = [{ questionId: "q1", chosen: [], correct: false, flagged: true }];
  const [row] = buildFullReview(form, answers, categoryLabels);
  assert.equal(row.answered, false);
  assert.equal(row.correct, null);
  assert.ok(row.options.every((o) => o.isChosen === false));
  assert.equal(row.options.find((o) => o.id === "a").isCorrectOption, true);
});

test("buildFullReview falls back to the category id when the label map has no entry", () => {
  const form = { questions: [reviewQuestion("q1", { categoryId: "does-not-exist" })] };
  const [row] = buildFullReview(form, [], categoryLabels);
  assert.equal(row.categoryLabel, "does-not-exist");
});

test("buildFullReview defaults explanation to an empty string when the question has none", () => {
  const question = reviewQuestion("q1");
  delete question.explanation;
  const form = { questions: [question] };
  const [row] = buildFullReview(form, [], categoryLabels);
  assert.equal(row.explanation, "");
});

test("buildFullReview preserves the form's question order, not the answers' order", () => {
  const form = { questions: [reviewQuestion("q1"), reviewQuestion("q2")] };
  const answers = [
    { questionId: "q2", chosen: ["a"] },
    { questionId: "q1", chosen: ["a"] },
  ];
  const rows = buildFullReview(form, answers, categoryLabels);
  assert.deepEqual(
    rows.map((r) => r.questionId),
    ["q1", "q2"],
  );
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
