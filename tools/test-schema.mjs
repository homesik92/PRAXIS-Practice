// Unit tests for js/schema.js. Pure Node, no dependencies. Run: node tools/test-schema.mjs
//
// Node has no `fetch`-backed static server, so these tests use a mock fetch keyed by
// URL -- schema.js is written against an injected `fetchImpl`, not the global directly,
// for exactly this reason (mirrors js/store.js's `storage` injection).
import assert from "node:assert/strict";
import {
  loadManifest,
  loadBank,
  loadBankSummary,
  loadTestList,
  assembleForm,
  resumeForm,
  flattenCategoryTree,
  categoryAndDescendantIds,
  assembleDrill,
} from "../js/schema.js";

// Tiny deterministic LCG -- not for security, only so assembleForm's shuffling is
// reproducible across test runs without depending on the real Math.random.
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function isPermutationOf(actualIds, expectedIds) {
  return actualIds.length === expectedIds.length && [...actualIds].sort().join() === [...expectedIds].sort().join();
}

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

function mockFetch(routes) {
  return async (url) => {
    if (!(url in routes)) throw new Error(`unexpected fetch: ${url}`);
    return routes[url];
  };
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const validBank = {
  schemaVersion: 1,
  code: "5165",
  name: "Mathematics",
  timeLimitMinutes: 15,
  formLength: 5,
  categories: [],
  questions: [{}, {}, {}, {}, {}],
};

test("loadManifest returns only enabled entries", async () => {
  const fetchImpl = mockFetch({
    "data/manifest.json": jsonResponse({
      schemaVersion: 1,
      tests: [
        { code: "5165", file: "tests/5165.json", enabled: true },
        { code: "5485", file: "tests/5485.json", enabled: false },
      ],
    }),
  });
  const result = await loadManifest(fetchImpl, "data/manifest.json");
  assert.equal(result.ok, true);
  assert.deepEqual(result.tests, [{ code: "5165", file: "tests/5165.json" }]);
});

test("loadManifest reports fetch-failed on a non-ok response", async () => {
  const fetchImpl = mockFetch({ "data/manifest.json": jsonResponse({}, { ok: false, status: 404 }) });
  const result = await loadManifest(fetchImpl, "data/manifest.json");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "fetch-failed");
});

test("loadManifest reports fetch-failed when fetch itself throws", async () => {
  const fetchImpl = async () => {
    throw new Error("network down");
  };
  const result = await loadManifest(fetchImpl, "data/manifest.json");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "fetch-failed");
});

test("loadManifest reports invalid-json when the body can't be parsed", async () => {
  const fetchImpl = mockFetch({
    "data/manifest.json": { ok: true, status: 200, json: async () => { throw new SyntaxError("bad json"); } },
  });
  const result = await loadManifest(fetchImpl, "data/manifest.json");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid-json");
});

test("loadManifest treats a missing tests array as empty rather than throwing", async () => {
  const fetchImpl = mockFetch({ "data/manifest.json": jsonResponse({ schemaVersion: 1 }) });
  const result = await loadManifest(fetchImpl, "data/manifest.json");
  assert.equal(result.ok, true);
  assert.deepEqual(result.tests, []);
});

test("loadBank returns the full parsed bank, questions included", async () => {
  const fetchImpl = mockFetch({ "data/tests/5165.json": jsonResponse(validBank) });
  const result = await loadBank("tests/5165.json", fetchImpl, "data");
  assert.equal(result.ok, true);
  assert.deepEqual(result.bank, validBank);
});

test("loadBank reports fetch-failed on a non-ok response", async () => {
  const fetchImpl = mockFetch({ "data/tests/5165.json": jsonResponse({}, { ok: false, status: 404 }) });
  const result = await loadBank("tests/5165.json", fetchImpl, "data");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "fetch-failed");
});

test("loadBankSummary extracts only the summary fields, from the question array's length", async () => {
  const fetchImpl = mockFetch({ "data/tests/5165.json": jsonResponse(validBank) });
  const result = await loadBankSummary("tests/5165.json", fetchImpl, "data");
  assert.equal(result.ok, true);
  assert.deepEqual(result.bank, {
    code: "5165",
    name: "Mathematics",
    timeLimitMinutes: 15,
    formLength: 5,
    questionCount: 5,
  });
});

test("loadTestList combines the manifest and each enabled bank's summary", async () => {
  const fetchImpl = mockFetch({
    "data/manifest.json": jsonResponse({
      schemaVersion: 1,
      tests: [{ code: "5165", file: "tests/5165.json", enabled: true }],
    }),
    "data/tests/5165.json": jsonResponse(validBank),
  });
  const result = await loadTestList(fetchImpl, "data");
  assert.equal(result.ok, true);
  assert.equal(result.tests.length, 1);
  assert.equal(result.tests[0].code, "5165");
  assert.deepEqual(result.failed, []);
});

test("loadTestList skips a bank that fails to load and records its code in failed", async () => {
  const fetchImpl = mockFetch({
    "data/manifest.json": jsonResponse({
      schemaVersion: 1,
      tests: [
        { code: "5165", file: "tests/5165.json", enabled: true },
        { code: "5485", file: "tests/5485.json", enabled: true },
      ],
    }),
    "data/tests/5165.json": jsonResponse(validBank),
    "data/tests/5485.json": jsonResponse({}, { ok: false, status: 404 }),
  });
  const result = await loadTestList(fetchImpl, "data");
  assert.equal(result.ok, true);
  assert.equal(result.tests.length, 1);
  assert.deepEqual(result.failed, ["5485"]);
});

test("loadTestList propagates a manifest-level failure without attempting any bank fetch", async () => {
  const fetchImpl = mockFetch({ "data/manifest.json": jsonResponse({}, { ok: false, status: 500 }) });
  const result = await loadTestList(fetchImpl, "data");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "fetch-failed");
});

function question(id, categoryId, overlays) {
  return {
    id,
    type: "single",
    categoryId,
    ...(overlays ? { overlays } : {}),
    stem: { format: "text", value: id },
    options: [
      { id: "a", content: { format: "text", value: "a" } },
      { id: "b", content: { format: "text", value: "b" } },
    ],
    correct: ["a"],
  };
}

function twoCategoryBank(questionsByCategory) {
  return {
    categories: [
      { id: "I", label: "I", weight: { count: 2, percent: 50 } },
      { id: "II", label: "II", weight: { count: 2, percent: 50 } },
    ],
    questions: [
      ...(questionsByCategory.I ?? []).map((id) => question(id, "I")),
      ...(questionsByCategory.II ?? []).map((id) => question(id, "II")),
    ],
  };
}

test("assembleForm draws exactly each category's target when the bank has enough questions", () => {
  const bank = twoCategoryBank({ I: ["q1", "q2"], II: ["q3", "q4"] });
  const form = assembleForm(bank, { random: seededRandom(1) });
  assert.equal(form.questions.length, 4);
  assert.ok(isPermutationOf(form.questions.map((q) => q.id), ["q1", "q2", "q3", "q4"]));
  assert.deepEqual(form.shortfalls, []);
  assert.deepEqual(
    form.categoryTargets.sort((a, b) => a.categoryId.localeCompare(b.categoryId)),
    [
      { categoryId: "I", target: 2 },
      { categoryId: "II", target: 2 },
    ],
  );
});

test("a thin category reports a shortfall and is never backfilled from another category", () => {
  const bank = twoCategoryBank({ I: ["q1"], II: ["q3", "q4"] });
  const form = assembleForm(bank, { random: seededRandom(1) });
  assert.equal(form.questions.length, 3); // 1 from I (short) + 2 from II, never topped up to 4
  assert.deepEqual(form.shortfalls, [{ categoryId: "I", wanted: 2, got: 1 }]);
  assert.equal(form.questions.filter((q) => q.categoryId === "II").length, 2);
});

test("an empty bank reports a full shortfall for every category and draws nothing", () => {
  const bank = twoCategoryBank({});
  const form = assembleForm(bank, { random: seededRandom(1) });
  assert.deepEqual(form.questions, []);
  assert.deepEqual(
    form.shortfalls.sort((a, b) => a.categoryId.localeCompare(b.categoryId)),
    [
      { categoryId: "I", wanted: 2, got: 0 },
      { categoryId: "II", wanted: 2, got: 0 },
    ],
  );
});

test("an overridden formLength scales targets to sum exactly to the request, not drift from rounding", () => {
  const bank = {
    categories: [
      { id: "I", label: "I", weight: { count: 7, percent: 70 } },
      { id: "II", label: "II", weight: { count: 3, percent: 30 } },
    ],
    questions: [],
  };
  for (const requested of [1, 2, 3, 4, 5, 9, 10]) {
    const form = assembleForm(bank, { formLength: requested, random: seededRandom(1) });
    const total = form.categoryTargets.reduce((sum, c) => sum + c.target, 0);
    assert.equal(total, requested, `targets should sum to ${requested}, got ${total}`);
    assert.ok(form.categoryTargets.every((c) => Number.isInteger(c.target) && c.target >= 0));
  }
});

test("draw prefers a never-seen question over one seen recently, and one seen recently over one seen long ago", () => {
  const bank = {
    categories: [{ id: "I", label: "I", weight: { count: 1, percent: 100 } }],
    questions: [question("seen-recent", "I"), question("seen-long-ago", "I"), question("never-seen", "I")],
  };
  const history = {
    "seen-recent": { lastSeenAt: "2026-08-16T00:00:00.000Z" },
    "seen-long-ago": { lastSeenAt: "2020-01-01T00:00:00.000Z" },
  };
  const form = assembleForm(bank, { history, random: seededRandom(1) });
  assert.equal(form.questions.length, 1);
  assert.equal(form.questions[0].id, "never-seen");
});

test("a malformed lastSeenAt is treated as never-seen, not as NaN (which sort would coerce to a false tie)", () => {
  const bank = {
    categories: [{ id: "I", label: "I", weight: { count: 1, percent: 100 } }],
    questions: [question("seen-recent", "I"), question("malformed-history", "I")],
  };
  const history = {
    "seen-recent": { lastSeenAt: "2026-08-16T00:00:00.000Z" },
    "malformed-history": { lastSeenAt: "not-a-real-date" },
  };
  const form = assembleForm(bank, { history, random: seededRandom(1) });
  assert.equal(form.questions.length, 1);
  assert.equal(form.questions[0].id, "malformed-history");
});

test("overlay targetShare is reported (not enforced) against the actually-selected set", () => {
  const bank = {
    categories: [
      { id: "I", label: "I", weight: { count: 1, percent: 50 } },
      { id: "II", label: "II", weight: { count: 1, percent: 50 } },
    ],
    overlays: [{ id: "tot", label: "Task of Teaching", targetShare: 0.5 }],
    questions: [question("q1", "I", ["tot"]), question("q2", "II")],
  };
  const form = assembleForm(bank, { random: seededRandom(1) });
  assert.deepEqual(form.overlayCoverage, [{ overlayId: "tot", target: 1, actual: 1 }]);
});

test("the same seeded random reproduces the exact same presentation order", () => {
  const bank = twoCategoryBank({ I: ["q1", "q2"], II: ["q3", "q4"] });
  const first = assembleForm(bank, { random: seededRandom(42) }).questions.map((q) => q.id);
  const second = assembleForm(bank, { random: seededRandom(42) }).questions.map((q) => q.id);
  assert.deepEqual(first, second);
});

test("each question's options are shuffled to a permutation of the originals", () => {
  const bank = twoCategoryBank({ I: ["q1"], II: [] });
  const form = assembleForm(bank, { formLength: 1, random: seededRandom(7) });
  assert.ok(isPermutationOf(form.questions[0].options.map((o) => o.id), ["a", "b"]));
});

// --- resumeForm (Phase 2.2, D-19) ---

const resumeBank = twoCategoryBank({ I: ["q1", "q2"], II: ["q3"] });

test("resumeForm replays the exact recorded question and option order", () => {
  const questionOrder = [
    { questionId: "q3", optionOrder: ["b", "a"] },
    { questionId: "q1", optionOrder: ["a", "b"] },
  ];
  const form = resumeForm(resumeBank, questionOrder);
  assert.deepEqual(
    form.questions.map((q) => q.id),
    ["q3", "q1"],
  );
  assert.deepEqual(
    form.questions[0].options.map((o) => o.id),
    ["b", "a"],
  );
});

test("resumeForm returns null if a recorded question no longer exists in the bank", () => {
  const questionOrder = [{ questionId: "does-not-exist", optionOrder: ["a", "b"] }];
  assert.equal(resumeForm(resumeBank, questionOrder), null);
});

test("resumeForm returns null if a recorded option no longer exists on its question", () => {
  const questionOrder = [{ questionId: "q1", optionOrder: ["a", "does-not-exist"] }];
  assert.equal(resumeForm(resumeBank, questionOrder), null);
});

test("resumeForm returns null (not a partial result) if any question in the sequence fails to resolve", () => {
  const questionOrder = [
    { questionId: "q1", optionOrder: ["a", "b"] },
    { questionId: "does-not-exist", optionOrder: ["a", "b"] },
  ];
  assert.equal(resumeForm(resumeBank, questionOrder), null);
});

// --- flattenCategoryTree / categoryAndDescendantIds / assembleDrill (Phase 4.1, S5) ---

// Mirrors 5485's real shape (§2.4): the branch publishes a weight, its subcategories
// carry weight: null and exist purely as study filters -- no question ever attaches
// directly to the branch itself, only to a leaf.
const studyTree = [
  {
    id: "I",
    label: "Category I",
    weight: { count: 3, percent: 60 },
    children: [
      { id: "I-A", label: "Sub A", weight: null },
      { id: "I-B", label: "Sub B", weight: null },
    ],
  },
  { id: "II", label: "Category II", weight: { count: 2, percent: 40 } },
];

function studyBank(questionsByCategory, { retired = [] } = {}) {
  const questions = Object.entries(questionsByCategory).flatMap(([categoryId, ids]) =>
    ids.map((id) => ({ ...question(id, categoryId), retired: retired.includes(id) })),
  );
  return { categories: studyTree, questions };
}

test("flattenCategoryTree lists every node in document order with correct depth", () => {
  const result = flattenCategoryTree(studyTree);
  assert.deepEqual(
    result.map((n) => [n.id, n.depth]),
    [
      ["I", 0],
      ["I-A", 1],
      ["I-B", 1],
      ["II", 0],
    ],
  );
});

test("flattenCategoryTree returns an empty list for an empty/missing tree", () => {
  assert.deepEqual(flattenCategoryTree(undefined), []);
});

test("categoryAndDescendantIds on a leaf returns just that id", () => {
  assert.deepEqual(categoryAndDescendantIds(studyTree, "I-A"), new Set(["I-A"]));
});

test("categoryAndDescendantIds on a branch returns itself plus every descendant", () => {
  assert.deepEqual(categoryAndDescendantIds(studyTree, "I"), new Set(["I", "I-A", "I-B"]));
});

test("categoryAndDescendantIds returns an empty set for an id not present in the tree", () => {
  assert.deepEqual(categoryAndDescendantIds(studyTree, "does-not-exist"), new Set());
});

test("assembleDrill picking a branch gathers questions from every descendant leaf, not other branches", () => {
  const bank = studyBank({ "I-A": ["q1"], "I-B": ["q2"], II: ["q3"] });
  const drill = assembleDrill(bank, "I", { random: seededRandom(1) });
  assert.deepEqual(
    drill.questions.map((q) => q.id).sort(),
    ["q1", "q2"],
  );
});

test("assembleDrill picking a leaf gathers only that leaf's questions", () => {
  const bank = studyBank({ "I-A": ["q1"], "I-B": ["q2"] });
  const drill = assembleDrill(bank, "I-A", { random: seededRandom(1) });
  assert.deepEqual(
    drill.questions.map((q) => q.id),
    ["q1"],
  );
});

test("assembleDrill excludes retired questions", () => {
  const bank = studyBank({ "I-A": ["q1", "q2"] }, { retired: ["q2"] });
  const drill = assembleDrill(bank, "I-A", { random: seededRandom(1) });
  assert.deepEqual(
    drill.questions.map((q) => q.id),
    ["q1"],
  );
});

test("assembleDrill has no quota -- it returns every matching question, not a capped sample", () => {
  const bank = studyBank({ "I-A": ["q1", "q2", "q3", "q4", "q5"] });
  const drill = assembleDrill(bank, "I-A", { random: seededRandom(1) });
  assert.equal(drill.questions.length, 5);
});

test("assembleDrill returns an empty questions array for a category with nothing matching, not a throw", () => {
  const bank = studyBank({ "I-A": ["q1"] });
  const drill = assembleDrill(bank, "I-B", { random: seededRandom(1) });
  assert.deepEqual(drill.questions, []);
});

test("assembleDrill orders least-recently-seen first, same preference as the timed draw", () => {
  const bank = studyBank({ "I-A": ["never-seen", "seen-recently", "seen-long-ago"] });
  const history = {
    "seen-recently": { lastSeenAt: "2026-08-17T00:00:00.000Z" },
    "seen-long-ago": { lastSeenAt: "2020-01-01T00:00:00.000Z" },
  };
  const drill = assembleDrill(bank, "I-A", { history, random: seededRandom(1) });
  assert.deepEqual(
    drill.questions.map((q) => q.id),
    ["never-seen", "seen-long-ago", "seen-recently"],
  );
});

test("assembleDrill shuffles each question's options to a permutation of the originals", () => {
  const bank = studyBank({ "I-A": ["q1"] });
  const drill = assembleDrill(bank, "I-A", { random: seededRandom(7) });
  assert.ok(isPermutationOf(drill.questions[0].options.map((o) => o.id), ["a", "b"]));
});

test("assembleDrill's same seeded random reproduces the exact same order", () => {
  const bank = studyBank({ "I-A": ["q1", "q2", "q3"] });
  const first = assembleDrill(bank, "I-A", { random: seededRandom(42) }).questions.map((q) => q.id);
  const second = assembleDrill(bank, "I-A", { random: seededRandom(42) }).questions.map((q) => q.id);
  assert.deepEqual(first, second);
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL  ${name}`);
    console.log(`      ${e.message}`);
  }
}

console.log(`\n${tests.length - failed}/${tests.length} passed.`);
process.exitCode = failed > 0 ? 1 : 0;
