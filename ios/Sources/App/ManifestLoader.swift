import Foundation

/// The subjects this app sells, read from the bundled `data/manifest.json` (the same file
/// the website's own hub reads) rather than hardcoded, so a subject enabled or added
/// there shows up here with no Swift change (11.2, #136).
///
/// Only the fields the native picker needs are decoded. Purchase details (product ids,
/// prices) deliberately never live in the manifest -- it is shared with the web layer,
/// which must not see them (D-46, iOS D-19).
struct Subject: Codable, Identifiable, Hashable {
    let code: String
    let name: String
    let file: String
    let enabled: Bool
    let track: String?
    /// How many questions this subject's bank holds. `tools/verify.mjs` cross-checks it
    /// against the bank file on every CI run, so it is safe to show a buyer.
    let bankSize: Int?

    var id: String { code }
}

private struct ManifestFile: Codable {
    let tests: [Subject]
}

enum ManifestLoader {
    /// The track this app is built for (D-41/D-43). Only the STEM app exists today;
    /// how the other tracks' apps are produced from `ios/` is 11.3 (#139), parked until
    /// STEM is approved, so this stays a single constant rather than a build setting.
    static let appTrack = "stem"

    /// Parsed once: the bundled manifest cannot change while the app runs, and this is
    /// read on every entitlement publish and every unlock tap (code review finding).
    private static var cache: [String: [Subject]] = [:]

    /// Enabled subjects on `appTrack`, in manifest order. Returns an empty list if the
    /// manifest is missing or malformed -- the picker then shows its empty state rather
    /// than crashing.
    static func loadSubjects(resourceDirectory: String, track: String = appTrack) -> [Subject] {
        let cacheKey = "\(resourceDirectory)|\(track)"
        if let cached = cache[cacheKey] { return cached }
        guard
            let fileURL = Bundle.main.url(
                forResource: "manifest",
                withExtension: "json",
                subdirectory: "\(resourceDirectory)/data"
            ),
            let data = try? Data(contentsOf: fileURL),
            let manifest = try? JSONDecoder().decode(ManifestFile.self, from: data)
        else {
            return []
        }
        let subjects = manifest.tests.filter { $0.enabled && $0.track == track }
        cache[cacheKey] = subjects
        return subjects
    }

    /// Every question in the subjects this app sells -- the number a buyer is actually
    /// being offered.
    static func totalQuestions(resourceDirectory: String, track: String = appTrack) -> Int {
        loadSubjects(resourceDirectory: resourceDirectory, track: track)
            .reduce(0) { $0 + ($1.bankSize ?? 0) }
    }
}
