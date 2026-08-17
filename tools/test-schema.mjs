// Unit tests for js/schema.js. Pure Node, no dependencies. Run: node tools/test-schema.mjs
//
// Node has no `fetch`-backed static server, so these tests use a mock fetch keyed by
// URL -- schema.js is written against an injected `fetchImpl`, not the global directly,
// for exactly this reason (mirrors js/store.js's `storage` injection).
import assert from "node:assert/strict";
import { loadManifest, loadBankSummary, loadTestList } from "../js/schema.js";

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
