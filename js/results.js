// S4 results-dashboard logic -- Phase 1.3's minimal version: overall score and a bare
// per-category percentage. The full review list, explanations, and shortfall
// disclosure (SCHEMA.md §1.1 S4) land in Phase 4.2, which expands this file rather
// than replacing it, matching schema.js's and runner.js's placeholder-first pattern.
//
// Kept pure and DOM-free -- results.html owns fetching the attempt out of
// sessionStorage and the bank out of the network, and rendering the result.

/**
 * Walks a category tree (SCHEMA.md §2.4 -- any node may have children) and returns a
 * flat id -> label map. Works on today's flat placeholder tree and Phase 2's
 * variable-depth production trees alike, since a node's own {id, label} is collected
 * regardless of whether it has children.
 */
function flattenCategoryLabels(nodes) {
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
 * Summarizes a finished attempt (as produced by js/runner.js's scoreAttempt and
 * stashed by run.html) against its bank, for S4 to render.
 *
 * @param {{score: {correct: number, total: number, byCategory: Record<string, {correct: number, total: number}>}}} attempt
 * @param {{categories: object[]}} bank
 * @returns {{overall: {correct: number, total: number, percent: number},
 *            categories: {id: string, label: string, correct: number, total: number, percent: number}[]}}
 */
export function summarizeAttempt(attempt, bank) {
  const { correct, total, byCategory } = attempt.score;
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
  };
}
