// S3 test-runner logic -- Phase 1.2 added scoring; Phase 3.1 adds the review-pass list
// (excerptStem/buildReviewRows); Phase 3.2 adds the submit-confirmation counts
// (countReviewStatus). Timer enforcement is still Phase 3.3/3.4's, matching
// schema.js's placeholder-first pattern.
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

/**
 * Truncates a stem to a short excerpt for the review-pass list (SCHEMA.md §1.1 S3,
 * finding #16 -- "a short stem excerpt ... not a bare number"). Trims trailing
 * whitespace left by the cut before appending the ellipsis, so a break mid-word
 * doesn't read as `foo …` with an orphan space.
 *
 * @param {string} text
 * @param {number} [maxLength]
 */
export function excerptStem(text, maxLength = 80) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

/**
 * Builds the end-of-run review-pass list (SCHEMA.md §1.1 S3, D-11, finding #16) by
 * joining a form's questions -- in the order they were drawn, not the order they were
 * answered in -- against the attempt's stored answers. Looked up by a Map rather than
 * assuming `answers[i]` lines up with `questions[i]`: true in this project's current
 * forward-only flow, but this stays correct even if a future skip/reorder feature
 * breaks that assumption.
 *
 * A question with no matching answer reports `answered: false` and null
 * chosen/correct/flagged rather than throwing -- this project's flow always answers
 * every question before review is reached today, but the review list is written to
 * reflect reality rather than assume it.
 *
 * @param {{id: string, stem: {value: string}, categoryId: string}[]} questions
 * @param {{questionId: string, chosen: string[], correct: boolean, flagged: boolean}[]} answers
 * @param {Map<string, string>} categoryLabels
 * @returns {{questionId: string, stemExcerpt: string, categoryLabel: string, answered: boolean, chosen: string[]|null, correct: boolean|null, flagged: boolean}[]}
 */
export function buildReviewRows(questions, answers, categoryLabels) {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  return questions.map((question) => {
    const answer = byId.get(question.id);
    return {
      questionId: question.id,
      stemExcerpt: excerptStem(question.stem.value),
      categoryLabel: categoryLabels.get(question.categoryId) ?? question.categoryId,
      answered: Boolean(answer),
      chosen: answer?.chosen ?? null,
      correct: answer?.correct ?? null,
      flagged: answer?.flagged ?? false,
    };
  });
}

/**
 * Counts unanswered and flagged questions for the confirm-before-submit dialog
 * (SCHEMA.md §1.1 S3, finding #11) -- takes {@link buildReviewRows}'s output directly
 * rather than re-deriving from questions/answers, since run.html always has the rows
 * on hand already (it just rendered the review list from them).
 *
 * @param {{answered: boolean, flagged: boolean}[]} rows
 * @returns {{unanswered: number, flagged: number}}
 */
export function countReviewStatus(rows) {
  let unanswered = 0;
  let flagged = 0;
  for (const row of rows) {
    if (!row.answered) unanswered += 1;
    if (row.flagged) flagged += 1;
  }
  return { unanswered, flagged };
}

/**
 * The set of thresholds to pre-mark "already announced" when a run screen mounts
 * (SCHEMA.md §1.3, finding #12) -- so a résumé landing partway through the run never
 * retroactively announces a threshold that passed while the tab was closed.
 *
 * **Only meaningful for a genuine résumé.** A fresh start always returns an empty
 * set, regardless of how close `remainingMs` is to a threshold at that instant --
 * without this, a test whose `timeLimitMinutes` exactly equals a threshold (a
 * 10-minute drill, say) would have that threshold pre-marked at mount by the
 * handful of milliseconds of processing delay between computing the deadline and
 * evaluating this function, silently suppressing the single most useful
 * announcement a short timed test has (code review finding, Phase 3.4).
 *
 * @param {number} remainingMs
 * @param {number[]} thresholds
 * @param {boolean} isResume
 * @returns {Set<number>}
 */
export function initialAnnouncedThresholds(remainingMs, thresholds, isResume) {
  if (!isResume) return new Set();
  return new Set(thresholds.filter((t) => remainingMs <= t));
}

/**
 * Thresholds newly crossed at the current `remainingMs`, given which have already
 * fired this run (SCHEMA.md §1.3, finding #12). Doesn't mutate `alreadyAnnounced` --
 * the caller commits each returned threshold once it has actually announced it.
 *
 * @param {number} remainingMs
 * @param {number[]} thresholds
 * @param {Set<number>} alreadyAnnounced
 * @returns {number[]}
 */
export function crossedThresholds(remainingMs, thresholds, alreadyAnnounced) {
  return thresholds.filter((t) => !alreadyAnnounced.has(t) && remainingMs <= t);
}
