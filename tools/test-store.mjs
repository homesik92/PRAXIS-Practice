// Unit tests for js/store.js. Pure Node, no dependencies. Run: node tools/test-store.mjs
//
// Node has no localStorage by default, so these tests use a minimal in-memory mock
// implementing the real Storage interface (getItem/setItem/removeItem/length/key) --
// store.js is written against that interface, not against `window` directly, so the
// same code path runs under test and in the browser.
import assert from "node:assert/strict";
import { CURRENT_VERSION, STORAGE_KEY, defaultStore, loadStore, saveStore, _internal } from "../js/store.js";

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
