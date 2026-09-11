import Foundation

/// Mirrors just the fields needed from data/tests/5165.json's `categories`
/// tree (SCHEMA.md's category shape in PRAXIS-Practice) -- read directly
/// from the bundled JSON, not hardcoded, so this never drifts from the real
/// data if 5165's categories ever change.
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
    static func loadLeafCategories(bankFileName: String, resourceDirectory: String) -> [BankCategory] {
        guard
            let fileURL = Bundle.main.url(
                forResource: (bankFileName as NSString).deletingPathExtension,
                withExtension: (bankFileName as NSString).pathExtension,
                subdirectory: "\(resourceDirectory)/data/tests"
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
