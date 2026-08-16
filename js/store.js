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
 * @returns {{ok: true, store: object} | {ok: false, reason: string, raw?: string, store?: object}}
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

  if (typeof parsed !== "object" || parsed === null || typeof parsed.storeVersion !== "number") {
    return { ok: false, reason: "unreadable", raw };
  }

  if (parsed.storeVersion > CURRENT_VERSION) {
    // Never migrate downward -- report and read nothing rather than destroying a
    // history written by a later version of the site (SCHEMA.md §2.8).
    return { ok: false, reason: "future-version", store: parsed };
  }

  if (parsed.storeVersion < CURRENT_VERSION) {
    backupBeforeMigrate(storage, raw, parsed.storeVersion);
    let migrated = parsed;
    for (let v = parsed.storeVersion; v < CURRENT_VERSION; v++) {
      const migrate = migrations[v + 1];
      if (!migrate) {
        return { ok: false, reason: "missing-migration", store: migrated };
      }
      migrated = migrate(migrated);
    }
    pruneOldBackups(storage, parsed.storeVersion);
    return { ok: true, store: migrated };
  }

  return { ok: true, store: parsed };
}

/**
 * Saves the progress store. Never throws -- a failed write (e.g. quota exceeded)
 * returns a tagged failure instead of discarding the caller's data silently
 * (SCHEMA.md finding #6).
 */
export function saveStore(store, storage = globalThis.localStorage) {
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
