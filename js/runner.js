// S3 test-runner logic -- Phase 1.2's minimal version: scoring only. The rest of
// runner.js's eventual scope per the file layout (timer enforcement, flag, review
// pass, submit confirmation) lands in Phase 3; this file is deliberately thin until
// then, matching schema.js's placeholder-first pattern.
//
// Kept pure and DOM-free, like js/schema.js's shaping logic and checkers-demo's
// board.ts/input.ts split -- so scoring can be unit-tested under Node with a plain
// fixture bank, with no timer, no fetch, no DOM. run.html owns everything DOM- and
// timer-bound (rendering questions, the Start click, the countdown display).

/**
 * Whether a chosen set of option ids is correct for a question. `chosen` matches the
 * shape SCHEMA.md §2.8's stored answer record uses (`chosen: string[]`), not a single
 * option id -- deliberately, so this needs no reshaping once multi-select questions
 * exist (D-10: v1 authors only `type: "single"`, always a one-element `chosen`).
 *
 * Only `type: "single"` is ever correct -- any other `type` returns false rather than
 * throwing, since a bank could in principle carry an unimplemented type per
 * verify.mjs's warn-not-error stance (D-10).
 *
 * @param {{type: string, correct: string[]}} question
 * @param {string[]} chosen
 */
export function isCorrect(question, chosen) {
  return question.type === "single" && question.correct.includes(chosen[0]);
}

/**
 * Scores a finished attempt against a bank, from its stored `answers` -- SCHEMA.md
 * §2.7's "S4 self-verifies ... rather than trusting [a] recorded [value] blindly"
 * principle: nothing about score is cached on the attempt record (js/store.js's
 * completeAttempt stores none), so results.html calls this directly against
 * `attempt.answers` every time S4 renders, recomputing rather than trusting a
 * snapshot that could drift from what's actually stored.
 *
 * @param {{questions: {id: string, type: string, categoryId: string, correct: string[]}[]}} bank
 * @param {{questionId: string, chosen: string[]}[]} answers
 * @returns {{correct: number, total: number, byCategory: Record<string, {correct: number, total: number}>}}
 */
export function scoreAttempt(bank, answers) {
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const byCategory = {};
  let correct = 0;
  let total = 0;

  for (const answer of answers) {
    const question = byId.get(answer.questionId);
    if (!question) continue; // an answer for a question not in this bank -- ignore rather than throw
    total += 1;

    const bucket = (byCategory[question.categoryId] ??= { correct: 0, total: 0 });
    bucket.total += 1;

    if (isCorrect(question, answer.chosen)) {
      correct += 1;
      bucket.correct += 1;
    }
  }

  return { correct, total, byCategory };
}
