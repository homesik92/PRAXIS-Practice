import Foundation
import StoreKit

/// What the buyer owns, and the only place that talks to StoreKit (11.2 Phase D, #136).
///
/// Every API used here was checked against this machine's iOS SDK interface
/// (`StoreKit.swiftmodule/arm64-apple-ios-simulator.swiftinterface`, Xcode 27 /
/// iOS 27.0 SDK) rather than written from memory, per #136's own instruction:
/// `Product.products(for:)`, `Product.purchase(options:)`, `Transaction.updates`,
/// `Transaction.currentEntitlements`, `Transaction.productID`, `Transaction.finish()`
/// and `AppStore.sync()` are all available from iOS 15, well under this app's 16.4
/// floor. The per-product `Transaction.currentEntitlement(for:)` is deprecated as of
/// iOS 18.4, so entitlement is read from the `currentEntitlements` sequence instead.
///
/// The web layer never sees any of this -- it receives one `unlocked` flag per page
/// (D-46, N-21), which is the whole of the app-to-web channel.
@MainActor
final class EntitlementStore: ObservableObject {
    /// Product ids with a current, verified entitlement. Revoked and refunded
    /// purchases drop out of `currentEntitlements` on their own, so this needs no
    /// expiry handling of its own.
    @Published private(set) var ownedProductIDs: Set<String> = []

    /// The app's products as StoreKit describes them -- localized name and
    /// `displayPrice` included, which is why no price is hardcoded anywhere in the app.
    @Published private(set) var products: [Product] = []

    /// Set when the product fetch didn't return every product this app expects --
    /// offline, or an id StoreKit doesn't know (the likely case while #135 swaps the
    /// placeholder ids). Surfaced by the purchase sheet in Phase E; nothing reads it yet.
    @Published private(set) var productLoadFailed = false

    private var subjectCodes: [String] = []
    private var updatesTask: Task<Void, Never>?

    enum PurchaseOutcome: Equatable {
        case purchased
        case cancelled
        /// Ask to Buy, or a payment awaiting approval -- the entitlement arrives later
        /// through `Transaction.updates`, not from the purchase call.
        case pending
        case failed(String)
    }

    /// Called once at launch. Starts the transaction listener **before** reading
    /// current entitlements, so a transaction arriving during startup can't slip
    /// between the two.
    func start(subjectCodes: [String]) async {
        self.subjectCodes = subjectCodes
        if updatesTask == nil {
            updatesTask = listenForTransactions()
        }
        await refreshEntitlements()
        await loadProducts()
    }

    /// Does the buyer own this subject -- either its own product or the app's
    /// all-subjects bundle (D-47)?
    func isUnlocked(_ subjectCode: String) -> Bool {
        ProductCatalog
            .entitlingProductIDs(forSubjectCode: subjectCode)
            .contains { ownedProductIDs.contains($0) }
    }

    func product(forSubjectCode subjectCode: String) -> Product? {
        product(id: ProductCatalog.productID(forSubjectCode: subjectCode))
    }

    var bundleProduct: Product? {
        guard let id = ProductCatalog.bundleProductID else { return nil }
        return product(id: id)
    }

    func product(id: String) -> Product? {
        products.first { $0.id == id }
    }

    func purchase(_ product: Product) async -> PurchaseOutcome {
        do {
            switch try await product.purchase() {
            case .success(let verification):
                switch verification {
                case .verified(let transaction):
                    // Finishing is what tells StoreKit the purchase was delivered; an
                    // unfinished transaction is re-offered on every launch.
                    await transaction.finish()
                    await refreshEntitlements()
                    return .purchased
                case .unverified:
                    // A transaction whose signature doesn't check out is not treated as
                    // ownership -- the same stance refreshEntitlements() takes.
                    return .failed("This purchase could not be verified.")
                }
            case .userCancelled:
                return .cancelled
            case .pending:
                return .pending
            @unknown default:
                return .failed("This purchase could not be completed.")
            }
        } catch {
            return .failed(error.localizedDescription)
        }
    }

    /// Only ever from an explicit "Restore purchases" button -- never on launch.
    /// `AppStore.sync()` can prompt for an App Store sign-in, which is hostile
    /// unprompted, and `currentEntitlements` already covers the ordinary reinstall case.
    func restore() async -> PurchaseOutcome {
        do {
            try await AppStore.sync()
            await refreshEntitlements()
            return .purchased
        } catch {
            return .failed(error.localizedDescription)
        }
    }

    private func refreshEntitlements() async {
        var owned: Set<String> = []
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            owned.insert(transaction.productID)
        }
        ownedProductIDs = owned
    }

    private func loadProducts() async {
        let ids = ProductCatalog.allProductIDs(forSubjectCodes: subjectCodes)
        do {
            let fetched = try await Product.products(for: ids)
            // Keep the app's own order (subjects as the manifest lists them, bundle
            // last) rather than StoreKit's, which is unspecified.
            products = ids.compactMap { id in fetched.first { $0.id == id } }
            // Any missing product is a failure, not just all of them: one unknown id
            // would otherwise leave a subject silently unbuyable (code review finding).
            productLoadFailed = products.count != ids.count
        } catch {
            products = []
            productLoadFailed = true
        }
    }

    /// Kept alive for the app's lifetime (no cancellation in `deinit`: this object is
    /// created once by the app and outlives every view). Catches purchases made outside
    /// the app -- another device, Ask to Buy approval, a refund -- and re-reads
    /// entitlements each time.
    private func listenForTransactions() -> Task<Void, Never> {
        Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                if case .verified(let transaction) = result {
                    await transaction.finish()
                }
                await self.refreshEntitlements()
            }
        }
    }
}
