// Manifest and bank loading, plus (as of Phase 2.1) the real SCHEMA.md §2.7 form
// assembler that replaces Phase 1's placeholder draw logic ("use bank.questions as
// given"). Category-tree traversal here deliberately duplicates tools/verify.mjs's
// walkCategories rather than sharing it -- that module is Node-only dev tooling, this
// one is browser-facing app code, and blurring that boundary costs more than a ~15-line
// duplication does. (js/results.js's flattenCategoryLabels is a third, lighter-weight
// tree walk for a different purpose -- id-to-label lookup, not weight-bearing-leaf
// selection -- and was left alone rather than unified here.)
//
// Every function takes a `fetchImpl` parameter (defaulting to the global `fetch`)
// rather than reaching for it directly, so the shaping logic here is unit-testable
// under Node against a mock -- see tools/test-schema.mjs. Mirrors js/store.js's
// `storage` injection for the same reason. assembleForm follows the same pattern with
// an injected `random` (default Math.random) so shuffling is deterministic under test.

/**
 * Fetches and parses manifest.json, returning only its enabled entries.
 * Never throws -- a fetch failure or invalid JSON returns a tagged failure, matching
 * store.js's "storage failures are visible, never silent" convention (SCHEMA.md
 * finding #6) extended to network/data-loading failures.
 *
 * @returns {Promise<{ok: true, tests: {code: string, file: string}[]}
 *                  | {ok: false, reason: "fetch-failed" | "invalid-json", error?: Error}>}
 */
export async function loadManifest(fetchImpl = globalThis.fetch, manifestUrl = "data/manifest.json") {
  let response;
  try {
    response = await fetchImpl(manifestUrl);
  } catch (error) {
    return { ok: false, reason: "fetch-failed", error };
  }
  if (!response.ok) {
    return { ok: false, reason: "fetch-failed", error: new Error(`HTTP ${response.status}`) };
  }
  let manifest;
  try {
    manifest = await response.json();
  } catch (error) {
    return { ok: false, reason: "invalid-json", error };
  }
  const tests = Array.isArray(manifest.tests) ? manifest.tests.filter((t) => t && t.enabled) : [];
  return { ok: true, tests: tests.map((t) => ({ code: t.code, file: t.file })) };
}

/**
 * Fetches and parses one bank file in full (categories, questions, everything in
 * SCHEMA.md §2.3) -- what the runner (js/runner.js) needs to actually present and
 * score questions, as opposed to loadBankSummary's index-listing subset. Same
 * never-throws convention as loadManifest.
 *
 * @returns {Promise<{ok: true, bank: object} | {ok: false, reason: "fetch-failed" | "invalid-json", error?: Error}>}
 */
export async function loadBank(file, fetchImpl = globalThis.fetch, dataDir = "data") {
  let response;
  try {
    response = await fetchImpl(`${dataDir}/${file}`);
  } catch (error) {
    return { ok: false, reason: "fetch-failed", error };
  }
  if (!response.ok) {
    return { ok: false, reason: "fetch-failed", error: new Error(`HTTP ${response.status}`) };
  }
  try {
    return { ok: true, bank: await response.json() };
  } catch (error) {
    return { ok: false, reason: "invalid-json", error };
  }
}

/**
 * Fetches one bank file, returning only the fields S1/S2 need (name, timing, question
 * count) rather than the full record loadBank returns.
 *
 * @returns {Promise<{ok: true, bank: {code: string, name: string, timeLimitMinutes: number, formLength: number, questionCount: number}}
 *                  | {ok: false, reason: "fetch-failed" | "invalid-json", error?: Error}>}
 */
export async function loadBankSummary(file, fetchImpl = globalThis.fetch, dataDir = "data") {
  const result = await loadBank(file, fetchImpl, dataDir);
  if (!result.ok) return result;
  const bank = result.bank;
  return {
    ok: true,
    bank: {
      code: bank.code,
      name: bank.name,
      timeLimitMinutes: bank.timeLimitMinutes,
      formLength: bank.formLength,
      questionCount: Array.isArray(bank.questions) ? bank.questions.length : 0,
    },
  };
}

/**
 * Loads the manifest and every enabled test's bank summary together -- what S1 needs
 * to render its list in one call. Skips (rather than fails outright on) a bank that
 * fails to load, since one broken bank shouldn't blank the whole index; the caller can
 * inspect `failed` to surface that.
 *
 * @returns {Promise<{ok: true, tests: {code: string, name: string, timeLimitMinutes: number, formLength: number, questionCount: number}[], failed: string[]}
 *                  | {ok: false, reason: "fetch-failed" | "invalid-json", error?: Error}>}
 */
export async function loadTestList(fetchImpl = globalThis.fetch, dataDir = "data") {
  const manifestResult = await loadManifest(fetchImpl, `${dataDir}/manifest.json`);
  if (!manifestResult.ok) return manifestResult;

  const tests = [];
  const failed = [];
  for (const entry of manifestResult.tests) {
    const summary = await loadBankSummary(entry.file, fetchImpl, dataDir);
    if (summary.ok) {
      tests.push(summary.bank);
    } else {
      failed.push(entry.code);
    }
  }
  return { ok: true, tests, failed };
}

// -- Form assembly (SCHEMA.md §2.7) -------------------------------------------------

function shuffle(array, random) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Mirrors tools/verify.mjs's walkCategories: a node is weight-bearing only if it
// publishes a weight AND none of its descendants do (SCHEMA.md §2.4 -- "weights are
// authoritative at the deepest level that publishes them").
function collectWeightBearing(nodes) {
  const out = [];
  for (const node of nodes ?? []) {
    const hasWeight = node.weight !== null && node.weight !== undefined;
    const childResults = collectWeightBearing(node.children);
    if (hasWeight && childResults.length === 0) {
      out.push({ id: node.id, count: node.weight.count });
    }
    out.push(...childResults);
  }
  return out;
}

/**
 * Target count per weight-bearing category. With no override, each category's own
 * published `count` is the target. With an overridden (shorter) `formLength`, counts
 * are scaled proportionally and rounded by the largest-remainder method, so the
 * targets sum to exactly `formLength` rather than drifting from independent rounding.
 */
function scaleTargets(weightBearing, formLength) {
  if (formLength === undefined) {
    return weightBearing.map((c) => ({ categoryId: c.id, target: c.count }));
  }
  const totalCount = weightBearing.reduce((sum, c) => sum + c.count, 0);
  const raw = weightBearing.map((c) => (c.count / totalCount) * formLength);
  const floors = raw.map(Math.floor);
  const allocated = floors.reduce((sum, n) => sum + n, 0);
  const remainder = formLength - allocated;

  const byFractionDesc = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac);

  // remainder is always < weightBearing.length (a property of the largest-remainder
  // method: independent per-category rounding error can't accumulate to a full unit),
  // so every k lands in range -- no wraparound to guard against.
  const targets = [...floors];
  for (let k = 0; k < remainder; k++) {
    targets[byFractionDesc[k].i] += 1;
  }
  return weightBearing.map((c, i) => ({ categoryId: c.id, target: targets[i] }));
}

// A malformed/unparseable lastSeenAt is treated the same as "never seen" (-Infinity)
// rather than "seen just now" or NaN -- Date.parse returns NaN for anything it can't
// read, and NaN as a sort-comparator result is spec-coerced to 0 ("equal"), which
// would let a corrupted history entry sort as tied with whatever it's compared
// against instead of reliably ranking first. As of Phase 2.3, run.html passes real,
// unvalidated localStorage-sourced history straight into this function -- this guard
// is what keeps a hand-corrupted lastSeenAt from breaking the draw.
function lastSeenRank(question, history) {
  const lastSeenAt = history[question.id]?.lastSeenAt;
  if (lastSeenAt === undefined) return -Infinity;
  const parsed = Date.parse(lastSeenAt);
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

// Draws up to `target` questions for one category, preferring least-recently-seen
// (SCHEMA.md §2.7 step 3 -- "so a second attempt is not the first attempt again").
// Ties (including "every candidate is unseen", the common case before Phase 2.3's
// real history exists) are broken randomly: each candidate gets a random tiebreak
// value up front, folded into the sort key alongside its rank, rather than shuffling
// the whole pool and relying on Array.prototype.sort's stability to preserve that
// order through the second sort -- a real but easy-to-miss guarantee to depend on
// silently.
function drawForCategory(pool, target, history, random) {
  const ranked = pool.map((q) => ({ q, rank: lastSeenRank(q, history), tie: random() }));
  ranked.sort((a, b) => a.rank - b.rank || a.tie - b.tie);
  const drawn = ranked.slice(0, target).map((r) => r.q);
  return { drawn, wanted: target, got: drawn.length };
}

/**
 * Assembles a practice form from a bank: the real weight-correct draw with disclosed
 * shortfalls that replaces Phase 1's placeholder (`bank.questions` used as-is).
 *
 * Never backfills a thin category from another one (SCHEMA.md §2.7 step 4) -- a
 * shortfall is recorded and left as a shortfall, never silently masked by
 * over-sampling elsewhere. Overlay `targetShare` coverage is reported, never enforced
 * (step 5). Presentation order and each question's option order are shuffled (step 6).
 *
 * @param {object} bank
 * @param {{formLength?: number, history?: Record<string, {lastSeenAt?: string}>, random?: () => number}} [options]
 * @returns {{questions: object[],
 *            categoryTargets: {categoryId: string, target: number}[],
 *            shortfalls: {categoryId: string, wanted: number, got: number}[],
 *            overlayCoverage: {overlayId: string, target: number, actual: number}[]}}
 */
export function assembleForm(bank, { formLength, history = {}, random = Math.random } = {}) {
  const weightBearing = collectWeightBearing(bank.categories);
  const categoryTargets = scaleTargets(weightBearing, formLength);

  // One pass to group by category (excluding retired) rather than re-filtering the
  // full question list once per category inside the loop below -- O(categories +
  // questions) instead of O(categories × questions).
  const poolByCategory = new Map();
  for (const q of bank.questions ?? []) {
    if (q.retired) continue;
    if (!poolByCategory.has(q.categoryId)) poolByCategory.set(q.categoryId, []);
    poolByCategory.get(q.categoryId).push(q);
  }

  const shortfalls = [];
  const selected = [];

  for (const { categoryId, target } of categoryTargets) {
    const pool = poolByCategory.get(categoryId) ?? [];
    const { drawn, wanted, got } = drawForCategory(pool, target, history, random);
    selected.push(...drawn);
    if (got < wanted) {
      shortfalls.push({ categoryId, wanted, got });
    }
  }

  const overlayCoverage = (bank.overlays ?? []).map((overlay) => ({
    overlayId: overlay.id,
    target: Math.round(overlay.targetShare * selected.length),
    actual: selected.filter((q) => (q.overlays ?? []).includes(overlay.id)).length,
  }));

  const questions = shuffle(selected, random).map((q) => ({ ...q, options: shuffle(q.options, random) }));

  return { questions, categoryTargets, shortfalls, overlayCoverage };
}

/**
 * Reconstructs a form from a previously recorded questionOrder (SCHEMA.md §2.8's
 * attempt.questionOrder, D-19), replaying the exact original draw rather than
 * re-running assembleForm's random draw -- what résumé needs after a reload.
 *
 * Returns null, rather than throwing, if any referenced question or option can no
 * longer be resolved against the given bank (code review finding: an earlier version
 * of this logic threw instead) -- the realistic trigger is the bank being hand-edited
 * (a question or option id physically removed, not just retired) while an attempt
 * referencing it sits in progress. The caller decides how to handle an unresumable
 * attempt.
 *
 * @param {object} bank
 * @param {{questionId: string, optionOrder: string[]}[]} questionOrder
 * @returns {{questions: object[]} | null}
 */
export function resumeForm(bank, questionOrder) {
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const questions = questionOrder.map(({ questionId, optionOrder }) => {
    const question = byId.get(questionId);
    if (!question) return null;
    const optionsById = new Map(question.options.map((o) => [o.id, o]));
    const options = optionOrder.map((id) => optionsById.get(id));
    return options.some((o) => !o) ? null : { ...question, options };
  });
  return questions.some((q) => !q) ? null : { questions };
}
