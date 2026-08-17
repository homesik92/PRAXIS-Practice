// Unit tests for js/store.js. Pure Node, no dependencies. Run: node tools/test-store.mjs
//
// Node has no localStorage by default, so these tests use a minimal in-memory mock
// implementing the real Storage interface (getItem/setItem/removeItem/length/key) --
// store.js is written against that interface, not against `window` directly, so the
// same code path runs under test and in the browser.
import assert from "node:assert/strict";
import {
  CURRENT_VERSION,
  STORAGE_KEY,
  defaultStore,
  loadStore,
  saveStore,
  startAttempt,
  recordAnswer,
  recordQuestionHistory,
  completeAttempt,
  findInProgressAttempt,
  findAttempt,
  handleStorageEvent,
  _internal,
} from "../js/store.js";

class MockStorage {
  constructor() {
    this._data = new Map();
  }
  getItem(key) {
    return this._data.has(key) ? this._data.get(key) : null;
  }
  setItem(key, value) {
    this._data.set(key, String(value));
  }
  removeItem(key) {
    this._data.delete(key);
  }
  get length() {
    return this._data.size;
  }
  key(index) {
    return [...this._data.keys()][index] ?? null;
  }
}

class WriteThrowingStorage extends MockStorage {
  setItem() {
    throw new Error("QuotaExceededError");
  }
}

// Throws only when setItem targets a specific key -- lets a test set up initial
// state successfully, then simulate quota-exceeded on one particular write (e.g. the
// backup write specifically) rather than every write.
class ThrowsOnKeyStorage extends MockStorage {
  constructor(throwingKey) {
    super();
    this._throwingKey = throwingKey;
  }
  setItem(key, value) {
    if (key === this._throwingKey) throw new Error("QuotaExceededError");
    super.setItem(key, value);
  }
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test("loadStore with no existing key returns a fresh default store", () => {
  const storage = new MockStorage();
  const result = loadStore(storage);
  assert.equal(result.ok, true);
  assert.equal(result.store.storeVersion, CURRENT_VERSION);
  assert.deepEqual(result.store.attempts, []);
  assert.deepEqual(result.store.questionHistory, {});
});

test("saveStore then loadStore round-trips the same data", () => {
  const storage = new MockStorage();
  const store = { storeVersion: CURRENT_VERSION, attempts: [{ id: "att-1" }], questionHistory: {} };
  const saveResult = saveStore(store, storage);
  assert.equal(saveResult.ok, true);
  const loadResult = loadStore(storage);
  assert.equal(loadResult.ok, true);
  assert.deepEqual(loadResult.store, store);
});

test("corrupted JSON is reported, not silently reinitialized", () => {
  const storage = new MockStorage();
  storage.setItem(STORAGE_KEY, "{not valid json");
  const result = loadStore(storage);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unreadable");
});

test("corrupted JSON is left untouched in storage -- devtools-recoverable", () => {
  const storage = new MockStorage();
  const corrupted = "{not valid json, definitely broken";
  storage.setItem(STORAGE_KEY, corrupted);
  loadStore(storage);
  assert.equal(storage.getItem(STORAGE_KEY), corrupted);
});

test("a value with no storeVersion field is reported as unreadable", () => {
  const storage = new MockStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ attempts: [] }));
  const result = loadStore(storage);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unreadable");
});

test("a store from a newer version is never migrated downward", () => {
  const storage = new MockStorage();
  const future = { storeVersion: CURRENT_VERSION + 1, attempts: ["from the future"], questionHistory: {} };
  storage.setItem(STORAGE_KEY, JSON.stringify(future));
  const result = loadStore(storage);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "future-version");
});

test("a future-version store is left completely untouched in storage", () => {
  const storage = new MockStorage();
  const raw = JSON.stringify({ storeVersion: CURRENT_VERSION + 1, attempts: [], questionHistory: {} });
  storage.setItem(STORAGE_KEY, raw);
  loadStore(storage);
  assert.equal(storage.getItem(STORAGE_KEY), raw);
});

test("a write failure (e.g. quota exceeded) is reported, not thrown", () => {
  const storage = new WriteThrowingStorage();
  const result = saveStore(defaultStore(), storage);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "write-failed");
});

test("backupBeforeMigrate copies the exact prior raw value to a versioned backup key", () => {
  const storage = new MockStorage();
  const raw = '{"storeVersion":1,"attempts":[],"questionHistory":{}}';
  _internal.backupBeforeMigrate(storage, raw, 1);
  assert.equal(storage.getItem(`${STORAGE_KEY}.backup.v1`), raw);
});

test("pruneOldBackups keeps only the specified version's backup", () => {
  const storage = new MockStorage();
  storage.setItem(`${STORAGE_KEY}.backup.v1`, "old-1");
  storage.setItem(`${STORAGE_KEY}.backup.v2`, "old-2");
  storage.setItem(`${STORAGE_KEY}.backup.v3`, "keep-me");
  storage.setItem("unrelated-key", "should survive");
  _internal.pruneOldBackups(storage, 3);
  assert.equal(storage.getItem(`${STORAGE_KEY}.backup.v1`), null);
  assert.equal(storage.getItem(`${STORAGE_KEY}.backup.v2`), null);
  assert.equal(storage.getItem(`${STORAGE_KEY}.backup.v3`), "keep-me");
  assert.equal(storage.getItem("unrelated-key"), "should survive");
});

// --- Regression tests for the code-review pass on PR #14 ---

test("NaN storeVersion is rejected as unreadable, not silently accepted (regression)", () => {
  // typeof NaN === "number", and NaN > / < CURRENT_VERSION are both false, so a naive
  // `typeof x !== "number"` guard alone lets this fall through to ok:true.
  const storage = new MockStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ storeVersion: NaN, attempts: [], questionHistory: {} }));
  const result = loadStore(storage);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unreadable");
});

test("loadStore's migration path exercises backup + prune end-to-end via a real call (regression)", () => {
  // migrations is empty, so a storeVersion below CURRENT_VERSION always hits
  // "missing-migration" today -- this still exercises the orchestration (backup,
  // then prune, then loop-entry) that no test previously drove through loadStore
  // itself, only through _internal directly.
  const storage = new MockStorage();
  const old = { storeVersion: 0, attempts: ["old data"], questionHistory: {} };
  const raw = JSON.stringify(old);
  storage.setItem(STORAGE_KEY, raw);
  const result = loadStore(storage);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "missing-migration");
  assert.equal(storage.getItem(`${STORAGE_KEY}.backup.v0`), raw);
});

test("prune still runs when a migration is missing partway through the chain (regression)", () => {
  // Previously pruneOldBackups only ran after the full migration loop succeeded, so
  // hitting a missing migration left old backup keys un-pruned indefinitely.
  const storage = new MockStorage();
  storage.setItem(`${STORAGE_KEY}.backup.v-2`, "should be pruned"); // a stray older backup
  const raw = JSON.stringify({ storeVersion: 0, attempts: [], questionHistory: {} });
  storage.setItem(STORAGE_KEY, raw);
  loadStore(storage);
  assert.equal(storage.getItem(`${STORAGE_KEY}.backup.v-2`), null);
  assert.equal(storage.getItem(`${STORAGE_KEY}.backup.v0`), raw);
});

test("a storage failure during the migration path is reported, not thrown (regression)", () => {
  // backupBeforeMigrate/pruneOldBackups call storage.setItem/removeItem, which can
  // throw (quota exceeded) -- this path previously had no try/catch around it,
  // breaking loadStore's own documented "never throws" contract.
  const backupKey = `${STORAGE_KEY}.backup.v0`;
  const storage = new ThrowsOnKeyStorage(backupKey);
  storage.setItem(STORAGE_KEY, JSON.stringify({ storeVersion: 0, attempts: [], questionHistory: {} }));
  assert.doesNotThrow(() => {
    const result = loadStore(storage);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "migration-failed");
  });
});

test("rejected field carries the offending data for future-version (regression)", () => {
  const storage = new MockStorage();
  const future = { storeVersion: CURRENT_VERSION + 1, attempts: ["future"], questionHistory: {} };
  storage.setItem(STORAGE_KEY, JSON.stringify(future));
  const result = loadStore(storage);
  assert.deepEqual(result.rejected, future);
  assert.equal(result.store, undefined); // never the same key as the success shape
});

test("saveStore rejects a store with the wrong storeVersion instead of writing it (regression)", () => {
  const storage = new MockStorage();
  const result = saveStore({ storeVersion: 99, attempts: [], questionHistory: {} }, storage);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid-store-version");
  assert.equal(storage.getItem(STORAGE_KEY), null); // nothing was written
});

test("saveStore rejects a store with a missing storeVersion instead of writing it (regression)", () => {
  const storage = new MockStorage();
  const result = saveStore({ attempts: [], questionHistory: {} }, storage);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid-store-version");
});

test("loading twice without saving in between is idempotent (documents the caller contract)", () => {
  const storage = new MockStorage();
  const raw = JSON.stringify({ storeVersion: 0, attempts: [], questionHistory: {} });
  storage.setItem(STORAGE_KEY, raw);
  const first = loadStore(storage);
  const second = loadStore(storage);
  assert.deepEqual(first, second);
  // Still exactly one backup key -- re-running backup+prune twice didn't accumulate.
  assert.equal(storage.getItem(`${STORAGE_KEY}.backup.v0`), raw);
});

// --- Attempt lifecycle (Phase 2.2) ---

const fixedNow = (iso) => ({ now: () => new Date(iso) });
const startParams = {
  testCode: "5165",
  mode: "test",
  timeLimitMinutes: 15,
  formLength: 5,
  categoryTargets: [{ categoryId: "I", target: 2 }],
  shortfalls: [],
  questionOrder: [{ questionId: "5165-0001", optionOrder: ["b", "a", "c", "d"] }],
};

test("startAttempt appends a new in-progress attempt with the given fields", () => {
  const { store, attempt } = startAttempt(defaultStore(), startParams, fixedNow("2026-08-17T10:00:00.000Z"));
  assert.equal(store.attempts.length, 1);
  assert.equal(attempt.status, "in-progress");
  assert.equal(attempt.startedAt, "2026-08-17T10:00:00.000Z");
  assert.equal(attempt.finishedAt, null);
  assert.equal(attempt.testCode, "5165");
  assert.deepEqual(attempt.answers, []);
  assert.deepEqual(attempt.questionOrder, startParams.questionOrder);
  assert.deepEqual(attempt.categoryTargets, startParams.categoryTargets);
});

test("startAttempt marks a prior in-progress attempt for the same testCode abandoned", () => {
  const first = startAttempt(defaultStore(), startParams, fixedNow("2026-08-17T10:00:00.000Z"));
  const second = startAttempt(first.store, startParams, fixedNow("2026-08-17T11:00:00.000Z"));
  const priorInSecondStore = second.store.attempts.find((a) => a.id === first.attempt.id);
  assert.equal(priorInSecondStore.status, "abandoned");
  assert.equal(second.attempt.status, "in-progress");
  assert.equal(second.store.attempts.length, 2);
});

test("startAttempt leaves an in-progress attempt for a different testCode untouched", () => {
  const first = startAttempt(defaultStore(), startParams, fixedNow("2026-08-17T10:00:00.000Z"));
  const second = startAttempt(
    first.store,
    { ...startParams, testCode: "5101" },
    fixedNow("2026-08-17T11:00:00.000Z"),
  );
  const priorInSecondStore = second.store.attempts.find((a) => a.id === first.attempt.id);
  assert.equal(priorInSecondStore.status, "in-progress");
});

test("recordAnswer appends to the matching attempt's answers array", () => {
  const { store, attempt } = startAttempt(defaultStore(), startParams, fixedNow("2026-08-17T10:00:00.000Z"));
  const answer = { questionId: "5165-0001", chosen: ["b"], correct: true, elapsedMs: 4200, flagged: false };
  const result = recordAnswer(store, attempt.id, answer);
  assert.equal(result.ok, true);
  assert.deepEqual(result.store.attempts[0].answers, [answer]);
});

test("recordAnswer reports recorded: true when it actually appends an answer", () => {
  const { store, attempt } = startAttempt(defaultStore(), startParams, fixedNow("2026-08-17T10:00:00.000Z"));
  const result = recordAnswer(store, attempt.id, { questionId: "5165-0001", chosen: ["b"] });
  assert.equal(result.recorded, true);
});

test("recordAnswer is idempotent for a duplicate answer to the same questionId (cross-tab race guard)", () => {
  const { store, attempt } = startAttempt(defaultStore(), startParams, fixedNow("2026-08-17T10:00:00.000Z"));
  const first = { questionId: "5165-0001", chosen: ["b"], correct: true, elapsedMs: 4200, flagged: false };
  const afterFirst = recordAnswer(store, attempt.id, first);
  const duplicate = { questionId: "5165-0001", chosen: ["a"], correct: false, elapsedMs: 900, flagged: false };
  const afterDuplicate = recordAnswer(afterFirst.store, attempt.id, duplicate);
  assert.equal(afterDuplicate.ok, true);
  // Exactly one answer for that question survives -- the first, not the duplicate.
  assert.deepEqual(afterDuplicate.store.attempts[0].answers, [first]);
});

test("recordAnswer reports recorded: false on the idempotent duplicate-write path", () => {
  const { store, attempt } = startAttempt(defaultStore(), startParams, fixedNow("2026-08-17T10:00:00.000Z"));
  const first = { questionId: "5165-0001", chosen: ["b"] };
  const afterFirst = recordAnswer(store, attempt.id, first);
  const afterDuplicate = recordAnswer(afterFirst.store, attempt.id, { questionId: "5165-0001", chosen: ["a"] });
  assert.equal(afterDuplicate.recorded, false);
});

test("recordAnswer against an unknown attemptId reports not-found", () => {
  const result = recordAnswer(defaultStore(), "att-does-not-exist", { questionId: "x", chosen: ["a"] });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not-found");
});

test("recordAnswer against a completed attempt reports not-in-progress", () => {
  const { store, attempt } = startAttempt(defaultStore(), startParams, fixedNow("2026-08-17T10:00:00.000Z"));
  const { store: completedStore } = completeAttempt(store, attempt.id, fixedNow("2026-08-17T10:15:00.000Z"));
  const result = recordAnswer(completedStore, attempt.id, { questionId: "x", chosen: ["a"] });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not-in-progress");
});

test("recordQuestionHistory adds a new entry keyed by questionId", () => {
  const entry = { seen: 1, correct: 1, lastSeenAt: "x", dueAt: "y", intervalDays: 3, ease: 2.6 };
  const result = recordQuestionHistory(defaultStore(), "5165-0001", entry);
  assert.deepEqual(result.questionHistory, { "5165-0001": entry });
});

test("recordQuestionHistory replaces an existing entry for the same questionId without disturbing others", () => {
  const older = { seen: 1, correct: 0, lastSeenAt: "x", dueAt: "y", intervalDays: 1, ease: 2.3 };
  const other = { seen: 2, correct: 2, lastSeenAt: "a", dueAt: "b", intervalDays: 4, ease: 2.6 };
  const store = { ...defaultStore(), questionHistory: { "5165-0001": older, "5165-0002": other } };
  const newer = { seen: 2, correct: 1, lastSeenAt: "z", dueAt: "w", intervalDays: 2, ease: 2.4 };
  const result = recordQuestionHistory(store, "5165-0001", newer);
  assert.deepEqual(result.questionHistory, { "5165-0001": newer, "5165-0002": other });
});

test("recordQuestionHistory tolerates a missing questionHistory field rather than throwing", () => {
  const entry = { seen: 1, correct: 1, lastSeenAt: "x", dueAt: "y", intervalDays: 3, ease: 2.6 };
  const store = { storeVersion: CURRENT_VERSION, attempts: [] }; // no questionHistory key at all
  const result = recordQuestionHistory(store, "5165-0001", entry);
  assert.deepEqual(result.questionHistory, { "5165-0001": entry });
});

test("completeAttempt sets status completed and finishedAt, never touching answers already recorded", () => {
  const { store, attempt } = startAttempt(defaultStore(), startParams, fixedNow("2026-08-17T10:00:00.000Z"));
  const answered = recordAnswer(store, attempt.id, { questionId: "5165-0001", chosen: ["b"] });
  const result = completeAttempt(answered.store, attempt.id, fixedNow("2026-08-17T10:15:00.000Z"));
  assert.equal(result.ok, true);
  const completed = result.store.attempts[0];
  assert.equal(completed.status, "completed");
  assert.equal(completed.finishedAt, "2026-08-17T10:15:00.000Z");
  assert.equal(completed.answers.length, 1);
});

test("completeAttempt against an unknown attemptId reports not-found", () => {
  const result = completeAttempt(defaultStore(), "att-does-not-exist");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "not-found");
});

test("findInProgressAttempt returns the in-progress attempt for a test code, or undefined", () => {
  const { store, attempt } = startAttempt(defaultStore(), startParams, fixedNow("2026-08-17T10:00:00.000Z"));
  assert.equal(findInProgressAttempt(store, "5165").id, attempt.id);
  assert.equal(findInProgressAttempt(store, "5101"), undefined);
});

test("findInProgressAttempt does not return a completed attempt", () => {
  const { store, attempt } = startAttempt(defaultStore(), startParams, fixedNow("2026-08-17T10:00:00.000Z"));
  const { store: completedStore } = completeAttempt(store, attempt.id, fixedNow("2026-08-17T10:15:00.000Z"));
  assert.equal(findInProgressAttempt(completedStore, "5165"), undefined);
});

test("findAttempt looks up by id regardless of status", () => {
  const { store, attempt } = startAttempt(defaultStore(), startParams, fixedNow("2026-08-17T10:00:00.000Z"));
  assert.equal(findAttempt(store, attempt.id).id, attempt.id);
  assert.equal(findAttempt(store, "att-does-not-exist"), undefined);
});

// --- Cross-tab reconciliation (finding #2) ---

test("handleStorageEvent ignores an event for an unrelated key", () => {
  const storage = new MockStorage();
  const result = handleStorageEvent({ key: "some-other-app-key" }, storage);
  assert.equal(result, null);
});

test("handleStorageEvent reloads the store fresh via loadStore for the app's own key", () => {
  const storage = new MockStorage();
  const { store } = startAttempt(defaultStore(), startParams, fixedNow("2026-08-17T10:00:00.000Z"));
  saveStore(store, storage);
  const result = handleStorageEvent({ key: STORAGE_KEY }, storage);
  assert.equal(result.ok, true);
  assert.equal(result.store.attempts.length, 1);
});

test("handleStorageEvent surfaces a corrupted external write the same way loadStore would", () => {
  const storage = new MockStorage();
  storage.setItem(STORAGE_KEY, "{not valid json");
  const result = handleStorageEvent({ key: STORAGE_KEY }, storage);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unreadable");
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
