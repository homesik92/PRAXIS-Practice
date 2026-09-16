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

    /// Enabled subjects on `appTrack`, in manifest order. Returns an empty list if the
    /// manifest is missing or malformed -- the picker then shows its empty state rather
    /// than crashing.
    static func loadSubjects(resourceDirectory: String, track: String = appTrack) -> [Subject] {
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
        return manifest.tests.filter { $0.enabled && $0.track == track }
    }
}
