import SwiftUI

@main
struct PraxisMathApp: App {
    /// One store for the app's lifetime (11.2 Phase D). Nothing reads it yet -- the
    /// subject list's lock badges and the purchase sheet are Phase E -- but the
    /// transaction listener it starts has to be running from launch, so a purchase,
    /// refund or Ask-to-Buy approval that lands while the app is open is seen.
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
