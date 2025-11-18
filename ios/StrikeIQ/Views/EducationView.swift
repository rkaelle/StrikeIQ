import SwiftUI

struct EducationView: View {
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    // Modules
                    NavigationLink(destination: ModuleDetailView(module: .basics)) {
                        ModuleCard(
                            icon: "book.fill",
                            title: "Options Basics",
                            description: "Learn the fundamentals of options trading",
                            lessons: 5
                        )
                    }

                    NavigationLink(destination: ModuleDetailView(module: .greeks)) {
                        ModuleCard(
                            icon: "function",
                            title: "The Greeks",
                            description: "Understanding Delta, Gamma, Theta, and Vega",
                            lessons: 4
                        )
                    }

                    NavigationLink(destination: ModuleDetailView(module: .psychology)) {
                        ModuleCard(
                            icon: "brain.head.profile",
                            title: "Trading Psychology",
                            description: "Master your emotions and discipline",
                            lessons: 3
                        )
                    }

                    NavigationLink(destination: ModuleDetailView(module: .riskManagement)) {
                        ModuleCard(
                            icon: "shield.fill",
                            title: "Risk Management",
                            description: "Position sizing and protecting your capital",
                            lessons: 4
                        )
                    }

                    NavigationLink(destination: ModuleDetailView(module: .signalTypes)) {
                        ModuleCard(
                            icon: "bolt.fill",
                            title: "Signal Types",
                            description: "Understanding StrikeIQ signals",
                            lessons: 5
                        )
                    }

                    // Quote of the day
                    QuoteCard()
                }
                .padding()
            }
            .background(Color("Background"))
            .navigationTitle("Learn")
        }
    }
}

struct ModuleCard: View {
    let icon: String
    let title: String
    let description: String
    let lessons: Int

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color("Primary").opacity(0.2))
                    .frame(width: 50, height: 50)

                Image(systemName: icon)
                    .foregroundColor(Color("Primary"))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.white)
                Text(description)
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            VStack {
                Text("\(lessons)")
                    .font(.headline)
                    .foregroundColor(.white)
                Text("lessons")
                    .font(.caption2)
                    .foregroundColor(.gray)
            }

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding()
        .background(Color("Surface"))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color("Border"), lineWidth: 1)
        )
    }
}

struct QuoteCard: View {
    let quotes = [
        ("The goal of a successful trader is to make the best trades. Money is secondary.", "Alexander Elder"),
        ("Risk comes from not knowing what you're doing.", "Warren Buffett"),
        ("Plan your trade and trade your plan.", "Trading Proverb"),
        ("The market can stay irrational longer than you can stay solvent.", "John Maynard Keynes")
    ]

    var body: some View {
        let quote = quotes[Int.random(in: 0..<quotes.count)]

        VStack(spacing: 12) {
            Image(systemName: "quote.opening")
                .font(.title)
                .foregroundColor(Color("Primary"))

            Text(quote.0)
                .font(.subheadline)
                .italic()
                .multilineTextAlignment(.center)

            Text("- \(quote.1)")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color("Surface"))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color("Border"), lineWidth: 1)
        )
    }
}

enum EducationModule {
    case basics, greeks, psychology, riskManagement, signalTypes
}

struct ModuleDetailView: View {
    let module: EducationModule

    var title: String {
        switch module {
        case .basics: return "Options Basics"
        case .greeks: return "The Greeks"
        case .psychology: return "Trading Psychology"
        case .riskManagement: return "Risk Management"
        case .signalTypes: return "Signal Types"
        }
    }

    var content: [(String, String)] {
        switch module {
        case .basics:
            return [
                ("What Are Options?", "Options are financial derivatives that give buyers the right, but not the obligation, to buy or sell an underlying asset at a specified price within a specific time period.\n\nCall Options: Give the holder the right to BUY\nPut Options: Give the holder the right to SELL"),
                ("Why Trade Options?", "Options offer leverage, limited risk (for buyers), flexibility to profit in any market direction, and income generation opportunities.\n\nHowever, they require education and carry risks including time decay and complexity.")
            ]
        case .greeks:
            return [
                ("Delta (Δ)", "Delta measures how much an option's price changes for a $1 move in the underlying.\n\nCall delta: 0 to 1.0\nPut delta: -1.0 to 0\n\nATM options have roughly 0.50 delta."),
                ("Gamma (Γ)", "Gamma measures the rate of change in delta. It's highest at ATM options and increases near expiration.\n\n0DTE Warning: Gamma can explode near expiration."),
                ("Theta (Θ)", "Theta measures time decay - how much value an option loses daily. Always negative for buyers.\n\nAccelerates near expiration and is highest for ATM options."),
                ("Vega (V)", "Vega measures sensitivity to implied volatility changes. Higher for longer-dated options.\n\nBuy low IV, sell high IV.")
            ]
        case .psychology:
            return [
                ("Emotional Control", "Common pitfalls: FOMO, revenge trading, overconfidence, fear paralysis, and greed.\n\nSolutions: Follow your plan, use stops, take breaks after losses, journal trades."),
                ("Discipline", "Key disciplines: Position sizing (1-3% risk), entry/exit rules, daily limits, and regular review.\n\nRemember: It's not about being right, it's about managing risk.")
            ]
        case .riskManagement:
            return [
                ("Position Sizing", "The 1-2% Rule: Never risk more than 1-2% of your account on a single trade.\n\nExample: $10,000 account = $100-200 max risk per trade"),
                ("Stop Losses", "Stop losses are non-negotiable.\n\n0DTE: 30-50% stops\nWeekly: 40-60% stops\nMonthly: 50-70% stops\n\nNever remove a stop once placed!")
            ]
        case .signalTypes:
            return [
                ("0DTE Signals", "Same-day expiration with highest gamma exposure. Requires active management, smaller sizes, tight stops, and quick profit taking."),
                ("Weekly Signals", "Options expiring in 1-5 days. Balanced risk/reward with moderate theta decay. Good for swing trades."),
                ("Earnings Signals", "Plays around earnings reports. High IV environment with potential IV crush post-earnings. Consider spreads."),
                ("Dark Pool Signals", "Institutional activity on private exchanges. Large block trades that often precede moves. Use as supporting evidence.")
            ]
        }
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(Array(content.enumerated()), id: \.offset) { index, item in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(item.0)
                            .font(.headline)

                        Text(item.1)
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color("Surface"))
                    .cornerRadius(12)
                }
            }
            .padding()
        }
        .background(Color("Background"))
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.large)
    }
}
