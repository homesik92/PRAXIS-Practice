import Foundation

/// Mirrors just the fields needed from a question bank's `categories` tree
/// (SCHEMA.md's category shape) -- read directly from the bundled JSON, not
/// hardcoded, so this never drifts from the real data if a subject's
/// categories ever change.
struct BankCategory: Codable, Identifiable {
    let id: String
    let label: String
    let children: [BankCategory]?
}

private struct BankFile: Codable {
    let categories: [BankCategory]
}

enum CategoryLoader {
    /// Leaf categories only, matching PRAXIS-Practice's own convention
    /// (`leafCategoryIds` in tools/verify.mjs, teach.html's own filter) --
    /// teaching content is only ever authored against a leaf categoryId.
    ///
    /// `bankFile` is the manifest's own `file` value (e.g. `tests/5165.json`),
    /// relative to `data/`, so the bank is found the same way the website finds it.
    static func loadLeafCategories(bankFile: String, resourceDirectory: String) -> [BankCategory] {
        let relativePath = bankFile as NSString
        let folder = relativePath.deletingLastPathComponent
        let fileName = relativePath.lastPathComponent as NSString
        guard
            let fileURL = Bundle.main.url(
                forResource: fileName.deletingPathExtension,
                withExtension: fileName.pathExtension,
                subdirectory: folder.isEmpty ? "\(resourceDirectory)/data" : "\(resourceDirectory)/data/\(folder)"
            ),
            let data = try? Data(contentsOf: fileURL),
            let bank = try? JSONDecoder().decode(BankFile.self, from: data)
        else {
            return []
        }

        var leaves: [BankCategory] = []
        func walk(_ nodes: [BankCategory]) {
            for node in nodes {
                if let children = node.children, !children.isEmpty {
                    walk(children)
                } else {
                    leaves.append(node)
                }
            }
        }
        walk(bank.categories)
        return leaves
    }
}
