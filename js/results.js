// S4 results-dashboard logic -- Phase 1.3's minimal version: overall score and a bare
// per-category percentage, plus (as of Phase 2.4) recomputed shortfall disclosure
// (SCHEMA.md §1.2, §2.8 finding #3). The full review list and explanations (SCHEMA.md
// §1.1 S4) land in Phase 4.2, which expands this file rather than replacing it,
// matching schema.js's and runner.js's placeholder-first pattern.
//
// Kept pure and DOM-free -- results.html owns loading the attempt out of the real
// store (js/store.js, as of Phase 2.2) and the bank out of the network, computing the
// score itself via js/runner.js's scoreAttempt, and rendering the result.

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
