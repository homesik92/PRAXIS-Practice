// Progress-store persistence: load, save, and the backup-before-migrate safety net
// from SCHEMA.md §2.8. This is Phase 0.2 -- only the safety net and the top-level
// load/save envelope. Attempt/answer read-write helpers (SCHEMA.md's write-per-answer
// cadence, résumé lookup, spaced repetition) land in Phase 2.2.
//
// Every function here takes a `storage` parameter (defaulting to the browser's
// localStorage) rather than reaching for the global directly, so this module can be
// unit-tested under Node with a mock -- see tools/test-store.mjs.

export const STORAGE_KEY = "praxis-practice";
export const CURRENT_VERSION = 1;

export function defaultStore() {
  return { storeVersion: CURRENT_VERSION, attempts: [], questionHistory: {} };
}

// Migrations keyed by the version they migrate *to*. migrations[2] takes a v1 store
// and returns a v2 store. Empty today -- storeVersion has never changed. Every
// migration must be additive-first per SKILL.md's launch-and-cutover discipline.
const migrations = {};

function backupBeforeMigrate(storage, rawValue, fromVersion) {
  storage.setItem(`${STORAGE_KEY}.backup.v${fromVersion}`, rawValue);
}

// Retention: keep only the immediately-prior version's backup (SCHEMA.md finding #8).
// Called right after a backup is created, independent of whether the migration chain
// that follows actually completes -- the retention invariant must hold even when a
// migration is missing partway through (code review finding: it previously didn't).
function pruneOldBackups(storage, keepVersion) {
  const prefix = `${STORAGE_KEY}.backup.v`;
  const keepKey = `${prefix}${keepVersion}`;
  const toRemove = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(prefix) && key !== keepKey) toRemove.push(key);
  }
  for (const key of toRemove) storage.removeItem(key);
}

/**
 * Loads the progress store. Never throws -- every failure mode returns a tagged
 * result instead, per SCHEMA.md's "storage failures are visible, never silent" rule
 * (finding #6). A corrupted value is left in storage untouched, not overwritten, so
 * it stays inspectable/recoverable via devtools.
 *
 * The `store` field appears ONLY on `ok: true` -- a rejected/partial value (from a
 * newer-than-supported version, or a migration chain that hit a missing step) is
 * returned under `rejected`, a deliberately different key, so a caller that forgets
 * to check `ok` gets `undefined` from `result.store` instead of a plausible-looking
 * object it was never safe to read (code review finding: the original shape made
 * that mistake easy).
 *
 * loadStore does NOT persist a migrated result back to storage -- that's the
 * caller's job (call saveStore(result.store) if you want a successful migration to
 * stick). Re-loading before saving safely re-runs backup+migrate against the same
 * original data; see tools/test-store.mjs's idempotency test.
 *
 * @returns {{ok: true, store: object}
 *         | {ok: false, reason: "unreadable", raw: string}
 *         | {ok: false, reason: "future-version", rejected: object}
 *         | {ok: false, reason: "missing-migration", rejected: object}
 *         | {ok: false, reason: "migration-failed", error: Error}}
 */
export function loadStore(storage = globalThis.localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) {
    return { ok: true, store: defaultStore() };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "unreadable", raw };
  }

  // Number.isInteger rejects NaN, Infinity, and non-numbers alike -- `typeof x ===
  // "number"` alone lets NaN through (typeof NaN is "number"), and NaN compares
  // false against CURRENT_VERSION on both sides, which silently fell through to
  // "valid, current-version data" in an earlier version of this check (code review
  // finding).
  if (typeof parsed !== "object" || parsed === null || !Number.isInteger(parsed.storeVersion)) {
    return { ok: false, reason: "unreadable", raw };
  }

  if (parsed.storeVersion > CURRENT_VERSION) {
    // Never migrate downward -- report and read nothing rather than destroying a
    // history written by a later version of the site (SCHEMA.md §2.8).
    return { ok: false, reason: "future-version", rejected: parsed };
  }

  if (parsed.storeVersion < CURRENT_VERSION) {
    // The whole migration path is wrapped: backupBeforeMigrate and pruneOldBackups
    // call storage.setItem/removeItem, which can throw (quota exceeded is the
    // realistic case, and it's most likely to happen exactly here, since a backup
    // temporarily doubles this key's footprint). Without this try/catch, loadStore's
    // own documented "never throws" contract broke at the one call site guarding the
    // project's only backup mechanism (code review finding).
    try {
      backupBeforeMigrate(storage, raw, parsed.storeVersion);
      pruneOldBackups(storage, parsed.storeVersion);

      let migrated = parsed;
      for (let v = parsed.storeVersion; v < CURRENT_VERSION; v++) {
        const migrate = migrations[v + 1];
        if (!migrate) {
          return { ok: false, reason: "missing-migration", rejected: migrated };
        }
        migrated = migrate(migrated);
      }
      return { ok: true, store: migrated };
    } catch (error) {
      return { ok: false, reason: "migration-failed", error };
    }
  }

  return { ok: true, store: parsed };
}

/**
 * Saves the progress store. Never throws -- a failed write (e.g. quota exceeded)
 * returns a tagged failure instead of discarding the caller's data silently
 * (SCHEMA.md finding #6).
 *
 * This performs an unconditional whole-object overwrite. That is exactly the shape
 * SCHEMA.md's finding #2 warns against for cross-tab safety, and it is deliberately
 * out of scope here -- the per-answer write cadence (Phase 2.2) and the cross-tab
 * `storage`-event reconciliation (Phase 2.2/2.3) both have to be built on top of this
 * function, not assumed to fall out of it for free.
 *
 * Rejects a store whose storeVersion isn't the current version rather than writing
 * it silently: saving a mismatched storeVersion would make the very next loadStore
 * call reject the data as unreadable or future-version, discovered only on the next
 * load with no signal at write time (code review finding).
 */
export function saveStore(store, storage = globalThis.localStorage) {
  if (!store || store.storeVersion !== CURRENT_VERSION) {
    return { ok: false, reason: "invalid-store-version" };
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "write-failed", error };
  }
}

// Exposed for tools/test-store.mjs to exercise the backup/retention mechanism
// directly, independent of a real migration existing yet.
export const _internal = { backupBeforeMigrate, pruneOldBackups };
