#!/usr/bin/env node
// Merges natively-authored 5436 questions from .authoring/*.json into the bank.
//
// Phase 7.4 authors 5436's Life Science and Earth & Space Science content -- the ~48%
// of the test that 5485 does not cover and `derivedFrom` therefore cannot supply. Each
// authoring agent writes one file per leaf into `.authoring/` (gitignored, but on the
// real filesystem rather than a session scratchpad, so a session-limit interrupt cannot
// destroy completed work).
//
// This script is the mechanical merge step: it validates each file hard, then writes
// the questions into data/tests/5436.json alongside the derived ones and refreshes the
// manifest's bankSize.
//
// It is SAFE TO RE-RUN. Derived questions (those carrying `derivedFrom`) are never
// touched -- tools/derive-5436.mjs owns those. Native questions are replaced wholesale
// by whatever `.authoring/` currently holds, so re-running after an agent extends its
// file simply picks up the longer version.
//
// Usage:  node tools/merge-authored-5436.mjs [--dry-run]
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const AUTHORING = path.join(ROOT, ".authoring");
const BANK = path.join(ROOT, "data", "tests", "5436.json");
const MANIFEST = path.join(ROOT, "data", "manifest.json");
const DRY = process.argv.includes("--dry-run");

const bank = JSON.parse(fs.readFileSync(BANK, "utf8"));

// The leaves a native question may be filed under, read from the bank's own tree rather
// than hardcoded, so this cannot drift from the category structure.
const leafIds = new Set();
(function walk(nodes) {
  for (const n of nodes ?? []) {
    if (n.children?.length) walk(n.children);
    else if (n.weight) leafIds.add(n.id);
  }
})(bank.categories);

const overlayIds = new Set((bank.overlays ?? []).map((o) => o.id));

if (!fs.existsSync(AUTHORING)) {
  console.error(`No .authoring/ directory at ${AUTHORING} -- nothing to merge.`);
  process.exit(1);
}
const files = fs.readdirSync(AUTHORING).filter((f) => f.endsWith(".json")).sort();
if (files.length === 0) {
  console.error("No .json files in .authoring/ -- nothing to merge.");
  process.exit(1);
}

const problems = [];
const skipped = [];
const collected = [];
const seenIds = new Set();
const perFile = [];

for (const file of files) {
  const full = path.join(AUTHORING, file);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (e) {
    // An agent interrupted mid-write leaves truncated JSON. This is a WARNING, not a
    // blocking problem: the whole point of one file per leaf is that a dead agent
    // costs its own leaf and nothing else. Blocking here would make one truncated
    // file hold three finished leaves hostage.
    skipped.push(`${file}: invalid JSON (${e.message.slice(0, 60)}) -- re-run this leaf's agent`);
    continue;
  }
  if (!Array.isArray(parsed)) {
    skipped.push(`${file}: expected a top-level JSON array of questions -- re-run this leaf's agent`);
    continue;
  }

  for (const [i, q] of parsed.entries()) {
    const where = `${file}[${i}] ${q?.id ?? "(no id)"}`;
    const bad = (msg) => problems.push(`${where}: ${msg}`);

    if (typeof q?.id !== "string" || !q.id.startsWith("5436-")) bad('id must be a string prefixed "5436-"');
    else if (seenIds.has(q.id)) bad("duplicate question id across the authoring set");
    else seenIds.add(q.id);

    if (q?.derivedFrom !== undefined) bad("native questions must not carry derivedFrom");
    if (q?.type !== "single") bad('type must be "single"');
    if (!leafIds.has(q?.categoryId)) bad(`categoryId "${q?.categoryId}" is not a weight-bearing leaf`);
    if (q?.retired !== false && q?.retired !== true) bad("retired must be a boolean");

    for (const [field, label] of [[q?.stem, "stem"], [q?.explanation, "explanation"]]) {
      if (typeof field?.value !== "string" || field.value.trim() === "") bad(`${label} must be {format, value} with a non-empty value`);
      else if (field.format !== "text" && field.format !== "mathml" && field.format !== "code") bad(`${label}.format is not a known format`);
    }

    const opts = q?.options;
    if (!Array.isArray(opts) || opts.length !== 4) bad("must have exactly 4 options");
    else {
      if (opts.map((o) => o?.id).join("") !== "abcd") bad("option ids must be exactly a,b,c,d in order");
      for (const o of opts) {
        if (typeof o?.content?.value !== "string" || o.content.value.trim() === "") bad(`option ${o?.id} has an empty content value`);
      }
      const texts = opts.map((o) => o?.content?.value?.trim());
      if (new Set(texts).size !== texts.length) bad("two options have identical text");
    }

    if (!Array.isArray(q?.correct) || q.correct.length !== 1) bad("correct must be an array with exactly one option id");
    else if (!Array.isArray(opts) || !opts.some((o) => o?.id === q.correct[0])) bad(`correct "${q.correct[0]}" does not name one of this question's options`);

    if (q?.overlays !== undefined) {
      if (!Array.isArray(q.overlays)) bad("overlays must be an array");
      else for (const ov of q.overlays) if (!overlayIds.has(ov)) bad(`overlay "${ov}" is not declared by the bank`);
    }

    // The letter/ordinal bug: options are shuffled on every draw and letters are never
    // rendered, so an explanation naming one by position points at nothing.
    const expl = q?.explanation?.value ?? "";
    const letterRef = expl.match(/\b(option|choice)s?\s+[a-d]\b|\bthe (first|second|third|fourth|last) (option|choice|answer)\b/i);
    if (letterRef) bad(`explanation references an option by position ("${letterRef[0]}") -- options are shuffled`);

    // Collected regardless; any problem above aborts the whole run before writing.
    collected.push(q);
  }
  perFile.push({ file, count: parsed.length, leaf: parsed[0]?.categoryId ?? "?" });
}

if (skipped.length) {
  console.warn(`\n${skipped.length} file(s) skipped (other leaves still merge):`);
  for (const w of skipped) console.warn("  ! " + w);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s) found:\n`);
  for (const p of problems.slice(0, 40)) console.error("  - " + p);
  if (problems.length > 40) console.error(`  ... and ${problems.length - 40} more`);
  console.error("\nNothing was written. Fix the authoring output and re-run.");
  process.exit(1);
}

const derived = bank.questions.filter((q) => q.derivedFrom);
const next = { ...bank, questions: [...derived, ...collected] };

console.log("Merging natively authored questions into 5436:");
for (const { file, count, leaf } of perFile) console.log(`  ${file.padEnd(18)} ${String(count).padStart(3)}  -> ${leaf}`);
console.log(`  ${"".padEnd(18)} ---`);
console.log(`  derived (untouched) ${derived.length}`);
console.log(`  native (merged)     ${collected.length}`);
console.log(`  bank total          ${next.questions.length}`);

const perLeaf = {};
for (const q of next.questions) perLeaf[q.categoryId] = (perLeaf[q.categoryId] || 0) + 1;
console.log("\nPer leaf:", JSON.stringify(perLeaf));

if (DRY) {
  console.log("\n--dry-run: nothing written.");
  process.exit(0);
}

fs.writeFileSync(BANK, JSON.stringify(next, null, 2) + "\n");

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const entry = manifest.tests.find((t) => t.code === "5436");
if (entry && entry.bankSize !== next.questions.length) {
  entry.bankSize = next.questions.length;
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nmanifest bankSize updated to ${entry.bankSize}`);
}
console.log("\nWrote data/tests/5436.json. Run: node tools/verify.mjs");
