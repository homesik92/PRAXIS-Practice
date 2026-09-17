import SwiftUI

@main
struct PraxisMathApp: App {
    /// One store for the app's lifetime. The subject list's lock badges, every page's
    /// `unlocked` flag and the purchase sheet all read it, and the transaction listener
    /// it starts runs from launch, so a purchase, refund or Ask-to-Buy approval that
    /// lands while the app is open is seen without a relaunch.
    @StateObject private var entitlements = EntitlementStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(entitlements)
                .task {
                    let codes = ManifestLoader.loadSubjects(resourceDirectory: "WebContent").map(\.code)
                    await entitlements.start(subjectCodes: codes)
                }
        }
    }
}
