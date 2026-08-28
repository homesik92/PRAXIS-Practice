---
name: dev-workflow
description: This project's development-session methodology — the plan → build → review → remediate → live-test → close loop and its approval gates. Invoke at the start of ANY session that will change code or docs (feature, bugfix, refactor, issue batch), and for triage sessions that schedule issues into work sessions, before proposing a plan or writing code. Also covers PR/merge rules, code-review depth, bugfix discipline (repro-test-before-fix), issue hygiene, triage-session conventions, autonomous scheduled sessions (auto-triage → approved schedule → stop-at-PR), decision-log conventions (append-only + topic index), model/effort guidance, and the session close-out checklist. For new-project design-stage work (seed doc → PRD/engineering design → adversarial review), read design-methodology.md in this skill; for the NAS production cutover, read launch-and-cutover.md.
---

# Development Session Workflow

Every substantive session follows one loop:

**plan → build → code review → remediate → merge → live-test → remediate → close**

The gates below are firm. When a gate and expedience conflict, the gate wins; when genuinely unsure whether something clears a gate, ask rather than guessing.

**Who "the session owner" is.** Throughout this document, the *session owner* is the person driving the current session — the human you are talking to. They approve that session's plan, decide its design forks, and live-test its outcome. This project delegates fully: whoever runs the session holds the gates for it. There is no separate approver to wait on, and no gate is satisfied by anyone's absence.

**This copy is the project's own.** It began as a snapshot of `splankna-ios`'s vendored methodology (itself adapted from `homesik92/splankna-rebuild`, itself from `fthiess/checkers-demo`) and has been adapted for this project. Change it here, in a PR, like any other project document.

## Gate 1 — Plan first, always

Begin by discussing the work, not doing it. Review the relevant docs, issues, and code, ask clarifying questions, and propose a plan (scope, approach, what will and won't be touched, test strategy). Then **stop and wait for the session owner's explicit approval**. Clarifying questions and their answers are *not* approval — approval is an unambiguous "go." Use plan mode for substantial work. "Measure twice, cut once."

Two standing sub-rules:

- **The session owner decides genuine design forks.** Present options with a recommendation; don't pick for them. Each decided fork is recorded in the decision log as "Session owner's call" with the reasoning. **Attribute by role, never by name** — this is a public repository and the people working in it have not consented to being named in it. The git history already records who did what, for anyone with a legitimate reason to look.
- **Prefer the simple path.** If earlier decisions appear to force complexity, surface the simpler alternative and confirm direction before building.

## Gate 2 — Build on a branch, gate green

- All work happens on a feature branch and lands via a PR. Never commit directly to `main` — branch protection should refuse it once configured (see Phase 0 of the coding plan).
- Unit tests for any non-trivial logic; run the project's formatter and linter on everything.
- **Run the project's fast local verification as you iterate** — type checking, lint, and unit tests, in seconds, on local hardware — it catches the great majority of mistakes before one costs a CI cycle. (The exact command is recorded in `CLAUDE.md` once the toolchain is chosen — `tools/verify.mjs`, see the coding plan's Phase 0.)
- **The pull-request CI run is the authoritative verification — not a local one, once CI exists.** Don't re-run heavy checks locally merely to confirm what CI is about to confirm. Until CI is wired up (Phase 0), the local gate is the only check there is — run it before every push regardless.
- **Never write framework-specific code from memory.** Check the actual dependency versions (package manifest or equivalent), verify version-specific APIs against the official docs, and cite the page that settled a non-obvious question. When something can't be verified against official docs, flag it plainly as *unverified — from training data*; an explicit flag beats both confident hallucination and vague hedging.
- **Dependency upgrades are their own PR** — one dependency per change. Read the changelog, not the version number (semver is a promise the maintainer may not have kept), and review the lockfile diff like code. This project targets zero runtime dependencies (D-3); a dependency upgrade PR should be rare and itself worth questioning.
- **Grep the staged diff for secrets before every push** (`git diff --staged | grep -iE "password|secret|api_key|token"`) — this repository is public.
- **Documentation is code.** Design docs, the decision log, and user docs are updated in the same PR as the code they describe. Append significant decisions to `DECISIONS.md` as they're made — following the decision-log conventions below — and propagate them to affected docs once, in place.
- **Fix known tech debt now — don't bank it.** AI has made writing code cheap, which flips the economics: a known issue — including small or low-severity ones, and code-review findings — is cheapest to fix the moment it surfaces, while the context is loaded, and it only rots if deferred. So remediate it in the session where it's found. Defer only when the fix is genuinely big enough to need its own focus and plan — and then it follows the deferral rule below.
- Anything discovered but deliberately not done now — deferred features, uncertain items, rough edges — gets a **GitHub issue** before the session ends, not a TODO comment or a mental note. The PR description ends with a short **"Didn't touch (intentionally)"** list — adjacent issues noticed but left out of scope, each pointing at its issue — so scope discipline is visible at review time.

## The ETS copyright rule

This project's standing hazard is not personal data — it is **someone else's copyrighted exam content**.

The four ETS *Study Companion* PDFs under `Knowledge-Guides/` are ETS's copyrighted publications, and the real Praxis item pool is ETS's trade secret. What may be taken from those PDFs is the **factual blueprint**: test codes, time limits, question counts, the names of the content categories, and their approximate weightings. Facts about a test's structure are not owned by anyone.

What must never enter this repository or the built site:

- Verbatim or lightly-reworded ETS sample questions, answer choices, or explanations.
- Extended passages of the study companions' prose, reproduced or paraphrased closely enough to substitute for reading the original.
- Scanned or screenshotted pages, figures, or diagrams from the PDFs.
- The PDFs themselves — `Knowledge-Guides/` is gitignored, and stays that way. **This matters more, not less, on a public repo** — the PDFs never touch GitHub under any circumstance.

Every practice question in this project is **written from scratch** to exercise a listed content category. "Inspired by the format" is fine and is the whole point; "the same question with the numbers changed" is not — a derivative work is still a copy. When a drafted question feels close to a remembered ETS item, rewrite it from the underlying skill rather than editing the surface.

⚠ **No checker can enforce this.** A linter cannot tell an original question from a reworded one, and the source material is a PDF nobody diffs. It rests on being written here and honored while drafting.

*Applies to the site, too:* Praxis® is ETS's registered trademark. The site describes itself as unofficial practice material and does not imply ETS endorsement or affiliation.

## When something breaks

Debugging is where corners get cut fastest, so it has its own discipline:

- **Stop the line.** Don't push past a failing test or broken build to keep feature work moving — errors compound. Fix it, or explicitly park it with an issue, before building further.
- **Reproduce before you fix (the prove-it pattern).** Never start with the fix. Write the reproduction test first and watch it fail; then fix; then watch it pass and run the full suite. A test written after the fix tends to prove the fix, not the bug — and the repro test stays in the suite as the regression guard. For subtle bugs, have a subagent write the repro test without knowledge of the intended fix.
- **Reduce before you fix.** Shrink the failure to its minimal case first — a minimal reproduction makes the root cause obvious and prevents patching symptoms.
- **One fix at a time.** No unrelated changes in the tree while debugging; a contaminated diff makes the fix unreviewable.
- **Can't reproduce?** Don't guess-patch. Classify the suspect (timing, environment, state), add targeted logging around it, and file an issue with the evidence so the next occurrence convicts itself. Remove the scaffolding logging once the bug is fixed and guarded.

## Gate 3 — Code review, scaled to depth

- **Deep changes** (the scoring/timing engine, the progress-persistence layer, anything touching the question-bank schema, tricky logic): run `/code-review` at high effort on the PR in-session and remediate the findings directly before merge. If `/code-review` is unavailable, say so in the session before proceeding, and run its methodology manually — independent agents across CLAUDE.md compliance, shallow bug scan, git history, prior-PR guidance, and comment accuracy, then confidence-score the findings and drop anything below ~80. Never silently substitute a single-pass review.
- **Shallow follow-ups** (CSS/UI tweak, added questions, doc fix, workflow step): self-review the edge cases; CI green suffices. Still via a PR — the review round is what's optional, never the PR.
- **A new question bank is content, not code, but it still gets reviewed** — for factual correctness of the answer key, for exactly one defensible correct answer per item, and against the ETS copyright rule above. A wrong answer key teaches the wrong fact, which is this project's version of a production bug.
- When unsure whether a change is deep or shallow, ask.
- Local `/code-review` subagents inherit the session model — invoke local reviews from the strongest available model.

## Gate 4 — Merge, tiered by change class and presence

Human review is highest-leverage at intent (Gate 1) and outcome (Gate 5); between them, the automated review round plus a green gate is the real quality check. The merge pause is therefore tiered, not universal. After any merge, wait for the deploy/release step to complete and confirm it went green before declaring anything live.

- **Interactive sessions, non-deep changes: merge on green.** Once CI is green and the Gate 3 review round is clean and remediated, merge without waiting for a further click — and say plainly in the session that the merge happened.
- **The pause stays — the session owner's explicit go-ahead required, every time — for:** deep changes (Gate 3's taxonomy); dependency additions or upgrades; and anything that changes the question-bank schema or the shape of saved progress data. When unsure which tier a change is in, ask.
- **Mechanical precondition:** merge-on-green applies only once branch protection actually enforces the project's verification gate on `main` (Phase 0 of the coding plan sets this up). Until then, treat every merge as requiring explicit go-ahead.
- **The audit loop replaces the dropped pause once merge-on-green is active:** at each live-test session, review `git log --oneline` on `main` since your last visit as the merge digest.

## Gate 5 — Live testing closes the loop

The session owner live-tests after every deploy/build. Treat the findings as the top priority: diagnose, fix via the same branch→PR→merge loop (usually shallow follow-ups), and iterate until they confirm everything works. A phase or task is not "done" at merge — it's done when it has been live-confirmed, which is what the roadmap's ☑ means.

Some things are the session owner's to run rather than yours: anything that changes repository settings, grants access, or touches the NAS itself (its admin interface, shares, web-server configuration, or user accounts). Diagnose, hand over the exact command or click-path, and where possible fix the scripts so the manual step never recurs.

## Gate 6 — Close out the session

Before ending a session, verify every box:

- [ ] GitHub issues for completed work closed **with evidence comments**; issues filed for everything deferred.
- [ ] Decision log appended, its index (`DECISIONS-INDEX.md`) updated to match, and doc changes committed alongside the code.
- [ ] `ROADMAP.md` statuses and the session log row updated.
- [ ] Merged local branches deleted.
- [ ] Session memory updated **in place, not appended**: rewrite the forward-state summary so this session's outcome *replaces* the entry that queued it. Memory keeps only what's next, open blockers, still-active landmines, and pointers into the decision log and issues — those hold the full detail. Memory is per-machine and does not travel between contributors; anything another person will need belongs in the repo instead.
- [ ] State plainly what was verified versus what wasn't.

## Rationalizations and red flags

The gates erode through plausible-sounding exceptions, not open defiance. The usual suspects, pre-rebutted:

| Rationalization | Reality |
|---|---|
| "This change is trivial — skip the plan." | Trivial still gets a two-line plan and a "go." Gate 1 is how *trivial* gets confirmed. |
| "They answered my clarifying questions, so that's approval." | Approval is an unambiguous "go," nothing less. |
| "CI is green and review is clean — merging." | Only if Gate 4's tier allows it: interactive session, non-deep change. Deep, dependency, and schema/progress-data changes, and all autonomous-session PRs wait for the session owner. |
| "I'm autonomous, but this PR is clean — merging it unblocks the next one." | Autonomous sessions never merge. The stop-at-PR is an integration serialization point, not a quality verdict. |
| "I'll file the issue at close-out." | File it when discovered. Close-out verifies issues exist; it doesn't remember them for you. |
| "This session's full write-up is worth keeping — append it to memory." | Memory is forward state, not a changelog; the write-up already lives in the decision log, the PR, and the issue's evidence comment. Appending per session grows memory past what a single read can load. |
| "Setting up a worktree is overhead — the other session probably won't touch my files." | Sessions sharing a checkout clobber branches and staged state, not just files. Worktree setup is one command; untangling two sessions' interleaved work is an afternoon. |
| "It's minor — I'll TODO it / leave it." | Minor known debt is cheapest to fix now, in context. Defer only if the fix needs its own PR — and then it's an issue, not a TODO. |
| "The fix is obvious — no need to reproduce first." | Obvious fixes are right most of the time; the rest cost hours. Repro test first. |
| "Docs can follow in the next PR." | Documentation is code. Same PR. |
| "This API is standard — I know it from memory." | Versions drift. Verify against current official docs or flag it unverified. |
| "I'll just adapt this ETS sample question." | An adapted question is a derivative work. Write it from the underlying skill instead. |

Red flags — observable signs a session is drifting: the same test or build command run twice with no code change in between (reassurance, not verification); a hundred-plus lines written without running anything; unrelated edits appearing in the diff while debugging; a TODO comment where an issue belongs; a "while I was in there" refactor that wasn't in the plan; a test modified so the change passes (the behavior probably changed); a question whose wording you cannot trace to a skill rather than to a source.

## The decision log

`DECISIONS.md` is the compact read-first artifact that lets later sessions honor earlier conclusions. Conventions:

- **Append-only; supersession by pointer.** Never rewrite a past entry's decision text. A change of direction is a *new* entry that names what it changes ("amends D-3", "supersedes D-7"); the only in-place edit permitted on an old entry is appending an italic "*Later updated by: …*" trailer pointing forward. IDs: `D-n` for design decisions, `N-n` for implementation notes.
- **Every entry records the Why**, not just the What — the rationale is the part a later session cannot reconstruct.
- **Attribute by role, not by name.** "Session owner's call" marks a genuine fork that was decided rather than derived.
- **Keep a topic index.** `DECISIONS-INDEX.md` maps each subsystem to its currently-authoritative decision chain. Update it in the same PR as any log append. Sessions consult the index first and jump to the few governing entries — never read the full log into context.
- **Distill at completion.** When a major build phase closes, freeze the chronological log into `history/` and write an as-built digest organized by subsystem: the net of all decisions with superseded entries dropped, citing historical IDs for the reasoning.

## Triage sessions

When the tracker accumulates issues, schedule them in a dedicated **triage session** — a planning session that touches only the tracker and session memory, never the repo. Triage is cheap in tokens but its errors compound (a bad batch degrades an entire implementation session), so run it on the strongest available model. Gate 1 still applies: propose the schedule before applying it.

- **Read every candidate issue in full** before grouping anything, not list excerpts.
- **Group for the implementing model's context, not by theme.** Batch by surface affinity — issues touching the same area share a session so the model holds one surface in context. Genuine bugs and behavioral changes get solo or near-solo sessions; cosmetic issues batch well. Question-bank authoring batches by test code, since each test's content categories are their own context.
- **Labels are the session index.** Apply one label per session with a one-line scope description. Number sessions by priority; execution order may deviate.
- **Leave each issue a guidance comment** — the highest-value artifact of the session, carrying context the implementing session cannot reconstruct: the session assignment and pairing rationale; any root-cause hypothesis, framed as verify-not-assume; landmines from the decision history that the issue's surface touches; and design forks to escalate at the plan gate.

## Parallel sessions and worktrees

Two sessions editing one checkout clobber each other — a branch switch, a formatter pass, or a reset in one silently destroys the other's uncommitted work. The rule:

- **If another session may be active in this checkout, do not edit it.** Create a git worktree (`git worktree add .claude/worktrees/<session-slug> -b <branch>`) and do all work there. The main checkout belongs to whichever session was there first — when in doubt, assume that isn't you.
- **Autonomous sessions use a worktree unconditionally.** An unattended session can never verify it's alone.
- Worktree landmines, each learned from a real detour on this and sibling projects:
  - **Absolute paths bite.** Inside a worktree, an absolute path to the main repo tree edits the WRONG checkout. Every Read/Edit/Write must target the worktree path.
  - **Run the install step inside the worktree** if the project ever gains a dependency tree — currently none does (D-3).
  - **Remove the worktree at close-out** (`git worktree remove`).

## Autonomous sessions (scheduled)

Some work may run without a human present: a scheduled routine triages the backlog and spawns implementation sessions. The gates don't relax when nobody is watching — they move:

1. **Triage automates the work, not the decision.** The routine reads every candidate issue in full, drafts the groupings, labels, and per-issue guidance comments — then **posts the proposed schedule and stops**. One approval of the schedule satisfies Gate 1 for every session it spawns: the approved schedule plus each issue's guidance comment *is* the plan. No implementation session starts before that approval.
2. **Spawned sessions run the full loop unattended** — branch, build, gate green, code review at the depth the change warrants, remediate — and **stop with the PR ready. Never merge** (Gate 4). With nobody present there is no live-testing between merges, and parallel PRs landing on a moving `main` compound.
3. **Concurrency follows surface affinity** — sessions on disjoint surfaces may run in parallel; sessions touching the same surface run serially. Never stack PRs across autonomous sessions. Every spawned session works in its own worktree.
4. **Degrade loudly, never silently.** Headless environments may lack interactively-authenticated tools or the `/code-review` plugin. If something is unreachable, record what would have been an issue update in the PR description and say so; if `/code-review` is absent, say so in the PR and run its methodology manually. A missing tool changes the mechanics, never the standard.

## Model & effort guidance

- Design and planning sessions: strongest available model at high, extra-high, or max effort.
- Implementation: strongest available model at standard effort is usually right; escalate effort for the progress-store persistence layer.
- **Question authoring: high effort, and verify the answer key independently.** Subject-matter errors are the failure mode here, and they are invisible to every other gate in this document.
- Adversarial design reviews: a **fresh session** of the strongest model at max effort, with no prior context on the project (see design-methodology.md).
- Split sessions and sub-sessions to manage focus and context — when scope grows mid-session, propose splitting rather than pushing through with a degraded context.

## Starting a new project?

Read `design-methodology.md` (in this skill) for the ideation → design → adversarial review → coding-plan process. This project has completed the design stage — see `ROADMAP.md`.

## Heading to production?

**Production is the coupled pair:** the GitHub Pages site at `github.io` and the session owner's NAS copy serving the final version. These two are kept in sync and together constitute the production system. Any update to the webpage on GitHub Pages should automatically trigger a corresponding NAS update, so both remain in sync. Every other stage of work, including intermediate builds the session owner wants to try, happens through the normal GitHub PR loop above, same as the sibling projects. Read `launch-and-cutover.md` (in this skill) **at the planning stage** before the first NAS deploy.

That document was written for a live business with real users, and most of it is oversized for a static study site with one user and no server-side data. Two parts still earn their keep, and they are the two that bite hardest here:

- **The saved-progress store is live data.** It lives in the visitor's browser (localStorage or similar), which means it is *outside* the deploy and survives every one of them. Changing the shape of a saved-progress record can silently destroy a real study history, and there is no backup. The expand/contract sequence in that document applies in full to that store.
- **Know the way back.** Keep the previous version's folder on the NAS until the new one has been live-tested, so rollback is a rename.

The rest — staged exposure, canary percentages, latency baselines, the first-hour watch — is not applicable at this scale. Say so rather than performing it.
