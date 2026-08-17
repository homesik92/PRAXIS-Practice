// Manifest and bank loading -- Phase 1.1's placeholder version. Only what S1 (list
// enabled tests) and S2 (show one test's name and a "take a practice test" entry)
// need. Category-tree traversal, overlays, and weight-correct form assembly (SCHEMA.md
// §2.4-2.7) land in Phase 2.1, which replaces this file's draw logic wholesale -- see
// ROADMAP.md Phase 2's note.
//
// Every function takes a `fetchImpl` parameter (defaulting to the global `fetch`)
// rather than reaching for it directly, so the shaping logic here is unit-testable
// under Node against a mock -- see tools/test-schema.mjs. Mirrors js/store.js's
// `storage` injection for the same reason.

/**
 * Fetches and parses manifest.json, returning only its enabled entries.
 * Never throws -- a fetch failure or invalid JSON returns a tagged failure, matching
 * store.js's "storage failures are visible, never silent" convention (SCHEMA.md
 * finding #6) extended to network/data-loading failures.
 *
 * @returns {Promise<{ok: true, tests: {code: string, file: string}[]}
 *                  | {ok: false, reason: "fetch-failed" | "invalid-json", error?: Error}>}
 */
export async function loadManifest(fetchImpl = globalThis.fetch, manifestUrl = "data/manifest.json") {
  let response;
  try {
    response = await fetchImpl(manifestUrl);
  } catch (error) {
    return { ok: false, reason: "fetch-failed", error };
  }
  if (!response.ok) {
    return { ok: false, reason: "fetch-failed", error: new Error(`HTTP ${response.status}`) };
  }
  let manifest;
  try {
    manifest = await response.json();
  } catch (error) {
    return { ok: false, reason: "invalid-json", error };
  }
  const tests = Array.isArray(manifest.tests) ? manifest.tests.filter((t) => t && t.enabled) : [];
  return { ok: true, tests: tests.map((t) => ({ code: t.code, file: t.file })) };
}

/**
 * Fetches and parses one bank file, returning only the fields S1/S2 need at this
 * phase (name, timing, question count). Same never-throws convention as loadManifest.
 *
 * @returns {Promise<{ok: true, bank: {code: string, name: string, timeLimitMinutes: number, formLength: number, questionCount: number}}
 *                  | {ok: false, reason: "fetch-failed" | "invalid-json", error?: Error}>}
 */
export async function loadBankSummary(file, fetchImpl = globalThis.fetch, dataDir = "data") {
  let response;
  try {
    response = await fetchImpl(`${dataDir}/${file}`);
  } catch (error) {
    return { ok: false, reason: "fetch-failed", error };
  }
  if (!response.ok) {
    return { ok: false, reason: "fetch-failed", error: new Error(`HTTP ${response.status}`) };
  }
  let bank;
  try {
    bank = await response.json();
  } catch (error) {
    return { ok: false, reason: "invalid-json", error };
  }
  return {
    ok: true,
    bank: {
      code: bank.code,
      name: bank.name,
      timeLimitMinutes: bank.timeLimitMinutes,
      formLength: bank.formLength,
      questionCount: Array.isArray(bank.questions) ? bank.questions.length : 0,
    },
  };
}

/**
 * Loads the manifest and every enabled test's bank summary together -- what S1 needs
 * to render its list in one call. Skips (rather than fails outright on) a bank that
 * fails to load, since one broken bank shouldn't blank the whole index; the caller can
 * inspect `failed` to surface that.
 *
 * @returns {Promise<{ok: true, tests: {code: string, name: string, timeLimitMinutes: number, formLength: number, questionCount: number}[], failed: string[]}
 *                  | {ok: false, reason: "fetch-failed" | "invalid-json", error?: Error}>}
 */
export async function loadTestList(fetchImpl = globalThis.fetch, dataDir = "data") {
  const manifestResult = await loadManifest(fetchImpl, `${dataDir}/manifest.json`);
  if (!manifestResult.ok) return manifestResult;

  const tests = [];
  const failed = [];
  for (const entry of manifestResult.tests) {
    const summary = await loadBankSummary(entry.file, fetchImpl, dataDir);
    if (summary.ok) {
      tests.push(summary.bank);
    } else {
      failed.push(entry.code);
    }
  }
  return { ok: true, tests, failed };
}
