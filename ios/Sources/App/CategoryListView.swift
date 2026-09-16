import SwiftUI

/// One subject's topic list in the Study tab, reached from `SubjectPickerView`.
/// teach.html requires both `code` and `category`, so this native list is what
/// makes a subject's teaching content reachable from the Study tab. Study a topic
/// is free for every subject (D-46), so nothing here is ever locked.
struct CategoryListView: View {
    private let subject: Subject
    private let categories: [BankCategory]

    init(subject: Subject) {
        self.subject = subject
        categories = CategoryLoader.loadLeafCategories(bankFile: subject.file, resourceDirectory: "WebContent")
    }

    var body: some View {
        List(categories) { category in
            NavigationLink(category.label) {
                // Bottom edge not ignored -- same tab-bar tap-swallowing
                // issue as the Practice tab's WebViewContainer (Phase 4
                // finding, ContentView.swift).
                //
                // unlocked=1: see ContentView.swift -- marks the app context so
                // teach.html's back link carries it to test.html.
                WebViewContainer(
                    resourcePath: "teach.html?code=\(subject.code)&category=\(category.id)&unlocked=1",
                    resourceDirectory: "WebContent"
                )
                .navigationTitle(category.label)
                .navigationBarTitleDisplayMode(.inline)
            }
        }
        .navigationTitle(subject.name)
    }
}
