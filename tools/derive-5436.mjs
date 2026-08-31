#!/usr/bin/env node
// Refreshes 5436 (General Science)'s derived questions from 5485 (Physical Science).
//
// 5436 and 5485 assess the same physical-science content, so every 5485 question is
// valid on 5436 -- but the two tests organise it differently: 5485 splits physical
// science across three top-level categories (II Matter & Energy, III Chemistry, IV
// Physics) while 5436 folds all of it into one (II Physical Science) and spends the
// rest of the form on Life Science and Earth & Space Science, which 5485 does not
// cover at all.
//
// Rather than maintain two copies by hand -- this project's highest-stakes failure
// mode is a wrong answer key, and a hand-synced duplicate is exactly how one survives
// a correction -- 5436's copies are generated here and carry a `derivedFrom` id.
// `validateDerivedQuestions` in tools/verify.mjs then asserts every copy still matches
// its source, so forgetting to re-run this script fails CI instead of reaching a
// student.
//
// Natively authored 5436 questions (Life Science, Earth & Space Science, and the
// gap topics 5436 covers that 5485 does not) have no `derivedFrom` and are preserved
// untouched by this script.
//
// Usage:  node tools/derive-5436.mjs [--check]
//   --check  report what would change and exit non-zero, without writing
import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data", "tests");
const SOURCE_CODE = "5485";
const TARGET_CODE = "5436";

// Every 5485 weight-bearing leaf maps into exactly one 5436 leaf. This is a pure
// many-to-one aggregation -- no question needs a judgement call about where it lands.
const LEAF_MAP = {
  "I-A": "I-A",   // Nature of Science                     -> Nature of Science
  "I-B": "I-B",   // Science/Engineering/Tech/Society/Env   -> same
  "II-A": "II-A", // Atomic and Nuclear Structure           -> Principles & Models of Matter and Energy
  "II-B": "II-A", // Relationships Between Energy & Matter  -> same
  "III-A": "II-B", // Chemical Composition/Bonding          -> Chemistry
  "III-B": "II-B", // Chemical Reactions and Periodicity    -> Chemistry
  "III-C": "II-B", // Solutions and Acid-Base Chemistry     -> Chemistry
  "IV-A": "II-C", // Mechanics                              -> Physics
  "IV-B": "II-C", // Electricity, Magnetism, and Waves      -> Physics
};

// The fields a derived copy carries over verbatim. Anything not listed is either
// rewritten (id, categoryId) or added (derivedFrom). Keep this in sync with
// verify.mjs's DERIVED_FIELDS -- the check compares exactly these.
const CARRIED = ["type", "overlays", "retired", "stem", "options", "correct", "explanation", "authored"];

const readBank = (code) => JSON.parse(fs.readFileSync(path.join(DATA, `${code}.json`), "utf8"));

const source = readBank(SOURCE_CODE);
const target = readBank(TARGET_CODE);

// Order derived questions by their 5436 leaf, then by source id, so the generated
// file is stable across runs and diffs stay readable.
const LEAF_ORDER = ["I-A", "I-B", "II-A", "II-B", "II-C", "III-A", "III-B", "IV-A", "IV-B"];

const derived = [];
const unmapped = [];
for (const q of source.questions) {
  const leaf = LEAF_MAP[q.categoryId];
  if (!leaf) {
    unmapped.push(`${q.id} (categoryId "${q.categoryId}")`);
    continue;
  }
  if (!q.id.startsWith(`${SOURCE_CODE}-`)) {
    throw new Error(`${q.id}: source question id is not prefixed "${SOURCE_CODE}-"`);
  }
  const copy = {
    id: `${TARGET_CODE}-${q.id.slice(SOURCE_CODE.length + 1)}`,
    type: q.type,
    categoryId: leaf,
    derivedFrom: q.id,
  };
  for (const field of CARRIED) {
    if (field in q && field !== "type") copy[field] = structuredClone(q[field]);
  }
  derived.push(copy);
}

if (unmapped.length) {
  console.error(`ERROR: ${unmapped.length} source question(s) have no LEAF_MAP entry:`);
  for (const u of unmapped) console.error(`  - ${u}`);
  console.error("Add the mapping above, or the 5436 bank would silently lose this content.");
  process.exit(1);
}

derived.sort((a, b) => {
  const byLeaf = LEAF_ORDER.indexOf(a.categoryId) - LEAF_ORDER.indexOf(b.categoryId);
  return byLeaf !== 0 ? byLeaf : a.derivedFrom.localeCompare(b.derivedFrom);
});

// Natively authored questions keep their place; only derived ones are regenerated.
const native = target.questions.filter((q) => !q.derivedFrom);
const nativeIds = new Set(native.map((q) => q.id));
for (const q of derived) {
  if (nativeIds.has(q.id)) {
    console.error(`ERROR: derived id ${q.id} collides with a natively authored 5436 question`);
    process.exit(1);
  }
}

const next = { ...target, questions: [...derived, ...native] };
const serialised = JSON.stringify(next, null, 2) + "\n";
const current = fs.readFileSync(path.join(DATA, `${TARGET_CODE}.json`), "utf8");

const byLeaf = {};
for (const q of derived) byLeaf[q.categoryId] = (byLeaf[q.categoryId] || 0) + 1;

if (serialised === current) {
  console.log(`5436 is already in sync with 5485 (${derived.length} derived, ${native.length} natively authored).`);
  process.exit(0);
}

if (process.argv.includes("--check")) {
  console.error("5436's derived questions are STALE relative to 5485.");
  console.error("Run: node tools/derive-5436.mjs");
  process.exit(1);
}

fs.writeFileSync(path.join(DATA, `${TARGET_CODE}.json`), serialised);
console.log(`Derived ${derived.length} question(s) from ${SOURCE_CODE} into ${TARGET_CODE}:`);
for (const leaf of LEAF_ORDER) {
  if (byLeaf[leaf]) console.log(`  ${leaf.padEnd(6)} ${byLeaf[leaf]}`);
}
console.log(`Preserved ${native.length} natively authored question(s).`);
