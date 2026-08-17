// Unit tests for verify.mjs. Pure Node, no dependencies. Run: node tools/test-verify.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateBank, validateManifest } from "./verify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test("valid fixture bank has zero errors", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/valid-bank.json"), "utf-8"));
  const { errors } = validateBank(bank);
  assert.deepEqual(errors, []);
});

test("valid fixture bank's weight-bearing counts sum to formLength", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/valid-bank.json"), "utf-8"));
  const { errors } = validateBank(bank);
  assert.ok(!errors.some((e) => e.includes("formLength")));
});

test("invalid fixture bank catches duplicate category id", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/invalid-bank.json"), "utf-8"));
  const { errors } = validateBank(bank);
  assert.ok(errors.some((e) => e.includes('duplicate category id "I"')));
});

test("invalid fixture bank catches duplicate question id", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/invalid-bank.json"), "utf-8"));
  const { errors } = validateBank(bank);
  assert.ok(errors.some((e) => e.includes("duplicate question id")));
});

test("invalid fixture bank catches correct referencing unknown option", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/invalid-bank.json"), "utf-8"));
  const { errors } = validateBank(bank);
  assert.ok(errors.some((e) => e.includes('unknown option id "z"')));
});

test("invalid fixture bank catches empty correct array", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/invalid-bank.json"), "utf-8"));
  const { errors } = validateBank(bank);
  assert.ok(errors.some((e) => e.includes("correct must be a non-empty array")));
});

test("invalid fixture bank catches bad content format", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/invalid-bank.json"), "utf-8"));
  const { errors } = validateBank(bank);
  assert.ok(errors.some((e) => e.includes("format must be one of")));
});

test("invalid fixture bank catches unknown categoryId reference", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/invalid-bank.json"), "utf-8"));
  const { errors } = validateBank(bank);
  assert.ok(errors.some((e) => e.includes('categoryId "does-not-exist" is not a weight-bearing leaf category')));
});

test("invalid fixture bank catches a question tagged to a non-leaf (ancestor) category", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/invalid-bank.json"), "utf-8"));
  const { errors } = validateBank(bank);
  assert.ok(errors.some((e) => e.includes('categoryId "III" is not a weight-bearing leaf category')));
});

test("invalid fixture bank catches an overlay missing targetShare", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/invalid-bank.json"), "utf-8"));
  const { errors } = validateBank(bank);
  assert.ok(errors.some((e) => e.includes('overlay "ov1": targetShare must be a number')));
});

test("invalid fixture bank catches wrongly-prefixed question id", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/invalid-bank.json"), "utf-8"));
  const { errors } = validateBank(bank);
  assert.ok(errors.some((e) => e.includes("must be a string prefixed")));
});

test("invalid fixture bank catches duplicate option id", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/invalid-bank.json"), "utf-8"));
  const { errors } = validateBank(bank);
  assert.ok(errors.some((e) => e.includes("duplicate option id")));
});

test("invalid fixture bank catches overlay reference not declared", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/invalid-bank.json"), "utf-8"));
  const { errors } = validateBank(bank);
  assert.ok(errors.some((e) => e.includes('overlay "not-declared" is not declared')));
});

test("invalid fixture bank warns on unimplemented type without erroring on type itself", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/invalid-bank.json"), "utf-8"));
  const { warnings } = validateBank(bank);
  assert.ok(warnings.some((w) => w.includes('type "multi" is not implemented')));
});

test("manifest with duplicate test codes is rejected", () => {
  const manifest = {
    schemaVersion: 1,
    tests: [
      { code: "5165", file: "tests/5165.json", enabled: true },
      { code: "5165", file: "tests/5165-dupe.json", enabled: true },
    ],
  };
  const { errors } = validateManifest(manifest, null);
  assert.ok(errors.some((e) => e.includes("duplicate test code")));
});

test("empty manifest with zero tests is valid (Phase 0 starting state)", () => {
  const manifest = { schemaVersion: 1, tests: [] };
  const { errors } = validateManifest(manifest, null);
  assert.deepEqual(errors, []);
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
