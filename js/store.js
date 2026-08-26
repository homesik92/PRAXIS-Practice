// Progress-store persistence: load, save, and the backup-before-migrate safety net
// from SCHEMA.md §2.8 (Phase 0.2), plus (as of Phase 2.2) the real attempt lifecycle:
// starting, per-answer writes, completion, résumé lookup, and cross-tab
// reconciliation. Spaced-repetition scheduling (questionHistory's dueAt/interval/ease
// fields) is Phase 2.3's, not this file's.
//
// Every function here takes a `storage` parameter (defaulting to the browser's
// localStorage) rather than reaching for the global directly, so this module can be
// unit-tested under Node with a mock -- see tools/test-store.mjs. The attempt-lifecycle
// functions additionally take an injectable `now` (default `() => new Date()`) for the
// same reason, so ids and timestamps are deterministic under test.

export const STORAGE_KEY = "praxis-practice";
export const CURRENT_VERSION = 1;

export function defaultStore() {
  return { storeVersion: CURRENT_VERSION, attempts: [], questionHistory: {} };
}

// Migrations keyed by the version they migrate *to*. migrations[2] takes a v1 store
// and returns a v2 store. Empty today -- storeVersion has never changed. Every
// migration must be additive-first per SKILL.md's launch-and-cutover discipline.
const migrations = {};

function backupBeforeMigrate(storage, rawValue, fromVersion) {
  storage.setItem(`${STORAGE_KEY}.backup.v${fromVersion}`, rawValue);
}

// Retention: keep only the immediately-prior version's backup (SCHEMA.md finding #8).
// Called right after a backup is created, independent of whether the migration chain
// that follows actually completes -- the retention invariant must hold even when a
// migration is missing partway through (code review finding: it previously didn't).
function pruneOldBackups(storage, keepVersion) {
  const prefix = `${STORAGE_KEY}.backup.v`;
  const keepKey = `${prefix}${keepVersion}`;
  const toRemove = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(prefix) && key !== keepKey) toRemove.push(key);
  }
  for (const key of toRemove) storage.removeItem(key);
}

// Parses raw text into a store-shaped object, with no storage access and no
// side effects -- shared by loadStore (below) and importStoreFromJson, so
// there's exactly one place that decides what "a valid stored value" means,
// not two copies that can drift. Doesn't run the migration chain itself
// (`migrateParsedStore` does that) -- callers differ on what happens around
// a downgrade-needed value (loadStore backs up the raw localStorage value
// first; an imported file has no equivalent live key to back up), so that
// step stays theirs to sequence.
//
// @returns {{ok: true, parsed: object} | {ok: false, reason: "unreadable", raw: string}}
function parseStoredValue(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "unreadable", raw };
  }

  // Number.isInteger rejects NaN, Infinity, and non-numbers alike -- `typeof x ===
  // "number"` alone lets NaN through (typeof NaN is "number"), and NaN compares
  // false against CURRENT_VERSION on both sides, which silently fell through to
  // "valid, current-version data" in an earlier version of this check (code review
  // finding).
  //
  // Also checks `attempts`/`questionHistory` shape, not just `storeVersion` -- this
  // used to matter only for a devtools-edited localStorage value, but Phase 6.7's
  // importStoreFromJson (below) reuses this same check against arbitrary uploaded
  // files, where a wrong-shape-but-version-valid file previously sailed through here
  // and `saveStore` (which also only checks `storeVersion`), only to crash later at
  // whatever first reads `store.attempts`/`store.questionHistory` -- `findAttempt`,
  // `findInProgressAttempt`, etc. (code review finding).
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Number.isInteger(parsed.storeVersion) ||
    !Array.isArray(parsed.attempts) ||
    typeof parsed.questionHistory !== "object" ||
    parsed.questionHistory === null
  ) {
    return { ok: false, reason: "unreadable", raw };
  }
  return { ok: true, parsed };
}

// Runs an already-parsed, version-tagged value through the migration chain if
// it's behind CURRENT_VERSION. Pure -- no storage access -- so both the live
// loadStore path (which wraps this with a pre-migration backup of the real
// localStorage value) and importStoreFromJson (which has no such live value
// to back up -- the uploaded file IS the backup) can share the one migration
// implementation rather than each re-deriving the version-fixup loop.
//
// @returns {{ok: true, store: object}
//         | {ok: false, reason: "future-version", rejected: object}
//         | {ok: false, reason: "missing-migration", rejected: object}
//         | {ok: false, reason: "migration-failed", error: Error}}
function migrateParsedStore(parsed) {
  if (parsed.storeVersion > CURRENT_VERSION) {
    // Never migrate downward -- report and read nothing rather than destroying a
    // history written by a later version of the site (SCHEMA.md §2.8).
    return { ok: false, reason: "future-version", rejected: parsed };
  }
  if (parsed.storeVersion === CURRENT_VERSION) {
    return { ok: true, store: parsed };
  }
  try {
    let migrated = parsed;
    for (let v = parsed.storeVersion; v < CURRENT_VERSION; v++) {
      const migrate = migrations[v + 1];
      if (!migrate) {
        return { ok: false, reason: "missing-migration", rejected: migrated };
      }
      migrated = migrate(migrated);
    }
    return { ok: true, store: migrated };
  } catch (error) {
    return { ok: false, reason: "migration-failed", error };
  }
}

/**
 * Loads the progress store. Never throws -- every failure mode returns a tagged
 * result instead, per SCHEMA.md's "storage failures are visible, never silent" rule
 * (finding #6). A corrupted value is left in storage untouched, not overwritten, so
 * it stays inspectable/recoverable via devtools.
 *
 * The `store` field appears ONLY on `ok: true` -- a rejected/partial value (from a
 * newer-than-supported version, or a migration chain that hit a missing step) is
 * returned under `rejected`, a deliberately different key, so a caller that forgets
 * to check `ok` gets `undefined` from `result.store` instead of a plausible-looking
 * object it was never safe to read (code review finding: the original shape made
 * that mistake easy).
 *
 * loadStore does NOT persist a migrated result back to storage -- that's the
 * caller's job (call saveStore(result.store) if you want a successful migration to
 * stick). Re-loading before saving safely re-runs backup+migrate against the same
 * original data; see tools/test-store.mjs's idempotency test.
 *
 * @returns {{ok: true, store: object}
 *         | {ok: false, reason: "unreadable", raw: string}
 *         | {ok: false, reason: "future-version", rejected: object}
 *         | {ok: false, reason: "missing-migration", rejected: object}
 *         | {ok: false, reason: "migration-failed", error: Error}}
 */
export function loadStore(storage = globalThis.localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) {
    return { ok: true, store: defaultStore() };
  }

  const parsedResult = parseStoredValue(raw);
  if (!parsedResult.ok) return parsedResult;
  const { parsed } = parsedResult;

  if (parsed.storeVersion < CURRENT_VERSION) {
    // This try/catch wraps only the backup step: backupBeforeMigrate and
    // pruneOldBackups call storage.setItem/removeItem, which can throw (quota
    // exceeded is the realistic case, and it's most likely to happen exactly here,
    // since a backup temporarily doubles this key's footprint). Without this
    // try/catch, loadStore's own documented "never throws" contract broke at the one
    // call site guarding the project's only backup mechanism (code review finding).
    // The migration loop itself has its own separate try/catch inside
    // migrateParsedStore (below, called unwrapped a few lines down) -- Phase 6.7's
    // extraction moved it out of this block, so don't assume an exception thrown by
    // a future migrate() function is caught here too (code review finding: this
    // comment previously claimed "the whole migration path is wrapped," which
    // stopped being true once the loop moved).
    try {
      backupBeforeMigrate(storage, raw, parsed.storeVersion);
      pruneOldBackups(storage, parsed.storeVersion);
    } catch (error) {
      return { ok: false, reason: "migration-failed", error };
    }
  }

  return migrateParsedStore(parsed);
}

/**
 * Parses and validates an uploaded backup file's text (the counterpart to
 * `exportStoreAsJson`, SCHEMA.md finding #9's restore half) into a store ready to
 * pass to `saveStore`. Never throws, same tagged-result contract as `loadStore` --
 * a caller that only ever handled `loadStore`'s result shape already knows how to
 * handle this one.
 *
 * Deliberately does NOT write to storage itself, and does NOT run
 * `backupBeforeMigrate`/`pruneOldBackups` -- those exist to protect the live
 * localStorage value during an *automatic* migration; an imported file has no
 * live value in that sense to protect, and the uploaded file itself is already
 * the user's out-of-band backup (SCHEMA.md finding #9). The caller decides
 * whether/when to actually call `saveStore(result.store)` -- this project's
 * "restore" flow does that only after the person confirms an explicit warning
 * that it replaces whatever's currently saved on this device (session owner's
 * call, 2026-08-18: replace, not merge -- merging progress from two devices is
 * a separate, harder problem, not part of this feature).
 *
 * @param {string} jsonText
 * @returns {{ok: true, store: object}
 *         | {ok: false, reason: "unreadable", raw: string}
 *         | {ok: false, reason: "future-version", rejected: object}
 *         | {ok: false, reason: "missing-migration", rejected: object}
 *         | {ok: false, reason: "migration-failed", error: Error}}
 */
export function importStoreFromJson(jsonText) {
  const parsedResult = parseStoredValue(jsonText);
  if (!parsedResult.ok) return parsedResult;
  return migrateParsedStore(parsedResult.parsed);
}

/**
 * Saves the progress store. Never throws -- a failed write (e.g. quota exceeded)
 * returns a tagged failure instead of discarding the caller's data silently
 * (SCHEMA.md finding #6).
 *
 * This performs an unconditional whole-object overwrite -- still exactly the shape
 * SCHEMA.md's finding #2 warns against in isolation. What makes it safe in practice is
 * how it's called: the attempt-lifecycle functions below take the freshest in-memory
 * store, mutate one attempt, and the caller saves immediately after -- there's no
 * separate cross-tab reconciliation step folded into saveStore itself. See
 * `handleStorageEvent` for the read side of that safety.
 *
 * Rejects a store whose storeVersion isn't the current version rather than writing
 * it silently: saving a mismatched storeVersion would make the very next loadStore
 * call reject the data as unreadable or future-version, discovered only on the next
 * load with no signal at write time (code review finding).
 */
export function saveStore(store, storage = globalThis.localStorage) {
  if (!store || store.storeVersion !== CURRENT_VERSION) {
    return { ok: false, reason: "invalid-store-version" };
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "write-failed", error };
  }
}

/**
 * Serializes the whole store to a downloadable JSON file (SCHEMA.md finding #9) --
 * the cheapest available mitigation against cross-tab loss, storage failures, and a
 * person clearing site data by hand, since none of those leave any other recovery
 * path. Pure and DOM-free (no Blob/anchor here) so it's testable under Node; the
 * caller turns {filename, content} into an actual download.
 *
 * Colons in an ISO timestamp aren't safe in filenames on every OS, so they're
 * replaced with "-" before use.
 */
export function exportStoreAsJson(store, { now = () => new Date() } = {}) {
  const timestamp = now().toISOString().replace(/:/g, "-");
  return {
    filename: `praxis-practice-progress-${timestamp}.json`,
    content: JSON.stringify(store, null, 2),
  };
}

/**
 * A short, human-readable summary of a store's contents -- attempt count and
 * distinct-questions-with-history count. Exists as an exported helper (rather than
 * inline UI code) so the restore-confirmation flow (Phase 6.7) can describe both the
 * store about to be overwritten AND the incoming file's own contents with the same
 * logic, and so it's unit-testable independent of any page (code review finding: this
 * was originally written inline in test.html, reachable by only one of the two stores
 * it needed to describe).
 *
 * @param {{attempts: object[], questionHistory: object}} store
 * @returns {{attempts: number, questionsWithHistory: number}}
 */
export function summarizeStore(store) {
  return {
    attempts: store.attempts.length,
    questionsWithHistory: Object.keys(store.questionHistory).length,
  };
}

// -- Attempt lifecycle (SCHEMA.md §2.8) ---------------------------------------------

function findAttemptIndex(store, attemptId) {
  return store.attempts.findIndex((a) => a.id === attemptId);
}

/**
 * Shared precondition check for every write that mutates an existing attempt by id
 * (`recordAnswer`, `updateAnswer`, `completeAttempt`) -- locates the attempt and
 * confirms it's still `in-progress`, in the one place, so the three call sites can't
 * drift out of sync on what "not found" or "not in-progress" means (code review
 * finding: this exact four-line preamble had been copied into all three). Distinct
 * from the exported `findInProgressAttempt` below, which looks up by `testCode` for
 * S2's résumé entry point, not by `attemptId`.
 *
 * @returns {{ok: true, index: number, attempt: object} | {ok: false, reason: "not-found" | "not-in-progress"}}
 */
function requireInProgressAttempt(store, attemptId) {
  const index = findAttemptIndex(store, attemptId);
  if (index === -1) return { ok: false, reason: "not-found" };
  const attempt = store.attempts[index];
  if (attempt.status !== "in-progress") return { ok: false, reason: "not-in-progress" };
  return { ok: true, index, attempt };
}

/**
 * Starts a new attempt: appends it to store.attempts with status "in-progress".
 * Marks any other in-progress attempt for the same testCode "abandoned" first --
 * "at most one in-progress attempt exists per test code at a time" (SCHEMA.md §2.8).
 *
 * `questionOrder` (D-19) is the caller's responsibility to supply -- it's the exact
 * drawn question/option order from assembleForm, captured once here so résumé can
 * replay it rather than re-running form assembly's random draw.
 *
 * Does not save -- the caller calls saveStore(result.store), matching loadStore's own
 * "load/mutate/save are separate steps" contract.
 *
 * @returns {{store: object, attempt: object}}
 */
export function startAttempt(
  store,
  { testCode, mode, timeLimitMinutes, formLength, categoryTargets, shortfalls, questionOrder },
  { now = () => new Date() } = {},
) {
  const attempts = store.attempts.map((a) =>
    a.testCode === testCode && a.status === "in-progress" ? { ...a, status: "abandoned" } : a,
  );
  const attempt = {
    id: `att-${now().getTime()}`,
    testCode,
    mode,
    status: "in-progress",
    startedAt: now().toISOString(),
    finishedAt: null,
    timeLimitMinutes,
    formLength,
    categoryTargets,
    shortfalls,
    questionOrder,
    answers: [],
  };
  return { store: { ...store, attempts: [...attempts, attempt] }, attempt };
}

/**
 * Appends one answer to an in-progress attempt -- the real per-answer write cadence
 * (SCHEMA.md §2.8 findings #1/#10): the caller saves after every call, not just at the
 * end, so a tab closed mid-test doesn't lose anything already answered.
 *
 * Tagged failure rather than a throw for "attemptId not found" and "attempt not
 * in-progress" -- both are real, expected-in-practice cases (a stale reference after
 * cross-tab reconciliation, or something still trying to answer a completed/abandoned
 * attempt), not programmer errors.
 *
 * Idempotent against a duplicate write for the same `questionId` -- the realistic
 * trigger is two tabs both resuming the *same* in-progress attempt and answering
 * within the same round trip, before either has processed the other's `storage`
 * event (code review finding: `handleStorageEvent`'s reload-on-event narrows that
 * race but can't fully close it, since it's inherently asynchronous). Without this
 * guard, a duplicate entry would double-count that question in scoreAttempt's total
 * and apply a spaced-repetition update to it twice (Phase 2.3's `recordQuestionHistory`
 * below).
 *
 * `recorded` tells the caller whether this call actually appended an answer (`true`)
 * or hit the idempotent no-op path (`false`) -- an explicit signal, rather than
 * leaving the caller to infer it from whether `result.store` is a new object
 * reference (code review finding: relying on reference identity is an implicit
 * contract this function doesn't otherwise promise to keep).
 *
 * `priorHistory` (Phase 3.1, N-6) is the caller's snapshot of this question's
 * `questionHistory` entry from *before* this answer's own spaced-repetition update --
 * `null` if none existed yet. It exists purely so a later review-pass edit
 * (`updateAnswer` + a fresh `updateHistory` call) can recompute the SM-2 update from
 * the same baseline this answer started from, instead of stacking a second review
 * event on top of the first. Not read by anything in this file; stored as-is and left
 * untouched by `updateAnswer`'s shallow merge.
 *
 * @param {{questionId: string, chosen: string[], correct: boolean, elapsedMs: number, flagged: boolean, priorHistory: object | null}} answer
 * @returns {{ok: true, store: object, recorded: boolean} | {ok: false, reason: "not-found" | "not-in-progress"}}
 */
export function recordAnswer(store, attemptId, answer) {
  const found = requireInProgressAttempt(store, attemptId);
  if (!found.ok) return found;
  const { index, attempt } = found;

  if (attempt.answers.some((a) => a.questionId === answer.questionId)) {
    return { ok: true, store, recorded: false }; // already recorded (e.g. a cross-tab race) -- not an error
  }

  const attempts = [...store.attempts];
  attempts[index] = { ...attempt, answers: [...attempt.answers, answer] };
  return { ok: true, store: { ...store, attempts }, recorded: true };
}

/**
 * Replaces an already-recorded answer's editable fields during the end-of-run review
 * pass (SCHEMA.md §2.8, Phase 3.1, D-11) -- distinct from `recordAnswer`'s append-only,
 * idempotent-on-duplicate semantics above, which stays exactly as-is for the live
 * per-question answering path (its cross-tab race guard would otherwise silently
 * swallow every real review-pass edit as a "duplicate").
 *
 * Requires the attempt to still be `in-progress` (the review pass happens before
 * scoring, same precondition `recordAnswer` enforces) and the questionId to already
 * have a recorded answer -- reopening a question that was never answered isn't a
 * review-pass case in this project's current forward-only flow (SCHEMA.md's S3: an
 * answer is always recorded before the run can reach its last question).
 *
 * `updates` is shallow-merged onto the existing answer record, so a caller can change
 * just `flagged`, just `chosen`/`correct` together, or both, without needing to resend
 * fields it isn't touching (e.g. `elapsedMs`, which review edits leave untouched --
 * it's the time spent on the original answer, not the edit).
 *
 * @param {string} questionId
 * @param {{chosen?: string[], correct?: boolean, flagged?: boolean}} updates
 * @returns {{ok: true, store: object} | {ok: false, reason: "not-found" | "not-in-progress" | "answer-not-found"}}
 */
export function updateAnswer(store, attemptId, questionId, updates) {
  const found = requireInProgressAttempt(store, attemptId);
  if (!found.ok) return found;
  const { index, attempt } = found;

  const answerIndex = attempt.answers.findIndex((a) => a.questionId === questionId);
  if (answerIndex === -1) return { ok: false, reason: "answer-not-found" };

  const answers = [...attempt.answers];
  answers[answerIndex] = { ...answers[answerIndex], ...updates };

  const attempts = [...store.attempts];
  attempts[index] = { ...attempt, answers };
  return { ok: true, store: { ...store, attempts } };
}

/**
 * Folds one question's updated spaced-repetition history (SCHEMA.md §2.8, Phase 2.3's
 * `js/srs.js`'s `updateHistory`) into the store -- the `questionHistory` counterpart to
 * `recordAnswer`'s attempt-record write, kept as its own store.js function rather than
 * inlined at the call site so the store's shape (spread `store`, spread
 * `questionHistory`, key by `questionId`) stays owned in one place alongside
 * `startAttempt`/`recordAnswer`/`completeAttempt`, matching this file's own established
 * pattern for store mutations (code review finding: the call site had reimplemented
 * this ad hoc). Defaults a missing `questionHistory` to `{}` rather than throwing --
 * defensive against a store manually edited in devtools, matching this file's existing
 * tolerance for corrupted/partial stored data.
 *
 * Does not save -- same "load/mutate/save are separate steps" contract as every other
 * function here.
 *
 * @param {string} questionId
 * @param {{seen: number, correct: number, lastSeenAt: string, dueAt: string, intervalDays: number, ease: number}} entry
 * @returns {object} the updated store
 */
export function recordQuestionHistory(store, questionId, entry) {
  return {
    ...store,
    questionHistory: { ...(store.questionHistory ?? {}), [questionId]: entry },
  };
}

/**
 * Marks an attempt "completed" with a finishedAt timestamp. No score is stored on the
 * attempt itself -- S4 recomputes it from `answers` (SCHEMA.md §2.7's "self-verifies
 * ... rather than trusting [a] recorded [value] blindly" principle, applied to the
 * score the same way it already applies to shortfalls).
 *
 * @returns {{ok: true, store: object} | {ok: false, reason: "not-found" | "not-in-progress"}}
 */
export function completeAttempt(store, attemptId, { now = () => new Date() } = {}) {
  const found = requireInProgressAttempt(store, attemptId);
  if (!found.ok) return found;
  const { index, attempt } = found;

  const attempts = [...store.attempts];
  attempts[index] = { ...attempt, status: "completed", finishedAt: now().toISOString() };
  return { ok: true, store: { ...store, attempts } };
}

/** S2's résumé lookup (SCHEMA.md §2.8): the in-progress attempt for a test code, if any. */
export function findInProgressAttempt(store, testCode) {
  return store.attempts.find((a) => a.testCode === testCode && a.status === "in-progress");
}

/** S4's lookup by attempt id. */
export function findAttempt(store, attemptId) {
  return store.attempts.find((a) => a.id === attemptId);
}

/**
 * S6 dashboard's first-vs-latest comparison: the earliest and most recent
 * *completed* attempts for a test code. In-progress and abandoned attempts are
 * excluded -- a comparison against an attempt that never finished, or was
 * abandoned mid-run, isn't meaningful.
 *
 * Relies on `store.attempts` always being append-order (`startAttempt` only
 * ever does `[...attempts, attempt]`, never inserts or reorders), so the first
 * and last matches after filtering are already the earliest and most recent --
 * no date parsing needed, and so no risk of an unparseable `startedAt`
 * silently misordering the result the way a numeric sort comparator could.
 *
 * Deliberately dynamic rather than a stored "this is my final attempt" flag: a
 * later real-world attempt always becomes the new "latest" automatically,
 * rather than needing its own schema field and an explicit user action to set
 * (Phase 6.5 scope call).
 *
 * Returns the same attempt object for both `first` and `latest` when exactly
 * one completed attempt exists, and `{first: null, latest: null}` when none do
 * -- callers decide how to render either case, not this function.
 *
 * @param {object} store
 * @param {string} testCode
 * @returns {{first: object|null, latest: object|null}}
 */
export function findFirstAndLatestAttempts(store, testCode) {
  const completed = store.attempts.filter((a) => a.testCode === testCode && a.status === "completed");
  if (completed.length === 0) return { first: null, latest: null };
  return { first: completed[0], latest: completed[completed.length - 1] };
}

/**
 * "Clear performance data" (test.html, session owner request): erases one test's
 * attempts and spaced-repetition history, so it looks brand new -- without touching
 * any other test's data in this same shared store. The real trigger: a full-length
 * attempt's timer expires while the person is away (SCHEMA.md's finding #10 path),
 * silently crediting only the few questions answered before they left and permanently
 * becoming that test's "first attempt" on the dashboard (Phase 6.5) with no way back
 * to a genuinely fresh start.
 *
 * `attempts` are already tagged with `testCode` (SCHEMA.md §2.8), so those filter
 * directly. `questionHistory` is not test-scoped in the store -- it's a flat map keyed
 * by raw question id (Phase 2.3) -- so the caller passes every question id belonging
 * to this test's bank (`bank.questions.map(q => q.id)`), including retired ones, so a
 * retired question's stale history doesn't survive the clear either.
 *
 * @param {object} store
 * @param {string} testCode
 * @param {string[]} questionIds
 * @returns {object} a new store, structurally sharing everything not filtered out
 */
export function clearTestData(store, testCode, questionIds) {
  const idsToClear = new Set(questionIds);
  const attempts = store.attempts.filter((a) => a.testCode !== testCode);
  const questionHistory = Object.fromEntries(
    Object.entries(store.questionHistory).filter(([id]) => !idsToClear.has(id)),
  );
  return { ...store, attempts, questionHistory };
}

// -- Cross-tab reconciliation (SCHEMA.md §2.8 finding #2) ---------------------------

/**
 * Reacts to the browser's `storage` event: re-loads the store fresh from `storage`
 * rather than trusting this tab's in-memory copy, since another tab may have written
 * since this tab last read. Ignores events for unrelated keys (this app's key
 * namespace also uses `.backup.v*` suffixes for migration backups, which shouldn't
 * trigger a reload) by returning `null`.
 *
 * Reuses loadStore rather than parsing `event.newValue` itself, so this goes through
 * exactly the same validation/migration path a normal load does -- and because by the
 * time the event fires, `storage.getItem` already reflects the committed value, so
 * there's nothing `event.newValue` would tell us that a fresh load doesn't.
 *
 * Deliberately simpler than SCHEMA.md §2.8's literal "or, if the current tab has
 * unsaved in-progress work, warns before overwriting": with every answer now written
 * immediately (recordAnswer's per-answer cadence), there generally is no unsaved
 * in-memory-only work left to protect by the time another tab's write could arrive.
 * The caller's job is to resync its in-memory store reference to the reconciled
 * result and, if the attempt it's currently running is no longer that attempt's
 * `status: "in-progress"` in the fresh copy, stop and say why -- not to merge
 * conflicting writes.
 *
 * @returns {ReturnType<typeof loadStore> | null}
 */
export function handleStorageEvent(event, storage = globalThis.localStorage) {
  if (event.key !== STORAGE_KEY) return null;
  return loadStore(storage);
}

// Exposed for tools/test-store.mjs to exercise the backup/retention mechanism
// directly, independent of a real migration existing yet.
export const _internal = { backupBeforeMigrate, pruneOldBackups };
