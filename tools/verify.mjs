#!/usr/bin/env node
// Local verification gate (SCHEMA.md, ROADMAP.md Phase 0.1). Pure Node — no
// dependencies, no package.json. Validates the manifest and every bank file it
// registers against the shape and invariants in SCHEMA.md. This is the project's
// only gate until CI exists (see CLAUDE.md "Verification").
//
// Usage: node tools/verify.mjs [data-dir]   (defaults to ./data)

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KNOWN_FORMATS = ["text", "mathml", "code"];

function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.length > 0;
}

/**
 * Walks a category tree, checking id uniqueness/shape, and returns the set of
 * "weight-bearing leaf" nodes — the deepest nodes in each branch that publish a
 * weight, per SCHEMA.md §2.4 ("Weights are authoritative at the deepest level that
 * publishes them").
 */
function walkCategories(nodes, { seenIds, errors, pathLabel }) {
  const weightBearing = [];
  if (!Array.isArray(nodes)) {
    errors.push(`${pathLabel}: categories must be an array`);
    return weightBearing;
  }
  for (const node of nodes) {
    if (!isPlainObject(node)) {
      errors.push(`${pathLabel}: category node must be an object`);
      continue;
    }
    const label = `${pathLabel} > ${node.id ?? "?"}`;
    if (!isNonEmptyString(node.id)) {
      errors.push(`${label}: missing or invalid id`);
    } else if (seenIds.has(node.id)) {
      errors.push(`${label}: duplicate category id "${node.id}"`);
    } else {
      seenIds.add(node.id);
    }
    if (!isNonEmptyString(node.label)) {
      errors.push(`${label}: missing or invalid label`);
    }

    const hasWeight = node.weight !== null && node.weight !== undefined;
    if (hasWeight) {
      if (
        !isPlainObject(node.weight) ||
        typeof node.weight.count !== "number" ||
        typeof node.weight.percent !== "number"
      ) {
        errors.push(`${label}: weight must be null or {count, percent} numbers`);
      }
    }

    let childWeightBearing = [];
    if (node.children !== undefined) {
      childWeightBearing = walkCategories(node.children, { seenIds, errors, pathLabel: label });
    }

    // A node is weight-bearing only if it publishes a weight AND none of its
    // descendants do — weights are authoritative at the deepest published level.
    if (hasWeight && childWeightBearing.length === 0 && isPlainObject(node.weight)) {
      weightBearing.push(node.weight);
    }
    weightBearing.push(...childWeightBearing);
  }
  return weightBearing;
}

function validateOverlays(overlays, errors) {
  const ids = new Set();
  if (overlays === undefined) return ids;
  if (!Array.isArray(overlays)) {
    errors.push("overlays must be an array if present");
    return ids;
  }
  for (const o of overlays) {
    if (!isPlainObject(o) || !isNonEmptyString(o.id)) {
      errors.push("overlay entry missing a valid id");
      continue;
    }
    if (ids.has(o.id)) errors.push(`duplicate overlay id "${o.id}"`);
    ids.add(o.id);
    if (!isNonEmptyString(o.label)) errors.push(`overlay "${o.id}": missing label`);
  }
  return ids;
}

function validateContentField(field, fieldName, errors, context) {
  if (!isPlainObject(field)) {
    errors.push(`${context}: ${fieldName} must be an object with format/value`);
    return;
  }
  if (!KNOWN_FORMATS.includes(field.format)) {
    errors.push(`${context}: ${fieldName}.format must be one of ${KNOWN_FORMATS.join(", ")}`);
  }
  if (!isNonEmptyString(field.value)) {
    errors.push(`${context}: ${fieldName}.value must be a non-empty string`);
  }
}

function validateQuestions(questions, { code, categoryIds, overlayIds, errors, warnings }) {
  if (!Array.isArray(questions)) {
    errors.push("questions must be an array");
    return;
  }
  const seenIds = new Set();
  for (const q of questions) {
    const context = `question ${q?.id ?? "(no id)"}`;
    if (!isNonEmptyString(q.id) || !q.id.startsWith(`${code}-`)) {
      errors.push(`${context}: id must be a string prefixed "${code}-"`);
    } else if (seenIds.has(q.id)) {
      errors.push(`${context}: duplicate question id`);
    } else {
      seenIds.add(q.id);
    }

    if (!isNonEmptyString(q.type)) {
      errors.push(`${context}: type must be a non-empty string`);
    } else if (q.type !== "single") {
      warnings.push(`${context}: type "${q.type}" is not implemented in v1 (D-10) — only "single" is`);
    }

    if (!isNonEmptyString(q.categoryId)) {
      errors.push(`${context}: categoryId missing`);
    } else if (!categoryIds.has(q.categoryId)) {
      errors.push(`${context}: categoryId "${q.categoryId}" does not exist in this bank's category tree`);
    }

    if (q.overlays !== undefined) {
      if (!Array.isArray(q.overlays)) {
        errors.push(`${context}: overlays must be an array if present`);
      } else {
        for (const ov of q.overlays) {
          if (!overlayIds.has(ov)) errors.push(`${context}: overlay "${ov}" is not declared in this bank`);
        }
      }
    }

    if (q.retired !== undefined && typeof q.retired !== "boolean") {
      errors.push(`${context}: retired must be a boolean if present`);
    }

    validateContentField(q.stem, "stem", errors, context);
    validateContentField(q.explanation, "explanation", errors, context);

    const optionIds = new Set();
    if (!Array.isArray(q.options) || q.options.length < 2) {
      errors.push(`${context}: options must be an array of at least 2 entries`);
    } else {
      for (const opt of q.options) {
        if (!isPlainObject(opt) || !isNonEmptyString(opt.id)) {
          errors.push(`${context}: each option needs a valid id`);
          continue;
        }
        if (optionIds.has(opt.id)) errors.push(`${context}: duplicate option id "${opt.id}"`);
        optionIds.add(opt.id);
        validateContentField(opt.content, "option.content", errors, `${context} option ${opt.id}`);
      }
    }

    if (!Array.isArray(q.correct) || q.correct.length === 0) {
      errors.push(`${context}: correct must be a non-empty array`);
    } else {
      for (const c of q.correct) {
        if (!optionIds.has(c)) errors.push(`${context}: correct references unknown option id "${c}"`);
      }
    }

    if (q.authored !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(q.authored)) {
      warnings.push(`${context}: authored date "${q.authored}" doesn't look like YYYY-MM-DD`);
    } else if (q.authored === undefined) {
      warnings.push(`${context}: no authored date`);
    }
  }
}

export function validateBank(bank, { dataDir } = {}) {
  const errors = [];
  const warnings = [];

  if (bank.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!isNonEmptyString(bank.code)) errors.push("code missing");
  if (!isNonEmptyString(bank.name)) errors.push("name missing");
  if (typeof bank.timeLimitMinutes !== "number" || bank.timeLimitMinutes <= 0) {
    errors.push("timeLimitMinutes must be a positive number");
  }
  if (typeof bank.formLength !== "number" || bank.formLength <= 0) {
    errors.push("formLength must be a positive number");
  }

  if (bank.referencePanel !== undefined) {
    if (!isNonEmptyString(bank.referencePanel)) {
      errors.push("referencePanel must be a string path if present");
    } else if (dataDir && !existsSync(path.join(dataDir, bank.referencePanel))) {
      errors.push(`referencePanel "${bank.referencePanel}" does not exist under ${dataDir}`);
    }
  }

  const categoryIds = new Set();
  const weightBearing = walkCategories(bank.categories, { seenIds: categoryIds, errors, pathLabel: "categories" });

  if (weightBearing.length === 0) {
    errors.push("no weight-bearing categories found — form assembly (SCHEMA.md §2.7) has nothing to draw against");
  } else if (typeof bank.formLength === "number") {
    const countSum = weightBearing.reduce((s, w) => s + w.count, 0);
    const percentSum = weightBearing.reduce((s, w) => s + w.percent, 0);
    if (countSum !== bank.formLength) {
      errors.push(`weight-bearing category counts sum to ${countSum}, expected formLength ${bank.formLength}`);
    }
    if (Math.abs(percentSum - 100) > 1) {
      errors.push(`weight-bearing category percents sum to ${percentSum}, expected ~100`);
    }
  }

  const overlayIds = validateOverlays(bank.overlays, errors);

  validateQuestions(bank.questions ?? [], {
    code: bank.code,
    categoryIds,
    overlayIds,
    errors,
    warnings,
  });

  return { errors, warnings };
}

export function validateManifest(manifest, dataDir) {
  const errors = [];
  const warnings = [];

  if (manifest.schemaVersion !== 1) errors.push("manifest schemaVersion must be 1");
  if (!Array.isArray(manifest.tests)) {
    errors.push("manifest.tests must be an array");
    return { errors, warnings };
  }

  const seenCodes = new Set();
  for (const entry of manifest.tests) {
    const label = `manifest entry ${entry?.code ?? "(no code)"}`;
    if (!isNonEmptyString(entry.code)) {
      errors.push(`${label}: code missing`);
    } else if (seenCodes.has(entry.code)) {
      errors.push(`${label}: duplicate test code`);
    } else {
      seenCodes.add(entry.code);
    }
    if (!isNonEmptyString(entry.file)) {
      errors.push(`${label}: file missing`);
    } else if (dataDir && !existsSync(path.join(dataDir, entry.file))) {
      errors.push(`${label}: file "${entry.file}" does not exist under ${dataDir}`);
    }
    if (typeof entry.enabled !== "boolean") {
      errors.push(`${label}: enabled must be a boolean`);
    }
  }

  return { errors, warnings };
}

async function loadJson(filePath) {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

async function main() {
  const dataDir = path.resolve(process.argv[2] ?? "data");
  const manifestPath = path.join(dataDir, "manifest.json");

  if (!existsSync(manifestPath)) {
    console.error(`No manifest.json found at ${manifestPath}`);
    process.exitCode = 1;
    return;
  }

  let allErrors = 0;
  let allWarnings = 0;

  const manifest = await loadJson(manifestPath);
  const { errors: mErrors, warnings: mWarnings } = validateManifest(manifest, dataDir);
  report("manifest.json", mErrors, mWarnings);
  allErrors += mErrors.length;
  allWarnings += mWarnings.length;

  if (Array.isArray(manifest.tests)) {
    for (const entry of manifest.tests) {
      if (!entry.enabled || !entry.file) continue;
      const bankPath = path.join(dataDir, entry.file);
      if (!existsSync(bankPath)) continue; // already reported above
      let bank;
      try {
        bank = await loadJson(bankPath);
      } catch (e) {
        report(entry.file, [`invalid JSON: ${e.message}`], []);
        allErrors += 1;
        continue;
      }
      const { errors, warnings } = validateBank(bank, { dataDir });
      report(entry.file, errors, warnings);
      allErrors += errors.length;
      allWarnings += warnings.length;
    }
  }

  console.log(`\n${allErrors} error(s), ${allWarnings} warning(s).`);
  process.exitCode = allErrors > 0 ? 1 : 0;
}

function report(label, errors, warnings) {
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`OK   ${label}`);
    return;
  }
  console.log(`--   ${label}`);
  for (const e of errors) console.log(`  ERROR   ${e}`);
  for (const w of warnings) console.log(`  WARN    ${w}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main();
}
