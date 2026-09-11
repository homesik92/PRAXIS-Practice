# Project instructions — the iOS app (`ios/`)

The native iOS app for this repository's web app: a thin SwiftUI shell around the same
`index.html` / `test.html` / `js/` / `data/` the website serves, running inside a
`WKWebView`. It lives here, beside the site, since **D-44**.

**Read the root [CLAUDE.md](../CLAUDE.md) first** — everything in it applies here too: the
repository is public, questions are original, no personal information goes anywhere
public, the dev-workflow skill governs the session, and answer keys are the real
correctness surface. This file only adds what is specific to the app.

## Where things live

- **Swift:** `Sources/App/`. UI tests: `Sources/UITests/`.
- **Xcode project:** generated from `project.yml` by xcodegen. The generated
  `PraxisMath.xcodeproj` is committed so CI and a fresh clone build without xcodegen. Edit
  `project.yml`, run `xcodegen generate` from `ios/`, commit both — never hand-edit
  `project.pbxproj`, because the next regeneration silently discards the edit.
- **Decisions:** the root [DECISIONS.md](../DECISIONS.md) and
  [DECISIONS-INDEX.md](../DECISIONS-INDEX.md). The app's own log from before D-44 is frozen at
  `ios/DECISIONS.md`: cite its entries as **"iOS D-n"** and never append to it.
- **Release work:** [APP-STORE-ROADMAP.md](../APP-STORE-ROADMAP.md). **Defects and deferred
  work:** this repository's issue tracker.
- `DESIGN.md`, `ROADMAP.md` and `DECISIONS-INDEX.md` in this folder are frozen history.
  `LEGAL.md` is still the naming/trademark primer, read together with D-40.

## How the web app gets into the bundle (D-44)

- **There is no copy.** At build time the project copies, from the repository root,
  `index.html results.html run.html teach.html test.html css/ js/ data/` into the app
  bundle under `WebContent/`. The app always ships exactly the web files of the commit it
  was built from.
- The files are served over a custom URL scheme by `LocalContentSchemeHandler`
  (iOS D-7), not `file://` — `fetch()` of `data/*.json` does not work under `file://`.
- The Swift side finds them by `resourceDirectory: "WebContent"` (`ContentView.swift`,
  `StudyPickerView.swift`, `CategoryPicker.swift`). Renaming the bundle subpath means
  changing all three.
- ⚠ **The list of published site files is written in three places — keep them
  identical:** `ios/project.yml`, the `deploy-site` job in
  `.github/workflows/verify.yml`, and the NAS deploy command (the session owner's, kept
  outside this repository because it carries NAS access details). A new file *inside* `css/`,
  `js/` or `data/` needs nothing (the folders are copied whole). A new **top-level** site
  file needs all three, or it will be missing from the app, from GitHub Pages, or from
  the NAS — and each of those fails quietly.
- If a web change doesn't show up in the simulator, clean the build folder (⇧⌘K) before
  suspecting the code: folder copies can be skipped by an incremental build.

## Rules that hold here

- **Web files serve both surfaces.** An app-only need that seems to call for a different
  page is a data-driven mode in the web layer that the site understands too — never a
  Swift-side script that rewrites the page at runtime. There is only one copy of each
  file now, so there is nowhere to fork it to.
- **Purchase state and the web layer:** the original design kept entitlement entirely
  native — a SwiftUI picker in front of the `WKWebView` that only ever opens an unlocked
  subject. D-42's free tier gates features *within* a subject, which that boundary cannot
  enforce. How "locked" reaches the web layer is open as
  [#131](https://github.com/homesik92/PRAXIS-Practice/issues/131) — settle it there before
  building any purchase flow.
- **Never `.ignoresSafeArea()` a `WebViewContainer`** — not under the native tab bar
  (iOS D-9) and not at the top either (iOS D-17). Both shipped real, hard-to-spot layout
  bugs.
- **Saved progress lives in the `WKWebView`'s storage, outside the app bundle, and
  survives every app update.** A change to the shape or meaning of stored data can destroy
  a real study history on a phone as easily as in a browser — treat it exactly as the root
  CLAUDE.md and `launch-and-cutover.md` describe.
- **The bundle id `com.homesik92.PraxisMath` and the display name "Praxis Math" are
  placeholders.** D-40 rules both out for release (PRAXIS is ETS's live registered mark).
  Never register either in App Store Connect — bundle ids are permanent once registered.
  Choosing the real ones is APP-STORE-ROADMAP.md Phases A and D.
- **Signing material never enters the repository.** `DEVELOPMENT_TEAM` in `project.yml`
  is a public identifier and fine; certificates, provisioning profiles, and Apple ID or App
  Store Connect credentials are not, anywhere — tree, commit message, PR or issue text.

## Build and verify

From the repository root:

```
xcodebuild -project ios/PraxisMath.xcodeproj -target PraxisMath -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
```

- **CI runs that exact build on every pull request** (the `ios-build` job, `macos-26`
  runner). It proves the Swift compiles and the bundle assembles. It does **not** prove
  anything renders correctly.
- **Run it in the Simulator** whenever a change could look or behave differently in the
  app than on the site — Swift, safe-area or layout work, navigation, anything touching
  how the web view is loaded. At minimum check: the Practice tab's test page, the Study
  tab's category picker opening a teaching page, and the calculator.
- **UI tests** (`Sources/UITests/`) run from Xcode with ⌘U. The committed project has no
  shared scheme, so `xcodebuild test` from a clean checkout has nothing to name.
- A real device is the check that matters before any TestFlight or App Store build —
  see APP-STORE-ROADMAP.md Phase G.

## Environment notes

- Built with Xcode 26.6 and xcodegen 2.46.0 on Apple Silicon; the `macos-26` CI runner
  defaults to the same Xcode.
- ⚠ **`IPHONEOS_DEPLOYMENT_TARGET = 16.4` is an unrevisited floor**, chosen when this
  machine's Xcode 14.3.1 capped the SDK. That reason is gone. Worth a deliberate decision —
  keep or raise, logged either way — before release, not an assumption that it's still
  right.
- ⚠ **`codesign` failing with `errSecInternalComponent`** on a device build is a login
  keychain whose password desynced from the Mac's, not a project or provisioning problem
  (iOS D-11). The session owner fixes it in their own Terminal; never through an AI or
  automation tool, so the password stays out of every transcript.
