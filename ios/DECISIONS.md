# PRAXIS iOS Math — Decisions

> **Frozen 2026-09-11 — historical record, no longer maintained ([D-44](../DECISIONS.md)).**
> This file came from the former `PRAXIS-iOS-Math` repository when the iOS app moved into
> this one. It is kept so the app's early reasoning stays readable, not as live guidance.
> Cite these entries as **"iOS D-n"** — they were not renumbered, and no new entries are added here. Superseded by D-44: iOS D-3 (manual content copy) and iOS D-4 (private repository). Superseded earlier within this log or by root decisions D-40–D-43: iOS D-2, D-5, D-6, D-12, D-18, D-19.
> Live guidance for the app is [`ios/CLAUDE.md`](CLAUDE.md); decisions from D-44 onward are
> in the root [DECISIONS.md](../DECISIONS.md), and release work is in
> [APP-STORE-ROADMAP.md](../APP-STORE-ROADMAP.md). Links below written as
> `../PRAXIS-Practice` now mean the repository root, and "bundled copy" / `Sources/WebContent/`
> no longer exist — the app bundles the root web files directly.

A short log, not PRAXIS-Practice-scale — this project has far fewer open
forks to decide, since most of the hard design work is inherited from
PRAXIS-Practice rather than invented here. Add a new `D-n` entry (numbers
never reused) whenever a real fork gets decided; skip it for anything
that's just execution of an already-settled decision.

### D-1 — Hybrid architecture: SwiftUI shell + WKWebView content, not a full native rewrite

**Decided:** 2026-08-20, in conversation before any doc was written.
**Why:** PRAXIS-Practice's engine (`js/*.js`) already has hundreds of
passing tests and several real bugs already found and fixed by code review.
Rewriting that logic in Swift would throw all of that away for a
single-user study app, where the payoff is mostly cosmetic native polish.
A pure full-screen WebView with zero native chrome was also considered and
rejected — it doesn't meet the session owner's explicit ask to "use some
SwiftUI functionality to navigate."
**What it means:** a `TabView` (or similar) native shell owns app-level
navigation; a shared `WebViewContainer` (`UIViewRepresentable` wrapping
`WKWebView`) hosts each tab's content; everything *within* a tab (e.g.
`test.html` → `run.html` → `results.html`) keeps navigating via its
existing anchor links, untouched. Full detail in `DESIGN.md` §3.

### D-2 — Single-subject app, with a documented portability recipe for a second subject

**Decided:** 2026-08-20, stated directly by the session owner as the two
governing constraints for this whole project.
**Why:** this app is scoped to Math 5165 only — not a multi-subject picker,
even though PRAXIS-Practice's own manifest already supports multiple
subjects. A future Computer Science (5652) app is a real, stated future
want, so the architecture needs to make that cheap without being built now.
**What it means:** the only subject-specific things in the whole
architecture are the bundled data files and one string constant
(`bank.code`) — see `DESIGN.md` §6 for the concrete recipe (copy the
Xcode project or add a second target, swap the data files, author new
content, change the app identity, zero SwiftUI/JS changes). Flagged
prerequisite for a useful CS app: `format: "code"` rendering isn't
implemented yet in the shared engine
([PRAXIS-Practice issue #45](https://github.com/homesik92/PRAXIS-Practice/issues/45)).

*Later updated by: D-12 settles the open "copy the project or add a second
target" question -- separate repo per subject, not a second target. **D-18
then supersedes D-12 and reverses that**: one repo, one Xcode project, one
target per subject, sharing the native shell after all.*

### D-3 — Content sync via manual copy, not a submodule or build step

**Decided:** 2026-08-20, in `DESIGN.md` §5.
**Why:** matches PRAXIS-Practice's own no-build-step philosophy (its D-3).
A git submodule or build-time fetch would add tooling complexity this
single-developer project doesn't currently need.
**What it means:** PRAXIS-Practice's shared engine files and 5165's data
get manually copied into this app's Xcode Resources (Phase 2 of
`ROADMAP.md`). Accepted tradeoff: a future engine fix in PRAXIS-Practice
has to be manually re-copied here — worth automating with a small sync
script once a second app exists and the drift risk becomes real, not
before.

### D-4 — Repo private for now, not public-by-default like every sibling project

**Decided:** 2026-08-20, via `AskUserQuestion` — session owner's explicit
choice among private / public / no-repo-yet.
**Why:** every other project on this machine (PRAXIS-Practice, splankna-ios,
splankna-rebuild) defaults to public GitHub under `homesik92` per an
earlier precedent (PRAXIS-Practice's own D-16). This project's own
`LEGAL.md` exists specifically because of trademark/naming sensitivity
around the word "Praxis" — a public repo makes the project's name and
description visible before that's settled, which the prior precedent never
had to weigh.
**What it means:** `homesik92/PRAXIS-iOS-Math` is a private GitHub repo.
Revisit if/when this heads toward public distribution — `LEGAL.md`'s
before-publication checklist is the natural trigger to reconsider this too,
not a separate decision to remember on its own.

### D-5 — Distribution: personal sideload for v1, not App Store

**Decided:** 2026-08-20, in `DESIGN.md` §2 and §7.
**Why:** matches `splankna-ios`'s existing setup, and avoids App Store
review, accounts, and legal/privacy-policy surface area that a personal
practice tool doesn't need yet.
**What it means:** installed via Xcode directly onto the session owner's
own device (`ROADMAP.md` Phase 5). Revisit only if wider distribution is
ever wanted — gated on `LEGAL.md`'s checklist being fully worked through
first, including a real attorney consult.

### D-6 — Bundle identifier: `com.homesik92.PraxisMath`

**Decided:** 2026-08-20, session owner's explicit call after asking what a
bundle identifier is and what it's used for.
**Why:** `splankna-ios`'s own decision log documents needing to correct its
bundle ID once already, and flags that a bundle ID becomes effectively
permanent once registered in App Store Connect — worth a real answer now
rather than a throwaway placeholder, even though this app is sideload-only
for now (D-5). `com.homesik92` reuses the same personal namespace as every
other GitHub-hosted project here; `PraxisMath` is the app-specific segment,
leaving room for a sibling `com.homesik92.PraxisCS` (or similar) if the
Computer Science app (D-2) ever gets built.
**What it means:** the Xcode project (`ROADMAP.md` Phase 1.1) is generated
with this bundle ID from the start.
**⚠ Action item, not yet due:** flag this to the session owner again, explicitly,
at the point this project first approaches real App Store Connect
registration — that's the actual lock-in moment, not today. Until then the
ID can still be changed freely (local test-install data would just reset,
nothing real to lose). Don't let this quietly become "already decided,
nothing to revisit" — it's a decision with a specific future trigger, same
pattern as D-4/D-5's own revisit triggers.

### D-7 — Bundled content served over a custom URL scheme, not `file://`

**Decided:** 2026-08-20, during `ROADMAP.md` Phase 1's own technical
verification (1.3), which existed specifically to catch exactly this kind
of gap before Phase 2 bundled real content on top of it.
**Why:** `DESIGN.md`'s original plan was `WKWebView`'s
`loadFileURL(_:allowingReadAccessTo:)`, on the theory (reasonable, but
untested) that its read-access grant would make `fetch()` work against
bundled sibling files, the way it makes navigation and `<script>`/`<link>`
resource loading work. Built a minimal bundled test page to check directly:
the page itself loaded and rendered correctly via `loadFileURL` (proving
the resource loader worked), but its own `fetch("test-data.json")` failed
with "Load failed" — and, to rule out a Fetch-API-specific quirk before
concluding anything, a parallel `XMLHttpRequest` to the identical path
failed identically (status 0). Confirmed `document.URL` resolved to exactly
the expected `file:///.../WebContent/test.html`, ruling out a path-
resolution bug in the Swift bundling code. That combination of evidence
points to a genuine, well-documented WebKit behavior: `file://` origins are
opaque to the Fetch/XHR network stack regardless of `loadFileURL`'s
read-access grant, which governs the resource loader (a different code
path) — not something specific to this app's setup.
**What it means:** `Sources/App/LocalContentSchemeHandler.swift` implements
`WKURLSchemeHandler`, serving bundled files over a custom scheme
(`praxisapp://local/...`) registered on the `WKWebViewConfiguration`.
`WebViewContainer.swift` loads through this scheme instead of calling
`loadFileURL`. This is the same technique Capacitor, Ionic, and other
production hybrid-app frameworks use for exactly this reason — not a
workaround specific to this project. Verified directly: `fetch()` and `XHR`
both succeed under the new scheme, and `localStorage` still persists across
a real force-terminate + relaunch (confirming the origin change doesn't
break the other Phase 1 requirement). One consequence, observed directly
and harmless going forward: `localStorage` is scoped per-origin, so the
switch from `file://` to `praxisapp://` mid-Phase-1 reset the test page's
own marker once — not a concern now that the origin is settled, but worth
remembering if the scheme name or host ever changes later. `DESIGN.md` §3
and §5 updated to describe the actual working mechanism, not the originally
planned one.

### D-8 — Study tab: a native SwiftUI category picker, not a web-side one

**Decided:** 2026-08-20, via `AskUserQuestion` during `ROADMAP.md` Phase 3,
after discovering `DESIGN.md`'s original assumption was wrong.
**Why:** `DESIGN.md`'s Phase-3 plan assumed `teach.html` had its own
in-page category picker the Study tab could just load directly. Reading the
actual page revealed it requires both `code` and `category` URL parameters
and shows "No category selected. Go back and choose one." if `category` is
missing — there's currently no way to reach any of it, in either app, since
PRAXIS-Practice's own "Study a topic" link (which would set `category`) is
still a disabled stub (that project's 6.9.3, not done there). Two real
options: build a small native picker now, or ship Phase 3 with only the
Practice tab and defer Study until PRAXIS-Practice's own picker exists. The
session owner chose the native picker — all 6 of 5165's teaching chapters
are already authored (that project's 6.9.2) and otherwise sit unreachable.
**What it means:** `Sources/App/CategoryPicker.swift` reads the leaf
categories directly out of the bundled `data/tests/5165.json` at runtime
(not hardcoded — matches D-2's own "content over config" spirit, so this
never drifts from the real category tree). `Sources/App/StudyPickerView.swift`
lists them; tapping one pushes a `WebViewContainer` loading
`teach.html?code=5165&category=<id>`. This is native code doing something
the web app can't yet do on its own — not a permanent fork from it. Revisit
once PRAXIS-Practice's own 6.9.3 lands: at that point decide whether to keep
this native picker (it also demonstrates real SwiftUI navigation, per D-1's
own rationale for using SwiftUI beyond a bare WebView) or fall back to
loading `teach.html`'s own picker once one exists.

### D-9 — Never `.ignoresSafeArea()` a `WebViewContainer` under the native tab bar

**Decided:** 2026-08-20, during `ROADMAP.md` Phase 4's on-device QA pass,
after a real bug was found and root-caused, not assumed.
**Why:** tapping "Submit test" during a real test/drill run silently failed
to open the confirm-submit dialog — no crash, no JS error, nothing visibly
wrong. Ruled out in order, with real evidence each time: not a WKWebView
`<dialog>` limitation (a hand-built `<dialog>` test page opened fine); not a
JS exception (a temporary `WKScriptMessageHandler` bridge forwarding
`window.onerror`/`unhandledrejection` to Xcode's log showed zero errors, and
monkey-patching `HTMLDialogElement.prototype.showModal` itself showed it was
never even called — the button's click listener wasn't firing, not firing
and failing). The actual cause: XCUITest's own tap log records the real
computed screen coordinate for every tap, and once the review screen's long
question list auto-scrolled so "Submit test" sat near the bottom of the
reported viewport, the button landed physically underneath the native
`TabView`'s tab bar (screen Y 761-844) -- because the Practice tab's
`WebViewContainer` had `.ignoresSafeArea()` (all edges), extending the
WebView's content under the tab bar instead of stopping above it. The tab
bar silently ate the touch instead of passing it to the DOM.
**What it means:** `Sources/App/ContentView.swift`'s Practice tab now uses
`.ignoresSafeArea(edges: .top)` instead of the unqualified form.
`Sources/App/StudyPickerView.swift`'s Study tab had `.ignoresSafeArea(edges:
.bottom)` removed entirely -- the same latent bug, not yet observed there
(no page in Study is long enough to have surfaced it), but identical cause.
**The general rule, for any future tab**: never `.ignoresSafeArea(edges:
.bottom)` or an unqualified `.ignoresSafeArea()` on a `WebViewContainer`
that sits under a native tab bar -- any interactive element a user scrolls
to the bottom of that page becomes untappable, and it fails completely
silently, which makes it easy to miss without exactly this kind of
coordinate-level tap debugging.

### D-10 — Backup/export stays a silent no-op for v1; native download hook deferred, not built now

**Decided:** 2026-08-20, session owner's call, during `ROADMAP.md` Phase
4.3's backup/restore check.
**Why:** `testBackupExportTap` confirmed tapping "Download progress"
produces zero observable effect inside the app -- no share sheet, no status
message, nothing. Root cause: `test.html`'s export button uses a Blob URL +
`<a download>` + `.click()`, a real browser download mechanism, and
`WebViewContainer` has no `WKDownloadDelegate` for it to hand off to. This
was a known theoretical gap (flagged in Phase 4.3's original framing as
"even before any native Share-Sheet integration") and is now a confirmed
one. Building the real fix (a `WKDownloadDelegate` routing the exported
JSON to iOS's share sheet) is real, scoped work of its own -- not something
to build reactively inside a QA-pass session.
**What it means:** v1 ships with the export button as a known, accepted
no-op rather than blocking Phase 4 on building the native hook now. Tracked
as [issue #1](https://github.com/homesik92/PRAXIS-iOS-Math/issues/1)
("coming soon"), not a TODO comment, per this project's own deferred-work
convention. Restore (`<input type=file>`, "Upload progress") wasn't
exercised this pass and may share the same category of gap -- noted on the
issue for whoever picks it up. Revisit at Phase 5 (sideload install) at the
latest, since a real device install is the point this stops being purely
theoretical for the session owner's own use.

### D-11 -- Phase 5.2 codesign failure was a machine-level login-keychain desync, not a project/provisioning problem

**Decided:** 2026-08-21, diagnosed via direct evidence, not guessed.
**Why:** the real device build failed at `CodeSign` with `errSecInternalComponent`
after device registration had already succeeded (a real signing identity and
provisioning profile were resolved correctly). This looked at first like a
provisioning/project-config issue, but `security show-keychain-info` hanging
indefinitely from a CLI shell, followed by unrelated system daemons
(`accountsd`, then `sharingd`) throwing their own "wants to use the login
keychain" prompts that neither the current Mac login password nor the Apple
ID password would satisfy, confirmed this was macOS's login keychain having
a stored password out of sync with the actual Mac login password -- a
machine-level issue, unrelated to this project's Xcode configuration or
provisioning setup.
**What it means:** fixed by the session owner running `security
set-keychain-password ~/Library/Keychains/login.keychain-db` directly in
their own Terminal (not through any AI/automation tool, so the old/new
passwords were never exposed outside the session owner's own terminal).
Notably, this machine's Keychain Access.app (macOS 26.6.2) has no working
GUI path for this -- "Change Password for Keychain" was greyed out under
File even with the keychain shown fully unlocked, and there's no
right-click equivalent either; the `security` CLI command is the only path
that worked. Once fixed, the exact same `xcodebuild ...
-allowProvisioningUpdates -allowProvisioningDeviceRegistration build`
command from before succeeded cleanly, and the app installed and ran
successfully on the session owner's real iPhone via `xcrun devicectl`. Full
troubleshooting detail lives in this machine's local memory (not this repo,
since it's a macOS/machine landmine rather than something specific to this
project's own code or config -- nothing in this repo needed to change to
fix it).

### D-12 -- Amends D-2: each subject app is a separate repo, not a second Xcode target in this one

**Decided:** 2026-08-22, session owner's call, presented as a genuine fork
with a real recommendation and an explicit trade-off, not a default.
**Why:** D-2 already established that this app is single-subject with a
documented portability recipe, but left open exactly how a second subject
app would be structured -- "copy this Xcode project (or set it up as a
second target sharing the same source files -- either works)." Now that a
real second app is anticipated (the session owner named `PRAXIS-iOS-Business`
as a concrete future example, alongside the already-planned 5652 CS app),
that ambiguity needed settling. Two real options: (a) a separate repo per
subject, matching every other sibling project on this machine
(PRAXIS-Practice, splankna-ios, splankna-rebuild, checkers-demo are all
separate repos), each with its own bundle id, roadmap, and decision log; or
(b) one repo with multiple Xcode targets, sharing native-shell code
(`WebViewContainer`, the `TabView` shell, the XCUITest harness) so a fix
like D-9's tab-bar bug lands once for every subject app instead of needing
manual porting to each.
**What it means:** the session owner chose (a), separate repo per subject,
consciously accepting the native-shell-duplication trade-off -- a fix found
in one `PRAXIS-iOS-<subject>` repo does **not** automatically apply to its
siblings and must be manually checked and ported, the same category of
obligation D-3 already established for bundled web content, just extended
to native Swift/XCUITest code once a second such repo actually exists.
`DESIGN.md` §6 renamed and rewritten to reflect this as the settled plan,
not an open question, and to use the actual naming pattern
(`PRAXIS-iOS-<subject>`) rather than only the one 5652 CS example.
PRAXIS-Practice's own docs were updated in the same pass (its own PR) to
record its role as the multi-subject master these apps all wrap.

*Later updated by: **D-18 supersedes this entry.** The trade-off accepted
here -- native-shell fixes needing manual porting between sibling repos --
was measured as a real cost (D-9/D-17, issues #1 and #14) before any sibling
repo existed, and the structure was reversed to option (b), one repo with a
target per subject.*

---

### D-17 -- Extends D-9: never `.ignoresSafeArea(edges: .top)` on a `WebViewContainer` either

**Decided:** 2026-08-29, after the session owner's real-device iPad testing
found a bug, not assumed or reasoned into existence.
**Why:** touching the very top of the screen during a real test attempt --
where the tiny system clock/connectivity/battery indicators sit -- quit the
app straight to the iOS home screen. Root-caused by inspection and git
history, the same discipline D-9 itself used: `ContentView.swift`'s
Practice tab had `.ignoresSafeArea(edges: .top)`, kept deliberately when
D-9 fixed the *bottom* edge, since nothing had surfaced against the top at
the time. Extending a `WebViewContainer`'s touchable content into the exact
screen strip iPadOS reserves for its own system-gesture recognizers is the
same root shape as D-9's bug (WebView content reaching into OS-owned
space) -- just the opposite edge, and a worse failure mode: D-9's bug
silently ate a tap, this one exits the app outright, mid-timed-test, with
the wall-clock timer (this app inherits PRAXIS-Practice's faithful,
never-pauses timer design) continuing to run while the person is locked
out.
**What it means:** `ContentView.swift`'s Practice tab no longer ignores
either safe-area edge. Verified in the Simulator that this introduces no
visual regression (status bar clear, page content correctly spaced, no
double-padding) -- but the actual bug this fixes is a real-device
touch/system-gesture arbitration issue that does not reliably reproduce in
the Simulator, so the fix itself is confirmed by code/history diagnosis and
D-9's precedent, not by reproducing the failure first. Session owner to
confirm on the physical iPad that this actually resolves the accidental
exit.
**The general rule, updated**: never `.ignoresSafeArea()` (any edge, or the
unqualified all-edges form) on a `WebViewContainer` in this app. Every edge
this app has actually tried ignoring has since been found to cause a real,
independently-discovered problem -- bottom (D-9, tap-swallowing under the
tab bar) and now top (this entry, system-gesture takeover). Absent a
concrete, currently-unmet layout need, there is no edge left worth risking.

### D-18 -- Supersedes D-12: one iOS repo, one Xcode project, one target per subject

**Decided:** 2026-09-08, session owner's call, reversing D-12 after its
accepted trade-off showed up as a concrete cost rather than a hypothetical
one.

**What changes.** D-12 chose (a) a separate `PRAXIS-iOS-<subject>` repo per
subject, explicitly rejecting (b) one repo with multiple Xcode targets
sharing the native shell. That is now reversed: **one iOS repo, one Xcode
project, one target per subject.** Each target keeps its own bundle
identifier, display name, icon, and bundled subject data, so it still ships
as a genuinely separate app on the App Store or a device — but every target
compiles the *same* `Sources/App/*.swift`.

**Why the reversal.** D-12 named the exact risk it was accepting: "a fix
like D-9's tab-bar bug lands once for every subject app instead of needing
manual porting to each." Three things since have turned that from a
prediction into a measured cost, all of them found before any sibling repo
existed:

- **D-9** (bottom-edge safe area swallowing taps) and **D-17** (top-edge
  safe area handing touches to iPadOS system gestures) are the same bug
  class, found seven days apart, both living in `ContentView.swift`.
- **[Issue #14](https://github.com/homesik92/PRAXIS-iOS-Math/issues/14)**
  (`WebViewContainer` has no `WKNavigationDelegate`, so external links are
  dead in-app) and **[issue #1](https://github.com/homesik92/PRAXIS-iOS-Math/issues/1)**
  (no `WKDownloadDelegate`, so backup/export is a silent no-op) are both
  unfixed today and both live in `WebViewContainer.swift`.

Under D-12, shipping four subjects meant those four defects becoming
sixteen hand-ported fixes. The template gate protects against cloning
something *unfinished*; it does nothing about native-shell drift *after* the
clone. The cheapest moment to change this is before the first clone exists,
which is exactly where this decision is being made.

**Why this doesn't weaken "iOS draws from PRAXIS-Practice."** It
strengthens it. The rule this repo now follows is: *the iOS side chooses
which files it bundles and what native chrome wraps them, but never edits
the contents of a file PRAXIS-Practice owns.* Multiple targets sharing one
Swift source tree is entirely on the native side of that line — it changes
nothing about D-3's manual content sync, which stays exactly as it is.

**What it means.**

- `Sources/App/*.swift` is shared by every target. A native-shell fix lands
  once, for every subject, permanently.
- Subject-specific state is data and configuration only: the bundled
  `Sources/WebContent/data/` payload, the trimmed `manifest.json`, the test
  code string (D-2), plus per-target identity (bundle id, name, icon).
- `project.yml` grows one target per subject; `xcodegen` generates them.
- The **template gate** (ROADMAP.md) keeps its meaning but changes its
  mechanism: nothing gets *copied* any more, so the gate is no longer about
  freezing a template before duplicating it. It is now about the shared
  Swift shell being correct before a second target depends on it.
- This repo's name becomes wrong once it holds more than Math. Renaming it
  to `PRAXIS-iOS` is a repo-settings change for the session owner, tracked
  separately rather than assumed here.

**Not done in this entry.** This records the decision only; the actual
restructure (adding targets, per-target resource sets, per-target identity)
is its own scheduled work.

*Later updated by: **D-19 amends this entry the same day.** The one-repo,
shared-Swift-shell core stands; the "one target per subject" half is dropped
in favour of a single target holding all five subjects, with four unlocked by
in-app purchase — App Store Guideline 4.3(a) makes five bundles of one binary
a rejection risk, and removes the reason to have them.*

---

### D-19 -- Amends D-18 and supersedes D-2's single-subject premise: one app, all five subjects, four unlocked by in-app purchase

**Decided:** 2026-09-08, session owner's call, same day as D-18 and going
further than it — for a reason that was not in view when D-18 was written.

**What changes.** D-18 settled "one repo, one Xcode project, **one target per
subject**." The target-per-subject half is now dropped: there is **one target**,
shipping one app that contains all five subjects. Mathematics (5165) is free;
Business Education (5101), General Science (5436), Physical Science (5485) and
Computer Science (5652) are unlocked with non-consumable in-app purchases.

D-18's core survives untouched — one repo, one shared Swift shell, subject data
as data. D-19 simply removes the reason to have five bundles of it.

This also supersedes **D-2**'s standing premise that the app is single-subject
and therefore "always `code=5165`, no test picker needed." A picker is now
required. What survives from D-2 is its real finding: the only subject-specific
things in the architecture are the bundled data and one string constant — which
is exactly why holding five subjects costs almost nothing.

**Why.** Two independent reasons, one external and one internal:

1. **App Store Review Guideline 4.3(a)** warns directly against "multiple Bundle
   IDs of the same app," giving "a separate map app for every city" as its
   example and naming in-app purchase as the remedy: *"consider submitting a
   single app and providing the variations using in-app purchase."* Five apps
   that are the same binary differing only in `data/` is close to the textbook
   case. Researched 2026-09-08 against the live guidelines rather than assumed.
2. **Five apps is the more complicated option, not the simpler one.** The
   session owner's stated reason for preferring five was avoiding in-app
   purchase complexity. Measured rather than assumed, that trade runs the other
   way: StoreKit 2 needs no server and no receipt-validation backend, and the
   whole surface is five calls (`Product.products(for:)`, `product.purchase()`,
   `Transaction.currentEntitlements`, `Transaction.updates`, `AppStore.sync()`)
   — a one-time cost of roughly one Swift file. Five listings is a *recurring*
   cost: five review submissions for every engine update, forever. All five
   subjects' content totals 3.6 MB, so bundling everything is free in practice.
   The paid-apps agreement, banking and tax setup are identical either way.

**The entitlement bridge — the one genuinely new design decision.** Not StoreKit
itself, but how the web layer learns what is unlocked. **It doesn't.** A native
SwiftUI subject picker sits in front of the `WKWebView`; locked subjects show a
Buy button natively, and the WebView is only ever handed an already-unlocked
subject's `code`. Purchase state never crosses into the web layer at all.

That choice is what keeps D-18's boundary intact: the alternative — bundling
`index.html` and injecting entitlement into it — would mean adding a "locked"
state upstream in PRAXIS-Practice for an app-only concern, forking a shared file
permanently. The native picker keeps every PRAXIS-Practice file byte-identical.
`StudyPickerView.swift` is the existing precedent for this pattern.

**What it means.**

- **One** bundle identifier, not five, plus four in-app purchase product ids.
  The permanent-lock-in warning in `LEGAL.md` and issue #20 now applies to one
  identifier — a materially smaller irreversible decision.
- The app bundles the **full** `data/` payload and the full manifest, not a
  trimmed one. D-2's trimmed single-entry `manifest.json` is retired.
- The planned upstream "single-subject mode" work is **cancelled**: its premise
  (a wrapper app shows exactly one subject) is now false. Issue #15 changes
  shape rather than needing that fix.
- Issue #16's restructure shrinks to almost nothing — no per-target resource
  sets, no per-target identity, no per-target icons.
- The Practice tab's entry point changes from a hardcoded `test.html?code=5165`
  to the picker's chosen code.

**Not done here.** This records the decision only. The StoreKit integration and
the native picker are their own work; the naming and bundle-identifier questions
stay open in #20 and must be settled before any App Store Connect record exists.

---
