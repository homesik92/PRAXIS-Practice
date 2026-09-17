import SwiftUI
import StoreKit
import UIKit

/// The only place in the app that talks about money (11.2 Phase E). Offers this subject
/// on its own and, where the app has more than one subject, everything at once (D-47).
/// Every price shown is StoreKit's own `displayPrice`, so it is whatever the buyer will
/// actually be charged in their own currency -- no price is written in the app.
struct PurchaseSheet: View {
    let subject: Subject
    @EnvironmentObject private var entitlements: EntitlementStore
    @Environment(\.dismiss) private var dismiss

    @State private var busy = false
    @State private var message: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Study a topic is always free, and you get one free Category test for each topic. Unlocking adds the full practice test, topic practice, topic review and repeat Category tests.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    NavigationLink("What's free without buying") {
                        FreeTierDetails()
                    }
                    .font(.footnote)
                }

                Section("Unlock") {
                    if let product = entitlements.product(forSubjectCode: subject.code) {
                        purchaseRow(
                            title: subject.name,
                            subtitle: subject.bankSize.map { "\($0.formatted()) questions" } ?? "This subject only",
                            product: product
                        )
                    }
                    if let bundle = entitlements.bundleProduct {
                        purchaseRow(
                            title: "Every subject",
                            subtitle: FreeTier.questionPoolSummary.isEmpty
                                ? "All subjects in this app"
                                : FreeTier.questionPoolSummary,
                            product: bundle
                        )
                    }
                    if entitlements.productLoadFailed {
                        // Offline at launch, or an id StoreKit doesn't know yet (#135).
                        // Keyed on productLoadFailed, not on an empty list: a *partial*
                        // load would otherwise leave this subject quietly unbuyable, with
                        // no reason given and nothing to retry (code review finding).
                        VStack(alignment: .leading, spacing: 8) {
                            Text(entitlements.products.isEmpty
                                 ? "Prices couldn't be loaded."
                                 : "Some options couldn't be loaded.")
                            Button("Try again") {
                                run { await entitlements.retryLoadingProducts() }
                            }
                            .disabled(busy)
                        }
                    }
                }

                Section {
                    Button("Restore purchases") {
                        run {
                            switch await entitlements.restore() {
                            case .purchased:
                                // Restoring something that doesn't cover this subject
                                // must not answer with "try Restore purchases" -- they
                                // just did (code review finding).
                                dismissIfUnlocked(
                                    otherwise: "Your purchases were restored, but they don't include \(subject.name)."
                                )
                            case .nothingToRestore:
                                message = "There were no purchases to restore on this Apple Account."
                            case .failed(let reason):
                                message = reason
                            case .cancelled, .pending:
                                break
                            }
                        }
                    }
                    .disabled(busy)
                } footer: {
                    Text("A purchase is tied to your Apple Account, so it restores on your other devices at no extra cost.")
                }

                if let message {
                    Section {
                        Text(message).foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Unlock \(subject.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .overlay {
                if busy {
                    // Blocks interaction as well as showing progress, and is spoken:
                    // a bare ProgressView left VoiceOver users with no signal that
                    // anything was happening (code review finding).
                    Color(uiColor: .systemBackground).opacity(0.6)
                        .ignoresSafeArea()
                        .overlay { ProgressView().controlSize(.large) }
                        .accessibilityElement()
                        .accessibilityLabel("Working")
                        .accessibilityAddTraits(.updatesFrequently)
                }
            }
            .onChange(of: message) { newValue in
                // The message Section is the only feedback for a pending, failed or
                // nothing-to-restore outcome, and it appears at the bottom without
                // moving focus -- announce it instead of letting it pass silently.
                guard let newValue, !newValue.isEmpty else { return }
                UIAccessibility.post(notification: .announcement, argument: newValue)
            }
        }
    }

    private func purchaseRow(title: String, subtitle: String, product: Product) -> some View {
        Button {
            run {
                switch await entitlements.purchase(product) {
                case .purchased:
                    dismissIfUnlocked()
                case .pending:
                    // Ask to Buy: the entitlement arrives later through
                    // Transaction.updates, not from the purchase call.
                    message = "This purchase needs approval before it finishes. It'll unlock on its own once approved."
                case .failed(let reason):
                    message = reason
                case .cancelled, .nothingToRestore:
                    break
                }
            }
        } label: {
            HStack {
                VStack(alignment: .leading) {
                    Text(title)
                    Text(subtitle).font(.footnote).foregroundStyle(.secondary)
                }
                Spacer()
                Text(product.displayPrice).monospacedDigit()
            }
        }
        .disabled(busy)
    }

    /// Only closes once the subject the sheet was opened for is actually unlocked --
    /// buying a different subject's bundle counts, buying nothing does not.
    private func dismissIfUnlocked(
        otherwise fallback: String = "That purchase went through, but this subject is still locked. Try Restore purchases."
    ) {
        if entitlements.isUnlocked(subject.code) {
            dismiss()
        } else {
            message = fallback
        }
    }

    /// One action at a time. `AppStore.sync()` shows no system UI of its own, so without
    /// this the sheet stays fully interactive during a restore and two tasks race on
    /// `busy` and `message` (code review finding).
    private func run(_ work: @escaping () async -> Void) {
        guard !busy else { return }
        message = nil
        busy = true
        Task {
            await work()
            busy = false
        }
    }
}
