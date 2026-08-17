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
