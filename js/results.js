// S4 results-dashboard logic -- Phase 1.3's minimal version: overall score and a bare
// per-category percentage, plus (as of Phase 2.4) recomputed shortfall disclosure
// (SCHEMA.md §1.2, §2.8 finding #3). Phase 4.2 adds time used and the full
// review-list-with-explanations (SCHEMA.md §1.1 S4).
//
// Kept pure and DOM-free -- results.html owns loading the attempt out of the real
// store (js/store.js, as of Phase 2.2) and the bank out of the network, computing the
// score itself via js/runner.js's scoreAttempt, reconstructing the original form via
// js/schema.js's resumeForm, and rendering the result.
import { isCorrect, joinAnswers, isAnswered } from "./runner.js";

/**
 * Walks a category tree (SCHEMA.md §2.4 -- any node may have children) and returns a
 * flat id -> label map. Works on today's flat placeholder tree and Phase 2's
 * variable-depth production trees alike, since a node's own {id, label} is collected
 * regardless of whether it has children.
 *
 * Exported (Phase 3.1) so run.html's review pass can label each row's category without
 * re-implementing this walk.
 */
export function flattenCategoryLabels(nodes) {
  const labels = new Map();
  for (const node of nodes ?? []) {
    labels.set(node.id, node.label);
    for (const [id, label] of flattenCategoryLabels(node.children)) {
      labels.set(id, label);
    }
  }
  return labels;
}

function percentOf(correct, total) {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

/**
 * Recomputes each category's shortfall fresh from the actual delivered/answered
 * counts (SCHEMA.md §2.8's shortfall-auditability finding #3), rather than trusting
 * `attempt.shortfalls` -- the value recorded at draw time -- blindly. Same principle
 * this file already applies to the score itself (never cached, always recomputed from
 * `answers`).
 *
 * `categoryTargets` (from the attempt record) is the per-category quota *actually
 * used for that draw* -- stable even if the bank's categories change later, which is
 * exactly why it's stored on the attempt rather than re-derived from the current bank
 * (SCHEMA.md §2.8). A category entirely absent from `byCategory` (the 100%-shortfall
 * case -- nothing in it was ever drawn) has no bucket there at all, so `got` defaults
 * to 0 rather than throwing on a missing lookup.
 *
 * Only the *target* side of this comparison carries that stability guarantee --
 * `byCategory` (the "got" side) comes from `scoreAttempt`, which re-derives every
 * question's `categoryId` from whatever bank is live when results.html loads, the
 * same as it always has since Phase 1.3. If a question is recategorized or deleted
 * between the attempt and viewing its results, both this and the pre-existing
 * per-category score breakdown can drift from what was actually delivered at draw
 * time -- a real, pre-existing gap this function inherits rather than introduces
 * (code review finding, filed as an issue rather than fixed here; see ROADMAP.md).
 *
 * @param {{categoryId: string, target: number}[]} categoryTargets
 * @param {Record<string, {correct: number, total: number}>} byCategory
 * @param {Map<string, string>} labels
 * @returns {{categoryId: string, label: string, wanted: number, got: number}[]}
 */
function recomputeShortfalls(categoryTargets, byCategory, labels) {
  return categoryTargets
    .map(({ categoryId, target }) => ({
      categoryId,
      label: labels.get(categoryId) ?? categoryId,
      wanted: target,
      got: byCategory[categoryId]?.total ?? 0,
    }))
    .filter((s) => s.got < s.wanted);
}

/**
 * Turns a score (js/runner.js's scoreAttempt output -- results.html calls that itself
 * against the attempt's stored answers, not a cached value) into percentages with
 * real category labels, for S4 to render.
 *
 * @param {{correct: number, total: number, byCategory: Record<string, {correct: number, total: number}>}} score
 * @param {{categories: object[]}} bank
 * @param {{categoryId: string, target: number}[]} [categoryTargets] the attempt's
 *   recorded draw quota (SCHEMA.md §2.8) -- omit for an empty shortfalls result.
 * @returns {{overall: {correct: number, total: number, percent: number},
 *            categories: {id: string, label: string, correct: number, total: number, percent: number}[],
 *            shortfalls: {categoryId: string, label: string, wanted: number, got: number}[]}}
 */
export function summarizeAttempt(score, bank, categoryTargets = []) {
  const { correct, total, byCategory } = score;
  const labels = flattenCategoryLabels(bank.categories);

  const categories = Object.entries(byCategory).map(([id, stats]) => ({
    id,
    label: labels.get(id) ?? id,
    correct: stats.correct,
    total: stats.total,
    percent: percentOf(stats.correct, stats.total),
  }));

  return {
    overall: { correct, total, percent: percentOf(correct, total) },
    categories,
    shortfalls: recomputeShortfalls(categoryTargets, byCategory, labels),
  };
}

/**
 * Which of this attempt's categories missed more than `threshold` questions
 * (Phase 6.5's S4 "practice your weak spots" section) -- reuses
 * {@link summarizeAttempt}'s existing per-category breakdown rather than
 * re-deriving correct/total from the score a second time. Attempt-scoped, by
 * design: this is "what should I practice after THIS test," a different
 * question from `weakestCategory`'s cross-attempt, all-time accuracy ranking
 * (SCHEMA.md S2, D-18) -- the two deliberately don't share an implementation,
 * since one reads a single already-computed summary and the other aggregates
 * `questionHistory` across the whole store.
 *
 * @param {{categories: {id: string, label: string, correct: number, total: number}[]}} summary
 * @param {number} [threshold]
 * @returns {{id: string, label: string, missed: number}[]}
 */
export function categoriesNeedingPractice(summary, threshold = 1) {
  return summary.categories
    .map((c) => ({ id: c.id, label: c.label, missed: c.total - c.correct }))
    .filter((c) => c.missed > threshold);
}

/**
 * Formats the wall-clock span between two ISO timestamps (an attempt's `startedAt`/
 * `finishedAt`, SCHEMA.md §2.8) as a short human string for S4's "time used" line.
 *
 * Rounds to the nearest minute -- per-second precision isn't meaningful for a span that
 * can run up to a test's full `timeLimitMinutes` (as much as 3 hours), and would just
 * read as noise.
 *
 * Reports "time unavailable" rather than a nonsensical string (code review finding) if
 * the two timestamps don't parse or come out in the wrong order -- both timestamps are
 * written client-side off the system clock with no server authority (js/store.js's
 * `startAttempt`/`completeAttempt`), so a clock adjusted backward mid-attempt (NTP
 * correction, DST, sleep/wake drift) can otherwise produce a negative span; without
 * this guard a multi-hour attempt could silently display "less than a minute".
 *
 * @param {string} startedAt
 * @param {string} finishedAt
 * @returns {string}
 */
export function formatElapsed(startedAt, finishedAt) {
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "time unavailable";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes === 0) return "less than a minute";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/**
 * Builds S4's full review list (SCHEMA.md §1.1 S4: "a full review list of every
 * question with the chosen answer, the correct answer, and the explanation") from an
 * already-reconstructed form (js/schema.js's `resumeForm`, replaying the attempt's
 * exact original question/option order and presentation -- results.html calls that
 * itself, the same layering S3's review pass already uses) and the attempt's stored
 * answers, joined via {@link joinAnswers} (js/runner.js) -- the same join S3's
 * `buildReviewRows` uses, shared rather than reimplemented (code review finding).
 *
 * Each row's `correct` is recomputed via {@link isCorrect} against the question and the
 * stored `chosen`, not read from `answer.correct` -- the same "self-verifies rather than
 * trusting a recorded value blindly" principle {@link summarizeAttempt} already applies
 * to the overall score (SCHEMA.md §2.7).
 *
 * A question reports `answered: false`, `correct: null`, and every option's
 * `isChosen: false` both when there's no matching answer record at all, and when
 * there is one but `chosen` is empty ({@link isAnswered}, D-20's skip records the
 * latter -- an answer that exists, so it's counted and reopenable, but wasn't
 * actually given) -- the two need to look identical here even though only one of
 * them has a stored record.
 *
 * @param {{questions: {id: string, categoryId: string, stem: {value: string}, options: {id: string, content: {value: string}}[], correct: string[], explanation?: {value: string}}[]}} form
 * @param {{questionId: string, chosen: string[]}[]} answers
 * @param {Map<string, string>} categoryLabels
 * @returns {{questionId: string, categoryLabel: string, stem: string, options: {id: string, text: string, isChosen: boolean, isCorrectOption: boolean}[], explanation: string, answered: boolean, correct: boolean|null}[]}
 */
export function buildFullReview(form, answers, categoryLabels) {
  return joinAnswers(form.questions, answers).map(({ question, answer }) => {
    const answered = isAnswered(answer);
    const chosenId = answered ? answer.chosen[0] : null;
    return {
      questionId: question.id,
      categoryLabel: categoryLabels.get(question.categoryId) ?? question.categoryId,
      stem: question.stem.value,
      options: question.options.map((option) => ({
        id: option.id,
        text: option.content.value,
        isChosen: option.id === chosenId,
        isCorrectOption: question.correct.includes(option.id),
      })),
      explanation: question.explanation?.value ?? "",
      answered,
      correct: answered ? isCorrect(question, answer.chosen) : null,
    };
  });
}
