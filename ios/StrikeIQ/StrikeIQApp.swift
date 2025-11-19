import SwiftUI

@main
struct StrikeIQApp: App {
    @StateObject private var signalStore = SignalStore()
    @StateObject private var authStore = AuthStore()
    @AppStorage("hasAcceptedDisclaimer") private var hasAcceptedDisclaimer = false

    var body: some Scene {
        WindowGroup {
            if hasAcceptedDisclaimer {
                ContentView()
                    .environmentObject(signalStore)
                    .environmentObject(authStore)
                    .preferredColorScheme(.dark)
            } else {
                DisclaimerView(hasAccepted: $hasAcceptedDisclaimer)
                    .preferredColorScheme(.dark)
            }
        }
    }
}
