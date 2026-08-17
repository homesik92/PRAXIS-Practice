// Spaced-repetition scheduling (SCHEMA.md §2.8, D-8) -- an SM-2-style schedule,
// deliberately the simple version. Kept pure and DOM-free, like js/schema.js's shaping
// logic and js/runner.js's scoring -- so it can be unit-tested under Node with a plain
// fixture entry, no storage, no DOM. run.html owns writing the result into
// store.questionHistory alongside recordAnswer's per-answer write.

const BOOTSTRAP_INTERVAL_DAYS = 1;
const BOOTSTRAP_EASE = 2.5;
const EASE_INCREMENT = 0.1;
const EASE_DECREMENT = 0.2;
const EASE_FLOOR = 1.3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Computes the next questionHistory entry for one question after an answer.
 *
 * A question's first-ever answer initializes `intervalDays: 1, ease: 2.5` (standard
 * SM-2 defaults) before the recurrence below applies (SCHEMA.md §2.8) -- pass
 * `entry: undefined` (or any falsy value) for a question with no history entry yet.
 *
 * Recurrence: correct -> `intervalDays = max(1, round(intervalDays * ease))` and
 * `ease += 0.1`; incorrect -> `intervalDays = 1` and `ease -= 0.2`, floored at 1.3
 * (SCHEMA.md leaves the exact ease deltas unstated beyond "small"/floored at 1.3 --
 * these are the standard SM-2 constants, chosen because the 1.3 floor SCHEMA.md
 * already specifies is itself the standard SM-2 floor).
 *
 * @param {{seen: number, correct: number, intervalDays: number, ease: number} | undefined} entry
 * @param {boolean} correct
 * @param {() => Date} [now]
 * @returns {{seen: number, correct: number, lastSeenAt: string, dueAt: string, intervalDays: number, ease: number}}
 */
export function updateHistory(entry, correct, now = () => new Date()) {
  const base = entry ?? { seen: 0, correct: 0, intervalDays: BOOTSTRAP_INTERVAL_DAYS, ease: BOOTSTRAP_EASE };

  const intervalDays = correct
    ? Math.max(1, Math.round(base.intervalDays * base.ease))
    : 1;
  const ease = correct
    ? base.ease + EASE_INCREMENT
    : Math.max(EASE_FLOOR, base.ease - EASE_DECREMENT);

  const nowDate = now();
  const dueAt = new Date(nowDate.getTime() + intervalDays * MS_PER_DAY);

  return {
    seen: base.seen + 1,
    correct: base.correct + (correct ? 1 : 0),
    lastSeenAt: nowDate.toISOString(),
    dueAt: dueAt.toISOString(),
    intervalDays,
    ease,
  };
}
