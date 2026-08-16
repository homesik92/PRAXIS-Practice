# Launch & Cutover Methodology (production deploys and live-data migrations)

When to read this: a project is approaching its first production cutover, a deploy is about to reach real users, or a migration changes the shape or content of live data. SKILL.md's loop ends at "live-test on staging"; this document covers the step after that — the one that can't be retried cheaply. Read it at the *planning* stage of such work, so its requirements land in the plan rather than being retrofitted.

Three properties every launch must have: **reversible** (a tested way back), **observable** (you can tell within minutes whether it's healthy), and **incremental** (exposure grows in steps, not all at once). A launch plan missing one of the three is a design finding to fix before scheduling the launch, not a risk to accept silently.

## The rollback plan comes first

Write the rollback plan before the deploy, not during the incident. It fits on half a page:

- **Trigger conditions** — decided in advance and numeric where possible, so rolling back is a lookup, not a debate under pressure:
  - Error rate more than ~2× baseline → roll back. Elevated but under that → hold exposure where it is and investigate.
  - p95 latency more than ~50% worse than baseline → roll back; 20–50% worse → hold.
  - Any *new class* of client-side error appearing in more than a trickle of sessions → roll back.
  - A key usage metric down more than ~5% → roll back; less than that may be noise → hold and watch.
- **Mechanism and time target** — know which lever gets pulled and how long it takes: feature-flag flip (< 1 minute), redeploy the previous version (< 5 minutes), restore data (< 15 minutes, and only if rehearsed). Dry-run the mechanism before launch day; an untested rollback plan is a hope, not a plan.
- **Data considerations** — if the new version writes data the old version can't read, rolling back the binary doesn't roll back the damage. Answer "what happens to data written during the bad window?" in writing before deploying.

## Staged exposure and the first-hour watch

Grow exposure in steps, with a bake period at each step and advancement only when the current step has baked clean. At small scale the "percentages" are usually people — the contributors first, then a few trusted testers, then everyone — but the structure is the same as a 1% → 10% → 100% canary.

The first hour after any production deploy is a watch, not a walk-away:

- [ ] Health check passes and the critical flow is manually exercised end to end.
- [ ] Logs are flowing and readable; **no new error types** — not merely "the error rate looks OK."
- [ ] Latency in line with baseline.
- [ ] The rollback lever is confirmed ready (flag reachable, previous version still deployable).

Nobody watching the first hour is itself a launch-plan defect — as is "it's Friday afternoon, let's ship it."

## Expand/contract: changing the shape of live data

Never change a field in place, and never ship a data-shape change and the code that depends on it in the same deploy. The sequence (renaming `name` → `fullName` as the canonical example):

1. **Expand** — add the new field as optional; deploy. Old and new code are both valid against the data.
2. **Dual-write** — write both fields; deploy.
3. **Backfill** — fill the new field on existing records, in batches, off the hot path, resumable if interrupted.
4. **Switch reads** to the new field, still dual-writing; deploy and let it bake.
5. **Contract** — stop writing the old field, then remove it, in a separate, later deploy.

Every step leaves the system consistent even if the next step never happens, and every migration has a tested way back — written and run *before* merge, not sketched after trouble starts. "Schema" here means whatever shape the store enforces or the code assumes: persisted game state, the wire message format, config files. The same discipline governs any bulk mutation of live records (member consolidation, list cleanups): batch it, make it resumable, and know the undo before running it.

## Feature-flag lifecycle

Flags that gate incomplete or launching work have an owner and an expiration date, set when the flag is created (file the cleanup ticket then, too). Both flag states stay tested in CI while the flag lives; cleanup lands within ~2 weeks of full rollout; and flags never nest — combinations multiply faster than they can be tested.
