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

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(
            LocalContentSchemeHandler(resourceDirectory: resourceDirectory),
            forURLScheme: Self.scheme
        )
        let webView = WKWebView(frame: .zero, configuration: configuration)
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
}
