import SwiftUI

struct SignalCardView: View {
    let signal: Signal
    @EnvironmentObject var signalStore: SignalStore
    @EnvironmentObject var authStore: AuthStore
    @State private var isExpanded = false
    @State private var showConfirmation = false

    private var isBullish: Bool { signal.direction == .call }
    private var isActivated: Bool {
        signalStore.isSignalActivated(signal.id)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Main Card Content
            VStack(spacing: 12) {
                // Header
                HStack(alignment: .top) {
                    // Direction Icon
                    ZStack {
                        Circle()
                            .fill(isBullish ? Color("Bullish").opacity(0.2) : Color("Bearish").opacity(0.2))
                            .frame(width: 40, height: 40)

                        Image(systemName: isBullish ? "arrow.up.right" : "arrow.down.right")
                            .foregroundColor(isBullish ? Color("Bullish") : Color("Bearish"))
                    }

                    // Ticker Info
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            NavigationLink(destination: StockDetailView(ticker: signal.ticker)) {
                                Text(signal.ticker)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            }

                            Text(signal.direction.rawValue)
                                .font(.caption)
                                .fontWeight(.medium)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(isBullish ? Color("Bullish").opacity(0.2) : Color("Bearish").opacity(0.2))
                                .foregroundColor(isBullish ? Color("Bullish") : Color("Bearish"))
                                .cornerRadius(4)

                            Text(signal.signalType.displayName)
                                .font(.caption)
                                .fontWeight(.medium)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color("SurfaceLight"))
                                .foregroundColor(.gray)
                                .cornerRadius(4)
                        }

                        Text("$\(Int(signal.strikePrice)) Strike • \(signal.expirationDate.formatted(date: .abbreviated, time: .omitted))")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }

                    Spacer()

                    // Confidence Score
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("\(Int(signal.confidence))%")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("Confidence")
                            .font(.caption2)
                            .foregroundColor(.gray)
                        ConfidenceBar(value: signal.confidence)
                            .frame(width: 60)
                    }
                }

                // Key Metrics
                HStack(spacing: 8) {
                    MetricBox(label: "Entry", value: String(format: "$%.2f", signal.entryPrice))
                    MetricBox(label: "Stop", value: String(format: "$%.2f", signal.stopLoss), color: Color("Bearish"))
                    MetricBox(label: "Target", value: String(format: "$%.2f", signal.targetPrice), color: Color("Bullish"))
                    MetricBox(label: "R:R", value: String(format: "%.1f", signal.riskReward))
                }

                // Risk Level
                HStack {
                    Image(systemName: "shield.fill")
                        .font(.caption)
                        .foregroundColor(.gray)

                    Text("\(signal.riskLevel.rawValue) RISK")
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(riskColor(signal.riskLevel).opacity(0.2))
                        .foregroundColor(riskColor(signal.riskLevel))
                        .cornerRadius(4)

                    if signal.riskLevel == .high || signal.riskLevel == .extreme {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption)
                            .foregroundColor(Color("RiskHigh"))
                    }

                    Spacer()

                    Text(signal.createdAt.formatted(date: .omitted, time: .shortened))
                        .font(.caption2)
                        .foregroundColor(.gray)
                }

                // Expand Button
                Button {
                    withAnimation(.spring()) {
                        isExpanded.toggle()
                    }
                } label: {
                    HStack {
                        Text(isExpanded ? "Hide Details" : "Show Details")
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    }
                    .font(.caption)
                    .foregroundColor(.gray)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }

                // Expanded Content
                if isExpanded {
                    VStack(spacing: 12) {
                        // Reasoning
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Signal Reasoning")
                                .font(.caption)
                                .foregroundColor(.gray)
                            Text(signal.reasoning)
                                .font(.subheadline)
                        }
                        .padding()
                        .background(Color("SurfaceLight"))
                        .cornerRadius(8)

                        // Score Breakdown
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 8) {
                            ScoreBar(label: "Flow", value: signal.flowScore)
                            ScoreBar(label: "Volume", value: signal.volumeScore)
                            ScoreBar(label: "OI", value: signal.oiScore)
                            ScoreBar(label: "Technical", value: signal.technicalScore)
                            ScoreBar(label: "Sentiment", value: signal.sentimentScore)
                            ScoreBar(label: "Volatility", value: signal.volatilityScore)
                        }
                    }
                }

                // Activation Button (Primary Action)
                Button {
                    if let token = authStore.token {
                        signalStore.toggleActivation(signal, token: token)
                    }
                } label: {
                    HStack {
                        Image(systemName: isActivated ? "checkmark.circle.fill" : "circle")
                            .font(.headline)
                        Text(isActivated ? "Activated" : "Activate Signal")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(isActivated ? Color("AppPrimary") : Color("SurfaceLight"))
                    .foregroundColor(isActivated ? .black : .white)
                    .cornerRadius(8)
                }

                // Secondary Action Buttons
                HStack(spacing: 8) {
                    Button {
                        signalStore.rejectSignal(signal.id)
                    } label: {
                        HStack {
                            Image(systemName: "xmark")
                            Text("Pass")
                        }
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color("SurfaceLight"))
                        .foregroundColor(.white)
                        .cornerRadius(8)
                    }

                    Button {
                        signalStore.addToWatchlist(signal)
                    } label: {
                        Image(systemName: "plus")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .padding(.vertical, 10)
                            .padding(.horizontal, 12)
                            .background(Color("SurfaceLight"))
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }

                    Button {
                        showConfirmation = true
                    } label: {
                        HStack {
                            Image(systemName: "checkmark")
                            Text("Accept")
                        }
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(isBullish ? Color("Bullish").opacity(0.2) : Color("Bearish").opacity(0.2))
                        .foregroundColor(isBullish ? Color("Bullish") : Color("Bearish"))
                        .cornerRadius(8)
                    }
                }
            }
            .padding()
            .background(Color("Surface"))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color("Border"), lineWidth: 1)
            )
            .overlay(
                Rectangle()
                    .fill(isBullish ? Color("Bullish") : Color("Bearish"))
                    .frame(width: 4)
                    .cornerRadius(2, corners: [.topLeft, .bottomLeft]),
                alignment: .leading
            )
        }
        .alert("Confirm Trade Decision", isPresented: $showConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Confirm") {
                signalStore.acceptSignal(signal)
            }
        } message: {
            Text("You are about to accept this \(signal.direction.rawValue) signal for \(signal.ticker). This is not financial advice. Please ensure you have done your own research.")
        }
    }

    private func riskColor(_ level: Signal.RiskLevel) -> Color {
        switch level {
        case .low: return Color("RiskLow")
        case .medium: return Color("RiskMedium")
        case .high: return Color("RiskHigh")
        case .extreme: return Color("RiskExtreme")
        }
    }
}

struct MetricBox: View {
    let label: String
    let value: String
    var color: Color = .white

    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.gray)
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color("SurfaceLight"))
        .cornerRadius(6)
    }
}

struct ConfidenceBar: View {
    let value: Double

    private var color: Color {
        if value >= 75 { return Color("AppPrimary") }
        if value >= 60 { return .yellow }
        return .orange
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(Color("SurfaceLight"))
                    .frame(height: 4)
                    .cornerRadius(2)

                Rectangle()
                    .fill(color)
                    .frame(width: geometry.size.width * CGFloat(value / 100), height: 4)
                    .cornerRadius(2)
            }
        }
        .frame(height: 4)
    }
}

struct ScoreBar: View {
    let label: String
    let value: Double

    var body: some View {
        VStack(spacing: 4) {
            HStack {
                Text(label)
                    .font(.caption2)
                    .foregroundColor(.gray)
                Spacer()
                Text("\(Int(value))")
                    .font(.caption2)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color("SurfaceLight"))
                        .frame(height: 3)
                        .cornerRadius(1.5)

                    Rectangle()
                        .fill(Color("AppPrimary"))
                        .frame(width: geometry.size.width * CGFloat(value / 100), height: 3)
                        .cornerRadius(1.5)
                }
            }
            .frame(height: 3)
        }
        .padding(8)
        .background(Color("SurfaceLight"))
        .cornerRadius(6)
    }
}

// Corner radius extension
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}
