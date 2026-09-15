import SwiftUI
import WebKit

/// Wraps WKWebView so SwiftUI can host bundled local HTML/CSS/JS content.
/// Served over a custom URL scheme via `LocalContentSchemeHandler`, not
/// `file://` — see that file's doc comment and DECISIONS.md D-7 for why
/// `loadFileURL` alone (DESIGN.md's original plan) doesn't work.
struct WebViewContainer: UIViewRepresentable {
    let resourcePath: String
    let resourceDirectory: String

    static let scheme = "praxisapp"

    func makeCoordinator() -> Coordinator {
        Coordinator()
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
        if let url = URL(string: "\(Self.scheme)://local/\(resourcePath)") {
            webView.load(URLRequest(url: url))
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Intentionally no-op: makeUIView's initial load is sufficient for this
        // container's lifetime. If resourcePath ever needs to change after
        // creation, add a guarded reload here rather than reloading on every
        // SwiftUI re-render.
    }

    /// Keeps the app inside its own bundled content and hands every external link to
    /// Safari (D-45).
    ///
    /// Without this, a `WKWebView` navigates anywhere a link points, *in place* — so
    /// tapping an outside link replaces the app's entire UI with someone else's website
    /// in a view with no back button, no reload, and no way home short of force-quitting.
    /// That is the failure this class exists to prevent; the dead link of issue #134 was
    /// only the visible half of it.
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
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
    }
}
