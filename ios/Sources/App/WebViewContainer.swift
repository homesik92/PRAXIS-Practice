import SwiftUI
import UIKit
import WebKit

/// Wraps WKWebView so SwiftUI can host bundled local HTML/CSS/JS content.
/// Served over a custom URL scheme via `LocalContentSchemeHandler`, not
/// `file://` — see that file's doc comment and DECISIONS.md D-7 for why
/// `loadFileURL` alone (DESIGN.md's original plan) doesn't work.
struct WebViewContainer: UIViewRepresentable {
    /// The page to load, **without** an `unlocked` parameter -- this container appends
    /// it from `unlocked` below, so there is one place that decides what the web layer
    /// is told (D-46, N-21).
    let resourcePath: String
    let resourceDirectory: String
    /// Whether the subject this page belongs to is purchased. Passed to the page as
    /// `unlocked=1|0`; changing it reloads the page (see `updateUIView`).
    var unlocked: Bool = true
    /// Called with a subject code when the page asks for the purchase sheet by
    /// navigating to `praxisapp://local/unlock?code=<code>` (11.2 Phase E).
    var onUnlockRequested: (String) -> Void = { _ in }

    static let scheme = "praxisapp"

    func makeCoordinator() -> Coordinator {
        Coordinator(onUnlockRequested: onUnlockRequested)
    }

    /// `resourcePath` plus the one signal the app gives the web layer.
    private var resolvedPath: String {
        let separator = resourcePath.contains("?") ? "&" : "?"
        return "\(resourcePath)\(separator)unlocked=\(unlocked ? "1" : "0")"
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(
            LocalContentSchemeHandler(resourceDirectory: resourceDirectory),
            forURLScheme: Self.scheme
        )
        let webView = WKWebView(frame: .zero, configuration: configuration)
        // Both delegates are required for D-45: the navigation delegate handles
        // ordinary links, the UI delegate handles target="_blank" ones, which never
        // reach the navigation delegate's allow path at all.
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        context.coordinator.loadedUnlocked = unlocked
        if let url = URL(string: "\(Self.scheme)://local/\(resolvedPath)") {
            webView.load(URLRequest(url: url))
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Guarded reload, not a reload on every SwiftUI re-render: only when the
        // entitlement actually changed. This is what makes a purchase visible without
        // leaving the tab -- the page is showing locked controls, the sheet completes,
        // and the same page reloads with unlocked=1 (11.2 Phase E).
        context.coordinator.onUnlockRequested = onUnlockRequested
        guard context.coordinator.loadedUnlocked != unlocked else { return }
        context.coordinator.loadedUnlocked = unlocked
        // The page the buyer is *on*, not the one this container opened with: they may
        // have navigated to run.html or results.html since, and reloading the entry page
        // would throw away an answer in progress (code review finding).
        if let url = Self.reloadURL(for: webView, unlocked: unlocked, fallbackPath: resolvedPath) {
            webView.load(URLRequest(url: url))
        }
    }

    /// The current page with `unlocked` rewritten, falling back to this container's own
    /// path when the web view hasn't loaded one of our pages (or hasn't loaded yet).
    static func reloadURL(for webView: WKWebView, unlocked: Bool, fallbackPath: String) -> URL? {
        let value = unlocked ? "1" : "0"
        guard
            let current = webView.url,
            current.scheme == scheme,
            var components = URLComponents(url: current, resolvingAgainstBaseURL: false)
        else {
            return URL(string: "\(scheme)://local/\(fallbackPath)")
        }
        var items = (components.queryItems ?? []).filter { $0.name != "unlocked" }
        items.append(URLQueryItem(name: "unlocked", value: value))
        components.queryItems = items
        return components.url ?? URL(string: "\(scheme)://local/\(fallbackPath)")
    }

    /// Keeps the app inside its own bundled content and hands every external link to
    /// Safari (D-45).
    ///
    /// Without this, a `WKWebView` navigates anywhere a link points, *in place* — so
    /// tapping an outside link replaces the app's entire UI with someone else's website
    /// in a view with no back button, no reload, and no way home short of force-quitting.
    /// That is the failure this class exists to prevent; the dead link of issue #134 was
    /// only the visible half of it.
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
        /// The destination this coordinator handed to each `WKDownload` in
        /// `decideDestinationUsing`, read back in `downloadDidFinish`/
        /// `didFailWithError` (#133). Keyed by the download instance, not a bare
        /// optional -- a fast double-tap of the export button can start a second
        /// download before the first's `downloadDidFinish` runs, and a single
        /// shared property would let one download's completion read the other's
        /// destination (code review finding).
        private var pendingDownloads: [ObjectIdentifier: URL] = [:]

        /// Set by `updateUIView` so a re-render with a new closure doesn't keep calling
        /// the stale one.
        var onUnlockRequested: (String) -> Void
        /// The entitlement the web view was last loaded with, so `updateUIView` can tell
        /// a real entitlement change from an ordinary SwiftUI re-render.
        var loadedUnlocked: Bool = true

        init(onUnlockRequested: @escaping (String) -> Void) {
            self.onUnlockRequested = onUnlockRequested
            super.init()
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            // test.html's export button uses a Blob URL + <a download> (#133).
            // WebKit reports any download-attribute link this way regardless of
            // URL scheme, including blob: -- checked ahead of the scheme allow-list
            // below so it doesn't fall into the "leaves the app" branch.
            if navigationAction.shouldPerformDownload {
                decisionHandler(.download)
                return
            }

            // A locked control in the page links here (test.html's setLocked, run.html's
            // locked screen). Checked before the generic scheme-allow below, which would
            // otherwise hand it to LocalContentSchemeHandler as a file that doesn't
            // exist. `code` only personalizes the sheet -- entitlement itself is never
            // read from the page (D-46).
            if url.scheme == WebViewContainer.scheme, url.host == "local", url.path == "/unlock" {
                let code = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                    .queryItems?.first(where: { $0.name == "code" })?.value
                decisionHandler(.cancel)
                if let code, !code.isEmpty {
                    onUnlockRequested(code)
                }
                return
            }

            // The site's own hub (index.html) lists every subject, including ones this
            // app doesn't sell, and opens them without the app's `unlocked` signal --
            // which the web layer reads as "public site, nothing locked" (D-46, N-21).
            // Inside the app the web pages hide their hub links (test.html's always,
            // the Back links of run/teach/results.html whenever they couldn't be
            // pointed at a subject); this is the safety net for any that still point
            // there.
            if url.scheme == WebViewContainer.scheme, url.host == "local",
               url.path == "/" || url.path == "/index.html" || url.path.isEmpty {
                decisionHandler(.cancel)
                return
            }

            // Bundled content, and the about: URLs WebKit uses internally (about:blank
            // for an empty frame), stay in the web view.
            if url.scheme == WebViewContainer.scheme || url.scheme == "about" {
                decisionHandler(.allow)
                return
            }

            // Everything else leaves. Cancel first, so the decision handler is called
            // exactly once and before the app backgrounds itself opening Safari.
            decisionHandler(.cancel)
            openExternally(url)
        }

        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
            download.delegate = self
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            guard let url = navigationAction.request.url else { return nil }

            if url.scheme == WebViewContainer.scheme {
                // An in-app link asking for a new window: load it here instead, since
                // this app has exactly one web view and no tabs.
                webView.load(navigationAction.request)
            } else {
                openExternally(url)
            }

            // Never return a second web view: returning nil tells WebKit no window was
            // created, which is correct — the navigation has been handled already.
            return nil
        }

        /// Opens web URLs in Safari, and deliberately ignores anything else.
        ///
        /// The scheme check is a safety boundary, not a formality: without it, content
        /// in the web view could reach any URL scheme the device handles — `tel:`,
        /// `mailto:`, another app's custom scheme — straight from a page. Bundled
        /// content is this project's own today, but the check keeps that from being
        /// load-bearing.
        private func openExternally(_ url: URL) {
            guard let scheme = url.scheme?.lowercased(),
                  scheme == "http" || scheme == "https" else { return }
            UIApplication.shared.open(url)
        }

        // MARK: - WKDownloadDelegate (#133)
        //
        // The export button's Blob URL + <a download> becomes a WKDownload via
        // shouldPerformDownload above. This delegate writes it to a temp file and
        // hands that file to the share sheet, which is where a user actually saves
        // or sends it -- there's no Files-app "Downloads" folder equivalent to drop
        // it into silently.

        func download(
            _ download: WKDownload,
            decideDestinationUsing response: URLResponse,
            suggestedFilename: String,
            completionHandler: @escaping (URL?) -> Void
        ) {
            let destination = FileManager.default.temporaryDirectory.appendingPathComponent(suggestedFilename)
            // A stale file at this path (e.g. two exports with a colliding
            // timestamp within the same second) would otherwise make WKDownload
            // report a destination-exists failure instead of overwriting it.
            try? FileManager.default.removeItem(at: destination)
            pendingDownloads[ObjectIdentifier(download)] = destination
            completionHandler(destination)
        }

        func downloadDidFinish(_ download: WKDownload) {
            guard let url = pendingDownloads.removeValue(forKey: ObjectIdentifier(download)) else { return }
            // WKDownloadDelegate is @MainActor -- no dispatch needed to touch UIKit here.
            Self.presentShareSheet(for: url)
        }

        /// Clears the pending entry so a failed download doesn't linger in
        /// `pendingDownloads` forever (code review finding) -- WebKit has already
        /// given up on the download at this point, so there's nothing to retry
        /// here; the user just sees the tap silently produce nothing, same as if
        /// `topViewController()` below found no presenter.
        func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
            if let url = pendingDownloads.removeValue(forKey: ObjectIdentifier(download)) {
                try? FileManager.default.removeItem(at: url)
            }
        }

        private static func presentShareSheet(for url: URL) {
            guard let presenter = topViewController() else { return }
            let activityViewController = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            // Delete the temp file once the share sheet is done with it, whatever
            // the outcome -- nothing else ever cleans up this directory (code
            // review finding).
            activityViewController.completionWithItemsHandler = { _, _, _, _ in
                try? FileManager.default.removeItem(at: url)
            }
            // Required on iPad -- UIActivityViewController crashes there without a
            // popover configuration (it's presented modally on iPhone instead).
            if let popover = activityViewController.popoverPresentationController {
                popover.sourceView = presenter.view
                popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }
            presenter.present(activityViewController, animated: true)
        }

        private static func topViewController() -> UIViewController? {
            // .foregroundInactive as well as .foregroundActive -- downloadDidFinish
            // can land during a brief transition (e.g. a system alert or the
            // app-switcher gesture starting) where the scene is momentarily
            // inactive but still the one about to come back; excluding it turned a
            // narrow timing window into a silently dropped download (code review
            // finding).
            let scene = UIApplication.shared.connectedScenes
                .first { $0.activationState == .foregroundActive || $0.activationState == .foregroundInactive }
                as? UIWindowScene
            guard let root = scene?.windows.first(where: \.isKeyWindow)?.rootViewController else { return nil }
            var top = root
            while let presented = top.presentedViewController {
                top = presented
            }
            return top
        }
    }
}
