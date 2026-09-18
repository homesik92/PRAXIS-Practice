import SwiftUI

/// A subject's web page plus the purchase sheet it can ask for (11.2 Phase E).
///
/// Exists as its own view because the sheet needs state that survives the web view
/// re-rendering, and because both tabs need the same behaviour: a locked control in
/// `test.html` (or `run.html`'s locked screen) navigates to
/// `praxisapp://local/unlock?code=…`, `WebViewContainer` cancels that navigation and
/// calls back here, and the sheet opens. When the purchase lands, `entitlements`
/// changes, this view re-renders, and `WebViewContainer.updateUIView` reloads the same
/// page unlocked -- without the buyer leaving the tab.
struct SubjectWebView: View {
    let subject: Subject
    /// The page to open for this subject, without an `unlocked` parameter --
    /// `WebViewContainer` adds it.
    let resourcePath: String
    var title: String?

    @EnvironmentObject private var entitlements: EntitlementStore
    @State private var purchaseSubject: Subject?

    var body: some View {
        // Neither edge is ignored (D-9, D-17) -- see ContentView.swift.
        WebViewContainer(
            resourcePath: resourcePath,
            resourceDirectory: "WebContent",
            unlocked: entitlements.isUnlocked(subject.code),
            onUnlockRequested: { code in
                // The page names the subject only to personalize the sheet; the code it
                // sends is matched against the app's own subject list rather than
                // trusted as-is (D-46).
                purchaseSubject = ManifestLoader.loadSubjects(resourceDirectory: "WebContent")
                    .first { $0.code == code } ?? subject
            }
        )
        .navigationTitle(title ?? subject.name)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $purchaseSubject) { sheetSubject in
            PurchaseSheet(subject: sheetSubject)
                .environmentObject(entitlements)
        }
    }
}
