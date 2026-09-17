import SwiftUI

/// What the app gives away and what a purchase adds (D-46), said plainly on the first
/// screen. Without it the subject list is four padlocks and no explanation, which reads
/// as "everything costs money" when the teaching content is free forever.
///
/// No price appears here. Prices belong to StoreKit (N-22), so only `PurchaseSheet`
/// shows them -- and this copy stays true whatever a subject ends up costing, in any
/// currency.
enum FreeTier {
    /// How many questions this app holds, read from the manifest rather than written
    /// into the copy -- `tools/verify.mjs` checks those counts against the banks on every
    /// CI run, so the number a buyer sees can't drift from what ships.
    static var questionPoolSummary: String {
        let subjects = ManifestLoader.loadSubjects(resourceDirectory: "WebContent")
        let total = ManifestLoader.totalQuestions(resourceDirectory: "WebContent")
        guard total > 0, !subjects.isEmpty else { return "" }
        return "\(total.formatted()) questions across \(subjects.count) subjects"
    }

    /// Per-subject counts, for the explainer's own list.
    static var perSubjectCounts: [(name: String, count: Int)] {
        ManifestLoader.loadSubjects(resourceDirectory: "WebContent")
            .compactMap { subject in
                guard let size = subject.bankSize, size > 0 else { return nil }
                return (subject.name, size)
            }
    }

    /// The three things D-46 makes free, in the order a new user meets them.
    static let freeItems: [(icon: String, title: String, detail: String)] = [
        ("book", "Study a topic",
         "Every lesson, every subject, unlimited. Free forever."),
        ("timer", "One Category test per topic",
         "Ten real questions, timed like the exam, so you can judge the questions before paying."),
        ("chart.bar", "Your scores and history",
         "Anything you do is tracked and saved on this device."),
    ]

    /// What unlocking a subject adds.
    static let paidItems: [(icon: String, title: String, detail: String)] = [
        ("doc.text", "The full practice test",
         "Every category, full length, timed like the real thing, recorded as an attempt."),
        ("pencil.and.list.clipboard", "Practice a topic",
         "Ten questions from one topic, untimed, whenever you want."),
        ("checkmark.circle", "Review a topic",
         "One topic at a time, with each answer explained straight after the question."),
        ("arrow.clockwise", "Category tests again",
         "Repeat any topic's timed test as often as you like."),
    ]
}

/// The compact version, above the subject list.
struct FreeTierCard: View {
    var body: some View {
        NavigationLink(value: FreeTierDestination.details) {
            VStack(alignment: .leading, spacing: 10) {
                Image("ClassroomHero")
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: .infinity)
                    .padding(8)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    // The illustration carries no information the text doesn't.
                    .accessibilityHidden(true)
                Text("Try it before you buy it")
                    .font(.headline)
                Text("Lessons are free for every subject, and each topic gives you one free timed Category test. Unlocking a subject adds its full practice test, topic practice and topic review.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if !FreeTier.questionPoolSummary.isEmpty {
                    Text(FreeTier.questionPoolSummary)
                        .font(.subheadline.weight(.medium))
                }
                Text("See what's free")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.accentColor)
            }
            .padding(.vertical, 4)
        }
        .accessibilityIdentifier("free-tier-card")
    }
}

/// Values pushed by `SubjectPickerView`'s navigation destination alongside subjects.
enum FreeTierDestination: Hashable {
    case details
}

/// The full explanation, pushed from the card and linked from the purchase sheet.
struct FreeTierDetails: View {
    var body: some View {
        List {
            Section {
                Image("ClassroomHero")
                    .resizable()
                    .scaledToFit()
                    .padding(8)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .accessibilityHidden(true)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }

            Section("Free, with nothing to buy") {
                ForEach(FreeTier.freeItems, id: \.title) { item in
                    row(icon: item.icon, title: item.title, detail: item.detail)
                }
            }

            Section {
                ForEach(FreeTier.paidItems, id: \.title) { item in
                    row(icon: item.icon, title: item.title, detail: item.detail)
                }
            } header: {
                Text("What unlocking a subject adds")
            } footer: {
                Text("Each subject unlocks on its own, or you can unlock every subject in this app at once. It's a one-time purchase, not a subscription, and it stays with your Apple Account — so it comes back free on your other devices, and if you delete the app and install it again. Prices are shown when you choose to unlock.")
            }

            Section {
                ForEach(FreeTier.perSubjectCounts, id: \.name) { subject in
                    HStack {
                        Text(subject.name)
                        Spacer()
                        Text("\(subject.count.formatted()) questions")
                            .foregroundStyle(.secondary)
                            .monospacedDigit()
                    }
                    .font(.subheadline)
                }
            } header: {
                Text("How many questions")
            } footer: {
                Text("Every question is written for this app against the official content categories — none are reproduced from anyone else's material. Practice tests draw a fresh form each time, so the same subject gives you many different tests.")
            }
        }
        .navigationTitle("What's free")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func row(icon: String, title: String, detail: String) -> some View {
        Label {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                Text(detail).font(.footnote).foregroundStyle(.secondary)
            }
        } icon: {
            Image(systemName: icon).foregroundStyle(Color.accentColor)
        }
    }
}
