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
                // Teaching is free, but this still goes through SubjectWebView: the page
                // carries the app's `unlocked` signal (so its Back link into test.html
                // keeps it), and a locked control reached from there can open the
                // purchase sheet like anywhere else.
                SubjectWebView(
                    subject: subject,
                    resourcePath: "teach.html?code=\(subject.code)&category=\(category.id)",
                    title: category.label
                )
            }
        }
        .navigationTitle(subject.name)
    }
}
