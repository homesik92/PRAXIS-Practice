import SwiftUI

/// The app's subject list (11.2, #136): every enabled subject on this app's track,
/// in front of whatever each tab opens for a subject. Both tabs use it -- Practice
/// pushes the subject's test menu, Study pushes its topic list.
///
/// No lock badge yet: the app has no purchase state until 11.2 Phase D, and until then
/// every subject opens fully unlocked.
struct SubjectPickerView<Destination: View>: View {
    private let title: String
    private let identifierPrefix: String
    private let destination: (Subject) -> Destination
    private let subjects: [Subject]

    /// `identifierPrefix` keeps each tab's rows distinct for UI tests (both tabs list
    /// the same subjects, and a hidden tab's rows can still be in the element tree).
    init(title: String, identifierPrefix: String, @ViewBuilder destination: @escaping (Subject) -> Destination) {
        self.title = title
        self.identifierPrefix = identifierPrefix
        self.destination = destination
        subjects = ManifestLoader.loadSubjects(resourceDirectory: "WebContent")
    }

    var body: some View {
        NavigationStack {
            Group {
                if subjects.isEmpty {
                    Text("No subjects are available.")
                        .foregroundStyle(.secondary)
                } else {
                    List(subjects) { subject in
                        NavigationLink(subject.name, value: subject)
                            .accessibilityIdentifier("\(identifierPrefix)-subject-\(subject.code)")
                    }
                }
            }
            .navigationTitle(title)
            // Value-based, so a subject's screen is built only when its row is tapped.
            // A destination-closure NavigationLink builds every row's destination as
            // soon as the list draws -- for the Study tab that meant parsing every
            // subject's whole question bank up front (code review finding).
            .navigationDestination(for: Subject.self) { subject in
                destination(subject)
            }
        }
    }
}
