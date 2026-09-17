import SwiftUI
import StoreKit

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
                }

                Section("Unlock") {
                    if let product = entitlements.product(forSubjectCode: subject.code) {
                        purchaseRow(
                            title: subject.name,
                            subtitle: "This subject only",
                            product: product
                        )
                    }
                    if let bundle = entitlements.bundleProduct {
                        purchaseRow(
                            title: "Every subject",
                            subtitle: "All subjects in this app",
                            product: bundle
                        )
                    }
                    if entitlements.products.isEmpty {
                        // Offline at launch, or an id StoreKit doesn't know yet (#135).
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Prices couldn't be loaded.")
                            Button("Try again") {
                                run { await entitlements.retryLoadingProducts() }
                            }
                        }
                    }
                }

                Section {
                    Button("Restore purchases") {
                        run {
                            switch await entitlements.restore() {
                            case .purchased:
                                dismissIfUnlocked()
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
                if busy { ProgressView().controlSize(.large) }
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
    private func dismissIfUnlocked() {
        if entitlements.isUnlocked(subject.code) {
            dismiss()
        } else {
            message = "That purchase went through, but this subject is still locked. Try Restore purchases."
        }
    }

    private func run(_ work: @escaping () async -> Void) {
        message = nil
        busy = true
        Task {
            await work()
            busy = false
        }
    }
}
