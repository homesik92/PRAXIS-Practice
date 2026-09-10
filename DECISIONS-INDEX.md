# Decision Index — PRAXIS-Practice

Maps each subsystem/topic to its currently-authoritative decision chain in
`DECISIONS.md`. Update this in the same change as any log append. Consult this first;
read the full log only when a topic isn't indexed yet.

| Topic | Governing decisions |
| --- | --- |
| Repo/process setup | D-1 |
| Remote, hosting target, deployment | D-2 → **D-16** (public GitHub remote created; NAS is production-only) |
| Methodology (PR/CI/issue-tracker language) | D-2, N-1 → **D-16** (restored to full strength) |
| Deferred-work tracking | N-1 (BACKLOG.md) → **D-16** (GitHub issues #1–#10) |
| Tech stack, build step, dependencies | D-3 |
| Test coverage & bank extensibility | D-4 → **N-3** (confirmed, 411 questions) → **D-23** (5165 authored first, to full depth; each bank is 3× the real exam length, not 1×) → **D-24** (5101/5485/5652 authoring paused until after launch) → **D-25** (`enabled: false` only affects starting a new attempt, never review/resume access) → **D-27** (resume target formalized: 1,035 questions across the three, ROADMAP.md Phase 7) → **D-31** (5652 authored now, ahead of D-24's pause; 300/300, independently answer-key-verified) |
| Content-authoring order & per-test bank depth | N-3 → D-23 → D-24 → D-27 → **D-31** |
| S2 test-menu redesign & category-test mode | ROADMAP.md Phase 6.6.2 (deferred) → **D-27** (folded into Phase 6.8 rather than built standalone) → **D-28** (five-entry Start menu settled; Practice/Category-test share one mode; teaching pages split into Phase 6.9) → **[D-35](DECISIONS.md#d-35-practice-a-topiccategory-test-draw-made-history-aware-reversing-phase-682s-fully-random-tradeoff)** (draw made history-aware, reversing 6.8.2's fully-random tradeoff; ROADMAP.md Phase 7.1) |
| Topic teaching pages ("Study a topic" content) | D-28 → D-29 (content schema settled, SCHEMA.md §2.11 — reuses the reference-panel shape plus a per-section `categoryId`; ships as its own `teach.html` page) → **D-32** (chapters were authored for Mathematics only; ROADMAP.md Phase 6.10 added for the remaining three subjects) → **Phase 6.10 complete** (2026-09-03): all four subjects have independently-verified chapters — 5652 (6.10.1), 5101 (6.10.3), 5485 (6.10.2) — closing the gate D-32 set on Phase 10.2 |
| Disabled-test review/resume access | **D-25** (`loadManifest`'s `includeDisabled` option; only S1's start-a-new-test list filters to enabled) |
| Question provenance & ETS copyright | D-5 |
| v1 feature set | D-6, **D-8** (spaced repetition) |
| Saved-progress store (schema-change hazard) | D-6, **D-8** |
| Design-stage shape & scope | **D-7** |
| Screen flow | D-9 → D-11 (review pass added) → **D-20** (flag reveals a mid-run Skip) |
| Question format (single- vs multi-select) | D-9 → **D-10** (settled: uniform now, extensible schema) |
| Reference materials during a test | D-12 → D-14 (built scientific calculator, not graphing) → D-21 (5165 reference-panel content schema settled, §2.9) → **D-22** (5485 reference-panel content schema settled, §2.10 — full periodic table, not a subset) |
| Question-bank file format | SCHEMA.md §2.1–2.7 → **D-13** (session 3 remediation) |
| Progress store & spaced repetition | D-6, D-8 → SCHEMA.md §2.8 → **D-13** (resumability, cross-tab, audit trail, SR bootstrap, storage failures, export, retention) → **D-19** (`questionOrder`) → **N-4** (SM-2 ease deltas pinned) → **N-5** (shortfall audit recomputes fresh, no stored cross-check) → **N-6** (review-pass edits: SRS correction from a frozen baseline, immediate persist) → **D-26** (restore/"upload progress" replaces the whole store, never merges) |
| Review pass (flag, reopen/change answer) | D-11 → SCHEMA.md §1.1 S3, §2.8 → N-6 → **D-20** (flag-then-Skip, empty-`chosen` answer records) |
| Adversarial review & triage | **REVIEW.md**, D-13 |
| Notation & code rendering | SCHEMA.md §2.6 — recommendation → **D-21** (MathML support verified, closes issue #2; `format` dispatch implemented for the reference panel only, question rendering retrofit deferred to a new issue) |
| Test blueprints (weightings, timings) | BLUEPRINT.md (not a decision — extracted fact) |
| 5165 calculator scope (built, scientific, not graphing) | **D-14** |
| Coding plan structure (file layout, phasing, parallel content track) | **D-15** → ROADMAP.md → **D-27** (v1→multi-subject completion path formalized as Phases 6.8–10) |
| Local verification gate | ROADMAP.md Phase 0.1 → CLAUDE.md "Verification" |
| `file://` support (data-loading format) | **D-17** — not required; `.json` + `fetch()` stands |
| Weakest-category practice suggestion (S2) | **D-18** |
| Attempt record shape — résumé (`questionOrder`) | **D-19** |
| Prior 185-question Mathematics set | N-2 |
| Relationship to native iOS wrapper apps | **D-30** (each subject its own `PRAXIS-iOS-<subject>` repo; flag PRs touching shared engine files) → **D-37** (one repo, one target per subject) → **D-38** (one app holding all five subjects, four sold via IAP — the wrapper now copies *every* file this repo owns verbatim, including the full `manifest.json`, so no deliberately-divergent file remains) |
| S1 landing page visual refresh (Phase 6.11) | D-30 (native-wrapper scope, re-examined) → **D-33** (masthead mark provenance: Bill the Goat → USNA artwork → fouled anchor → "Go Navy" text, and why) → **D-34** (hero illustration/motto are original hand-authored SVG, no asset-sourcing step; iPhone-fit redesign deferred to issue #87) |
| Adding a fifth test (5436 General Science) and reusing 5485's questions | **D-36** — generated copies via `derivedFrom` + a CI drift check; shared-pool and plain-copy alternatives rejected (SCHEMA.md §2.12) → **N-9** (BLUEPRINT.md's gap-topic list was a topic-heading diff, not a content audit — one named gap turned out already covered) |
| One question appearing on two tests (`derivedFrom`) | **D-36** → SCHEMA.md §2.12 → `tools/derive-5436.mjs`, `validateDerivedQuestions` |
| Reference-panel content shared between tests (array `testCode`) | **D-36** → SCHEMA.md §2.12 → **N-8** (5436 was missing its `run.html` `REFERENCE_PANEL_KINDS` entry; found live-testing Phase 7.4's close-out, fixed) |
| 5436 native-content authoring tooling (`.authoring/*.json`, blind verification, merge) | ROADMAP.md Phase 7.4 → **N-7** (`.authoring/*.json` is the merge script's actual source of truth — a bank fix not mirrored back there is silently reverted by the next merge) |
| S2 Start-card layout on narrow viewports | **N-10** (`flex-basis`/`justify-content` are axis-relative — a row layout's 14rem width basis became a 224px height when a media query flipped the card to a column; re-check every inherited flex value when changing `flex-direction`) |
| Adding a sixth test (5581 Social Studies) | **D-39** — scaffold-first: permanent category tree + overlay + `"enabled": false` manifest entry land and get reviewed before ~420 questions are authored against them; Social Studies Skills modelled as one overlay per axis, subcategories `"weight": null` |
| ETS study-companion text extraction (`tools/pdf-text.py`) | ROADMAP.md Phase 7.4 → **N-11** (`/ToUnicode` CMap support added; an encrypted companion is a Preview re-save away from readable, not a dead end — recipe in ADDING-A-SUBJECT.md §1a) |
| Adding a subject — the procedure itself (ADDING-A-SUBJECT.md) | **N-12** (§6 documented a manifest entry missing the four fields `verify.mjs` requires and cross-checks; §4's question-id shape and §1a's encrypted-PDF advice corrected in the same pass — check a procedure against its checker) |
| Branch protection / merge-on-green | dev-workflow SKILL.md Gate 4 → **N-13** (protection enabled 2026-09-10, closing #107; `verify` is the only PR-time check, 0 required approvals avoids the solo self-approval deadlock, admins included — merge-on-green is live) |
| Legal posture, trademark, product naming | LEGAL.md (iOS repo) → **D-40** (consult deliberately skipped, session owner's call; PRAXIS verified as ETS's LIVE reg. 4,479,538 in classes 9/16/35/41/42 — Class 9 is downloadable practice tests, so descriptive reference only, never brand use; bundle id settled before any App Store Connect record) |
| App Store release process | **APP-STORE-ROADMAP.md** (split out of ROADMAP.md 2026-09-10, reusable per app) → D-40 (legal posture) → **D-41** (three apps, STEM first, approval gate between) |
| Downstream app structure (how many apps) | D-30 → D-37 → D-38 (one app, all subjects, IAP) → **D-41** (amends D-38: three apps split by subject area — STEM/Humanities/Administrative — with a `track` field keeping `manifest.json` verbatim, and the STEM app approved before the second is submitted) |
| Product naming & App Store name screening | **D-40** (PRAXIS is ETS's live mark; descriptive use only) → **N-14** (an App Store name screen is not USPTO clearance; "First Bell" and "Chalkline" both caught as Education-category collisions before commitment) |
