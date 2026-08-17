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
 * Scores a finished attempt against a bank. `answers` is the sequence recorded by the
 * runner: one entry per answered question, in the order answered.
 *
 * Only `type: "single"` is scored (D-10 -- v1 authors only single-select); any other
 * `type` is skipped from scoring but still counted in `total`, since a bank could in
 * principle carry an unimplemented type per verify.mjs's warn-not-error stance.
 *
 * @param {{questions: {id: string, type: string, categoryId: string, correct: string[]}[]}} bank
 * @param {{questionId: string, selectedOptionId: string}[]} answers
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

    const isCorrect = question.type === "single" && question.correct.includes(answer.selectedOptionId);
    if (isCorrect) {
      correct += 1;
      bucket.correct += 1;
    }
  }

  return { correct, total, byCategory };
}
