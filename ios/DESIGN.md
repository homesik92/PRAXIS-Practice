# PRAXIS iOS Math — Design Document

> **Frozen 2026-09-11 — historical record, no longer maintained ([D-44](../DECISIONS.md)).**
> This file came from the former `PRAXIS-iOS-Math` repository when the iOS app moved into
> this one. It is kept so the app's early reasoning stays readable, not as live guidance.
> Architecture that still holds: the SwiftUI shell + `WKWebView` split (iOS D-1) and the custom URL scheme (iOS D-7). What no longer holds: the single-subject scope, the manual content copy, and the private repository.
> Live guidance for the app is [`ios/CLAUDE.md`](CLAUDE.md); decisions from D-44 onward are
> in the root [DECISIONS.md](../DECISIONS.md), and release work is in
> [APP-STORE-ROADMAP.md](../APP-STORE-ROADMAP.md). Links below written as
> `../PRAXIS-Practice` now mean the repository root, and "bundled copy" / `Sources/WebContent/`
> no longer exist — the app bundles the root web files directly.

## 1. What this is

A native iOS app for practicing the Praxis 5165 (Mathematics) exam, built as a
**hybrid app**: a thin native SwiftUI shell handles navigation and app chrome,
while the actual study/test-taking content is the existing, already-built,
already-tested [PRAXIS-Practice](../PRAXIS-Practice) web app, running inside
an embedded `WKWebView` instead of a browser tab.

The goal is to get a real, installable, offline iPhone app with minimal new
code — reusing PRAXIS-Practice's HTML/CSS/JS engine and all authored content
(question banks, teaching chapters, reference panels) unchanged, rather than
rewriting any of it in Swift.

**Two governing constraints for this design, both from the session owner:**

1. This app is for **Math 5165 only** — a single-subject app, not a
   multi-subject picker.
2. The architecture and the *shape* of the Math content must be built so that
   a **second app for Computer Science 5652** can be created later by
   **substituting data, not rewriting code**. Section 6 below is the concrete
   recipe for that.

## 2. Scope for v1

- One subject (5165), matching PRAXIS-Practice's current `manifest.json`
  entry for it (`enabled: true`, one bank file).
- All 5 of PRAXIS-Practice's existing modes: full timed test, Practice a
  topic, Category test, Study a topic (teaching pages), Review a topic —
  unchanged from the web app.
- Progress (attempts, spaced-repetition history) persists on-device, same as
  today — no accounts, no server, no cross-device sync (matches
  PRAXIS-Practice's own D-3: no server, no runtime dependencies).
- Existing backup/restore (JSON export/import, already built in `test.html`)
  becomes the app's manual cross-device-migration path — see §7.

Not in scope for v1: any other subject, any native rewrite of a content
screen, push notifications, App Store distribution (sideload via Xcode, same
as the `splankna-ios` sibling project already does).

## 3. Architecture: SwiftUI shell + WKWebView content

Two layers, cleanly split by responsibility:

- **Native shell (new SwiftUI code).** Owns the app's outer navigation — a
  `TabView` or similar — and nothing about test-taking logic. A practical v1
  tab layout:
  - **Practice** — hosts a `WKWebView` loaded to `test.html?code=5165`, the
    existing Start hub (full test / practice-a-topic / category-test /
    review-a-topic, plus the score dashboard). All navigation *within* this
    tab (test.html → run.html → results.html, and back) stays exactly as it
    is today — normal `<a href="...">` links inside the WebView, which
    behaves as a small self-contained browser. SwiftUI does not get involved
    in that inner navigation at all.
  - **Study** — `teach.html` turned out to have no in-page category picker
    of its own (it requires `category` in the URL and has no way to set it,
    and PRAXIS-Practice's own "Study a topic" link that would set it is
    still a disabled stub) — a real gap found in Phase 3, not assumed away.
    D-8: a small native SwiftUI list (`StudyPickerView`), reading 5165's
    leaf categories straight out of the bundled `data/tests/5165.json` at
    runtime, pushes a `WebViewContainer` loaded to
    `teach.html?code=5165&category=<id>` on tap. Revisit once
    PRAXIS-Practice's own 6.9.3 wires up its picker — decide then whether to
    keep the native one or fall back to loading `teach.html` directly.
  - Optionally a native **Backup** screen wrapping the existing
    download/upload JSON feature — see §7's note on the Share Sheet.
  - A single shared `WebViewContainer` (`UIViewRepresentable` wrapping
    `WKWebView`) backs every tab — this is the one piece of genuinely new
    Swift code doing real work, and it's the same for both this app and any
    future subject app.
- **Content (reused as-is).** Every HTML page, every CSS rule, every
  `js/*.js` module, and every `data/*.json` file — bundled into the app's
  Resources exactly as they exist in PRAXIS-Practice today.

### Why this split, not more native or less

- More native (rewrite each screen in SwiftUI, porting `js/*.js`'s logic to
  Swift) throws away hundreds of already-passing tests and several rounds of
  real bugs already found and fixed by code review — for a personal
  single-user study app, that cost buys mostly cosmetic native polish.
- Less native (one `WKWebView` filling the whole screen, no `TabView` at all)
  is even less work, but doesn't meet the session owner's ask to "use some
  SwiftUI functionality to navigate" — a `TabView` shell is the smallest
  native layer that genuinely qualifies.

### Two technical points that needed confirming, not just assuming — both now verified (ROADMAP.md Phase 1, 2026-08-20)

- **Bundled `fetch()` — confirmed working, but NOT via the mechanism originally
  proposed here.** The original plan was `WKWebView`'s
  `loadFileURL(_:allowingReadAccessTo:)`, on the theory that it serves bundled
  resources under a real origin the way PRAXIS-Practice's own D-17 needed a
  real server for on desktop. **That theory was wrong in a specific way**:
  `loadFileURL`'s read-access grant covers the WebView's own resource loader
  (page navigation, `<script src>`, `<link>`, `<img>`) — it does NOT extend to
  the separate Fetch/XHR network stack, which treats every `file://` load as
  an opaque origin regardless of the grant. Confirmed directly: a minimal
  bundled test page loaded via `loadFileURL` rendered correctly (proving the
  resource loader worked) while its own `fetch()` *and* `XMLHttpRequest` to a
  sibling bundled JSON file both failed identically ("Load failed" / status
  0) — ruling out a Fetch-API-specific quirk and confirming it's a same-origin
  restriction on `file://` itself. **The fix, now implemented and verified**:
  serve bundled content over a custom URL scheme via `WKURLSchemeHandler`
  (`Sources/App/LocalContentSchemeHandler.swift`) instead of `file://` — the
  same technique Capacitor/Ionic use for exactly this reason. Once served as
  `praxisapp://local/...` rather than `file://...`, `fetch()` works normally
  against plain relative paths — meaning `js/schema.js`'s existing `fetch()`
  calls still need zero changes, just as originally hoped, only the
  *delivery* mechanism underneath them changed. See DECISIONS.md D-7. Two
  more implementation details this mechanism depends on, found while
  bundling real content in Phase 2: nested bundled paths (e.g.
  `data/tests/5165.json`) need the relative path split into a proper
  `subdirectory:` argument for `Bundle.main.url(forResource:)`, not jammed
  whole into the resource-name parameter; and the handler must return a real
  `HTTPURLResponse` with `statusCode: 200`, not a plain `URLResponse` — the
  latter has no HTTP status at all, so `fetch()`'s `response.ok` reads
  `false` even when the body loads correctly, which is exactly the kind of
  failure `loadManifest`/`loadBank`'s own `!response.ok` check is designed
  to catch (correctly, just for the wrong reason if this weren't fixed).
- **`localStorage` persistence — confirmed working as originally expected.**
  `WKWebView`'s default (non-ephemeral) data store does persist `localStorage`
  across a real app force-terminate and relaunch, the same as Safari would
  for an installed web app — verified directly (set a marker, force-quit via
  `simctl terminate`, relaunch, marker still present). `js/store.js`'s entire
  persistence/migration/backup design carries over completely unchanged, with
  zero Swift-side storage code needed, exactly as planned. One nuance worth
  keeping in mind: `localStorage` is scoped per-origin, so it resets on any
  future change to the serving scheme/host (already observed once, harmlessly,
  when Phase 1's fix switched from `file://` to `praxisapp://` mid-development)
  — not a concern going forward now that the origin is settled, but worth
  remembering if the custom scheme's name or host ever changes later.

## 4. What gets reused as-is (no changes needed)

- Every `js/*.js` module: `schema.js`, `runner.js`, `srs.js`, `store.js`,
  `calculator.js`, `results.js`, `reference-panel.js`,
  `element-categories.js` — all pure or DOM-scoped logic, subject-agnostic
  already (see §6).
- Every HTML page and `css/base.css`.
- `data/manifest.json`, `data/tests/5165.json`, `data/teaching/5165.json`,
  `data/reference/5165-formulas.json`.
- `tools/verify.mjs` and the whole `tools/test-*.mjs` suite — still the
  right gate for any future content or engine change, run exactly as today
  (Node, not part of the shipped app).

## 5. What's new (native-side work)

- An Xcode project/target (SwiftUI App lifecycle) — generated via `xcodegen`
  from `project.yml` rather than hand-authored or created through Xcode's GUI
  wizard, since this machine's Xcode (14.3.1) can still run the tool even
  though its own Homebrew formula wrongly gates on a newer Xcode being
  installed (a standalone release binary sidesteps that gate cleanly).
- `WebViewContainer.swift` — a small `UIViewRepresentable` wrapping
  `WKWebView`, loading content over a custom URL scheme via
  `LocalContentSchemeHandler.swift` (a `WKURLSchemeHandler`) rather than
  `loadFileURL(_:allowingReadAccessTo:)` — see §3 above and DECISIONS.md D-7
  for why the original `loadFileURL`-only plan didn't work.
- A `TabView`-based root view wiring the tabs described in §3.
- App icon, launch screen, `Info.plist` (app name, bundle identifier).
- A one-time **content sync step**: copy PRAXIS-Practice's shared engine
  files (`js/`, `css/`, the relevant `.html` pages) plus 5165's data files
  into this app's Xcode Resources. This is a manual copy for v1, not a
  submodule or build-time fetch — matches PRAXIS-Practice's own
  no-build-step philosophy (D-3), at the cost of needing a manual re-copy
  whenever the shared engine changes later. Worth automating with a small
  shell script once this app and a second (CS) app both exist and the
  copy-drift risk becomes real — not needed for a single app today.

## 6. Portability: all five subjects in one app, one target (D-19)

This is the central design constraint, so it's worth stating plainly: **the
only subject-specific things in this whole architecture are the bundled data
files and one string constant.** Everything else already generalizes,
because PRAXIS-Practice was already built to support multiple subjects
through its manifest — this app just happens to only ever show one.

**PRAXIS-Practice is the multi-subject master**; it grows to cover every
Praxis exam over time. **One** native app wraps all of them — Mathematics
(5165) free, with Business Education (5101), General Science (5436),
Physical Science (5485) and Computer Science (5652) unlocked by
non-consumable in-app purchase.

This took three passes to settle. D-12 chose a separate repo per subject,
accepting that native-shell fixes would need hand-porting between them.
**D-18 reversed that** once the cost was observable rather than
hypothetical — D-9 and D-17 (two safe-area bugs in `ContentView.swift`,
seven days apart) plus issues #1 and #14 (two missing WKWebView delegates
in `WebViewContainer.swift`) would have become sixteen hand-ported fixes
across four apps — and moved to one repo with a target per subject.
**D-19 then collapsed the targets too**: App Store Guideline 4.3(a) treats
multiple bundle ids of the same binary as spam and names in-app purchase as
the remedy, and five listings proved to be the more complicated option in
any case (five review cycles per engine update, forever, versus a one-off
serverless StoreKit integration). See D-19 for the full reasoning.

Concretely, to add a new subject:

1. **Bundle its data.** There is no new target and no new app. The shared
   native shell already handles any subject, because the only
   subject-specific things in the architecture are the bundled data and one
   string constant — the finding from D-2 that still holds even though its
   single-subject premise does not.
2. **Swap the bundled data**: replace `data/tests/5165.json` with the new
   subject's own test file, same for `data/teaching/` and (if needed)
   `data/reference/`. Update `data/manifest.json`'s one entry to the new
   subject's code.
3. **Author the new content** — the real work, same authoring standard
   PRAXIS-Practice already uses (original questions from the blueprint only,
   never adapted from ETS's copyrighted study companions; independent
   accuracy verification, same as 6.9.2's math chapters just went through).
4. **Add it to the subject picker** and, if it is a paid subject, register
   a non-consumable in-app purchase product id for it. The picker is native
   SwiftUI and is the only place entitlement is ever consulted — the
   `WKWebView` is handed an already-unlocked subject's code and knows
   nothing about purchases (D-19).
5. **No SwiftUI changes beyond the picker entry. No `js/*.js` changes.** If a
   subject seems to need one, that is a signal the change belongs upstream in
   PRAXIS-Practice as a data-driven mode — not as a local edit to a file that
   repo owns.

### Already-proven portability inside PRAXIS-Practice itself

This isn't a new hope — PRAXIS-Practice's existing code already demonstrates
the pattern working, which is exactly why this is a low-risk plan rather than
an assumption:

- The calculator only shows for `bank.code === "5165"` — for a CS bank, it
  simply never appears, no code path needed on the CS side at all.
- The periodic-table reference panel (5485's Chemistry/Physics) and 5165's
  formula panel already coexist in one `run.html`, dispatched purely by
  `bank.code` via `REFERENCE_PANEL_KINDS` — the exact mechanism a future
  5652-specific reference panel (if it needs one — e.g. a syntax/complexity
  cheat sheet) would plug into the same way.
- `verify.mjs` already validates any registered bank generically — a new
  5652 bank gets the same correctness gate for free.

### One real gap worth flagging now, not discovering later

5652 (Computer Science) teaching/reference content will likely want
**`format: "code"`** (a code snippet, not prose or MathML) — the `{format,
value}` content shape already documents this as a valid value (SCHEMA.md
§2.6), but **`renderContent` in `js/reference-panel.js` never implemented
it** (tracked as PRAXIS-Practice's own open
[issue #45](https://github.com/homesik92/PRAXIS-Practice/issues/45), since
nothing needed it yet). Implementing `format: "code"` rendering (syntax
highlighting is optional — even a plain `<pre><code>` block would satisfy
the schema) is a small, contained PRAXIS-Practice-side task, but it's a real
prerequisite for a 5652 app's teaching pages or reference panel to be useful,
not something to assume is "already done" because the schema allows it.

## 7. Known gaps and open questions

- **No cross-device sync.** `WKWebView`'s `localStorage` is sandboxed to
  this one app install, same limitation as any web app's local storage — a
  new device or a reinstall starts from zero. The existing backup/restore
  JSON export (already built in `test.html`) is the mitigation: on iOS,
  "download a file" needs to route through the native Share Sheet instead of
  a browser download prompt, which is a small, well-understood
  JS-to-native bridge point (a `WKScriptMessageHandler` intercepting the
  existing export click) — not a redesign, just one native integration
  point to build.
- **App Store vs. sideload.** v1 assumes personal sideload via Xcode, same
  as `splankna-ios`'s current setup — no App Store review, no accounts, no
  privacy-policy/legal surface to build. Revisit only if wider distribution
  is ever wanted.
- **Xcode/iOS version ceiling.** This Mac's Xcode (14.3.1) caps the
  deployment target around iOS 16.4, per the existing `splankna-ios`
  scaffold's own notes — worth reconfirming against the actual environment
  when this project is picked up for real, rather than assumed stale from a
  prior session.
- **`format: "code"` gap** — see §6, real prerequisite for a useful CS app,
  not urgent for the Math app itself.

## 8. Suggested phased approach (high level — not a full task breakdown yet)

1. Xcode project scaffold, `WebViewContainer`, confirm the two technical
   points from §3 (bundled `fetch()`, persisted `localStorage`) against a
   real build on a real simulator/device before building anything else.
2. Copy in PRAXIS-Practice's engine + 5165 data, get `test.html`'s Start hub
   rendering correctly inside the WebView.
3. `TabView` shell (Practice / Study), confirm inter-page navigation inside
   each WebView still works (test.html → run.html → results.html).
4. Full manual pass through all 5 modes on-device, matching the kind of
   live-testing rigor PRAXIS-Practice's own workflow already uses.
5. App icon, launch screen, sideload install, real-world use.
6. (Later, only once genuinely wanted) native Share-Sheet backup, a second
   subject app, or any deeper native features.

This document is meant to be enough to start Phase 1 above — a full
task-by-task roadmap (matching PRAXIS-Practice's own `ROADMAP.md` style) is
worth writing once this design itself gets a look, not before.
