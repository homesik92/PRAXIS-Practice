// Unit tests for js/entitlement.js. Pure Node, no dependencies. Run: node tools/test-entitlement.mjs
import assert from "node:assert/strict";
import { isNativeContext, isUnlocked, lockedControls, withEntitlementParam, isRunLocked } from "../js/entitlement.js";
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

// --- withEntitlementParam -----------------------------------------------------------
// The lock signal only lives on the page's own URL, so every in-app link has to carry
// it forward -- a link that drops it lands on a page that thinks it's the public site.

test("withEntitlementParam: on the public site (no unlocked param), the href is returned unchanged", () => {
  assert.equal(withEntitlementParam("test.html?code=5165", params("code=5165")), "test.html?code=5165");
});

test("withEntitlementParam: carries unlocked=0 forward onto an href that already has a query", () => {
  assert.equal(
    withEntitlementParam("run.html?code=5165&mode=test", params("code=5165&unlocked=0")),
    "run.html?code=5165&mode=test&unlocked=0"
  );
});

test("withEntitlementParam: carries unlocked=1 forward onto an href with no query", () => {
  assert.equal(withEntitlementParam("results.html", params("unlocked=1")), "results.html?unlocked=1");
});

// --- isRunLocked ----------------------------------------------------------------------
// run.html's own gate -- any link into it (test.html's controls, its dashboard
// shortcuts, run.html's "Try again", results.html's weak-spot links) is checked here,
// at the destination, rather than trusting each link site to have locked itself.

test("isRunLocked: on the public site, no mode is ever locked", () => {
  const store = recordCategoryTrialUsed(defaultStore(), "5165", "I");
  for (const query of ["mode=test", "mode=study", "mode=study&due=1", "mode=drill&category=I", "mode=drill&category=I&timed=1"]) {
    assert.equal(isRunLocked(store, "5165", params(query)), false, query);
  }
});

test("isRunLocked: unlocked=1, no mode is ever locked", () => {
  const store = recordCategoryTrialUsed(defaultStore(), "5165", "I");
  for (const query of ["mode=test", "mode=study", "mode=drill&category=I", "mode=drill&category=I&timed=1"]) {
    assert.equal(isRunLocked(store, "5165", params(`${query}&unlocked=1`)), false, query);
  }
});

test("isRunLocked: unlocked=0 locks full test, review (including due review), and untimed practice", () => {
  const store = defaultStore();
  for (const query of ["mode=test", "mode=study", "mode=study&due=1", "mode=study&category=I", "mode=drill&category=I"]) {
    assert.equal(isRunLocked(store, "5165", params(`${query}&unlocked=0`)), true, query);
  }
});

test("isRunLocked: unlocked=0, a timed drill on an untried topic is the free trial -- open", () => {
  assert.equal(isRunLocked(defaultStore(), "5165", params("mode=drill&category=I&timed=1&unlocked=0")), false);
});

test("isRunLocked: unlocked=0, a timed drill on an already-tried topic is locked (repeat Category test)", () => {
  const store = recordCategoryTrialUsed(defaultStore(), "5165", "I");
  assert.equal(isRunLocked(store, "5165", params("mode=drill&category=I&timed=1&unlocked=0")), true);
});

test("isRunLocked: unlocked=0, a timed drill with no category is locked (nothing to be free for)", () => {
  assert.equal(isRunLocked(defaultStore(), "5165", params("mode=drill&timed=1&unlocked=0")), true);
});

test("isRunLocked: an unknown or missing mode isn't this gate's call -- run.html reports those itself", () => {
  assert.equal(isRunLocked(defaultStore(), "5165", params("mode=bogus&unlocked=0")), false);
  assert.equal(isRunLocked(defaultStore(), "5165", params("unlocked=0")), false);
});

test("isRunLocked: a timed drill on a non-top-level category is not a free trial -- locked", () => {
  // D-46's "topic" is the grouped bucket test.html offers, so only those ids can carry a
  // free trial; a leaf id would otherwise mint one trial per leaf.
  const store = defaultStore();
  assert.equal(
    isRunLocked(store, "5165", params("mode=drill&category=I-A&timed=1&unlocked=0"), ["I", "II"]),
    true
  );
});

test("isRunLocked: a timed drill on a top-level topic is still the free trial", () => {
  assert.equal(
    isRunLocked(defaultStore(), "5165", params("mode=drill&category=I&timed=1&unlocked=0"), ["I", "II"]),
    false
  );
});

test("isRunLocked: the top-level list doesn't affect an unlocked subject or the public site", () => {
  assert.equal(
    isRunLocked(defaultStore(), "5165", params("mode=drill&category=I-A&timed=1&unlocked=1"), ["I"]),
    false
  );
  assert.equal(
    isRunLocked(defaultStore(), "5165", params("mode=drill&category=I-A&timed=1"), ["I"]),
    false
  );
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
