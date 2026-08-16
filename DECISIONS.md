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
