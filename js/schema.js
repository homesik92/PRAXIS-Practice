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
 * Fetches and parses manifest.json. By default returns only its enabled entries
 * (S1's "which tests can I start" list, index.html). Pass `includeDisabled: true`
 * for a by-code lookup that must keep working for a test that's been disabled --
 * reviewing/resuming/tracking progress on an attempt already taken doesn't stop
 * being valid just because the test isn't offered for a *new* attempt anymore
 * (Phase 6.5 code-review finding: results.html/run.html/test.html/dashboard.html
 * all used to hard-filter to enabled, silently orphaning any history on a test
 * disabled after the fact).
 * Never throws -- a fetch failure or invalid JSON returns a tagged failure, matching
 * store.js's "storage failures are visible, never silent" convention (SCHEMA.md
 * finding #6) extended to network/data-loading failures.
 *
 * @returns {Promise<{ok: true, tests: {code: string, file: string, enabled: boolean}[]}
 *                  | {ok: false, reason: "fetch-failed" | "invalid-json", error?: Error}>}
 */
export async function loadManifest(fetchImpl = globalThis.fetch, manifestUrl = "data/manifest.json", { includeDisabled = false } = {}) {
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
  const tests = Array.isArray(manifest.tests) ? manifest.tests.filter((t) => t && (includeDisabled || t.enabled)) : [];
  return { ok: true, tests: tests.map((t) => ({ code: t.code, file: t.file, enabled: !!t.enabled })) };
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
 * Fetches and parses a reference-panel content file (SCHEMA.md §2.9) -- the
 * `bank.referencePanel` path, same relative-to-dataDir convention as loadBank. Just
 * loadBank's own fetch/parse plumbing under a name that fits this call site (a
 * "bank" and a "reference panel" happen to have an identical loading shape, but
 * calling one a `bank` at this call site would be confusing) -- delegating rather
 * than re-typing the same fetch/HTTP-check/JSON-parse logic a second time keeps the
 * two from silently drifting if that shared logic ever changes.
 *
 * @returns {Promise<{ok: true, panel: object} | {ok: false, reason: "fetch-failed" | "invalid-json", error?: Error}>}
 */
export async function loadReferencePanel(path, fetchImpl = globalThis.fetch, dataDir = "data") {
  const result = await loadBank(path, fetchImpl, dataDir);
  return result.ok ? { ok: true, panel: result.bank } : result;
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
      // The number a real attempt actually draws (SCHEMA.md's weight-correct form
      // assembly), not the size of the underlying bank -- Phase 7 built each bank at
      // 3x a real attempt's length on purpose, so a wide dataset backs several
      // materially-different attempts (bug found live-testing the NAS deploy: this
      // used to read bank.questions.length, showing "198 questions" for a 66-question
      // test).
      questionCount: bank.formLength,
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

// Shared by lastSeenRank and (Phase 4.3) dueAtRank below: reads a question's
// history[field], parses it as a date, and returns its epoch ms -- or
// `undefined` if the field is missing, unparseable, or `history` itself is
// null/undefined (a hand-corrupted store can have valid-JSON, current-version
// `questionHistory: null`; both callers get this guard for free rather than
// each needing their own). Each caller picks its own sentinel for the
// "undefined" case, since they need different ones (see below).
function parsedHistoryDate(question, history, field) {
  const raw = history?.[question.id]?.[field];
  if (raw === undefined) return undefined;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

// A malformed/unparseable lastSeenAt is treated the same as "never seen" (-Infinity)
// rather than "seen just now" or NaN -- Date.parse returns NaN for anything it can't
// read, and NaN as a sort-comparator result is spec-coerced to 0 ("equal"), which
// would let a corrupted history entry sort as tied with whatever it's compared
// against instead of reliably ranking first. As of Phase 2.3, run.html passes real,
// unvalidated localStorage-sourced history straight into this function -- this guard
// is what keeps a hand-corrupted lastSeenAt from breaking the draw.
function lastSeenRank(question, history) {
  const ms = parsedHistoryDate(question, history, "lastSeenAt");
  return ms === undefined ? -Infinity : ms;
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

// Shared by assembleForm and assembleDrill (code review finding) -- shuffling
// each selected question's own option order is identical either way, only which
// questions get selected differs.
function shuffleQuestionOptions(questions, random) {
  return questions.map((q) => ({ ...q, options: shuffle(q.options, random) }));
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

  const questions = shuffleQuestionOptions(shuffle(selected, random), random);

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

// -- Topic study (SCHEMA.md §1.1 S5, Phase 4.1) -------------------------------------

/**
 * Flattens a category tree into a depth-annotated list, in document order
 * (SCHEMA.md §2.4). Unlike {@link collectWeightBearing}, includes every node
 * regardless of whether it publishes a weight -- a `weight: null` subcategory
 * "exists purely as a study filter" per §2.4, and S5's category picker is exactly
 * that filter's reason to exist, so it must be pickable even though it's never
 * drawn from for a timed form.
 *
 * @param {object[]} nodes
 * @param {number} [depth]
 * @returns {{id: string, label: string, depth: number}[]}
 */
export function flattenCategoryTree(nodes, depth = 0) {
  const out = [];
  for (const node of nodes ?? []) {
    out.push({ id: node.id, label: node.label, depth });
    out.push(...flattenCategoryTree(node.children, depth + 1));
  }
  return out;
}

/**
 * The picked category's id plus every descendant's id. A question attaches only
 * to the deepest category it belongs to (§2.4), so a branch node normally has no
 * questions attached directly to it at all -- picking one for study means
 * everything under it, not nothing. Returns an empty set for an id not present in
 * the tree, rather than throwing, so a stale or hand-typed `?category=` in the URL
 * degrades to "no matching questions" instead of a crash.
 *
 * Built on {@link flattenCategoryTree}'s document-order, depth-annotated list
 * (code review finding) rather than its own recursive find-then-collect walk: a
 * node's descendants are exactly the contiguous run right after it whose depth is
 * greater than its own, so one flatten plus a linear scan replaces two separate
 * tree walks.
 *
 * @param {object[]} nodes
 * @param {string} categoryId
 * @returns {Set<string>}
 */
export function categoryAndDescendantIds(nodes, categoryId) {
  const flat = flattenCategoryTree(nodes);
  const targetIndex = flat.findIndex((n) => n.id === categoryId);
  if (targetIndex === -1) return new Set();

  const ids = [flat[targetIndex].id];
  const targetDepth = flat[targetIndex].depth;
  for (let i = targetIndex + 1; i < flat.length && flat[i].depth > targetDepth; i++) {
    ids.push(flat[i].id);
  }
  return new Set(ids);
}

/**
 * Assembles an untimed topic-study drill (SCHEMA.md §1.1 S5): every non-retired
 * question under the picked category (itself plus every descendant), ordered
 * least-recently-seen first like the timed draw's preference (§2.7 step 3), each
 * question's option order shuffled. Unlike {@link assembleForm}, there is no
 * quota and no shortfall -- a study drill works through everything available for
 * that category rather than a weight-correct sample of the whole bank. Reuses
 * {@link drawForCategory} with the pool's own size as the target (code review
 * finding) rather than re-deriving the same rank/tiebreak/sort -- "draw
 * everything" is just an unlimited draw, not a different kind of ranking.
 *
 * @param {object} bank
 * @param {string} categoryId
 * @param {{history?: Record<string, {lastSeenAt?: string}>, random?: () => number}} [options]
 * @returns {{questions: object[]}}
 */
export function assembleDrill(bank, categoryId, { history = {}, random = Math.random } = {}) {
  const categoryIds = categoryAndDescendantIds(bank.categories, categoryId);
  const pool = (bank.questions ?? []).filter((q) => !q.retired && categoryIds.has(q.categoryId));
  const { drawn } = drawForCategory(pool, pool.length, history, random);
  return { questions: shuffleQuestionOptions(drawn, random) };
}

// Mirrors lastSeenRank's stance above via the same parsedHistoryDate helper,
// with a different sentinel: a malformed/unparseable/missing dueAt is "not
// due" (null) here rather than -Infinity, since this value feeds a filter, not
// a raw sort -- null keeps a hand-corrupted entry from inflating S2's due
// count or pulling a bogus question into the drill (code review finding:
// parsedHistoryDate's `history?.` guard also covers `questionHistory: null`,
// which this diff put on S2's every-page-load path, not just a drill actually
// being started).
function dueAtRank(question, history) {
  return parsedHistoryDate(question, history, "dueAt") ?? null;
}

/**
 * Assembles an untimed review drill (SCHEMA.md S2's "N questions due" entry point,
 * D-8): every non-retired question across the *whole* bank whose questionHistory
 * entry's `dueAt` (js/srs.js) has passed, ordered most-overdue-first, each
 * question's option order shuffled. Unlike {@link assembleDrill}, this ignores
 * category entirely -- it is driven purely by the SRS schedule, not by topic
 * (D-18 deliberately keeps "time has passed" and "performance is poor" as separate
 * signals, so this stays flat-across-categories rather than grouping by weakest
 * category). `.questions.length` doubles as S2's displayed "N due" count, so both
 * screens read the same computation instead of re-deriving it.
 *
 * @param {object} bank
 * @param {{history?: Record<string, {dueAt?: string}>, random?: () => number, now?: () => Date}} [options]
 * @returns {{questions: object[]}}
 */
export function assembleDueDrill(bank, { history = {}, random = Math.random, now = () => new Date() } = {}) {
  const nowMs = now().getTime();
  const due = (bank.questions ?? [])
    .filter((q) => !q.retired)
    .map((q) => ({ q, dueAtMs: dueAtRank(q, history) }))
    .filter((r) => r.dueAtMs !== null && r.dueAtMs <= nowMs)
    .sort((a, b) => a.dueAtMs - b.dueAtMs);
  return { questions: shuffleQuestionOptions(due.map((r) => r.q), random) };
}

// Shared by weakestCategory and aggregateCategoryStats -- both need the same
// per-leaf-category {correct, seen, distinctSeen, lastSeenAtMs} tally across the
// whole store's history for this bank, differing only in what they do with it
// (pick the single worst vs. return every category). Extracted rather than
// duplicated (Phase 6.5 code review finding).
function aggregateHistoryByCategory(bank, history) {
  const byCategory = new Map();
  for (const q of bank.questions ?? []) {
    if (q.retired) continue;
    const entry = history?.[q.id];
    if (!entry || !Number.isInteger(entry.seen) || entry.seen <= 0) continue;

    const bucket = byCategory.get(q.categoryId) ?? { correct: 0, seen: 0, distinctSeen: 0, lastSeenAtMs: -Infinity };
    // Clamped to [0, entry.seen] (code review finding): a hand-corrupted
    // entry.correct outside that range would otherwise push accuracy outside
    // [0, 1] -- e.g. {seen: 1, correct: 999} -- and S2 would render a nonsense
    // percentage straight from it.
    const correctCount = Number.isInteger(entry.correct) ? Math.min(Math.max(entry.correct, 0), entry.seen) : 0;
    bucket.correct += correctCount;
    bucket.seen += entry.seen;
    bucket.distinctSeen += 1;
    // Reuses lastSeenRank rather than re-deriving its same undefined-vs-parsed
    // sentinel handling by hand (code review finding).
    bucket.lastSeenAtMs = Math.max(bucket.lastSeenAtMs, lastSeenRank(q, history));
    byCategory.set(q.categoryId, bucket);
  }
  return byCategory;
}

/**
 * Every leaf category's accuracy across the whole store's history for this bank
 * (every attempt and study session that ever touched it, same scope as
 * {@link weakestCategory}) -- unlike weakestCategory, which returns only the
 * single worst category past a 5-question eligibility threshold, this returns
 * every category that has *any* history, each tagged with whether it clears
 * that same threshold, so a dashboard can show "not enough data yet" for a
 * thin category rather than omitting it silently or mislabeling it as strong.
 *
 * @param {object} bank
 * @param {Record<string, {seen?: number, correct?: number, lastSeenAt?: string}>} [history]
 * @returns {{categoryId: string, correct: number, seen: number, distinctSeen: number, accuracy: number, eligible: boolean}[]}
 */
export function aggregateCategoryStats(bank, history = {}) {
  const byCategory = aggregateHistoryByCategory(bank, history);
  return [...byCategory.entries()].map(([categoryId, b]) => ({
    categoryId,
    correct: b.correct,
    seen: b.seen,
    distinctSeen: b.distinctSeen,
    accuracy: b.correct / b.seen,
    eligible: b.distinctSeen >= 5,
  }));
}

/**
 * Finds S2's weakest-category suggestion (SCHEMA.md S2, D-18): the single
 * lowest-accuracy category in this bank, once any category clears a
 * 5-distinct-question threshold. "Category" here is the leaf a question
 * actually attaches to (SCHEMA.md 2.4: "a question attaches to the deepest
 * category it belongs to") -- the same granularity js/runner.js's
 * scoreAttempt/js/results.js's summarizeAttempt already use for S4's
 * per-category breakdown, just aggregated across every history entry the
 * *whole store* has for this bank (every attempt and study session that ever
 * touched it, per D-18 -- not one attempt) rather than a single attempt's
 * answers.
 *
 * Accuracy is `correct ÷ seen` summed across a category's distinct questions.
 * Eligibility is a count of *distinct questions with any history* reaching 5,
 * not total `seen` -- re-answering the same one or two questions five times
 * over shouldn't unlock a suggestion built on that narrow a sample, which is
 * exactly what D-18's threshold exists to guard against. Ties break toward
 * the category least recently practiced: the one whose most recent
 * `lastSeenAt` across its questions is furthest in the past.
 *
 * Excludes retired questions from both eligibility and accuracy, matching
 * assembleDrill/assembleDueDrill's existing convention: a retired question
 * isn't part of what S5 will actually let you practice, so it shouldn't drive
 * a suggestion to practice it. A history entry with a non-positive-integer
 * `seen` (hand-corrupted data) is treated as if the question were never
 * answered, the same "malformed -> treat as absent" stance dueAtRank/
 * lastSeenRank already take.
 *
 * @param {object} bank
 * @param {Record<string, {seen?: number, correct?: number, lastSeenAt?: string}>} [history]
 * @returns {{categoryId: string, correct: number, seen: number} | null}
 */
export function weakestCategory(bank, history = {}) {
  const byCategory = aggregateHistoryByCategory(bank, history);

  const eligible = [...byCategory.entries()]
    .filter(([, b]) => b.distinctSeen >= 5)
    .map(([categoryId, b]) => ({
      categoryId,
      correct: b.correct,
      seen: b.seen,
      accuracy: b.correct / b.seen,
      lastSeenAtMs: b.lastSeenAtMs,
    }));
  if (eligible.length === 0) return null;

  // Explicit comparisons rather than subtraction for the tie-break (code
  // review finding): lastSeenAtMs can be -Infinity for a category with no
  // parseable lastSeenAt anywhere in it, and -Infinity - -Infinity is NaN,
  // which Array.prototype.sort silently treats as "equal" -- quietly
  // replacing the documented "least recently practiced wins" rule with
  // whatever order the categories happened to appear in.
  eligible.sort(
    (a, b) => a.accuracy - b.accuracy || (a.lastSeenAtMs > b.lastSeenAtMs ? 1 : a.lastSeenAtMs < b.lastSeenAtMs ? -1 : 0),
  );
  const { categoryId, correct, seen } = eligible[0];
  return { categoryId, correct, seen };
}
