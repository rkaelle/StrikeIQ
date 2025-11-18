import SwiftUI

@main
struct StrikeIQApp: App {
    @StateObject private var signalStore = SignalStore()
    @StateObject private var userStore = UserStore()
    @AppStorage("hasAcceptedDisclaimer") private var hasAcceptedDisclaimer = false

    var body: some Scene {
        WindowGroup {
            if hasAcceptedDisclaimer {
                ContentView()
                    .environmentObject(signalStore)
                    .environmentObject(userStore)
                    .preferredColorScheme(.dark)
            } else {
                DisclaimerView(hasAccepted: $hasAcceptedDisclaimer)
                    .preferredColorScheme(.dark)
            }
        }
    }
}
