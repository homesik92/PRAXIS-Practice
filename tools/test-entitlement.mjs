// Unit tests for js/entitlement.js. Pure Node, no dependencies. Run: node tools/test-entitlement.mjs
import assert from "node:assert/strict";
import { isNativeContext, isUnlocked, lockedControls } from "../js/entitlement.js";
import { defaultStore, recordCategoryTrialUsed } from "../js/store.js";

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function params(query) {
  return new URLSearchParams(query);
}

// --- isNativeContext / isUnlocked -----------------------------------------------

test("isNativeContext is false when unlocked is absent (the plain public site)", () => {
  assert.equal(isNativeContext(params("")), false);
  assert.equal(isNativeContext(params("code=5165")), false);
});

test("isNativeContext is true whenever unlocked is present, regardless of its value", () => {
  assert.equal(isNativeContext(params("unlocked=1")), true);
  assert.equal(isNativeContext(params("unlocked=0")), true);
});

test("isUnlocked is true for unlocked=1 and false for unlocked=0", () => {
  assert.equal(isUnlocked(params("unlocked=1")), true);
  assert.equal(isUnlocked(params("unlocked=0")), false);
});

test("isUnlocked defaults to true when unlocked is absent -- matches 'nothing is locked' on the public site", () => {
  assert.equal(isUnlocked(params("")), true);
});

// --- lockedControls ---------------------------------------------------------------
// D-19/D-46: the public-site case (isNativeContext false) must resolve every control
// to unlocked, regardless of what the store contains -- this is the load-bearing case
// behind #131's "the public website is unaffected by construction."

test("lockedControls: on the public site (no unlocked param), nothing is ever locked", () => {
  const store = defaultStore();
  const result = lockedControls(store, "5165", params(""), "I");
  assert.deepEqual(result, { fullTest: false, practiceTopic: false, reviewTopic: false, categoryTest: false });
});

test("lockedControls: unlocked=1 (purchased subject) -- nothing is locked, even if a topic's trial is used", () => {
  const store = recordCategoryTrialUsed(defaultStore(), "5165", "I");
  const result = lockedControls(store, "5165", params("unlocked=1"), "I");
  assert.deepEqual(result, { fullTest: false, practiceTopic: false, reviewTopic: false, categoryTest: false });
});

test("lockedControls: unlocked=0, topic's free trial not yet used -- only Category test stays open", () => {
  const store = defaultStore();
  const result = lockedControls(store, "5165", params("unlocked=0"), "I");
  assert.deepEqual(result, { fullTest: true, practiceTopic: true, reviewTopic: true, categoryTest: false });
});

test("lockedControls: unlocked=0, topic's free trial already used -- Category test locks too", () => {
  const store = recordCategoryTrialUsed(defaultStore(), "5165", "I");
  const result = lockedControls(store, "5165", params("unlocked=0"), "I");
  assert.deepEqual(result, { fullTest: true, practiceTopic: true, reviewTopic: true, categoryTest: true });
});

test("lockedControls: unlocked=0, a *different* topic's trial being used doesn't lock this one", () => {
  const store = recordCategoryTrialUsed(defaultStore(), "5165", "I");
  const result = lockedControls(store, "5165", params("unlocked=0"), "II");
  assert.equal(result.categoryTest, false);
});

test("lockedControls: unlocked=0, a trial used under a different test code doesn't lock this subject's topic", () => {
  const store = recordCategoryTrialUsed(defaultStore(), "5101", "I");
  const result = lockedControls(store, "5165", params("unlocked=0"), "I");
  assert.equal(result.categoryTest, false);
});

test("lockedControls: unlocked=0, no topic selected yet -- Category test locks (nothing to be free for)", () => {
  const store = defaultStore();
  const result = lockedControls(store, "5165", params("unlocked=0"), null);
  assert.equal(result.categoryTest, true);
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
