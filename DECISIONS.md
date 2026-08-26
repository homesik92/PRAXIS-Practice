# Decision Log

Append-only. See conventions in `.claude/skills/dev-workflow/SKILL.md` ("The decision
log"). IDs: `D-n` for design decisions, `N-n` for implementation notes. Never rewrite a
past entry's decision text — a change of direction is a new entry that names what it
amends or supersedes.

---

### D-1: Repo scaffold and methodology adapted from `splankna-ios`

**Date:** 2026-08-16
**Decision:** This project's `.claude/skills/dev-workflow/` and initial doc structure
(README, CLAUDE.md, ROADMAP, DECISIONS/DECISIONS-INDEX, CONTRIBUTING, LICENSE) are
adapted from `splankna-ios` (itself adapted from `homesik92/splankna-rebuild`, itself
from `fthiess/checkers-demo`), at the session owner's request, to reuse the same
plan-first development discipline. Splankna-specific content (the real-business privacy
rule, App Store and Kajabi callouts) was stripped; generic process content
(`design-methodology.md`, `launch-and-cutover.md`, Gates 1–6) was kept and adapted.
**Why:** The session owner has used this methodology successfully on three other
projects and asked for it here — "go ahead with the design method."
**Attribution:** Session owner's call.

### D-2: Local git only — no GitHub remote; the NAS is production

**Date:** 2026-08-16
**Decision:** The repository is initialized locally with the same git identity as the
sibling projects (`homesik92` + GitHub noreply address), but **no GitHub remote is
created**. Only the finished production build is copied to the session owner's NAS on
the home network. Nothing is published to the public internet.
**Why:** Session owner's instruction: "use the same local git you used for other
projects, only the final production version should go to the NAS." The noreply identity
is set anyway so that adding a remote later is never the moment a real email address
enters the history.
**Attribution:** Session owner's call.
*Consequence recorded separately as N-1 — this decision removes three gates that the
inherited methodology depends on.*
*Later updated by: D-16 — this was a misreading. "Same local git you used for other
projects" meant the same **pattern** (local dir + GitHub remote), not local-only. D-2's
actual decision (no GitHub remote) is superseded; NAS-as-production-only stands.*

### D-3: Plain HTML/CSS/JS, no build step, no runtime dependencies

**Date:** 2026-08-16
**Decision:** The site is plain HTML, CSS, and JavaScript. No framework, no bundler, no
package manager, no build step. Question banks live in separate data files loaded by the
site. It must work opened directly from the filesystem and served as static files.
**Why:** Chosen over React+Vite and Next.js. The session owner has scripting experience
but is not a professional developer, and wants to be able to read and edit the result
years from now. A static site is also the simplest possible thing to host on a NAS —
any file-serving mechanism works, with no runtime to install, update, or keep patched.
The alternatives buy component reuse and server-side features that a single-user
offline quiz site does not need.
**Attribution:** Session owner's call.

### D-4: All four tests in the first version; the bank format must be extensible

**Date:** 2026-08-16
**Decision:** Version 1 covers all four staged Subject Assessments — 5101 Business,
5165 Mathematics, 5485 Physical Science, 5652 Computer Science — accepting thinner
per-test coverage at first in exchange for breadth. **Adding a fifth test later must not
require code changes**, only a new bank file plus its registration.
**Why:** Session owner's instruction: "use all four, but it is possible to add another
question bank later." The extensibility half is the binding constraint on the schema
design, not a nice-to-have — see B-1.
**Attribution:** Session owner's call.

### D-5: Questions are original, written against the ETS content categories

**Date:** 2026-08-16
**Decision:** All practice questions are authored from scratch to exercise the content
categories published in ETS's study companions. The PDFs supply the blueprint (category
names, weightings, question counts, time limits) and nothing else. The PDFs are
gitignored and never committed. The site labels itself unofficial and unaffiliated with
ETS.
**Why:** Session owner chose this over supplying their own questions or a hybrid. The
copyright constraint is not merely a legal formality here: the real Praxis item pool is
ETS's trade secret, and adapting remembered items would produce derivative works while
feeling original. Writing from the underlying skill is the only approach that is both
lawful and pedagogically honest — a question written to test a skill teaches it better
than one reverse-engineered from an example.
**Attribution:** Session owner's call (provenance); the copyright analysis is
constraint, not choice.

### D-6: Version 1 feature set

**Date:** 2026-08-16
**Decision:** Four features are in scope for v1: (a) timed full-length tests matching
the real exam's question count and time limit; (b) untimed practice drills filtered to a
single content category; (c) answer explanations; (d) progress and score history
persisted locally in the browser, with no account and no server.
**Why:** Session owner selected all four. Note that (d) makes the browser's local
storage a **live data store that survives every deploy** — the one place in this
otherwise-stateless project where a schema change can destroy real user data with no
backup. That is why the launch methodology's expand/contract discipline is retained for
that store specifically.
**Attribution:** Session owner's call.

### N-1: Methodology weakened where the no-remote decision removes a gate

**Date:** 2026-08-16
**Note:** D-2 removes pull requests, CI, and the GitHub issue tracker — three mechanisms
the inherited methodology leans on heavily. Rather than leave text in place that
describes gates this project cannot run, the vendored `SKILL.md` names an explicit
local substitute at each affected point: feature branches merged with `--no-ff` in place
of PRs; the local verification command promoted from *preview of CI* to *the
authoritative gate*; and `BACKLOG.md` (`B-n` entries) in place of GitHub issues. The
weakening is stated plainly at the top of `SKILL.md` rather than papered over, and the
full-strength clauses are written to reactivate as-is if a remote is ever added.
**Why:** A methodology document that describes checks the project doesn't actually run
is worse than one that admits the gap — it produces false confidence and invites
selective compliance elsewhere. Recording *which* protections were traded away, and for
what, is what makes the trade reversible.
**Attribution:** Derived from D-2, not an independent decision.
*Later updated by: D-16 — the premise (no remote) was wrong; the substitutes described
here were removed and the sibling projects' full-strength text restored.*

### N-2: A prior set of ~185 Mathematics questions could not be located

**Date:** 2026-08-16
**Note:** The session owner recalled an earlier session producing roughly 185 questions
for the 5165 Mathematics section. A search of `~/Desktop`, `~/Documents`, `~/Downloads`,
and every Claude Code transcript on this machine found no such file — the only Praxis
material present is the four study-companion PDFs. Most likely it came from a claude.ai
web conversation, which never writes to this filesystem. The Mathematics bank will be
authored fresh; if the old set resurfaces it can be evaluated for import (B-3), but
every item would still have to clear the Gate 3 answer-key and copyright review before
being accepted.
**Why:** Recording this prevents a later session from assuming the work exists somewhere
and searching for it again, and prevents an unreviewed import if it does turn up.
**Attribution:** Verified fact, not a decision.

### D-7: Compressed 4-session design stage rather than the full 8

**Date:** 2026-08-16
**Decision:** The design stage runs four sessions — (1) blueprint extraction,
(2) combined requirements + data schema, (3) one adversarial review pass focused on the
progress store and accessibility, (4) coding plan — rather than the eight-session plan
the inherited methodology implies. Dropped: separate requirements and engineering-design
documents, two of the three review angles, and the standalone visual-design pass.
**Why:** The inherited eight-session shape is calibrated for a real business with real
users, payment flows, and a public deployment. This is a static, single-user, offline
quiz site with no server and no network calls, so several deliverables (API spec,
operations/cost review, staged-exposure planning) have no subject matter here. The
methodology's own "prefer the simple path" rule requires surfacing that rather than
performing the full ceremony. The two checks retained are the two that map to this
project's actual failure modes: the browser progress store is un-backed-up live data,
and a test-taking interface is keyboard- and screen-reader-critical by nature.
**Attribution:** Session owner's call, from a recommendation.

### D-8: Spaced repetition is designed for in v1

**Date:** 2026-08-16
**Decision:** Missed questions resurface on a schedule. The progress store records
per-question attempt history with timestamps from the first version, and v1 ships the
scheduling behavior rather than merely leaving room for it.
**Why:** Chosen over omitting it and over the "leave room, don't build it" middle path.
It is the highest-value study feature available here — reviewing a missed question once
teaches less than meeting it again three days later — and it is the one feature whose
retrofit would require migrating the only un-backed-up data this project has (D-6).
Deciding it now costs a schema field; deciding it later costs a migration that can lose
a real study history.
**Attribution:** Session owner's call, from a recommendation.

### D-9: Interaction flow for v1

**Date:** 2026-08-16
**Decision:** Four screens, in this order:

1. **Index** — choose one of the four tests.
2. **Test menu** — choose *take a sample test* or *study a particular topic* within that
   test.
3. **Test runner** — a **Start** button begins the timer and presents question 1.
   Choosing an answer advances immediately to the next question. Remaining time is
   displayed at the top throughout.
4. **Results dashboard** — per-topic breakdown showing percentage correct and incorrect.

Answer options are **four choices with exactly one correct** and three incorrect.
**Why:** Session owner's stated requirements. Two consequences worth recording because
they are not obvious from the description: (a) advancing immediately on selection means
there is **no way back to a previous question**, which the real computer-delivered exams
do permit, and no chance to change an answer — a deliberate simplification, revisit if
practice attempts feel unrepresentative; (b) the four-option single-select format
diverges from ETS's stated format for three of the four tests (see BLUEPRINT.md, "Open
format question"), which is a fork still open at the time of this entry.
**Attribution:** Session owner's call.

### N-3: Breadth-first bank depth confirmed; D-4 unchanged

**Date:** 2026-08-16
**Note:** Offered the alternatives of going deep on a single test first or shipping thin
placeholder banks; the session owner confirmed breadth — all four tests, enough
questions for one full-length attempt each. D-4 stands unamended. The concrete size of
that commitment, established in BLUEPRINT.md, is **411 original questions**
(120 + 66 + 125 + 100), which is the project's dominant cost.
**Why:** Recorded so a later session does not re-open a settled question, and so the
411 figure is attached to the decision rather than buried in the blueprint.
**Attribution:** Session owner's call (confirmation of D-4).

### D-10: Uniform single-select in v1; the schema carries a type discriminator anyway

**Date:** 2026-08-16
**Decision:** Refines D-9. Every authored question in v1 is four options with exactly
one correct answer, and the runner supports only that. But the question record carries a
`type` field from the first version, and `correct` is stored as an **array** even when
it holds one element — so multi-select and numeric entry can be added later without
rewriting a single existing question or migrating the progress store.
**Why:** ETS describes only 5485 as plain selected-response; 5165 and 5652 explicitly
include select-one-or-more, and 5101 and 5165 include numeric entry (BLUEPRINT.md).
Building all of those now would multiply both engine complexity and authoring cost
against a 411-question backlog that is already the project's dominant expense. But
*storing* a scalar where an array belongs is the classic cheap-now, expensive-later
mistake: it forces a data migration precisely when the format is added. The two fields
cost nothing today and remove the migration entirely.
**Attribution:** Session owner's call, from a recommendation.

### D-11: One-way run, with a single review pass before the timer stops

**Date:** 2026-08-16
**Decision:** Amends D-9's screen flow. Choosing an answer still advances immediately to
the next question, as originally specified. On reaching the last question — and before
the attempt is scored — the test-taker gets **one review pass** over the attempt, in
which flagged or unanswered questions can be revisited and answers changed. The timer
continues to run during the review pass; when it expires the attempt is scored as it
stands.
**Why:** The real computer-delivered exams allow free review and answer changes, so a
strictly one-way run practices a constraint the actual test does not impose, and it
removes a genuine exam skill — skipping a hard question, banking the time, and returning
to it. Full free navigation would have meant a navigation bar and per-question state
throughout the run. The single end-of-run pass recovers most of the pacing skill for a
fraction of the interface. The timer must keep running during review or the practice
stops being time-realistic, which is the whole point of the mode.
**Attribution:** Session owner's call, from a recommendation.

### D-12: Reference panels are in scope for 5165 and 5485

**Date:** 2026-08-16
**Decision:** The site provides an in-test reference panel for Mathematics (notation and
formula sheet) and for Physical Science (periodic table and physical constants),
mirroring what ETS makes available on those tests' Help screens. 5101 and 5652 get no
panel. The panel content is **written for this project**, not reproduced from the study
companions — a periodic table and the value of Planck's constant are facts, not
expression.
**Why:** Finding F-3. Both exams supply these materials, so practice without them
measures memorization the real test does not ask for, and a practice score would
understate readiness in a way that is invisible to the person studying. Excluding them
would also have silently constrained what the two banks could ask, which is a worse
outcome than building a panel. Note this decision *enables* question authoring rather
than merely adding a feature: without it, whole areas of both banks are unwritable.
**Attribution:** Session owner's call.
*Later updated by: session 3's adversarial review (REVIEW.md finding #14) found this
decision quietly narrowed F-3's actual ask for 5165 — a static formula sheet, not the
interactive graphing calculator the real exam provides. Escalated back to the session
owner; not yet resolved.*

### D-13: Session 3 remediation — nineteen review findings triaged and eighteen fixed in the schema

**Date:** 2026-08-16
**Decision:** Two fresh, context-free adversarial reviews ran against SCHEMA.md and
BLUEPRINT.md per `design-methodology.md` step 5 — one on progress-store data integrity,
one on UX/accessibility of the timed runner. Full consolidation and triage in
[REVIEW.md](REVIEW.md). Of nineteen findings: eighteen accepted and remediated directly
in `SCHEMA.md` in this session (per the "fix known tech debt now" rule — none deferred),
zero rejected, one escalated to the session owner (the D-12 calculator narrowing, above).
**Why:** Both reviews independently surfaced the same core gap — "an interrupted attempt
is resumable" was asserted in §1.2 as a requirement with no data model in §2.8 to satisfy
it — which is exactly the kind of defect two independent context-free reviewers finding
the same thing is supposed to catch. The other major line of findings (unauditable
shortfall disclosure, cross-tab write collisions, undefined spaced-repetition bootstrap
values) all shared a pattern: each was a real gap in the one part of this project that
holds actual user data with no backup, which is where an omission is most expensive.
Fixing all eighteen now, while session 2's context is loaded and before any code exists
against the old shape, is far cheaper than discovering them after banks and an
implementation both depend on the schema.
**Attribution:** Findings from independent review; the accept-not-defer disposition on
all eighteen is the session owner's standing "fix known tech debt now" rule
(SKILL.md), applied rather than re-litigated.

### D-14: 5165 gets a built scientific calculator — not graphing, not the static sheet alone

**Date:** 2026-08-16
**Decision:** Resolves the escalation in D-12's later-update trailer and B-7. The site
builds an **on-screen scientific calculator** for 5165 — basic arithmetic plus
logarithms, trigonometric functions (sin/cos/tan and presumably their inverses), and
similar scientific-calculator functionality. **Explicitly not in scope: graphing, or any
other advanced/graphing-calculator function.** The static formula/notation reference
from D-12 stays alongside it — the calculator replaces the *computation* gap, not the
notation-lookup purpose the sheet already served.
**Why:** Chosen over shipping without one (documenting the limitation) and over
deferring the build to a post-v1 session. A scientific calculator is real but bounded
engine work — the session owner explicitly capped it below the harder graphing-calculator
problem, keeping it inside a single design-and-build session rather than the open-ended
scope a graphing implementation would invite. This is a genuine narrowing of BLUEPRINT.md
F-3 (ETS's stated feature is a *graphing* calculator) that the site now discloses rather
than silently absorbs — see the schema note below.
**Attribution:** Session owner's call, refining a recommendation.

### D-15: Coding plan — multi-page static site, engine and content as parallel tracks

**Date:** 2026-08-16
**Decision:** Design session 4 produced the phase breakdown in `ROADMAP.md` ("Phases
(post-design)"). Two structural calls worth recording on their own:

1. **Multiple plain HTML pages (`index.html`, `test.html`, `run.html`, `results.html`),
   not a client-side router.** Consistent with D-3's no-build-step rule and this
   project's most literal requirement — it must work identically opened via `file://`
   and served from the NAS — and keeps "what renders S3" traceable to one named file for
   a non-professional-developer maintainer.
2. **Content authoring (Phase 7, 411 questions) runs as a track parallel to engine
   Phases 3–6, starting once Phase 2 stabilizes the schema**, rather than as a single
   phase after the engine is finished. BLUEPRINT.md's F-1 already established the bank
   is 3–4× the engine's size; sequencing it strictly after the engine would leave the
   project's dominant cost unstarted until late, for no dependency reason that actually
   requires it.

**Why:** Both are judgement calls under the walking-skeleton methodology rather than
forced conclusions, so recording the reasoning matters more than usual here — a later
session revisiting phase order should see why these were chosen, not just that they
were. Phase 1 deliberately narrows to a single test (5165) with a 5-question placeholder
bank specifically so the walking-skeleton milestone (`design-methodology.md` step 7)
proves the architecture before the other three tests or any hardening is built on it.
**Attribution:** Session owner's call, from a recommendation — not put through an
adversarial review pass the way session 2's schema was. A coding plan is lower-stakes to
get wrong than the data schema: a bad phase order costs a re-sequencing, not a data
migration against real study history, so D-7's original four-session scoping did not
budget a review pass for this document.

### D-16: Correction — this project has a public GitHub remote, same as its siblings

**Date:** 2026-08-16
**Decision:** Supersedes D-2's "no GitHub remote" reading. `homesik92/PRAXIS-Practice`
is created and public, matching `splankna-ios` and `splankna-rebuild`'s precedent. The
project's git identity, branch/PR/merge workflow, and issue tracking now match those
siblings exactly — this repo is developed the ordinary way, with the local
`Claude-Work` checkout and the GitHub remote as two views of the same history, not a
local-only project with GitHub withheld. **What D-2 got right and what stands
unchanged:** the session owner's NAS remains the production deployment target, and it
is used **only for the final version** — not for day-to-day work, which happens through
GitHub the same as the siblings.
**Why:** D-2 was written from a misreading of "use the same local git you used for
other projects, only the final production version should go to the NAS" — read as
"stay local, add the NAS," when the actual instruction was "match the siblings' setup
(local + GitHub), and additionally use the NAS, but only once there's a final version."
The session owner corrected this directly: "I expect all of the files to be in the
local directory at claude-work and committed also in the github directory for
homesik92. Same as we did for splankna-ios and splankna-rebuild. When we have a final
version running, we can use the local NAS for production, but only when it's final. In
all other cases, we use the local repo and github repo."

This correction reverses real work, not just a label: N-1's "local substitutes"
(`--no-ff` merges standing in for PRs, the local gate promoted to authoritative in
place of CI, `BACKLOG.md` in place of GitHub issues) were removed from `SKILL.md`,
`CLAUDE.md`, `CONTRIBUTING.md`, and `README.md`, restoring the sibling projects'
original PR/CI/issue-tracker language. `BACKLOG.md`'s nine entries were migrated to
GitHub issues #1–#10 (three closed with evidence, matching the ones already resolved in
design sessions 2–3); the file itself was deleted. The four merged design-session
branches already in this repo's history (`design/1-blueprint` through
`design/4-coding-plan`) were local-only `--no-ff` merges rather than PRs — left as
history rather than reconstructed as PRs after the fact, since GitHub didn't exist yet
when they landed; the PR discipline applies from this point forward.

**Verified, not assumed, before acting:** `gh auth status` confirmed an authenticated
`homesik92` session; `gh repo view homesik92/PRAXIS-Practice` confirmed no such repo
existed yet (ruling out a stale duplicate); `gh repo view homesik92/splankna-ios
--json visibility` confirmed the precedent this decision matches is actually public,
not assumed to be.
**Attribution:** Session owner's call — direct correction of an assistant
misunderstanding, not a preference change.

### D-17: The site does not need to work opened via `file://`

**Date:** 2026-08-16
**Decision:** Resolves [issue #7](https://github.com/homesik92/PRAXIS-Practice/issues/7).
NAS-served or local-dev-server access is sufficient; double-clicking `index.html` with
no server running is not a requirement. Question banks stay as plain `.json` files
loaded with `fetch()`, exactly as SCHEMA.md already specified — no schema or file-layout
change needed.
**Why:** The `file://` requirement was never actually requested — it was added
unprompted in an earlier session (see the correction noted in issue #7's body) and
would have forced question banks into `.js`-module-export form to work around Chrome's
`fetch()`-from-`file://` restriction. Confirming it wasn't needed avoids that
restructuring entirely and unblocks Phase 0.3/1.1 on the simpler path.
**Attribution:** Session owner's call.

### D-18: Weakest-category practice suggestion on S2

**Date:** 2026-08-16
**Decision:** S2 gains a new entry point alongside the existing "N questions due"
prompt (D-8): once any category in the test has at least 5 answered questions, S2
surfaces the single lowest-accuracy category ("You're weakest in `<category>` — practice
it") and links straight into S5 pre-filtered to that category. Ranking is accuracy
(correct ÷ answered), computed across every attempt and study session in that test —
not a separate spaced-repetition mechanism. Ties break toward the category least
recently practiced. Below the 5-question threshold for every category, no suggestion is
shown.
**Why:** SCHEMA.md's S4 already reports per-category accuracy after a completed test,
but nothing surfaced it proactively or turned it into a next action — a person finishing
a test saw their weak spots once, on the results screen, with no standing prompt to go
work on them. Accuracy was chosen over a recency-weighted score or reusing the SRS "due"
count (the other two options considered) because it's the simplest rule that's still
explainable from data S4 already computes, and reusing SRS "due" would have conflated
"a category needs review because time has passed" with "a category needs review because
performance is poor," which are different signals worth surfacing separately.
**Attribution:** Session owner's call, from a recommendation.

### D-19: Attempt records persist the exact drawn question/option order (`questionOrder`)

**Date:** 2026-08-17
**Decision:** SCHEMA.md §2.8's attempt record gains a `questionOrder` field: the
sequence of question ids as presented, and each question's shuffled option order,
captured once when the attempt starts. Résumé (Phase 2.2) replays this recorded order
rather than re-invoking form assembly (§2.7).
**Why:** Flagged by the Phase 2.1 code review and deliberately deferred to "when
Phase 2.2 needs it" — that point arrived. Form assembly draws and shuffles randomly
(§2.7 step 3 and step 6), so a fresh page load without this field would run a
different random draw than the original attempt, making "resume at the next
unanswered question" impossible to implement honestly: there would be no stable way
to know which specific questions the person had already answered. Storing the actual
drawn order, rather than a random seed to replay, also means résumé is unaffected by
the bank changing between the original draw and the resume (e.g., a question retired
in between) — the attempt record stays a stable historical fact, consistent with how
`categoryTargets`/`shortfalls` already record what was "actually used for the draw
that day" rather than a value recomputed after the fact.
**Attribution:** Session owner's call, from a recommendation.

### N-4: SM-2 ease deltas pinned to the standard constants

**Date:** 2026-08-17
**Decision:** SCHEMA.md §2.8's spaced-repetition recurrence (D-8) left its ease
adjustment unquantified ("a small ease increase" / "an ease decrease, floored at
1.3"). Phase 2.3's implementation (`js/srs.js`) pins this to the standard SM-2
constants: `ease += 0.1` on a correct answer, `ease -= 0.2` on an incorrect one,
floored at 1.3.
**Why:** SCHEMA.md already specified the 1.3 floor, which is itself the standard SM-2
floor value — strong evidence the original intent was the standard algorithm
throughout, not a custom tuning. Logged as an implementation note rather than a design
decision (`D-n`) because it fills in a value the design already committed to in
substance, not a new fork; it's a tunable constant, not a schema shape, so it stays
cheap to retune later without a migration.
**Attribution:** Session owner's call, from a recommendation (code review flagged the
gap).

### N-5: Shortfall audit recomputes fresh; doesn't cross-check against the stored value

**Date:** 2026-08-17
**Decision:** Phase 2.4's `js/results.js` recomputes each category's shortfall fresh
from `categoryTargets` and the actual delivered/answered counts, and displays that
recomputed value directly. It does not read or compare against `attempt.shortfalls`
-- the value recorded at draw time -- at all.
**Why:** SCHEMA.md §2.8's literal wording ("self-verifies against the stored
`shortfalls` rather than trusting it blindly") and ROADMAP.md's 2.4 acceptance
criterion both describe a compute-and-compare check, which this implementation
doesn't perform -- flagged by code review as a real gap against the written spec.
Chosen anyway, over adding a live mismatch comparison, because it mirrors this file's
own established pattern for the *score* (never stored, never cross-checked, always
recomputed fresh from `answers`) -- and because the scenario where the two values
would actually differ (the bank changing between draw and results) isn't reachable
today and would be unverifiable/untestable UI built for a case that can't currently
occur. `attempt.shortfalls` still serves its original purpose: a historical audit
trail available via the export feature, just not something S4 reads live.
**Attribution:** Session owner's call, decided at the Phase 2.4 plan-approval step
(offered as an explicit alternative, not picked), confirmed as intentional when code
review raised it again against the literal spec wording.

### N-6: Review-pass edits correct spaced-repetition history from a frozen baseline; flag/answer edits persist immediately

**Date:** 2026-08-17
**Decision:** Phase 3.1's review pass (D-11) makes two implementation calls not spelled
out in SCHEMA.md's prose:
1. **A changed answer corrects `questionHistory`, recomputed from a baseline frozen at
   the moment the question was first answered** (the new `priorHistory` field on each
   answer record — SCHEMA.md §2.8), not left as the original (possibly now-wrong)
   answer's outcome, and not stacked as a second SM-2 review event on top of the
   first. Reopening and changing the same question any number of times before
   submitting always recomputes from that same fixed baseline, so the schedule always
   reflects only the *final* answer, however many edits it took to get there.
2. **Every review-pass edit — a changed answer, or a flag toggled — persists
   immediately** (`updateAnswer` + `saveStore`, right where the interaction happens),
   the same immediate-write cadence every other write in the store already uses. There
   is no separate "save" step in the review pass distinct from picking a new answer or
   toggling a checkbox.
**Why:** (1) was an open question put to the session owner rather than decided solo,
since it touches the spaced-repetition subsystem D-8/N-4 already governs: leaving
history stale after a correction was the simpler option and was flagged as the
recommended default, but the session owner chose the more consistent-with-final-score
behavior, accepting the added bookkeeping (`priorHistory`) that makes it safe against
double-counting. (2) follows directly from this project's established pattern — every
other write path (`recordAnswer`, the flag-toggle-during-live-answering buffer once an
answer exists) already saves on the interaction, not on a separate confirm step — and
avoids inventing a new UI affordance (a "save edit" button) 3.2's actual
confirm-before-submit dialog will already provide at the point that matters (submission
itself).
**Attribution:** (1) Session owner's call, against the offered recommendation. (2)
Implementer's call, following established precedent — not escalated as a fork.

### D-20: Flagging a question reveals a Skip option, amending D-11's forward-only run

**Date:** 2026-08-17
**Decision:** Amends D-11. D-11 kept the run strictly one-way — answering advances
immediately, with no way to leave a question and come back to it mid-run — and
explicitly accepted that this "removes a genuine exam skill: skipping a hard question,
banking the time, and returning to it," compensating with only the single end-of-run
review pass. This decision partially restores that skill: **checking the flag toggle
reveals a "Skip this question" button.** Flagging alone still never advances (picking an
answer after flagging, to double-check it later, keeps working exactly as before) — Skip
is a separate, deliberate second action, only reachable once a question is flagged. A
skipped question is recorded with an empty `chosen` (SCHEMA.md §2.8) — not left as a
gap — so it's counted toward the form and the confirm-before-submit dialog's unanswered
count (SCHEMA.md S3, finding #11), and shows up in the review pass exactly like any
other flagged row, reopenable there to give it a real answer. It contributes no
spaced-repetition update at skip time — nothing was actually attempted — but if it's
later answered in review, that answer's SM-2 update is computed from the same
`priorHistory` baseline captured at skip time, not one computed fresh at reopen time
(matching N-6's existing "recompute from a frozen baseline" pattern for review-pass
edits generally).
**Why:** Session-owner-driven, found by hand while live-testing Phase 3.2's
confirm-before-submit dialog on `main` — reaching "cannot advance without an answer,
even a flagged one" and asking for it directly, rather than a code-review finding.
Distinct from D-11's original tradeoff in one respect: D-11 judged the lost skill
acceptable "for a fraction of the interface" of full free navigation; hands-on use
surfaced that flag-then-skip recovers most of that skill (skip a hard question, come
back to it in the one review pass that already exists) for barely any added interface —
one button, gated on a control that already exists — making it worth doing rather than
leaving the D-11 tradeoff as originally scoped.
**Attribution:** Session owner's call, from their own live-testing.
**Note (code review, same session):** a skip that's never resolved by submit time scores
as a miss (`scoreAttempt` counts it toward `total`, never toward `correct`) — the same
treatment a real wrong answer gets, and standard exam-scoring convention (a blank counts
against you). This is a real asymmetry with a question the run's clock simply never
reached at all, which contributes nothing to `total` — but it's the intended behavior,
not a gap: Skip is a deliberate "leave this blank for now" action, not a promise the
question will be revisited, and the whole point of D-20 is that the person chose to
defer it. Documented here because the review surfaced it as worth being explicit about,
not because it needed fixing.

### D-21: 5165 reference-panel content schema settled; MathML support verified

**Date:** 2026-08-17
**Decision:** Settles [issue #3](https://github.com/homesik92/PRAXIS-Practice/issues/3)
for 5165 only. `data/reference/5165-formulas.json` is `{schemaVersion, testCode,
sections: [{id, heading, entries: [{id, label, content: {format, value}}]}]}` —
SCHEMA.md §2.9. Reuses §2.6's existing `{format, value}` content shape rather than
inventing a new one; `sections` are topic-organized (matching BLUEPRINT.md's four
top-level 5165 categories) rather than tied to the bank's `categoryId`, since the panel
is one continuous reference document available throughout the test, not filtered by the
current question — the same relationship the real exam's Help screen has to the test.
5485's periodic table/physical-constants panel (Phase 5.3) is out of scope here; it's
tabular data, not a formula list, and needs its own schema pass.

Also closes [issue #2](https://github.com/homesik92/PRAXIS-Practice/issues/2) (MathML
support, flagged in SCHEMA.md §2.6 as "unverified, from training data" since Phase 2):
checked current caniuse.com data directly rather than relying on training-data
knowledge — Chrome has shipped MathML Core since v109 (2023), Firefox since v2, Safari
since v10, 94.31% global usage today. Safe to use as originally recommended; no fallback
(LaTeX-subset renderer, pre-rendered SVG) needed.

**Scope decision, not just a schema decision:** nothing in this codebase has ever
actually implemented the `format` dispatch SCHEMA.md §2.6 documents — every existing
stem/option/explanation render call in `run.html` is a plain `el.textContent =
content.value`, which has only ever worked because every question authored so far uses
`format: "text"`. Phase 5.1 is therefore the first real implementation of MathML
rendering in this project. Deliberately scoped narrow: a `renderContent` dispatcher is
built for the new reference panel only. Existing question rendering is left untouched —
no authored question needs anything but `text` yet, and retrofitting three working,
tested render paths (S3/S4/S5) with no real content driving the change would be
speculative. Filed as its own follow-up issue rather than folded silently into this
phase or left as an undocumented gap.
**Why:** The reference panel is authored content that legitimately needs real math
notation (radicals, fractions, exponents, integral/summation signs) in a way the
existing questions' keyboard-notation workarounds (`^`, `×`, `−`) don't scale to for a
formula sheet. Deferring issue #2 further would have meant either authoring the panel
in the same degraded plain-text notation the questions currently use — undermining the
whole point of D-12's "a practice score would understate readiness" rationale for
building the panel at all — or blocking Phase 5.1 indefinitely on a check that only
takes a few minutes to actually perform.
**Attribution:** Session owner asked to resume Phase 5.1; the MathML verification and
the narrow-vs-broad rendering-scope fork were both surfaced during the design pass —
session owner chose the narrow scope after the tradeoff was presented via
AskUserQuestion.

### D-22: 5485 reference-panel content schema settled — full periodic table, not a subset

**Date:** 2026-08-17
**Decision:** Settles [issue #3](https://github.com/homesik92/PRAXIS-Practice/issues/3)
for 5485, closing it. `data/reference/5485-periodic.json` is `{schemaVersion,
testCode, elements: [{atomicNumber, symbol, name, atomicMass, category, group,
period}], constants: [{id, name, symbol, value, unit}]}` — SCHEMA.md §2.10.
Deliberately does **not** reuse §2.6/§2.9's `{format, value}` content shape: a
periodic table and a constants table are structured tabular data with fixed fields
per row, not prose needing a text/mathml/code discriminator. `elements` covers all
118 known elements, not a curated subset, treating the data as bounded, verifiable
scientific fact (identical in any chemistry reference) rather than authored
content — narrowing it would be a real, disclosed scope cut in the D-14 sense, not
a simplification. `constants` is ~12 entries spanning BLUEPRINT.md's Chemistry/
Physics categories, written in plain-text scientific notation (matching 5165's
existing Unicode-superscript convention) rather than MathML, since a bare `n × 10ᵏ`
has no typesetting need MathML would actually improve on.
**Why:** BLUEPRINT.md's F-3 already warns that shortchanging 5485's reference
materials turns chemistry questions into memorization tests the real exam doesn't
ask for — the same reasoning D-12 used to justify building this panel at all. A
curated element subset would reintroduce exactly that risk for any element outside
the curated list, and unlike 5165's formula sheet (real authoring judgment about
what belongs on a scoped scientific-calculator-era math reference), element data
has no such judgment call to make — every chemistry reference agrees on the same
118 rows, so there's no real cost to completeness here the way there might be for
open-ended prose content.
**Attribution:** Session owner asked to move to Phase 5.3; the schema shape and the
full-table-vs-subset scope question were both proposed during the design pass and
confirmed via AskUserQuestion before implementation began.

### D-23: 5165 authored first and to full depth; each bank is 3× the real exam length

**Date:** 2026-08-18
**Decision:** Amends N-3's breadth-first default for Phase 7's authoring order —
5165 (Mathematics) is built to completion before any other test's content authoring
starts, rather than interleaved across all four. All four tests remain in v1 scope
(D-4 unchanged); this changes only the order of work. Separately, and more durably:
each test's authored bank is **3× its real exam length**, not 1×. For 5165 that's
**198 questions** (66 × 3), split by leaf category to match BLUEPRINT.md's real
weights scaled ×3 (I-A 21, I-B 39, II-A 39, II-B 21, III 39, IV 39). No schema or
code change was needed for the 3× depth — `js/schema.js`'s existing
`drawForCategory` (built for spaced repetition, Phase 2.3) already ranks a
category's whole pool by least-recently-seen before drawing, so a deeper pool
automatically rotates toward unseen questions across a first practice test, a
study session, and a second practice test, with no new "pool"/"set" concept
needed on the question record.
**Why:** Session owner wants a first practice test, topic study in between, and a
second ("final") practice test to each surface materially different questions, not
the same fixed set every time. An explicit tagged-pool design (e.g. `pool:
"initial"` / `"study"` / `"final"`) was considered and rejected: it would need its
own schema field, form-assembly changes, and review, and would actually behave
*worse* than the existing mechanism — a hard partition can't borrow from a
still-fresh pool when another pool runs dry, while the least-recently-seen draw
already treats the whole bank as one adaptive resource.
**Attribution:** Session owner's call — both the 5165-first ordering and the 3×
depth requirement were stated directly; the "reuse the existing draw logic instead
of building explicit pools" implementation approach was proposed by Claude and
confirmed via AskUserQuestion before authoring began.

### D-24: Content authoring on 5101/5485/5652 paused until after launch

**Date:** 2026-08-18
**Decision:** Extends D-23's "5165 first" ordering into a harder stop. No content
authoring work happens on the other three tests — 5101 (Business), 5485 (Physical
Science), 5652 (Computer Science) — until the app is complete and in production
(Phase 8, NAS launch). They stay at their current placeholder question counts
(5101: 0, 5485: 0, 5652: 0) through the upcoming workflow/dashboard phase (a new
phase between 7 and 8, scoping starts this session) and Phase 8 launch. After
launch, the session owner intends to return and build out those
three banks to the same standard as 5165 (D-23's 3×-depth approach), and possibly
add tests beyond the original four. D-4's "all four tests in v1 scope" is not
reversed by this — v1 still targets all four; this decision is about **sequencing
build effort**, not cutting scope.
**Why:** Session owner wants the application itself — engine, workflow, dashboard,
launch — proven out and shipped before sinking further authoring effort (411+
questions is the project's dominant cost, per N-3) into content for tests that
don't yet have a finished product to sit inside. One fully-content-complete test
(5165) is enough to build, test, and launch the whole application against.
**Attribution:** Session owner's call.

### D-25: Disabling a test (`enabled: false`) only affects starting a *new* attempt, never review/resume access to an already-completed or in-progress one

**Date:** 2026-08-18
**Decision:** `js/schema.js`'s `loadManifest` gained an `includeDisabled` option.
Only S1's start-a-new-test list (`loadTestList`, `index.html`) calls it with the
default (enabled-only). Every other by-code bank lookup — `results.html` (review a
completed attempt), `run.html` (resume an in-progress attempt or continue a study
drill), `test.html` (S2, the hub page), and `dashboard.html` (S6) — now passes
`includeDisabled: true`, so a test flipped to `enabled: false` (per D-24/6.5.4's
manifest simplification) stays fully reachable for anything the user already did
on it. `tools/verify.mjs` was changed the same way: it now validates every
registered bank's schema regardless of `enabled`, not just enabled ones.
**Why:** Found as a Phase 6.5 code-review finding, confirmed independently by
three separate review angles: disabling 5101/5485/5652 (D-24) had silently
orphaned any real history from earlier live-testing sessions on those tests —
`results.html` showed "could not be loaded" for a genuinely completed attempt,
and `run.html` refused to resume a genuinely in-progress one, purely because the
manifest lookup filtered to `enabled` tests everywhere, not just on the "start a
new test" list where that filter actually belongs. `enabled` was designed to mean
"offered for a new attempt," but the code had it meaning "exists at all."
**Attribution:** Session owner's call — presented as a design fork ("unfiltered
lookup for review/resume" vs. "leave it, accept the data becomes unreachable while
paused") via AskUserQuestion; the unfiltered-lookup option was chosen.

### D-26: "Upload progress" (Phase 6.7) replaces the whole store, never merges

**Date:** 2026-08-18
**Decision:** The restore half of finding #9 (SCHEMA.md) — pairing the existing
"download my progress" export (Phase 6.2, D-9-adjacent) with an "upload progress"
restore — replaces whatever's currently saved on this device with the uploaded
file's contents entirely, after an explicit confirmation naming both what's being
lost and what the file contains. It does not attempt to reconcile or combine the
uploaded file with whatever's already on the device.
**Why:** Merging two devices' progress (e.g. taking the union of `attempts`, and
reconciling `questionHistory` entries for the same question seen on both — whose
spaced-repetition state wins?) is a materially harder problem with no obvious
single correct answer, and isn't what the session owner actually needed: the
real use case is moving progress to a new device or recovering after storage was
cleared, both of which are naturally "replace," not "combine." Building merge
semantics now would be speculative complexity for a need that hasn't come up.
**Attribution:** Session owner's call, via AskUserQuestion — merge-vs-replace was
presented as a fork; replace was chosen, with cross-device merge explicitly named
and deferred as a separate, harder feature if it's ever actually needed.

### D-27: Remaining v1 scope formalized into ROADMAP.md phases 6.8–10; 6.6.2 folds into 6.8

**Date:** 2026-08-20
**Decision:** The path from here to project completion — S2 redesign, v1 (Mathematics-
only) acceptance, S1 multi-subject redesign, resumed content authoring for
5101/5485/5652, and final four-subject acceptance — existed only as prose (D-24) and
private session memory, not as scheduled ROADMAP.md phases. Formalized as: Phase 6.8
(S2 redesign, ◐, mockup iteration in progress), Phase 8.3 (v1 acceptance, gates Phase
9), Phase 9 (S1 redesign + re-enabling 5101/5485/5652 in the manifest), Phase 10 (final
multi-subject testing and acceptance, gated on Phase 7's resumed authoring and Phase
9). Phase 7's resume target is now explicit: 5101/5485/5652 each at 3× their real exam
length per D-23's standard (360/375/300 — 1,035 questions total), the same standard
5165 already met. Separately: **6.6.2's deferred "category test" mode folds into Phase
6.8** rather than shipping as its own later pass — S2 is being rebuilt anyway, so
designing the category-test entry point against the *new* layout avoids building it
twice.
**Why:** "Documentation is code" (SKILL.md) applies to what's ahead, not just what's
shipped — the session owner asked what was missing before the project's remaining work
started, and the honest answer was that most of it lived nowhere durable. Numbering it
now makes the four-subject expansion an auditable plan rather than a remembered
intention.
**Attribution:** Session owner's call (the six-item scope list and its ordering);
6.6.2's fold-in decided via AskUserQuestion (folding into 6.8 chosen over keeping it a
separate deferred phase, or dropping it).

### D-28: S2's Start menu settled at five entries; teaching-page content split into Phase 6.9

**Date:** 2026-08-20
**Decision:** While iterating Phase 6.8's mockup, the session owner specified the real
shape of S2's "Start" section: (1) full practice test, unchanged; (2) **Practice a
topic** — new, untimed, 10 questions from one category, same flag/review-pass/submit
flow as a real test, scored locally, never persisted; (3) **Category test** — identical
to (2) but timed; (4) **Study a topic** — a new destination, a short textbook-
chapter-style teaching page per category (worked examples/explanation, not a quiz); (5)
**Review a topic** — today's existing S5 immediate-reveal drill, kept exactly as-is
(not retired, not folded into anything), relabeled from its current "Study a topic"
text since (4) now owns that name. (2) and (3) share one new `run.html` mode (a timer
on/off flag) rather than being built as two separate features. (4)'s actual content is
split into a new **Phase 6.9**, not built as part of 6.8 — it ships in 6.8 as a
`disabled`/"Coming soon" stub only.
**Why:** (2) and (3) differ only by a clock, so one mode covers both — building them
as separate features would duplicate the flag/review-pass/scoring logic for no reason.
(4) is a fundamentally different kind of work from the rest of 6.8: authored
instructional prose per category, not a UI/engine task — closer to Phase 5's reference
panels or Phase 7's question banks in required care (written from scratch, high effort,
verified) than to a page-merge PR. Bundling it into 6.8 would have blocked a mechanical,
low-risk change on a content-authoring project with its own design questions still
unanswered (how deep is "a couple of pages" per category; what's the content schema).
**Attribution:** Session owner's call throughout, refined over two rounds of
AskUserQuestion: (5)'s fate (keep as-is, recommended option was "fold into (4)" —
rejected) and (4)'s scheduling (own phase, recommended and accepted).

### D-29: Teaching-page content schema settled — reuses the reference-panel shape, not a new one

**Date:** 2026-08-20
**Decision:** Settles Phase 6.9.1's design pass. `data/teaching/<code>.json` is
`{schemaVersion, testCode, sections: [{id, categoryId, heading, entries: [{id, label,
content: {format, value}}]}]}` — SCHEMA.md §2.11. This is §2.9's reference-panel shape
verbatim (D-21's `{format, value}` text/mathml discriminator, the same
`sections`/`entries` nesting) with exactly one addition: a `categoryId` per section, so
a chapter can be selected and rendered on its own rather than shown as one continuous
document the way the reference panel is. A new `teachingContent` bank field (parallel
to `referencePanel`), a thin `loadTeachingContent` wrapper in `js/schema.js` (mirroring
`loadReferencePanel`), and `tools/verify.mjs` validation (existence, JSON validity,
`validateReferencePanel`'s existing shape check reused as-is, plus a new check that
every section's `categoryId` resolves to a real leaf category in the owning bank) all
follow the referencePanel precedent directly. Rendering reuses
`js/reference-panel.js`'s existing `renderContent`/`renderReferencePanel` unchanged —
no new render code, no new `format` values. Ships as its own page, `teach.html`, not a
`run.html` mode: no timer, no scoring, no `questionHistory` write (D-28).
**Why:** ROADMAP.md's own framing of Phase 6.9 ("closer in kind to Phase 5's reference
panels... than a UI task") turned out to be true at the schema level, not just in
spirit — a teaching chapter's prose and worked-example math notation have exactly the
needs D-21 already solved, and a chapter is addressable-by-category in the same way the
reference panel is deliberately *not*. Inventing a second, parallel content shape for
what's structurally the same authored-prose problem (label + `{format, value}` content,
grouped into headed sections) would have meant maintaining two rendering paths, two
verify.mjs validators, and two mental models for what is, on inspection, one shape used
two ways.
**Attribution:** Surfaced while reading `js/reference-panel.js` and SCHEMA.md §2.9
during the design pass — the original plan (from the prior session's proposal) assumed
a new schema section would be needed; re-reading the actual reference-panel code before
writing one showed the reuse was available. No AskUserQuestion round needed: an
implementation-approach call (reuse vs. invent), not a scope or user-facing decision.

### D-30: This repo is the multi-subject master; each subject gets its own native wrapper repo

**Date:** 2026-08-22

**Decision:** PRAXIS-Practice grows to cover every Praxis exam over time (its
`data/manifest.json` already supports multiple subjects by design). Each subject also
gets a thin native iOS wrapper — a hybrid SwiftUI-shell-plus-`WKWebView` app that
bundles a manual copy of this repo's shared engine files (`test.html`, `results.html`,
`css/base.css`, `js/*`) and one subject's data. Every wrapper lives in its own
repo, named `PRAXIS-iOS-<subject>` — `PRAXIS-iOS-Math` (5165) exists today; more will
follow as new subjects ship here. This was decided from the wrapper-app side as
[PRAXIS-iOS-Math D-12](https://github.com/homesik92/PRAXIS-iOS-Math/blob/main/DECISIONS.md)
(separate repo per subject, not multiple Xcode targets in one repo) — this entry
records the same split from this repo's side, since nothing here previously
acknowledged the wrapper apps exist at all.

**Why:** the two projects are tied together in a way that isn't visible from inside
this repo alone — a PR here that touches `test.html`, `results.html`, `css/base.css`,
or anything under `js/` can silently leave every wrapper app's bundled copy stale,
since nothing propagates automatically (a real instance of this already happened:
issue #66's score-meter text fix shipped here and sat unsynced in PRAXIS-iOS-Math for
a full session before being noticed and manually ported). Without a written pointer,
that risk is invisible to whoever's working here next.

**What it means:** flag it explicitly in the PR description whenever a PR touches
`test.html`, `results.html`, `css/base.css`, or `js/*` — noting that downstream native
wrapper repos may need a manual re-sync — so it's visible at review time rather than
discovered later. See `CLAUDE.md`'s new "Downstream native apps" note.

**Attribution:** Session owner's call, made explicit when asked directly how the
projects should relate going forward, after PRAXIS-iOS-Math D-12 settled the
separate-repo structure from the wrapper-app side.

---

### D-31: 5652 (Computer Science) authored now, ahead of D-24's post-launch pause

**Date:** 2026-08-26

**Decision:** D-24 paused all authoring on 5101/5485/5652 until after the app is
complete and in production (Phase 8). The session owner opened this session by asking
directly whether there was enough context to generate the 5652 bank now, without
waiting for that gate — superseding D-24 for 5652 specifically. The full 300-question
bank (3× BLUEPRINT.md's 100-question real exam, matching D-23/D-27's standard) was
authored, merged, and independently answer-key-verified in this session; see
ROADMAP.md Phase 7's "5652 — Computer Science bank progress" for the per-category
breakdown.

**Why:** the session owner's stated forward plan is to build out the three remaining
subjects' banks, test each in the practice web app, then create each as its own iOS
wrapper app (per D-30) — the same 5165 → PRAXIS-iOS-Math pattern already proven working
on a real device. Waiting for Phase 8.3's v1 acceptance gate before starting that work
would just delay it without changing what has to happen; the session owner chose to
start now while attention and tokens are available, rather than treat D-24's pause as
a hard prerequisite.

**What it means:** D-24's pause no longer governs 5652 (now fully authored) and is
understood to no longer bind 5101/5485 either — the session owner may resume authoring
any of the three remaining subjects without re-litigating the pause each time. Phase
8.3's v1 (Mathematics-only) acceptance gate and Phase 9's manifest re-enable/S1 redesign
are otherwise unchanged; a bank being authored does not by itself re-enable that test in
`data/manifest.json` (still Phase 9.2's job) or trigger iOS wrapper work (D-30's own
"resumed authoring does not by itself trigger any iOS work" note stands).

**Attribution:** Session owner's call ("we have some tokens, do you have what you need
to generate the question bank for the computer science test?"), made at the start of
this session.
