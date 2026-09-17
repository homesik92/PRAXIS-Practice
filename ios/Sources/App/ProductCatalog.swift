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

    /// Tracks whose app ships more than one subject, and therefore has an all-subjects
    /// product to sell (D-47). Listing them here is what makes the nil case real: a
    /// single-subject app's track is simply absent, rather than relying on someone
    /// remembering to blank a constant when that app is built (code review finding).
    /// Update this when 11.3 (#139) produces the other tracks' apps.
    private static let tracksWithBundle: Set<String> = ["stem"]

    /// The all-subjects product for this app: $9.99 (D-47), or nil where the app has
    /// only one subject and therefore nothing to bundle -- then every "or the bundle"
    /// check below simply finds nothing.
    ///
    /// Deliberately **not** derived from how many subjects are enabled right now: a
    /// bundle, once bought, must keep unlocking everything even if the manifest later
    /// enables fewer subjects, and a runtime count would strip a paying buyer's access
    /// the moment a track dropped to one enabled subject (code review finding).
    static let bundleProductID: String? = tracksWithBundle.contains(ManifestLoader.appTrack)
        ? "unlock.\(ManifestLoader.appTrack).all"
        : nil

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
