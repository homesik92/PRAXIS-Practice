// Unit tests for verify.mjs. Pure Node, no dependencies. Run: node tools/test-verify.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateBank,
  validateManifest,
  validateReferencePanel,
  validateElementsAndConstants,
  validateReferencePanelContent,
  validateTeachingContent,
} from "./verify.mjs";

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

test("a question stem using a non-text format warns (question rendering doesn't support it yet, issue #45), without erroring", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/valid-bank.json"), "utf-8"));
  bank.questions[0].stem = { format: "mathml", value: "<math><mi>x</mi></math>" };
  const { errors, warnings } = validateBank(bank);
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes('stem.format is "mathml"') && w.includes("issue #45")));
});

test("a question option using a non-text format warns the same way a stem does", async () => {
  const bank = JSON.parse(await readFile(path.join(__dirname, "fixtures/valid-bank.json"), "utf-8"));
  bank.questions[0].options[0].content = { format: "code", value: "x = 1" };
  const { errors, warnings } = validateBank(bank);
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes('option.content.format is "code"')));
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

function validReferencePanel() {
  return {
    schemaVersion: 1,
    testCode: "5165",
    sections: [
      {
        id: "algebra",
        heading: "Number & Quantity and Algebra",
        entries: [{ id: "quadratic-formula", label: "Quadratic formula", content: { format: "text", value: "x = ..." } }],
      },
    ],
  };
}

test("valid reference panel has zero errors", () => {
  const { errors } = validateReferencePanel(validReferencePanel(), { code: "5165" });
  assert.deepEqual(errors, []);
});

test("reference panel testCode mismatched against the owning bank's code is rejected", () => {
  const panel = validReferencePanel();
  const { errors } = validateReferencePanel(panel, { code: "5485" });
  assert.ok(errors.some((e) => e.includes('testCode "5165" does not match owning bank\'s code "5485"')));
});

test("reference panel with no sections is rejected", () => {
  const panel = { ...validReferencePanel(), sections: [] };
  const { errors } = validateReferencePanel(panel, { code: "5165" });
  assert.ok(errors.some((e) => e.includes("sections must be a non-empty array")));
});

test("reference panel catches a duplicate section id", () => {
  const panel = validReferencePanel();
  panel.sections.push({ ...panel.sections[0], heading: "Duplicate" });
  const { errors } = validateReferencePanel(panel, { code: "5165" });
  assert.ok(errors.some((e) => e.includes("duplicate section id")));
});

test("reference panel catches a section with no heading", () => {
  const panel = validReferencePanel();
  delete panel.sections[0].heading;
  const { errors } = validateReferencePanel(panel, { code: "5165" });
  assert.ok(errors.some((e) => e.includes("missing or invalid heading")));
});

test("reference panel catches a section with an empty entries array", () => {
  const panel = validReferencePanel();
  panel.sections[0].entries = [];
  const { errors } = validateReferencePanel(panel, { code: "5165" });
  assert.ok(errors.some((e) => e.includes("entries must be a non-empty array")));
});

test("reference panel catches a duplicate entry id within one section", () => {
  const panel = validReferencePanel();
  panel.sections[0].entries.push({ ...panel.sections[0].entries[0], label: "Duplicate" });
  const { errors } = validateReferencePanel(panel, { code: "5165" });
  assert.ok(errors.some((e) => e.includes("duplicate entry id within section")));
});

test("reference panel catches an entry with a bad content format", () => {
  const panel = validReferencePanel();
  panel.sections[0].entries[0].content = { format: "bogus", value: "x" };
  const { errors } = validateReferencePanel(panel, { code: "5165" });
  assert.ok(errors.some((e) => e.includes("format must be one of")));
});

test("reference panel catches an entry missing a label", () => {
  const panel = validReferencePanel();
  delete panel.sections[0].entries[0].label;
  const { errors } = validateReferencePanel(panel, { code: "5165" });
  assert.ok(errors.some((e) => e.includes("missing or invalid label")));
});

test("reference panel entries using mathml do not warn -- unlike questions, the reference panel actually renders it", () => {
  const panel = validReferencePanel();
  panel.sections[0].entries[0].content = { format: "mathml", value: "<math><mi>x</mi></math>" };
  const { errors, warnings } = validateReferencePanel(panel, { code: "5165" });
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

function validTeachingContent() {
  return {
    schemaVersion: 1,
    testCode: "5165",
    sections: [
      {
        id: "number-quantity-intro",
        categoryId: "I",
        heading: "What counts as a number here",
        entries: [{ id: "concept", label: "Concept", content: { format: "text", value: "..." } }],
      },
    ],
  };
}

function bankWithCategories() {
  return {
    code: "5165",
    categories: [
      { id: "I", label: "Category One", weight: { count: 2, percent: 67 } },
      { id: "II", label: "Category Two", weight: { count: 1, percent: 33 } },
    ],
  };
}

test("valid teaching content has zero errors", () => {
  const { errors } = validateTeachingContent(validTeachingContent(), { code: "5165", bank: bankWithCategories() });
  assert.deepEqual(errors, []);
});

test("teaching content reuses validateReferencePanel's own shape checks (e.g. testCode mismatch)", () => {
  const content = validTeachingContent();
  const { errors } = validateTeachingContent(content, { code: "5485", bank: bankWithCategories() });
  assert.ok(errors.some((e) => e.includes('testCode "5165" does not match owning bank\'s code "5485"')));
});

test("teaching content catches a section with a missing categoryId", () => {
  const content = validTeachingContent();
  delete content.sections[0].categoryId;
  const { errors } = validateTeachingContent(content, { code: "5165", bank: bankWithCategories() });
  assert.ok(errors.some((e) => e.includes("missing or invalid categoryId")));
});

test("teaching content catches a section whose categoryId isn't a real leaf category in the bank", () => {
  const content = validTeachingContent();
  content.sections[0].categoryId = "does-not-exist";
  const { errors } = validateTeachingContent(content, { code: "5165", bank: bankWithCategories() });
  assert.ok(errors.some((e) => e.includes('categoryId "does-not-exist" is not a real leaf category')));
});

test("teaching content has no categoryId opinion when no bank is given", () => {
  const content = validTeachingContent();
  content.sections[0].categoryId = "does-not-exist";
  const { errors } = validateTeachingContent(content, { code: "5165" });
  assert.deepEqual(errors, []);
});

function validElementsAndConstants() {
  return {
    schemaVersion: 1,
    testCode: "5485",
    elements: [
      { atomicNumber: 1, symbol: "H", name: "Hydrogen", atomicMass: 1.008, category: "nonmetal", group: 1, period: 1 },
      { atomicNumber: 2, symbol: "He", name: "Helium", atomicMass: 4.003, category: "noble-gas", group: 18, period: 1 },
    ],
    constants: [{ id: "speed-of-light", name: "Speed of light", symbol: "c", value: "2.998 × 10⁸", unit: "m/s" }],
  };
}

test("valid elements-and-constants panel has zero errors", () => {
  const { errors } = validateElementsAndConstants(validElementsAndConstants(), { code: "5485" });
  assert.deepEqual(errors, []);
});

test("elements-and-constants testCode mismatched against the owning bank's code is rejected", () => {
  const { errors } = validateElementsAndConstants(validElementsAndConstants(), { code: "5165" });
  assert.ok(errors.some((e) => e.includes('testCode "5485" does not match')));
});

test("elements-and-constants catches a duplicate atomicNumber", () => {
  const panel = validElementsAndConstants();
  panel.elements.push({ ...panel.elements[0], symbol: "Xx" });
  const { errors } = validateElementsAndConstants(panel, { code: "5485" });
  assert.ok(errors.some((e) => e.includes("duplicate atomicNumber 1")));
});

test("elements-and-constants catches a duplicate symbol", () => {
  const panel = validElementsAndConstants();
  panel.elements.push({ ...panel.elements[0], atomicNumber: 99 });
  const { errors } = validateElementsAndConstants(panel, { code: "5485" });
  assert.ok(errors.some((e) => e.includes('duplicate symbol "H"')));
});

test("elements-and-constants catches an unknown category", () => {
  const panel = validElementsAndConstants();
  panel.elements[0].category = "made-up";
  const { errors } = validateElementsAndConstants(panel, { code: "5485" });
  assert.ok(errors.some((e) => e.includes("category must be one of")));
});

test("elements-and-constants catches a group outside 1-18", () => {
  const panel = validElementsAndConstants();
  panel.elements[0].group = 19;
  const { errors } = validateElementsAndConstants(panel, { code: "5485" });
  assert.ok(errors.some((e) => e.includes("group must be an integer 1-18")));
});

test("elements-and-constants accepts period 8/9 for the lanthanide/actinide display rows", () => {
  const panel = validElementsAndConstants();
  panel.elements[0].period = 8;
  const { errors } = validateElementsAndConstants(panel, { code: "5485" });
  assert.deepEqual(errors, []);
});

test("elements-and-constants catches a period outside 1-9", () => {
  const panel = validElementsAndConstants();
  panel.elements[0].period = 10;
  const { errors } = validateElementsAndConstants(panel, { code: "5485" });
  assert.ok(errors.some((e) => e.includes("period must be an integer 1-9")));
});

test("elements-and-constants catches a non-positive atomicMass", () => {
  const panel = validElementsAndConstants();
  panel.elements[0].atomicMass = 0;
  const { errors } = validateElementsAndConstants(panel, { code: "5485" });
  assert.ok(errors.some((e) => e.includes("atomicMass must be a positive number")));
});

test("elements-and-constants catches a duplicate constant id", () => {
  const panel = validElementsAndConstants();
  panel.constants.push({ ...panel.constants[0] });
  const { errors } = validateElementsAndConstants(panel, { code: "5485" });
  assert.ok(errors.some((e) => e.includes("duplicate constant id")));
});

test("elements-and-constants catches a constant missing its unit", () => {
  const panel = validElementsAndConstants();
  delete panel.constants[0].unit;
  const { errors } = validateElementsAndConstants(panel, { code: "5485" });
  assert.ok(errors.some((e) => e.includes("missing or invalid unit")));
});

test("elements-and-constants rejects an empty elements array", () => {
  const panel = { ...validElementsAndConstants(), elements: [] };
  const { errors } = validateElementsAndConstants(panel, { code: "5485" });
  assert.ok(errors.some((e) => e.includes("elements must be a non-empty array")));
});

test("elements-and-constants rejects an empty constants array", () => {
  const panel = { ...validElementsAndConstants(), constants: [] };
  const { errors } = validateElementsAndConstants(panel, { code: "5485" });
  assert.ok(errors.some((e) => e.includes("constants must be a non-empty array")));
});

test("validateReferencePanelContent dispatches a sections-shaped panel to validateReferencePanel", () => {
  const { errors } = validateReferencePanelContent(validReferencePanel(), { code: "5165" });
  assert.deepEqual(errors, []);
});

test("validateReferencePanelContent dispatches an elements-shaped panel to validateElementsAndConstants", () => {
  const { errors } = validateReferencePanelContent(validElementsAndConstants(), { code: "5485" });
  assert.deepEqual(errors, []);
});

test("validateReferencePanelContent rejects a panel matching neither known shape", () => {
  const { errors } = validateReferencePanelContent({ schemaVersion: 1, testCode: "9999" }, { code: "9999" });
  assert.ok(errors.some((e) => e.includes("unrecognized reference panel shape")));
});

test("validateReferencePanelContent rejects a sections-shaped panel wired into a bank whose code expects elements", () => {
  const panel = { ...validReferencePanel(), testCode: "5485" };
  const { errors } = validateReferencePanelContent(panel, { code: "5485" });
  assert.ok(errors.some((e) => e.includes('bank code "5485" expects a "elements"-shaped reference panel')));
});

test("validateReferencePanelContent rejects an elements-shaped panel wired into a bank whose code expects sections", () => {
  const panel = { ...validElementsAndConstants(), testCode: "5165" };
  const { errors } = validateReferencePanelContent(panel, { code: "5165" });
  assert.ok(errors.some((e) => e.includes('bank code "5165" expects a "sections"-shaped reference panel')));
});

test("validateReferencePanelContent has no shape opinion for an unknown bank code -- still validates the shape it finds", () => {
  const panel = { ...validElementsAndConstants(), testCode: "9999" };
  const { errors } = validateReferencePanelContent(panel, { code: "9999" });
  assert.deepEqual(errors, []);
});

test("elements-and-constants catches two elements assigned the same grid position", () => {
  const panel = validElementsAndConstants();
  panel.elements.push({ ...panel.elements[0], atomicNumber: 99, symbol: "Xx" });
  const { errors } = validateElementsAndConstants(panel, { code: "5485" });
  assert.ok(errors.some((e) => e.includes("grid position (group 1, period 1) is already used")));
});

test("elements-and-constants does not flag a grid-position collision when group/period themselves are already invalid", () => {
  const panel = validElementsAndConstants();
  panel.elements[0].group = 19;
  const { errors } = validateElementsAndConstants(panel, { code: "5485" });
  assert.ok(!errors.some((e) => e.includes("grid position")));
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
