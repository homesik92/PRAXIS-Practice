import SwiftUI

/// The app's subject list (11.2, #136): every enabled subject on this app's track,
/// in front of whatever each tab opens for a subject. Both tabs use it -- Practice
/// pushes the subject's test menu, Study pushes its topic list.
///
/// A locked subject is badged rather than hidden or blocked: the free tier (D-46) lives
/// *inside* a subject, so a locked subject still has teaching content and one free
/// Category test per topic to open.
struct SubjectPickerView<Destination: View>: View {
    private let title: String
    private let identifierPrefix: String
    private let isLocked: (Subject) -> Bool
    private let showsFreeTierCard: Bool
    private let destination: (Subject) -> Destination
    private let subjects: [Subject]

    /// `identifierPrefix` keeps each tab's rows distinct for UI tests (both tabs list
    /// the same subjects, and a hidden tab's rows can still be in the element tree).
    init(
        title: String,
        identifierPrefix: String,
        isLocked: @escaping (Subject) -> Bool = { _ in false },
        showsFreeTierCard: Bool = false,
        @ViewBuilder destination: @escaping (Subject) -> Destination
    ) {
        self.title = title
        self.identifierPrefix = identifierPrefix
        self.isLocked = isLocked
        self.showsFreeTierCard = showsFreeTierCard
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
                    List {
                        // Practice only: the Study tab has nothing locked to explain.
                        if showsFreeTierCard {
                            Section { FreeTierCard() }
                        }
                        Section {
                            subjectRows
                        }
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
            .navigationDestination(for: FreeTierDestination.self) { _ in
                FreeTierDetails()
            }
        }
    }

    @ViewBuilder
    private var subjectRows: some View {
        ForEach(subjects) { subject in
                        NavigationLink(value: subject) {
                            HStack {
                                Text(subject.name)
                                if isLocked(subject) {
                                    Spacer()
                                    Image(systemName: "lock.fill")
                                        .foregroundStyle(.secondary)
                                        .font(.footnote)
                                        // Spoken instead of the icon's own name, and it
                                        // says what it means rather than "lock".
                                        .accessibilityLabel("Not unlocked")
                                }
                            }
                        }
            .accessibilityIdentifier("\(identifierPrefix)-subject-\(subject.code)")
        }
    }
}
