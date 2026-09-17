import Foundation

/// The subject ↔ product-id mapping, and nothing else about commerce.
///
/// Deliberately native-only: `data/manifest.json` is shared with the web layer, and
/// product ids are exactly the commerce detail D-46's boundary keeps out of it. Prices
/// are never here either -- they come from StoreKit (the local `Configuration.storekit`
/// today, App Store Connect later), so there is one source of truth for what something
/// costs and it is the one the buyer is actually charged against.
///
/// ⚠ These ids are **placeholders** until [#135] settles the real bundle id and product
/// ids, which are permanent once registered in App Store Connect. They only have to be
/// self-consistent while purchases are tested against a local StoreKit configuration.
enum ProductCatalog {
    /// One non-consumable per subject: $5.99 (D-47).
    static func productID(forSubjectCode subjectCode: String) -> String {
        "unlock.\(subjectCode)"
    }

    /// The all-subjects product for this app: $9.99 (D-47). A **build-time** property of
    /// the app, not something derived from how many subjects happen to be enabled right
    /// now: a bundle, once bought, must keep unlocking everything even if the manifest
    /// later enables fewer subjects (deriving it at runtime would silently strip a
    /// paying buyer's access the moment a track dropped to one enabled subject -- code
    /// review finding). A single-subject app (Humanities, Administrative) sells its one
    /// subject at $5.99 with no bundle tier, and sets this to nil when it is built.
    static let bundleProductID: String? = "unlock.\(ManifestLoader.appTrack).all"

    /// Every product id whose ownership unlocks this subject: its own, plus the app's
    /// bundle if the app has one. Entitlement is per subject, not per app (D-47).
    static func entitlingProductIDs(forSubjectCode subjectCode: String) -> [String] {
        [productID(forSubjectCode: subjectCode), bundleProductID].compactMap { $0 }
    }

    /// Every product this app offers, for a single `Product.products(for:)` fetch.
    static func allProductIDs(forSubjectCodes subjectCodes: [String]) -> [String] {
        subjectCodes.map(productID(forSubjectCode:)) + [bundleProductID].compactMap { $0 }
    }
}
