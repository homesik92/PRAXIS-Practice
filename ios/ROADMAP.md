# PRAXIS iOS Math — Roadmap

> **Frozen 2026-09-11 — historical record, no longer maintained ([D-44](../DECISIONS.md)).**
> This file came from the former `PRAXIS-iOS-Math` repository when the iOS app moved into
> this one. It is kept so the app's early reasoning stays readable, not as live guidance.
> Its phases stopped being tracked here once the release schedule moved to the root repository; native-shell defects are now issues in this repository's tracker.
> Live guidance for the app is [`ios/CLAUDE.md`](CLAUDE.md); decisions from D-44 onward are
> in the root [DECISIONS.md](../DECISIONS.md), and release work is in
> [APP-STORE-ROADMAP.md](../APP-STORE-ROADMAP.md). Links below written as
> `../PRAXIS-Practice` now mean the repository root, and "bundled copy" / `Sources/WebContent/`
> no longer exist — the app bundles the root web files directly.

Read [DESIGN.md](DESIGN.md) first for the architecture and the portability
plan, and [LEGAL.md](LEGAL.md) for the naming/publication considerations —
this file is the phase-by-phase build plan, not a repeat of either.

This roadmap is intentionally lighter than
[PRAXIS-Practice](../PRAXIS-Practice)'s own — that project designed a whole
system from scratch and needed a multi-session design process to get there.
This one wraps an already-built, already-tested system, so there's no new
data model, no new algorithm, and no new content format to invent. The work
here is native-shell engineering and content bundling, not design.

## Phase overview

| Phase | Name | Status |
| --- | --- | --- |
| 0 | Docs & repo setup | ☑ |
| 1 | Xcode scaffold & technical verification | ☑ |
| 2 | Content bundling | ☑ |
| 3 | Native navigation shell | ☑ |
| 4 | Full on-device QA pass | ☑ |
| 5 | App identity & sideload install | ☑ |
| 6 | Deferred / later | not started |

## Phase 0 — Docs & repo setup

- ☑ **0.1 Design and legal primer.** `DESIGN.md` (architecture, portability
  plan) and `LEGAL.md` (trademark/naming considerations) written
  2026-08-20.
- ☑ **0.2 Repo setup.** Private GitHub repo under `homesik92` (session
  owner's explicit call via `AskUserQuestion` — trademark-sensitive naming
  makes this a different call than PRAXIS-Practice's public-by-default
  precedent, D-16 there). `.gitignore` seeded with standard Xcode/macOS
  entries ahead of the actual Xcode project.
- ☑ **0.3 This roadmap and `DECISIONS.md`.**

## Phase 1 — Xcode scaffold & technical verification

*Accepts:* a SwiftUI App project exists, builds, and runs on the simulator;
both of DESIGN.md §3's flagged technical points are concretely confirmed
against a real build, not assumed. **Done, 2026-08-20 — one real finding
along the way, see D-7.**

- ☑ **1.1 Xcode project scaffold.** Reconfirmed this machine's Xcode is
  still 14.3.1 / iOS SDK 16.4 (no drift from `splankna-ios`'s own notes).
  No project-creation CLI ships with Xcode itself, and `xcodegen`'s
  Homebrew formula refused to install ("requires a full installation of
  Xcode.app 15.3" — this machine's Xcode is 14.3.1) — worked around by
  installing `xcodegen`'s standalone GitHub release binary directly to a
  user-owned prefix instead (`~/.local`), which has no such gate and runs
  fine; Homebrew's formula-level requirement turned out to be overly
  conservative, not a real limitation of the tool itself. Project generated
  from `project.yml` (bundle id `com.homesik92.PraxisMath`, D-6; iOS 16.4
  deployment target). `xcodebuild` confirms a clean build.
- ☑ **1.2 `WebViewContainer`.** Built, then revised same-session once 1.3
  found `loadFileURL` didn't actually satisfy its own purpose — see D-7.
  Final form: `UIViewRepresentable` wrapping `WKWebView`, loading content
  via `LocalContentSchemeHandler` (a `WKURLSchemeHandler`) over a custom
  `praxisapp://` scheme.
- ☑ **1.3 Verify bundled `fetch()` works — real finding, real fix (D-7).**
  The original `loadFileURL(_:allowingReadAccessTo:)` plan (DESIGN.md's
  original §3) rendered a minimal bundled test page correctly but failed
  its own `fetch()` call against a sibling bundled JSON file ("Load
  failed"); a parallel `XMLHttpRequest` to the identical path failed
  identically, ruling out a Fetch-API-specific quirk, and `document.URL`
  confirmed the file resolved to exactly the expected path, ruling out a
  bundling/path bug. Root cause: `loadFileURL`'s read-access grant governs
  the WebView's resource loader (navigation, `<script>`, `<link>`), not the
  separate Fetch/XHR network stack, which treats `file://` as an opaque
  origin regardless. Fixed by serving content over a custom URL scheme
  instead (`LocalContentSchemeHandler.swift`) — the same technique
  Capacitor/Ionic use for exactly this reason. Re-verified after the fix:
  both `fetch()` and `XHR` succeed cleanly under `praxisapp://`.
- ☑ **1.4 Verify `localStorage` persists across app relaunch.** Confirmed
  directly: set a marker, force-terminated the app via `simctl terminate`
  (not just backgrounded), relaunched, marker still present. One expected,
  harmless nuance observed directly rather than just asserted:
  `localStorage` is origin-scoped, so switching from `file://` to
  `praxisapp://` mid-Phase-1 (per 1.3's fix) reset the test marker once —
  not a concern now that the origin is settled.

## Phase 2 — Content bundling

*Accepts:* PRAXIS-Practice's `test.html` Start hub renders correctly inside
the app's `WebViewContainer`, sourced from bundled files, no server involved.
**Done, 2026-08-20 — two more real findings, both implementation
refinements of D-7's already-decided scheme-handler approach, not new
forks.**

- ☑ **2.1 Copy in the shared engine + 5165 data.** `js/`, `css/`, the
  relevant `.html` pages, `data/tests/5165.json`, `data/teaching/5165.json`,
  `data/reference/5165-formulas.json` copied in per DESIGN.md §5.
  `data/manifest.json` bundled **trimmed to its single 5165 entry**, not
  copied verbatim — matches D-2's own stated design ("swap
  `data/manifest.json`'s one entry" for a future subject app), so this app
  never carries the other three subjects' manifest rows at all.
- ☑ **2.2 Confirm `test.html` renders — two real bugs found and fixed
  getting there.** `ContentView` now loads `test.html?code=5165` directly
  (D-2: single-subject app, no test-picker step needed). Two issues surfaced
  by an isolated debug page (`fetch("data/manifest.json")` /
  `fetch("data/tests/5165.json")`, checked before trusting the full app):
  1. **Nested-path resolution bug in `LocalContentSchemeHandler`.**
     Phase 1 only ever exercised a flat, non-nested bundled file. Once real
     content introduced real subdirectories (`data/tests/5165.json`), the
     handler's `Bundle.main.url(forResource:)` call — which had the whole
     relative path (including `/`) jammed into the `forResource` name
     parameter — doesn't reliably resolve names containing slashes. Fixed
     by properly splitting the relative path into a `subdirectory:` argument
     (the nested folder portion) and a bare filename, matching how the
     `Bundle` API is actually meant to be used.
  2. **Missing HTTP status on the scheme handler's response.** Even after
     fix #1, the debug page showed `fetch()` succeeding with the *correct
     body content* but **`status: 0`** — a plain `URLResponse` has no HTTP
     status code concept at all, so `response.ok` reads `false` in `fetch()`
     regardless of whether the body loaded. This exactly explains why
     `test.html` showed `Test "5165" is not registered.`: PRAXIS-Practice's
     own `loadManifest`/`loadBank` (`js/schema.js`) correctly check
     `response.ok` before parsing, per their own error-handling contract —
     the data was arriving fine, but got treated as a failed fetch. Fixed
     by returning a real `HTTPURLResponse` with `statusCode: 200` and
     `Content-Type`/`Content-Length` headers instead of a generic
     `URLResponse`. Re-verified via the same debug page: both requests now
     report `status: 200`. Confirmed `js/schema.js`'s own try/catch +
     `!response.ok` handling already covers both failure shapes (network
     rejection and a resolved-but-not-ok response) gracefully, so the
     not-found path (`didFailWithError`) didn't need a matching change.
  Debug page removed once its job was done. Live-verified the real
  `test.html` afterward: "Mathematics" heading, "Not started" score meter,
  and the full real category breakdown (Number and Quantity, Algebra,
  Functions, Calculus, …) all rendering from genuinely fetched bundled
  data — not placeholder content.

**Standing obligation from Phase 2 onward, flagged by the session owner
2026-08-20 while live-testing PRAXIS-Practice directly:** once this app
carries its own bundled copy of PRAXIS-Practice's content (question banks,
teaching chapters, reference panels), any data/content bug found by testing
either app has to be fixed in **both** places — PRAXIS-Practice's own
source data, and this app's bundled copy (D-3's manual-copy tradeoff,
now concrete rather than hypothetical). Before Phase 2, a
PRAXIS-Practice-side content fix needs no action here at all, since nothing
is bundled yet. After Phase 2, treat "fixed in PRAXIS-Practice" as
incomplete until the same fix has also been re-copied into
`Sources/WebContent/` here and re-verified. If this starts happening often
enough to be real toil, that's the signal D-3 already named to build the
small sync script, not a reason to skip the manual copy in the meantime.

## Phase 3 — Native navigation shell

*Accepts:* a `TabView` shell exists with Practice and Study tabs, each
hosting a `WebViewContainer`; navigating between pages *within* a tab (e.g.
`test.html` → `run.html` → `results.html`) still works exactly as it does
in the browser today, entirely inside that tab's WebView. **Done,
2026-08-20 — one real design gap found and closed, see D-8.**

- ☑ **3.1 `TabView` root shell — real gap found first.** `DESIGN.md`'s
  original assumption was that `teach.html` had its own in-page category
  picker the Study tab could just load directly. Reading the actual page
  showed it requires both `code` and `category` URL parameters and shows
  "No category selected. Go back and choose one." without one — there was
  no way to reach any of 5165's already-authored teaching chapters, in
  either app, since PRAXIS-Practice's own "Study a topic" link is still a
  disabled stub. Session owner chose a small native picker over deferring
  the tab (D-8). `Sources/App/CategoryPicker.swift` reads 5165's leaf
  categories directly out of the bundled `data/tests/5165.json` at runtime
  (verified against the real file: I-A Number and Quantity, I-B Algebra,
  II-A Functions, II-B Calculus, III Geometry, IV Statistics & Probability —
  not hardcoded from memory). `Sources/App/StudyPickerView.swift` lists
  them in a `NavigationStack`; tapping one pushes a `WebViewContainer`
  loading `teach.html?code=5165&category=<id>`. `ContentView.swift` is now
  a `TabView` with Practice (`test.html?code=5165`, unchanged from Phase 2)
  and Study (`StudyPickerView`) tabs.
- ☑ **3.2 Confirm inner navigation & the new picker, live.** The MCP
  simulator panel is still crashed (unrelated to this project, see Phase 1's
  session log), and scripted taps via `osascript`/System Events are blocked
  by this machine's Accessibility permissions (a system-settings change,
  not made without the session owner doing it themselves) — verified
  another way instead: temporarily forced the `TabView`'s initial tab to
  Study (`.constant(1)`, reverted immediately after) to screenshot the
  picker itself (all 6 categories, correct labels, correct order), then
  temporarily pointed the Study tab straight at
  `teach.html?code=5165&category=I-B` to screenshot the real bundled
  Algebra chapter content rendering (headings, prose, and the quadratic
  formula as real math markup) through the exact same
  `WebViewContainer`/`LocalContentSchemeHandler` path a tap would take.
  Both temporary overrides reverted afterward; final build re-verified
  clean with the real `StudyPickerView`-based tab restored. Practice tab
  re-confirmed rendering correctly alongside the new tab bar (Mathematics
  heading, score meter, category breakdown). Didn't re-test
  test→run→results inner navigation itself here since Phase 2 already
  confirmed `test.html` loads correctly under the same mechanism and
  nothing in Phase 3 touched that page or the scheme handler.

## Phase 4 — Full on-device QA pass

*Accepts:* every one of PRAXIS-Practice's 5 modes exercised end-to-end on a
real simulator/device, matching the rigor PRAXIS-Practice's own live-testing
already applies — not just "it builds." **Done, 2026-08-20 — one real app
bug found and fixed (a tab-bar/`ignoresSafeArea` silent-tap-swallowing bug,
see D-9), plus a confirmed gap in backup/export (see D-10, tracked as
[issue #1](https://github.com/homesik92/PRAXIS-iOS-Math/issues/1)).**

- ☑ **4.1 Full pass, all 5 modes.** Driven via a new `PraxisMathUITests`
  XCUITest target (`Sources/UITests/Phase4Tests.swift`), not
  `osascript`/System Events — that approach was tried first and rejected
  once a raw, untargeted click landed on the Claude desktop app's own
  window instead of the Simulator on this multi-window desktop; XCUITest's
  taps are scoped to the target app's own process and can't leak elsewhere.
  All 5 modes (full timed test, practice a topic, category test, study a
  topic, review a topic) each started, used, and completed at least once,
  confirmed by 6 passing test methods (one combines the full-test-completion
  and persistence checks into a single run rather than repeating the
  66-question flow twice) — 0 failures across a full-suite run.
  **The real finding**: tapping "Submit test" during a real run silently
  failed to open the confirm-submit dialog — no crash, no JS error. Root
  cause, confirmed via XCUITest's own tap-coordinate log rather than
  guessed: the Practice tab's `WebViewContainer` had `.ignoresSafeArea()`
  (all edges), so once the review screen's content scrolled enough to put
  "Submit test" near the bottom of the *reported* viewport, the button
  landed physically underneath the native tab bar, which silently ate the
  touch. Same latent bug removed from the Study tab pre-emptively (not yet
  observed there, but identical cause). Documented as this project's own
  D-9 — see `DECISIONS.md`.
- ☑ **4.2 Progress persistence check.** Folded into
  `testFullTestCompletionAndPersistence`: complete a full attempt, force-quit
  the app (`simctl terminate`, not just backgrounding), relaunch, confirm the
  attempt and its score are still present — passes, matching Phase 1.4's
  isolated `localStorage` check now confirmed under real app usage.
- ☑ **4.3 Backup/restore check — confirms a real gap, not a clean pass.**
  `testBackupExportTap` dumps the accessibility tree right after tapping
  "Download progress" rather than assuming success or failure. Finding:
  **zero observable effect** — no share sheet, no status message (the
  `#export-status` text stays hidden), nothing changes. `WebViewContainer`
  has no `WKDownloadDelegate`, so the web app's Blob-URL/`<a download>`
  export mechanism has nowhere to go; it degrades silently rather than
  erroring. **Decision (D-10)**: v1 ships with this as a known, accepted
  no-op, not a Phase-4 blocker — the real native download/share-sheet hook
  is tracked as
  [issue #1](https://github.com/homesik92/PRAXIS-iOS-Math/issues/1), not
  built now. Restore (`<input type=file>`) wasn't exercised this pass and
  may share the same category of gap — noted on the issue.
- **Two test-authoring bugs found and fixed along the way, distinct from the
  app bugs above** (both in `Phase4Tests.swift` itself): the backup-panel
  `<summary>`/`<details>` toggle renders to WebKit's accessibility bridge as
  a generic `Other` element, not a `Button` — same category of surprise as
  the already-documented radio-button locators; and the review-a-topic drill
  loop was bounded at 20 iterations when the real bundled `5165.json` has
  categories with up to 39 questions (confirmed by counting, not guessed) —
  bumped to 45.

## Phase 5 — App identity & sideload install

*Accepts:* the app has a real icon and launch screen and installs via Xcode
onto the session owner's own device, not just the simulator.

- ☑ **5.1 App icon & launch screen.**
- ☑ **5.2 Sideload install onto a real device**, matching `splankna-ios`'s
  existing setup.

## Phase 6 — Deferred / later

Not scoped in detail yet — revisit only when actually wanted:

- Native Share-Sheet integration for the backup/restore feature
  (LEGAL.md-unrelated; DESIGN.md §7's cross-device-migration mitigation) —
  now a confirmed gap, not just a hypothetical, per Phase 4.3/D-10; tracked
  as [issue #1](https://github.com/homesik92/PRAXIS-iOS-Math/issues/1).
- ~~iPad support~~ — **done** ([issue #2](https://github.com/homesik92/PRAXIS-iOS-Math/issues/2),
  closed via [PR #7](https://github.com/homesik92/PRAXIS-iOS-Math/pull/7)).
  `TARGETED_DEVICE_FAMILY` is `"1,2"`, iPad icons added, and iPad gets
  landscape (all four orientations) while iPhone stays portrait-only —
  required switching from `GENERATE_INFOPLIST_FILE` to a real `Info.plist`
  file, since device-suffixed `INFOPLIST_KEY_*` build settings silently
  don't work under that mechanism (Apple bug FB9757266, confirmed against
  the built binary). Simulator-verified only — visual landscape rotation
  and real iPad testing are still open, see the gate below.
- A second subject app (5652 Computer Science) — see DESIGN.md §6 for the
  portability recipe; blocked on 5652 content being authored in
  PRAXIS-Practice first, and on `format: "code"` rendering
  ([PRAXIS-Practice issue #45](https://github.com/homesik92/PRAXIS-Practice/issues/45))
  if CS's teaching/reference content needs it.
- Any App Store / public-distribution work — gated on `LEGAL.md`'s
  before-publication checklist being fully worked through first, including
  the real attorney consult.

## Gate: the shared native shell must be correct before the app ships

Session owner's sequencing decision, 2026-08-22, **restated 2026-09-08 after
D-18**. The gate survives that decision but its mechanism changed, so it is
worth stating precisely rather than leaving the old wording to be
misread.

*Originally* (under D-12, separate repo per subject) the gate was about
**copying**: this repo was the literal template, so anything unfinished here
would be duplicated N times instead of fixed once.

*Now* (under D-18 and then D-19, a single target holding all five subjects)
nothing is ever copied, so duplication is no longer the risk. The risk is the
opposite shape and is now maximal: there is exactly **one** native shell, and
every subject — free and paid alike — runs on it. A defect left in it is not
copied N times; it is simply present for every user of every subject at once.
The gate therefore still holds, and now means: **the native shell must be
complete and explicitly user-accepted before the app ships to anyone who paid
for it.**

Remaining before this gate closes:

- iPad's visual landscape check and real-iPad device testing, including
  whether D-17's top-edge fix actually stops the accidental quit-to-home
  (the Simulator cannot reproduce iPadOS system-gesture arbitration).
- [Issue #14](https://github.com/homesik92/PRAXIS-iOS-Math/issues/14) —
  `WebViewContainer` has no `WKNavigationDelegate`. Now gating rather than
  merely filed: it is a shell defect, so every future target inherits it.
- [Issue #1](https://github.com/homesik92/PRAXIS-iOS-Math/issues/1) —
  backup/export share-sheet gap, still deferred as a v1 no-op per D-10. Same
  shell surface as #14 and best taken with it. **D-19 raises its stakes**: a
  silent no-op is a defensible rough edge in a personal free app and a much
  weaker position in one people have paid for, since the export button is the
  only route a paying user has to their own study history.
- The StoreKit integration and native subject picker (D-19) — new, and now on
  the critical path rather than optional.
- The naming and bundle-identifier questions
  ([#20](https://github.com/homesik92/PRAXIS-iOS-Math/issues/20)), which
  `LEGAL.md`'s own trigger requires settling before any App Store Connect
  record exists. That registration is the one irreversible step in the plan.

This gate is independent of PRAXIS-Practice's own Phase 10.2 (all subjects
authored and accepted there). Both must close before a second subject target
ships; neither alone is sufficient. Note the two lock on different schedules —
PRAXIS-Practice's *engine* stabilizing is what actually gates this repo, while
its *content* keeps growing indefinitely and syncs in as ordinary updates.

## Release sequencing

Agreed with the session owner 2026-09-08. The authoritative copy lives in
[PRAXIS-Practice's ROADMAP](https://github.com/homesik92/PRAXIS-Practice/blob/main/ROADMAP.md)
("After Phase 10"), since the ordering spans both projects; repeated here in
brief because a session working in *this* repo reads *this* file.

1. **Name/trademark consult — now, in parallel with everything else.**
2. **PRAXIS-Practice to production-ready.**
3. **This app to production-ready** — the gate above, then StoreKit and the
   native picker (issue #24).
4. **App Store work last** — App Store Connect record, IAP product records,
   listing copy, screenshots, pricing, submission.

Two things that *look* like step 4 but are not, and should not wait for it:

- **The name and bundle identifier (#20) are branding, not store work.**
  "Praxis" is already this app's product name, its bundle identifier
  (`com.homesik92.PraxisMath`, D-6), this repo's name, and the upstream
  site's public wordmark. `LEGAL.md` advises against using it as a product
  *brand* rather than a descriptive reference, and a change reaches all of
  those at once. Nothing blocks booking the consult, and it gets more
  expensive the longer it waits.
- **The StoreKit code (#24) is architecture, not store work.** The native
  picker replaces `ContentView`'s hardcoded `test.html?code=5165`, which is
  core app structure. The whole purchase/restore flow is testable locally
  with an Xcode StoreKit configuration file — **no App Store Connect record
  is required to build or test it.** Only the four product records wait.

One practical note for step 4: the paid-apps agreement and banking/tax forms
involve verification that can take days. Worth starting before submission day.

## Session log

| Date | Session | Outcome |
| --- | --- | --- |
| 2026-09-08 | D-19 — one app, all five subjects, four unlocked by IAP (amends D-18, supersedes D-2's single-subject premise) | Session owner's call, hours after D-18 and going further, because a constraint came into view that D-18 was written without. Reviewing the overall structure against the stated end goal (one web app, five subjects on the App Store, Math free and four sold) surfaced **App Store Review Guideline 4.3(a)**, researched live rather than recalled: it warns against "multiple Bundle IDs of the same app," gives "a separate map app for every city" as its example, and names in-app purchase as the remedy. Five apps that are one binary differing only in `data/` is close to the textbook case. The session owner's stated reason for wanting five apps was to *avoid* in-app-purchase complexity; checked rather than assumed, that trade runs the other way — StoreKit 2 needs no server and no receipt backend (five calls: `Product.products(for:)`, `purchase()`, `Transaction.currentEntitlements`, `Transaction.updates`, `AppStore.sync()`), a one-off cost, while five listings is a recurring five-review-cycles-per-update cost forever. All five subjects' content totals 3.6MB, so "too large" was measured and dismissed. **The one genuinely new design decision is the entitlement bridge, and the answer is that there isn't one**: a native SwiftUI picker sits in front of the WebView and hands it only an already-unlocked subject's code, so purchase state never crosses into the web layer and every PRAXIS-Practice file stays byte-identical — the alternative (a "locked" state in `index.html`) would have forked a shared file upstream for an app-only concern, violating the boundary written down in D-18 the same day. Consequences: one bundle id instead of five (shrinking #20's irreversible surface), the trimmed single-entry `manifest.json` from D-2 retired in favour of the full payload, #16's restructure reduced to almost nothing, and **the planned upstream single-subject-mode work cancelled outright** — its premise, that a wrapper app shows one subject, is now false. Docs only; the StoreKit work and picker are separate. |
| 2026-09-08 | D-18 — one repo, one target per subject (supersedes D-12) | Session owner's call, reversing D-12's separate-repo-per-subject structure in favour of the alternative D-12 itself had named and rejected: one Xcode project with a target per subject over a shared `Sources/App/*.swift`. The reversal was driven by evidence rather than preference — D-12 explicitly accepted that native-shell fixes would need hand-porting between sibling repos, and that cost has since been measured while still hypothetical: D-9 and D-17 are the same safe-area bug class in `ContentView.swift` found seven days apart, and issues #1 and #14 are two missing WKWebView delegates in `WebViewContainer.swift`, both currently unfixed. Four subjects under D-12 would have turned those four defects into sixteen hand-ported fixes; the cheapest moment to change course is before the first clone exists, which is where this was decided. Documented only — **no restructure work done in this session**; adding targets, per-target resource sets and per-target identity is separate scheduled work (issue filed). Docs updated in one pass: D-18 appended with forward-pointer trailers on D-2 and D-12 (append-only convention), DECISIONS-INDEX row re-chained, CLAUDE.md's 'this is the template repos get copied from' bullet rewritten, DESIGN.md §6 rewritten from a copy-the-project recipe to an add-a-target one, and this file's template gate restated — it survives D-18 but inverts: nothing is copied any more, so the risk is no longer a defect being duplicated N times but a defect in the shared shell being present in all N apps at once. Issue #14 is promoted from filed-and-deferred to gating on that basis. Also recorded the boundary that keeps 'iOS draws from PRAXIS-Practice' intact under the new structure: this repo chooses which upstream files it bundles and what native chrome wraps them, and never edits the contents of a file PRAXIS-Practice owns. |
| 2026-08-20 | Project kickoff | `DESIGN.md` and `LEGAL.md` written following a conversation exploring whether/how to wrap PRAXIS-Practice as an iOS app. Repo created private on `homesik92` (session owner's explicit call, given `LEGAL.md`'s trademark-sensitivity concerns make this a different call than every sibling project's public-by-default precedent). This roadmap and `DECISIONS.md` written to close out Phase 0. **No Xcode project yet — Phase 1 is the next real work.** |
| 2026-08-20 | Phase 1 — Xcode scaffold & technical verification | Bundle identifier settled first (D-6, `com.homesik92.PraxisMath`) after the session owner asked what one actually is. `xcodegen`'s Homebrew formula refused to install on this machine's Xcode 14.3.1 ("requires Xcode.app 15.3") — worked around with `xcodegen`'s standalone GitHub release binary instead, installed to a user-owned prefix (no `sudo`), which has no such gate. Generated a SwiftUI App project (iOS 16.4 target) and built it successfully via `xcodebuild`. **Real finding during 1.3**: the originally-planned `loadFileURL(_:allowingReadAccessTo:)` approach does not make `fetch()`/`XMLHttpRequest` work against bundled sibling files, despite loading the page itself correctly — confirmed via a minimal bundled test page plus a parallel XHR check (both failed identically) and a `document.URL` check (ruled out a path bug) before concluding it was a genuine WebKit `file://`-origin limitation, not a bug in this project's own bundling code. Fixed with a custom `WKURLSchemeHandler` (`LocalContentSchemeHandler.swift`) serving content over `praxisapp://` instead — the same technique Capacitor/Ionic use for exactly this reason (D-7). Re-verified after the fix: `fetch()` works, and `localStorage` genuinely persists across a real `simctl terminate` + relaunch (not just a page reload). `DESIGN.md` §3/§5 updated to describe the actual working mechanism. The simulator's live-view panel crashed repeatedly and needed the session owner's own re-open (noted, not fixed — outside this session's reach); all verification instead done directly via `xcodebuild`/`xcrun simctl` (build, install, launch, screenshot), independent of the panel. **Phase 1 fully done — Phase 2 (bundling PRAXIS-Practice's real content) is next.** |
| 2026-08-20 | Phase 2 — Content bundling | Copied in PRAXIS-Practice's `js/`/`css/`/HTML pages and 5165's data files; `manifest.json` bundled trimmed to its single 5165 entry per D-2. `ContentView` now loads `test.html?code=5165` directly. Real `test.html` initially failed with `Test "5165" is not registered.` — diagnosed with an isolated debug page rather than guessing, which surfaced two real bugs in `LocalContentSchemeHandler` (both implementation refinements of D-7's already-decided scheme-handler approach, not new forks): (1) nested bundled paths like `data/tests/5165.json` weren't resolving, since the whole relative path including `/` was being jammed into `Bundle.main.url(forResource:)`'s name parameter instead of being split into a proper `subdirectory:` argument; (2) even after fixing that, `fetch()` reported `status: 0` despite the correct body arriving, because the handler returned a plain `URLResponse` with no HTTP status concept — `js/schema.js`'s own `loadManifest`/`loadBank` correctly check `response.ok` before parsing, so real data was being treated as a failed fetch. Fixed by returning a proper `HTTPURLResponse` with `statusCode: 200`. Re-verified via the debug page (both fetches now report 200), then removed it and confirmed the real `test.html` renders correctly — "Mathematics" heading, "Not started" score meter, full real category breakdown, all from genuinely fetched bundled data. Also noted, separately: the session owner flagged that once this app carries bundled content, a data/content bug found while testing either app needs the same fix applied in both places (D-3's manual-sync tradeoff, now concrete) — recorded as a standing Phase-2-onward obligation in this file. **Phase 2 fully done — Phase 3 (native TabView shell) is next.** |
| 2026-08-20 | Phase 3 — Native navigation shell | `DESIGN.md`'s assumption that `teach.html` had its own category picker turned out wrong — it requires `category` in the URL and has no way to set it from within the page, and PRAXIS-Practice's own "Study a topic" link that would normally set it is still a disabled stub. Presented the session owner two options via `AskUserQuestion`; they chose building a small native picker over deferring the Study tab (D-8). Added `CategoryPicker.swift` (reads 5165's leaf categories straight out of the bundled `data/tests/5165.json` at runtime — verified against the real file rather than assumed: I-A/I-B/II-A/II-B/III/IV) and `StudyPickerView.swift` (lists them, pushes `teach.html?code=5165&category=<id>` on tap). `ContentView` restructured into a `TabView` (Practice/Study). The MCP simulator panel is still crashed and scripted taps via `osascript` turned out to be blocked by this machine's Accessibility permissions (a system-settings change left to the session owner, not made here) — verified with a different, still-real method: temporarily forced the initial tab/route via `.constant(...)` overrides, screenshotted, then reverted, confirming (a) all 6 categories render correctly in the native picker and (b) tapping through actually reaches real bundled content (`teach.html?code=5165&category=I-B` rendered the real Algebra chapter, prose and quadratic-formula markup included) via the same `WebViewContainer`/scheme-handler path Phase 2 already proved. Final build re-verified clean with the real picker-based tab restored. **Phase 3 fully done — Phase 4 (full on-device QA pass across all 5 modes) is next.** |
| 2026-08-20 | Phase 4 — Full on-device QA pass (session interrupted mid-way by a file-access lockout, resumed same day) | Added a `PraxisMathUITests` XCUITest target after `osascript`/System Events was tried first and found both blocked by this machine's Accessibility permissions and, once unblocked, unsafe (a global click landed on the Claude desktop app's own window instead of the Simulator on this multi-window desktop) — session owner chose XCUITest via `AskUserQuestion` since its taps are scoped to the target app's process. Building `Phase4Tests.swift`, hit a real bug: tapping "Submit test" silently failed to open the confirm dialog. Diagnosed with real evidence at each step (a hand-built `<dialog>` test page ruled out a WKWebView limitation; a `WKScriptMessageHandler` bridge forwarding `window.onerror` ruled out a JS exception; monkey-patching `showModal` itself showed the click handler never fired at all) before XCUITest's own tap-coordinate log revealed the actual cause: `.ignoresSafeArea()` on the Practice tab's `WebViewContainer` let scrolled-to-bottom content extend under the native tab bar, which silently swallowed the touch. Fixed in `ContentView.swift` (`.ignoresSafeArea(edges: .top)`) and pre-emptively in `StudyPickerView.swift` (removed entirely, same latent cause not yet observed there). Documented as D-9. Mid-session, both the Bash and Read tools began returning `EPERM` on every path under this machine's `Claude-Work` directory — looked like a stuck session-level sandbox state, not a real ACL change; session ended there with `Phase4Tests.swift` uncommitted and two of its six methods never actually run. **Resumed same day, access restored on its own.** Ran `xcodegen generate` (project file was stale, referencing an already-deleted spike-test file — self-healed, since `xcodegen` fully rescans `Sources/` every run) then ran all 6 `Phase4Tests` methods for real. Two test-authoring bugs surfaced and fixed (not app bugs): `testBackupExportTap` used `app.buttons[...]` against a `<summary>`/`<details>` toggle that WebKit's accessibility bridge exposes as a generic `Other` element, not a `Button`; and `testReviewATopic`'s completion loop was bounded at 20 iterations against real categories with up to 39 questions (counted directly in `5165.json`, not guessed), bumped to 45. Once both were fixed, all 6 tests passed together in one full-suite run (0 failures, 257s). **The actual 4.3 finding**: tapping "Download progress" produces no observable effect at all — no share sheet, no status text, nothing — confirming `WebViewContainer` has no `WKDownloadDelegate` for the web app's Blob-URL export mechanism to hand off to. Session owner's call: ship v1 with this as a known no-op rather than build the native hook now (D-10); filed as [issue #1](https://github.com/homesik92/PRAXIS-iOS-Math/issues/1) instead of a TODO. **Phase 4 fully done — Phase 5 (app identity & sideload install) is next.** |
| 2026-08-21 | Phase 5 — App identity & sideload install | 5.1 (icon/signing) was built in a prior part of this session: an italic serif "f(x)" icon on a deep navy background, `CODE_SIGN_STYLE: Automatic` and `DEVELOPMENT_TEAM: NP2F4WUWJG` (the same paid Apple Developer team already active for `splankna-ios`) set in `project.yml`. 5.2 required a macOS/Xcode upgrade first (14.3.1 lacked CoreDevice and couldn't see any real physical device as a build target at all) — session owner upgraded to macOS 26.6.2 / Xcode 26.6 outside this session. With that done, the real device install hit three sequential, real blockers, each confirmed rather than guessed: Developer Mode disabled on the phone (fixed via Settings), the device not yet registered in the Apple Developer account (fixed by adding `-allowProvisioningDeviceRegistration` to the `xcodebuild` invocation, which required confirming the Apple ID password on the phone itself), and then a `CodeSign` failure (`errSecInternalComponent`) even though a real signing identity and provisioning profile had resolved correctly. The third one turned out to be a machine-level problem, not a project one: the login keychain's stored password had desynced from the Mac's actual login password (confirmed via cascading "wants to use the login keychain" prompts from unrelated system daemons, `accountsd` then `sharingd`, that neither the current login password nor the Apple ID password would clear). Fixed by the session owner running `security set-keychain-password` directly in their own Terminal — notably, this macOS version's Keychain Access.app GUI has no working path for this at all (greyed out even fully unlocked). Documented as D-11, since it's a genuine landmine worth recording even though nothing in this repo changed to fix it. Once fixed, the same build command succeeded cleanly, and the app installed and launched successfully on the session owner's real iPhone via `xcrun devicectl` — confirmed working by the session owner on the device itself. **Phase 5 fully done.** A follow-up question about iPad support was raised and filed as [issue #2](https://github.com/homesik92/PRAXIS-iOS-Math/issues/2) (currently iPhone-only by explicit config, not a code constraint) rather than scoped into this phase. |
| 2026-08-22 | Issue #2 — iPad support | [PR #7](https://github.com/homesik92/PRAXIS-iOS-Math/pull/7). `TARGETED_DEVICE_FAMILY` flipped to `"1,2"`; six iPad-sized icons generated from the existing 1024px source and added to `AppIcon.appiconset`. Session owner also asked for landscape on iPad specifically (iPhone stays portrait-only) — the obvious approach, a `~ipad`-suffixed `INFOPLIST_KEY_UISupportedInterfaceOrientations` build setting under `GENERATE_INFOPLIST_FILE`, was tried first and empirically confirmed (via `PlistBuddy` against the actual built `Info.plist`, not assumed) to silently do nothing: a known Xcode limitation, Apple bug FB9757266 — `GENERATE_INFOPLIST_FILE`'s auto-synthesis doesn't handle device-idiom-suffixed keys at all. Fixed by switching the target to a real, physical `Info.plist` file via xcodegen's `info.properties`, first capturing every key `GENERATE_INFOPLIST_FILE` had been auto-generating (read directly from the actual built plist, not guessed) so nothing was lost in the switch, then adding the two device-specific orientation keys. Re-verified in a clean rebuild: both `~ipad` (all four orientations) and `~iphone` (portrait only) keys present and correct, `CFBundleDisplayName`/`UILaunchScreen`/`UIApplicationSceneManifest` all unchanged. No SwiftUI changes needed for either half — confirmed via grep, no hardcoded iPhone-specific frame/geometry in `Sources/App`. Verified in the iPad Pro 11-inch (M5) simulator: clean build, real content renders correctly, native iPad top-tab bar, no layout issues. **Not verified**: actually rotating the simulator to landscape (no `simctl` rotation command, and `osascript`-based Simulator automation is an unreliable documented landmine on this machine) and real physical iPad testing (none connected this session). Issue #2 closed with an evidence comment. |
| 2026-08-23 | Bundled-content sync from PRAXIS-Practice PR #72/#73, real iPad connected | Per D-3's manual-sync obligation: `diff`-checked all of `Sources/WebContent/` against `../PRAXIS-Practice` before assuming anything was already current, confirmed drift limited to exactly `test.html`, `run.html`, `results.html`, `css/base.css` (all four differing only by PRAXIS-Practice's own already-merged [PR #72](https://github.com/homesik92/PRAXIS-Practice/pull/72) and [PR #73](https://github.com/homesik92/PRAXIS-Practice/pull/73) content — no unexpected divergence), plus a brand-new `js/review-row.js` that didn't exist here yet. Copied all five files straight across; re-diffed after to confirm byte-identical with the source repo. Brings in: the Practice-a-topic/Category-test drill heading showing the chosen category instead of the subject name, the Formulas & Notation panel's centered/accented category headers, Category-test's dropdown narrowed to top-level groups only, a full red/green review-with-explanations on both drill modes' completion screen (mirroring the real test's results page), and a second "Submit test" button at the top of the review pass so a long form doesn't require scrolling to submit. No native Swift/SwiftUI code touched — content-only sync. Separately, a second real device is now available for testing: a different iPad (iPadOS 26.6.1) than the one behind Phase 5/issue #2's original "no iPad connected" gap — a charging-only cable/port was the root cause of it not appearing at all (no Trust prompt, no Developer Mode entry in Settings), fixed by switching to the iPad's own cable plugged directly into a Mac port; confirmed connected via `xcrun xctrace list devices`. |
| 2026-08-26 | Bundled-content sync from PRAXIS-Practice PR #74/#75 | Per D-3's manual-sync obligation: the session owner asked directly whether PRAXIS-Practice's box-overflow fix and new "Clear performance data" control had made it here yet — they hadn't. `diff`-checked all of `Sources/WebContent/` against `../PRAXIS-Practice`, confirming drift limited to exactly seven files: `test.html`, `run.html`, `css/base.css`, `js/store.js`, `js/reference-panel.js`, `js/review-row.js`, `js/results.js` (all differing only by PRAXIS-Practice's own already-merged [PR #74](https://github.com/homesik92/PRAXIS-Practice/pull/74) and [PR #75](https://github.com/homesik92/PRAXIS-Practice/pull/75) content — `results.html` was already identical, no unexpected divergence anywhere). Copied all seven straight across; re-diffed after to confirm byte-identical with the source repo. Brings in: the long-word-problem question-box overflow fix (`#question-stem`/`#study-stem`'s `float: left; width: 100%` legend fix), the new "Clear performance data" per-test reset control (`clearTestData` in `js/store.js`, wired into `test.html` behind its own confirm dialog), and the `format: "code"`/`format: "mathml"` question-rendering fix (`renderContent` now used by `run.html`/`js/review-row.js`/`js/results.js` for stem/option/explanation content, not just reference panels) — this app's own content (5165 Mathematics) is all `format: "text"` today, so the rendering fix has no visible effect here yet, but keeps this app's engine code in step with the master repo's. No native Swift/SwiftUI code touched — content-only sync. Verified via a fresh `xcodebuild` (Debug, iPad Pro 11-inch M5 simulator) — build succeeded, app launched, "Clear performance data" control visible and correctly placed on the Practice tab's start screen. Not verified this session: an actual long-stem question box on a real device (no physical iPad connected this session) — the underlying CSS fix is identical to PRAXIS-Practice's own already-live-tested version, so this is considered low-risk, but worth a real-device spot-check next time one is connected. |
| 2026-08-29 | Live-test fix — top-edge `.ignoresSafeArea()` removed (D-17) | Session owner's real-device iPad testing surfaced a bug: brushing the very top of the screen (status-bar strip) during a test mid-tap quit the app to the home screen — iPadOS's own system-gesture recognizers intercepting the touch instead of the page. Root cause diagnosed by inspection as the same shape as D-9's already-fixed bottom-edge bug: `.ignoresSafeArea(edges: .top)` on the Practice tab's `WebViewContainer` (`Sources/App/ContentView.swift`) let touchable WebView content extend into OS-reserved screen space, this time at the top instead of the bottom. Fix: removed the top-edge `.ignoresSafeArea()` call entirely — neither edge is ignored now. Documented as D-17 (extends D-9), index row updated. Verified via a clean Simulator build and launch (iPad Pro 11-inch M5): no visual regression, status bar fully clear, no double-padding. **Not verified**: whether this actually stops the real-device accidental-exit — the Simulator does not reproduce iPadOS's real system-gesture arbitration, and no physical iPad was used this session, so this needs the session owner's own real-iPad confirmation before being considered closed. |
| 2026-09-08 | Bundled-content sync from PRAXIS-Practice (PRs #91–#102) + working-tree repair | Session opened on a **corrupted working tree**: `Sources/App/ContentView.swift` had been overwritten with a 490-line copy of an unrelated project's Google Apps Script — an earlier session writing to the wrong path — leaving the app unable to compile. Confirmed before touching anything that the committed Swift was intact and that the stray content was a *stale duplicate* (v1.0) of a file that still exists, newer (v1.0b), in its own project directory, so `git restore` discarded nothing of value. Per D-3/D-30's manual-sync obligation, `diff`-checked all of `Sources/WebContent/` against `../PRAXIS-Practice` rather than assuming currency: `test.html`, `css/base.css` and seven of nine `js/` files were already current; five files had drifted — `run.html`, `js/schema.js`, `results.html`, `teach.html`, `index.html` — all differing only by the master repo's own already-merged content, no unexpected divergence. **Two further gaps found beyond the planned file set**, both outside the usual sync checklist and neither previously noticed: the bundled `data/tests/5165.json` was **55 questions behind** (198 vs 253), and the trimmed manifest's `bankSize` still read 198. The bank drift was verified **purely additive** (zero lines removed in the diff) before copying, so no existing question, option, or answer key changed — this repo's most damaging possible bug class, checked rather than assumed. Copied all seven files across plus the bank, corrected `bankSize` to 253, and re-diffed to confirm byte-identical with the source repo. Brings in: the **calculator-display `readonly` fix** (the one change with real on-device effect here — a focused non-readonly `<input>` made iPadOS surface a software keyboard over the calculator on every keypad press, so this app has been carrying that bug on device since the calculator shipped), the D-35 history-aware `assembleCategoryDrill` draw, bottom "Back" links on `run.html`/`results.html`/`teach.html`, the 5436 reference-panel entry, and `index.html`'s "Beat Army!" USNA link. No native Swift/SwiftUI code touched — repair plus content-only sync. Verified: the master repo's own `tools/verify.mjs` run against the bundled `data/` directory (0 errors, 0 warnings, including its manifest↔bank cross-check); clean `xcodebuild` (Debug, iPhone 17 simulator); app launched and driven through a real drill — question renders from the freshly-synced bank, calculator opens with **no software keyboard**, keypad still writes to the now-readonly display, and `7 × 8` evaluates to `= 56` (the actual regression risk of `readonly` was breaking input, and it did not). **Not verified**: that the software keyboard would have appeared *without* the fix — the Simulator's hardware-keyboard setting suppresses it independently, so the negative observation here is weak evidence on its own; the fix's own diagnosis came from real iPadOS behavior in the master repo. The D-17 top-edge fix still awaits the session owner's real-iPad confirmation, unchanged by this session. |
