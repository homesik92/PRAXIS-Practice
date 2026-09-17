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

    /// The all-subjects product for this app: $9.99 (D-47). Only exists where the app
    /// has more than one subject to bundle -- a single-subject app (Humanities,
    /// Administrative) sells its one subject at $5.99 with no bundle tier, so this
    /// returns nil there and every "or the bundle" check below simply finds nothing.
    static func bundleProductID(forSubjectCount subjectCount: Int, track: String = ManifestLoader.appTrack) -> String? {
        subjectCount > 1 ? "unlock.\(track).all" : nil
    }

    /// Every product id whose ownership unlocks this subject: its own, plus the app's
    /// bundle if the app has one. Entitlement is per subject, not per app (D-47).
    static func entitlingProductIDs(forSubjectCode subjectCode: String, subjectCount: Int) -> [String] {
        [productID(forSubjectCode: subjectCode), bundleProductID(forSubjectCount: subjectCount)]
            .compactMap { $0 }
    }

    /// Every product this app offers, for a single `Product.products(for:)` fetch.
    static func allProductIDs(forSubjectCodes subjectCodes: [String]) -> [String] {
        subjectCodes.map(productID(forSubjectCode:))
            + [bundleProductID(forSubjectCount: subjectCodes.count)].compactMap { $0 }
    }
}
