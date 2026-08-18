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
import { ELEMENT_CATEGORIES } from "../js/element-categories.js";

const KNOWN_FORMATS = ["text", "mathml", "code"];
const KNOWN_ELEMENT_CATEGORIES = ELEMENT_CATEGORIES.map((c) => c.id);

// Which reference-panel shape (SCHEMA.md §2.9 vs §2.10) each test code's bank is
// expected to carry -- mirrors run.html's REFERENCE_PANEL_KINDS. Without this,
// validateReferencePanelContent's shape-detection alone can't catch a wrong-shape
// file wired into the wrong bank's `referencePanel` slot (e.g. a 5165 §2.9 file
// copy-pasted into 5485's slot with only `testCode` fixed to match) -- it would
// self-validate cleanly as a well-formed §2.9 panel and only fail at runtime, when
// run.html looks up the renderer for "5485" and hands it §2.9-shaped data (code
// review finding, Phase 5.3).
const REFERENCE_PANEL_SHAPES = { "5165": "sections", "5485": "elements" };

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
    // Carries its own id (not just count/percent) so callers can check a question's
    // categoryId against the weight-bearing set specifically, not just "exists
    // somewhere in the tree" — a question tagged to a non-leaf ancestor category
    // passes the looser check but is invisible to every real draw (js/schema.js's
    // assembleForm only ever pulls from weight-bearing leaves).
    if (hasWeight && childWeightBearing.length === 0 && isPlainObject(node.weight)) {
      weightBearing.push({ ...node.weight, id: node.id });
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
    if (typeof o.targetShare !== "number") {
      errors.push(`overlay "${o.id}": targetShare must be a number`);
    }
  }
  return ids;
}

/**
 * `warnings`, when passed, flags a non-"text" format as a warning even though it's a
 * schema-valid `KNOWN_FORMATS` value -- question stem/option/explanation rendering
 * (run.html) only actually implements plain-text rendering today (D-21, issue #45);
 * reference-panel content (§2.9) genuinely supports mathml, so its own call site
 * below doesn't pass this. Without it, authoring a question with `format: "mathml"`
 * (copy-pasted from data/reference/5165-formulas.json, the one place in this repo
 * that pattern actually works) would pass this gate cleanly and then render as
 * literal `<math>...</math>` text on a real practice test.
 */
function validateContentField(field, fieldName, errors, context, warnings) {
  if (!isPlainObject(field)) {
    errors.push(`${context}: ${fieldName} must be an object with format/value`);
    return;
  }
  if (!KNOWN_FORMATS.includes(field.format)) {
    errors.push(`${context}: ${fieldName}.format must be one of ${KNOWN_FORMATS.join(", ")}`);
  } else if (warnings && field.format !== "text") {
    warnings.push(
      `${context}: ${fieldName}.format is "${field.format}", but question rendering only implements "text" ` +
        `today (issue #45) -- this will render as literal markup, not ${field.format}`,
    );
  }
  if (!isNonEmptyString(field.value)) {
    errors.push(`${context}: ${fieldName}.value must be a non-empty string`);
  }
}

function validateQuestions(questions, { code, weightBearingIds, overlayIds, errors, warnings }) {
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
    } else if (!weightBearingIds.has(q.categoryId)) {
      errors.push(
        `${context}: categoryId "${q.categoryId}" is not a weight-bearing leaf category — ` +
          `form assembly (SCHEMA.md §2.7) only draws from weight-bearing leaves, so a question ` +
          `tagged to a non-leaf ancestor category is never selected by any real draw`,
      );
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

    validateContentField(q.stem, "stem", errors, context, warnings);
    validateContentField(q.explanation, "explanation", errors, context, warnings);

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
        validateContentField(opt.content, "option.content", errors, `${context} option ${opt.id}`, warnings);
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
  const weightBearingIds = new Set(weightBearing.map((w) => w.id));

  validateQuestions(bank.questions ?? [], {
    code: bank.code,
    weightBearingIds,
    overlayIds,
    errors,
    warnings,
  });

  return { errors, warnings };
}

/**
 * `schemaVersion`/`testCode` header check shared by both reference-panel content
 * shapes (§2.9 and §2.10) -- was two verbatim-identical copies before this
 * extraction (code review finding, Phase 5.3). `code`, when given, is the owning
 * bank's own `code` -- cross-checked against the panel's own `testCode` so a
 * copy-pasted or mismatched reference file is caught here rather than silently
 * loaded against the wrong test.
 */
function checkPanelHeader(panel, code, errors) {
  if (panel.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!isNonEmptyString(panel.testCode)) {
    errors.push("testCode missing");
  } else if (code && panel.testCode !== code) {
    errors.push(`testCode "${panel.testCode}" does not match owning bank's code "${code}"`);
  }
}

/**
 * `Set`-backed duplicate check: pushes `message` to `errors` and returns `false`
 * if `value` was already seen, otherwise records it and returns `true`. Used
 * below for §2.10's new duplicate checks (atomicNumber, symbol, constant id) --
 * this file already had this exact pattern hand-rolled 6 times before this
 * extraction (category/question/option ids, §2.9's section/entry ids); adding a
 * 7th-9th copy for §2.10 rather than finally extracting it was flagged in code
 * review (Phase 5.3) as compounding debt a prior review had already noted and
 * left. Pre-existing call sites are left as-is -- out of this diff's scope to
 * retrofit -- but new ones use this instead of growing the count further.
 */
function checkUnique(value, seen, message, errors) {
  if (seen.has(value)) {
    errors.push(message);
    return false;
  }
  seen.add(value);
  return true;
}

/**
 * Validates a reference-panel content file against SCHEMA.md §2.9. `code`, when
 * given, is the owning bank's own `code` -- cross-checked against the panel's own
 * `testCode` so a copy-pasted or mismatched reference file is caught here rather than
 * silently loaded against the wrong test.
 */
export function validateReferencePanel(panel, { code } = {}) {
  const errors = [];
  const warnings = [];

  checkPanelHeader(panel, code, errors);

  if (!Array.isArray(panel.sections) || panel.sections.length === 0) {
    errors.push("sections must be a non-empty array");
    return { errors, warnings };
  }

  const sectionIds = new Set();
  for (const section of panel.sections) {
    const sLabel = `section ${section?.id ?? "(no id)"}`;
    if (!isPlainObject(section)) {
      errors.push(`${sLabel}: must be an object`);
      continue;
    }
    if (!isNonEmptyString(section.id)) {
      errors.push(`${sLabel}: missing or invalid id`);
    } else if (sectionIds.has(section.id)) {
      errors.push(`${sLabel}: duplicate section id`);
    } else {
      sectionIds.add(section.id);
    }
    if (!isNonEmptyString(section.heading)) errors.push(`${sLabel}: missing or invalid heading`);

    if (!Array.isArray(section.entries) || section.entries.length === 0) {
      errors.push(`${sLabel}: entries must be a non-empty array`);
      continue;
    }
    const entryIds = new Set();
    for (const entry of section.entries) {
      const eLabel = `${sLabel} entry ${entry?.id ?? "(no id)"}`;
      if (!isPlainObject(entry)) {
        errors.push(`${eLabel}: must be an object`);
        continue;
      }
      if (!isNonEmptyString(entry.id)) {
        errors.push(`${eLabel}: missing or invalid id`);
      } else if (entryIds.has(entry.id)) {
        errors.push(`${eLabel}: duplicate entry id within section`);
      } else {
        entryIds.add(entry.id);
      }
      if (!isNonEmptyString(entry.label)) errors.push(`${eLabel}: missing or invalid label`);
      validateContentField(entry.content, "content", errors, eLabel);
    }
  }

  return { errors, warnings };
}

/**
 * Validates a 5485-shaped reference panel (SCHEMA.md §2.10: a periodic table plus a
 * physical-constants table) -- a genuinely different shape from validateReferencePanel
 * above, not a variant of it, since this content is fixed-field tabular data rather
 * than prose needing a text/mathml/code discriminator. `code`, when given, is
 * cross-checked the same way validateReferencePanel does.
 */
export function validateElementsAndConstants(panel, { code } = {}) {
  const errors = [];
  const warnings = [];

  checkPanelHeader(panel, code, errors);

  if (!Array.isArray(panel.elements) || panel.elements.length === 0) {
    errors.push("elements must be a non-empty array");
  } else {
    const seenNumbers = new Set();
    const seenSymbols = new Set();
    // Catches two elements silently authored onto the same grid cell (same
    // group+period) -- each field passes its own in-range check individually, so
    // nothing else here would catch a collision, and run.html's renderer has no
    // way to detect or report an overlap at render time either (code review
    // finding, Phase 5.3).
    const seenPositions = new Set();
    for (const el of panel.elements) {
      const label = `element ${el?.symbol ?? el?.atomicNumber ?? "(unknown)"}`;
      if (!isPlainObject(el)) {
        errors.push(`${label}: must be an object`);
        continue;
      }
      if (!Number.isInteger(el.atomicNumber) || el.atomicNumber < 1) {
        errors.push(`${label}: atomicNumber must be a positive integer`);
      } else {
        checkUnique(el.atomicNumber, seenNumbers, `${label}: duplicate atomicNumber ${el.atomicNumber}`, errors);
      }
      if (!isNonEmptyString(el.symbol)) {
        errors.push(`${label}: missing or invalid symbol`);
      } else {
        checkUnique(el.symbol, seenSymbols, `${label}: duplicate symbol "${el.symbol}"`, errors);
      }
      if (!isNonEmptyString(el.name)) errors.push(`${label}: missing or invalid name`);
      if (typeof el.atomicMass !== "number" || el.atomicMass <= 0) {
        errors.push(`${label}: atomicMass must be a positive number`);
      }
      if (!KNOWN_ELEMENT_CATEGORIES.includes(el.category)) {
        errors.push(`${label}: category must be one of ${KNOWN_ELEMENT_CATEGORIES.join(", ")}`);
      }
      const validGroup = Number.isInteger(el.group) && el.group >= 1 && el.group <= 18;
      if (!validGroup) errors.push(`${label}: group must be an integer 1-18`);
      const validPeriod = Number.isInteger(el.period) && el.period >= 1 && el.period <= 9;
      if (!validPeriod) {
        errors.push(`${label}: period must be an integer 1-9 (8/9 are the lanthanide/actinide display rows)`);
      }
      if (validGroup && validPeriod) {
        checkUnique(
          `${el.group},${el.period}`,
          seenPositions,
          `${label}: grid position (group ${el.group}, period ${el.period}) is already used by another element`,
          errors,
        );
      }
    }
  }

  if (!Array.isArray(panel.constants) || panel.constants.length === 0) {
    errors.push("constants must be a non-empty array");
  } else {
    const seenIds = new Set();
    for (const c of panel.constants) {
      const label = `constant ${c?.id ?? "(no id)"}`;
      if (!isPlainObject(c)) {
        errors.push(`${label}: must be an object`);
        continue;
      }
      if (!isNonEmptyString(c.id)) {
        errors.push(`${label}: missing or invalid id`);
      } else {
        checkUnique(c.id, seenIds, `${label}: duplicate constant id`, errors);
      }
      if (!isNonEmptyString(c.name)) errors.push(`${label}: missing or invalid name`);
      if (!isNonEmptyString(c.symbol)) errors.push(`${label}: missing or invalid symbol`);
      if (!isNonEmptyString(c.value)) errors.push(`${label}: missing or invalid value`);
      if (!isNonEmptyString(c.unit)) errors.push(`${label}: missing or invalid unit`);
    }
  }

  return { errors, warnings };
}

/**
 * Dispatches a loaded reference-panel file to the validator matching its actual
 * shape (SCHEMA.md §2.9 `sections` vs §2.10 `elements`/`constants`), rather than
 * hardcoding which test code implies which shape -- keeps this dispatch in the one
 * place it needs to change if a future test's reference panel introduces a third
 * shape. Also cross-checks the detected shape against `REFERENCE_PANEL_SHAPES[code]`
 * when `code` is known: shape-detection alone would let a wrong-shape file wired
 * into the wrong bank's `referencePanel` slot self-validate cleanly (its `testCode`
 * can be edited to match without touching its actual shape) and only fail later, at
 * runtime, when run.html hands that data to the renderer its own `bank.code` picks
 * (code review finding, Phase 5.3).
 */
export function validateReferencePanelContent(panel, { code } = {}) {
  const actualShape = Array.isArray(panel?.sections)
    ? "sections"
    : Array.isArray(panel?.elements) || Array.isArray(panel?.constants)
      ? "elements"
      : null;
  if (!actualShape) {
    return {
      errors: [`unrecognized reference panel shape -- expected "sections" (§2.9) or "elements"/"constants" (§2.10)`],
      warnings: [],
    };
  }
  const expectedShape = code ? REFERENCE_PANEL_SHAPES[code] : undefined;
  if (expectedShape && expectedShape !== actualShape) {
    return {
      errors: [
        `bank code "${code}" expects a "${expectedShape}"-shaped reference panel (per REFERENCE_PANEL_SHAPES), ` +
          `but this file is "${actualShape}"-shaped`,
      ],
      warnings: [],
    };
  }
  return actualShape === "sections" ? validateReferencePanel(panel, { code }) : validateElementsAndConstants(panel, { code });
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

      if (isNonEmptyString(bank.referencePanel)) {
        const panelPath = path.join(dataDir, bank.referencePanel);
        if (existsSync(panelPath)) {
          let panel;
          try {
            panel = await loadJson(panelPath);
          } catch (e) {
            report(bank.referencePanel, [`invalid JSON: ${e.message}`], []);
            allErrors += 1;
            continue;
          }
          const { errors: pErrors, warnings: pWarnings } = validateReferencePanelContent(panel, { code: bank.code });
          report(bank.referencePanel, pErrors, pWarnings);
          allErrors += pErrors.length;
          allWarnings += pWarnings.length;
        } // else already reported by validateBank's own referencePanel existence check
      }
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
