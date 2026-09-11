import WebKit

/// Serves bundled files over a custom URL scheme instead of `file://`.
///
/// ROADMAP.md Phase 1.3 found that `WKWebView`'s `loadFileURL(_:allowingReadAccessTo:)`
/// does NOT make `fetch()`/`XMLHttpRequest` work against sibling bundled files —
/// `file://` origins are opaque to WebKit's network stack even though the same
/// resource loader that serves the page's own navigation/`<script>`/`<link>` tags
/// is happy to read them. Serving content over a custom scheme (the same technique
/// Capacitor/Ionic use) makes it a "real" origin that `fetch`/`XHR` work against
/// normally with plain relative paths — this is why `js/schema.js`'s existing
/// `fetch()` calls can stay completely unchanged once PRAXIS-Practice's real content
/// is bundled in Phase 2.
final class LocalContentSchemeHandler: NSObject, WKURLSchemeHandler {
    private let resourceDirectory: String

    init(resourceDirectory: String) {
        self.resourceDirectory = resourceDirectory
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }

        // Bundle.main.url(forResource:) does not reliably resolve a name containing
        // slashes (e.g. "data/tests/5165") -- split into the nested subdirectory
        // (passed via `subdirectory:`) and a bare filename instead.
        let relativePath = url.path.hasPrefix("/") ? String(url.path.dropFirst()) : url.path
        let relativeDir = (relativePath as NSString).deletingLastPathComponent
        let fullSubdirectory = relativeDir.isEmpty ? resourceDirectory : "\(resourceDirectory)/\(relativeDir)"
        let fileName = (relativePath as NSString).lastPathComponent

        guard
            let fileURL = Bundle.main.url(
                forResource: (fileName as NSString).deletingPathExtension,
                withExtension: (fileName as NSString).pathExtension,
                subdirectory: fullSubdirectory
            ),
            let data = try? Data(contentsOf: fileURL)
        else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
            return
        }

        // A plain URLResponse has no HTTP status code, so fetch()'s `response.ok`
        // reads as false (status 0) even though the body loads correctly --
        // PRAXIS-Practice's own loadManifest/loadBank check `response.ok` before
        // parsing, so this must be a real HTTPURLResponse with status 200.
        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": mimeType(forExtension: fileURL.pathExtension),
                "Content-Length": String(data.count),
            ]
        )!
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // No cancellable async work — each request is read and returned synchronously.
    }

    private func mimeType(forExtension ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html"
        case "css": return "text/css"
        case "js": return "application/javascript"
        case "json": return "application/json"
        default: return "application/octet-stream"
        }
    }
}
