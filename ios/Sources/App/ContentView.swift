import SwiftUI

/// Native TabView shell. Both tabs open on the app's subject list (11.2,
/// `SubjectPickerView`): "Practice" then pushes that subject's test menu
/// (test.html); "Study" pushes its topic list (`CategoryListView`) in front of
/// teach.html, since that page has no in-page category picker of its own.
struct ContentView: View {
    @EnvironmentObject private var entitlements: EntitlementStore

    var body: some View {
        TabView {
            SubjectPickerView(
                title: "Practice",
                identifierPrefix: "practice",
                isLocked: { !entitlements.isUnlocked($0.code) },
                showsFreeTierCard: true
            ) { subject in
                // The web view never ignores a safe-area edge (D-9 for the tab bar,
                // D-17 for the status bar -- both shipped real layout bugs), which is
                // why SubjectWebView adds no .ignoresSafeArea.
                SubjectWebView(subject: subject, resourcePath: "test.html?code=\(subject.code)")
            }
            .tabItem {
                Label("Practice", systemImage: "list.bullet.clipboard")
            }

            // No lock badge on the Study tab: teaching content is free for every
            // subject (D-46), so nothing behind this list is ever locked.
            SubjectPickerView(title: "Study a Topic", identifierPrefix: "study") { subject in
                CategoryListView(subject: subject)
            }
            .tabItem {
                Label("Study", systemImage: "book")
            }
        }
    }
}
