import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var authStore: AuthStore
    @State private var currentStep = 0
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false

    var body: some View {
        ZStack {
            Color("Background").ignoresSafeArea()

            TabView(selection: $currentStep) {
                // Step 1: Welcome
                OnboardingStepView(
                    icon: "chart.line.uptrend.xyaxis",
                    title: "Welcome to StrikeIQ",
                    description: "Professional-grade 0DTE options signals powered by institutional AI analytics.",
                    stepNumber: 0
                )
                .tag(0)

                // Step 2: How It Works
                OnboardingStepView(
                    icon: "gearshape.2.fill",
                    title: "5-Pillar System",
                    description: "Our institutional-grade system analyzes:\n\n✓ Trend State\n✓ Institutional Flow\n✓ Volatility Conditions\n✓ Liquidity\n✓ Market Correlation",
                    stepNumber: 1
                )
                .tag(1)

                // Step 3: Signal Types
                OnboardingStepView(
                    icon: "bolt.fill",
                    title: "Signal Types",
                    description: "• 0DTE: Same-day expiration (high precision)\n• WEEKLY: Multi-day plays (more time)\n• DARK POOL: Large institutional activity\n• NEWS: Catalyst-driven moves",
                    stepNumber: 2
                )
                .tag(2)

                // Step 4: How to Use
                OnboardingStepView(
                    icon: "checkmark.circle.fill",
                    title: "How to Use Signals",
                    description: "1. Browse signals on the Signals tab\n2. Tap 'Activate' to watch a signal\n3. Enter trades in your brokerage\n4. Log trades in StrikeIQ to track performance",
                    stepNumber: 3
                )
                .tag(3)
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
            .indexViewStyle(.page(backgroundDisplayMode: .always))

            VStack {
                Spacer()

                if currentStep == 3 {
                    Button {
                        hasCompletedOnboarding = true
                    } label: {
                        Text("Get Started")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color("AppPrimary"))
                            .foregroundColor(.black)
                            .cornerRadius(12)
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 50)
                } else {
                    Button {
                        hasCompletedOnboarding = true
                    } label: {
                        Text("Skip")
                            .foregroundColor(.gray)
                    }
                    .padding(.bottom, 50)
                }
            }
        }
    }
}

struct OnboardingStepView: View {
    let icon: String
    let title: String
    let description: String
    let stepNumber: Int

    var body: some View {
        VStack(spacing: 30) {
            Spacer()

            Image(systemName: icon)
                .font(.system(size: 80))
                .foregroundColor(Color("AppPrimary"))

            VStack(spacing: 16) {
                Text(title)
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .multilineTextAlignment(.center)

                Text(description)
                    .font(.body)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .lineSpacing(6)
                    .padding(.horizontal, 40)
            }

            Spacer()
            Spacer()
        }
    }
}
