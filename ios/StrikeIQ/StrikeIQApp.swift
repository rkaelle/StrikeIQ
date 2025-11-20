import SwiftUI

@main
struct StrikeIQApp: App {
    @StateObject private var signalStore = SignalStore()
    @StateObject private var userStore = UserStore()
    @StateObject private var authStore = AuthStore()
    @AppStorage("hasAcceptedDisclaimer") private var hasAcceptedDisclaimer = false
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false

    var body: some Scene {
        WindowGroup {
            if !hasAcceptedDisclaimer {
                DisclaimerView(hasAccepted: $hasAcceptedDisclaimer)
                    .preferredColorScheme(.dark)
            } else if !hasCompletedOnboarding && authStore.isAuthenticated {
                // Show onboarding only for authenticated users who haven't seen it
                OnboardingView()
                    .environmentObject(authStore)
                    .preferredColorScheme(.dark)
            } else {
                ContentView()
                    .environmentObject(signalStore)
                    .environmentObject(userStore)
                    .environmentObject(authStore)
                    .preferredColorScheme(.dark)
            }
        }
    }
}
