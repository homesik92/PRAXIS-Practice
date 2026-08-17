// Unit tests for js/srs.js. Pure Node, no dependencies. Run: node tools/test-srs.mjs
import assert from "node:assert/strict";
import { updateHistory } from "../js/srs.js";

const NOW = () => new Date("2026-08-16T12:00:00.000Z");

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test("first-ever answer (no entry) bootstraps intervalDays:1, ease:2.5 before recurrence applies", () => {
  // correct on the bootstrap values: intervalDays = max(1, round(1 * 2.5)) = 3
  const result = updateHistory(undefined, true, NOW);
  assert.equal(result.intervalDays, 3);
  assert.equal(result.ease, 2.6);
  assert.equal(result.seen, 1);
  assert.equal(result.correct, 1);
});

test("first-ever wrong answer bootstraps then applies the incorrect recurrence", () => {
  const result = updateHistory(undefined, false, NOW);
  assert.equal(result.intervalDays, 1);
  assert.equal(result.ease, 2.3);
  assert.equal(result.seen, 1);
  assert.equal(result.correct, 0);
});

test("a correct answer grows intervalDays by the current ease and increments seen/correct", () => {
  const entry = { seen: 3, correct: 2, intervalDays: 4, ease: 2.5 };
  const result = updateHistory(entry, true, NOW);
  assert.equal(result.intervalDays, 10); // round(4 * 2.5)
  assert.equal(result.ease, 2.6);
  assert.equal(result.seen, 4);
  assert.equal(result.correct, 3);
});

test("an incorrect answer resets intervalDays to 1 and decreases ease", () => {
  const entry = { seen: 3, correct: 2, intervalDays: 10, ease: 2.5 };
  const result = updateHistory(entry, false, NOW);
  assert.equal(result.intervalDays, 1);
  assert.equal(result.ease, 2.3);
  assert.equal(result.seen, 4);
  assert.equal(result.correct, 2);
});

test("ease is floored at 1.3 and never goes lower on repeated wrong answers", () => {
  let entry = { seen: 0, correct: 0, intervalDays: 1, ease: 1.4 };
  entry = updateHistory(entry, false, NOW); // 1.4 - 0.2 = 1.2, floored to 1.3
  assert.equal(entry.ease, 1.3);
  entry = updateHistory(entry, false, NOW); // already at floor, stays there
  assert.equal(entry.ease, 1.3);
});

test("intervalDays never rounds below 1 even at the ease floor", () => {
  const entry = { seen: 5, correct: 1, intervalDays: 1, ease: 1.3 };
  const result = updateHistory(entry, true, NOW);
  assert.equal(result.intervalDays, 1); // round(1 * 1.3) = 1
});

test("dueAt is now + intervalDays days", () => {
  const result = updateHistory({ seen: 0, correct: 0, intervalDays: 1, ease: 2.5 }, true, NOW);
  assert.equal(result.intervalDays, 3);
  assert.equal(result.dueAt, "2026-08-19T12:00:00.000Z");
});

test("lastSeenAt is set to the injected now", () => {
  const result = updateHistory(undefined, true, NOW);
  assert.equal(result.lastSeenAt, "2026-08-16T12:00:00.000Z");
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
