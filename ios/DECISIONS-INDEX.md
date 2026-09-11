# Decisions Index — PRAXIS-iOS-Math

> **Frozen 2026-09-11 — historical record, no longer maintained ([D-44](../DECISIONS.md)).**
> This file came from the former `PRAXIS-iOS-Math` repository when the iOS app moved into
> this one. It is kept so the app's early reasoning stays readable, not as live guidance.
> The chains below stop at 2026-09-11. For the current chain on any topic, use the root [DECISIONS-INDEX.md](../DECISIONS-INDEX.md).
> Live guidance for the app is [`ios/CLAUDE.md`](CLAUDE.md); decisions from D-44 onward are
> in the root [DECISIONS.md](../DECISIONS.md), and release work is in
> [APP-STORE-ROADMAP.md](../APP-STORE-ROADMAP.md). Links below written as
> `../PRAXIS-Practice` now mean the repository root, and "bundled copy" / `Sources/WebContent/`
> no longer exist — the app bundles the root web files directly.

Topic → currently-authoritative decision chain. Jump here first; read `DECISIONS.md`
whole only when this index doesn't cover the surface you're touching.

| Topic | Governing decision(s) |
| --- | --- |
| Overall architecture (SwiftUI shell + WKWebView content) | [D-1](DECISIONS.md#d-1--hybrid-architecture-swiftui-shell--wkwebview-content-not-a-full-native-rewrite) |
| Subject scope (single-subject app) and portability to a second subject | [D-2](DECISIONS.md#d-2--single-subject-app-with-a-documented-portability-recipe-for-a-second-subject) (amended by [D-12](DECISIONS.md#d-12----amends-d-2-each-subject-app-is-a-separate-repo-not-a-second-xcode-target-in-this-one)) |
| How shared content/engine files get into this app | [D-3](DECISIONS.md#d-3--content-sync-via-manual-copy-not-a-submodule-or-build-step) |
| Repository visibility (private, not public like sibling projects) | [D-4](DECISIONS.md#d-4--repo-private-for-now-not-public-by-default-like-every-sibling-project) |
| Distribution (sideload vs. App Store) | [D-5](DECISIONS.md#d-5--distribution-personal-sideload-for-v1-not-app-store) |
| Bundle identifier | [D-6](DECISIONS.md#d-6--bundle-identifier-comhomesik92praxismath) |
| How bundled content is served to WKWebView (fetch/XHR support) | [D-7](DECISIONS.md#d-7--bundled-content-served-over-a-custom-url-scheme-not-file) |
| Study tab: native category picker vs. web-side one | [D-8](DECISIONS.md#d-8--study-tab-a-native-swiftui-category-picker-not-a-web-side-one) |
| `WebViewContainer` + native tab bar interaction (safe-area rule) | D-9 (bottom edge, tap-swallowing) → **[D-17](DECISIONS.md#d-17----extends-d-9-never-ignoressafearededges-top-on-a-webviewcontainer-either)** (top edge, iPadOS system-gesture takeover; general rule now covers every edge) |
| Backup/export button behavior in v1 (known no-op, native download hook deferred) | [D-10](DECISIONS.md#d-10--backupexport-stays-a-silent-no-op-for-v1-native-download-hook-deferred-not-built-now) |
| Phase 5.2 codesign failure root cause (machine-level keychain issue, not project config) | [D-11](DECISIONS.md#d-11----phase-52-codesign-failure-was-a-machine-level-login-keychain-desync-not-a-projectprovisioning-problem) |
| Multi-subject structure: repos, targets, and how many apps ship | D-12 (a repo per subject) → **[D-18](DECISIONS.md#d-18----supersedes-d-12-one-ios-repo-one-xcode-project-one-target-per-subject)** (one repo, a target per subject, shared `Sources/App/*.swift`) → **[D-19](DECISIONS.md#d-19----amends-d-18-and-supersedes-d-2s-single-subject-premise-one-app-all-five-subjects-four-unlocked-by-in-app-purchase)** (one target, one app, all five subjects; four unlocked by IAP — App Store Guideline 4.3(a)) |
| Subject selection in the app, and where purchase state lives | D-2 (single subject, no picker needed) → **[D-19](DECISIONS.md#d-19----amends-d-18-and-supersedes-d-2s-single-subject-premise-one-app-all-five-subjects-four-unlocked-by-in-app-purchase)** (native SwiftUI picker in front of the WebView; entitlement never crosses into the web layer, so every PRAXIS-Practice file stays byte-identical) |
