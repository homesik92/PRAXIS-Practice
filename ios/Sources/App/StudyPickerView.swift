import SwiftUI

/// Phase 3: teach.html requires both `code` and `category` -- there's no
/// in-page picker (PRAXIS-Practice's own "Study a topic" link is still a
/// disabled stub, 6.9.3 not done there). This native list is what makes the
/// already-authored 5165 teaching content reachable at all right now.
struct StudyPickerView: View {
    private let categories: [BankCategory]

    init() {
        categories = CategoryLoader.loadLeafCategories(bankFileName: "5165.json", resourceDirectory: "WebContent")
    }

    var body: some View {
        NavigationStack {
            List(categories) { category in
                NavigationLink(category.label) {
                    // Bottom edge not ignored -- same tab-bar tap-swallowing
                    // issue as the Practice tab's WebViewContainer (Phase 4
                    // finding, ContentView.swift).
                    WebViewContainer(
                        resourcePath: "teach.html?code=5165&category=\(category.id)",
                        resourceDirectory: "WebContent"
                    )
                    .navigationTitle(category.label)
                    .navigationBarTitleDisplayMode(.inline)
                }
            }
            .navigationTitle("Study a Topic")
        }
    }
}
