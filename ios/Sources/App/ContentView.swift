import SwiftUI

/// Phase 3: native TabView shell (D-2 -- always code=5165, no test picker
/// needed). "Practice" hosts the Start hub as-is; "Study" is a native
/// picker (StudyPickerView) in front of teach.html, since that page has no
/// in-page category picker of its own.
struct ContentView: View {
    var body: some View {
        TabView {
            // Neither edge is ignored now (D-17). The bottom edge has been off
            // since D-9 (Phase 4): ignoring it let the WebView extend under the
            // tab bar, silently swallowing taps on content scrolled into that
            // ~83pt strip. The top edge was ignored until the session owner's
            // real-device iPad testing found a second, more severe problem
            // with the same root shape: extending touchable WebView content
            // into the status-bar strip let a touch near the very top edge be
            // captured by iPadOS's own system-gesture recognizers instead of
            // the page, quitting the app to the home screen. Same class of bug
            // as D-9 (WebView content reaching into OS-reserved screen space),
            // just the opposite edge and a worse failure mode.
            WebViewContainer(resourcePath: "test.html?code=5165", resourceDirectory: "WebContent")
                .tabItem {
                    Label("Practice", systemImage: "list.bullet.clipboard")
                }

            StudyPickerView()
                .tabItem {
                    Label("Study", systemImage: "book")
                }
        }
    }
}
