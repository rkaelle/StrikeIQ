import SwiftUI
import Charts

struct PerformanceView: View {
    @EnvironmentObject var userStore: UserStore
    @State private var selectedPeriod = "30d"

    let periods = ["7d", "30d", "90d"]

    // Mock data for charts
    let pnlHistory = generatePnLHistory()

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    // Period Selector
                    HStack {
                        ForEach(periods, id: \.self) { period in
                            Button {
                                selectedPeriod = period
                            } label: {
                                Text(period)
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(selectedPeriod == period ? Color("AppPrimary") : Color("SurfaceLight"))
                                    .foregroundColor(selectedPeriod == period ? .black : .white)
                                    .cornerRadius(8)
                            }
                        }
                        Spacer()
                    }
                    .padding(.horizontal)

                    // Stats Grid
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 12) {
                        StatCard(
                            icon: "target",
                            iconColor: Color("AppPrimary"),
                            label: "System Win Rate",
                            value: "68.5%",
                            trend: "+2.3%"
                        )
                        StatCard(
                            icon: "chart.bar.fill",
                            iconColor: Color("AppSecondary"),
                            label: "Your Win Rate",
                            value: String(format: "%.1f%%", userStore.stats.winRate),
                            trend: "+5.1%"
                        )
                        StatCard(
                            icon: "arrow.up.right",
                            iconColor: Color("Bullish"),
                            label: "Total P&L",
                            value: String(format: "$%.0f", userStore.stats.totalPnl),
                            trend: "+12.5%"
                        )
                        StatCard(
                            icon: "star.fill",
                            iconColor: .yellow,
                            label: "Avg Confidence",
                            value: "72.3%"
                        )
                    }
                    .padding(.horizontal)

                    // P&L Chart
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Cumulative P&L")
                            .font(.headline)
                            .padding(.horizontal)

                        if #available(iOS 16.0, *) {
                            Chart(pnlHistory) { item in
                                AreaMark(
                                    x: .value("Date", item.date),
                                    y: .value("P&L", item.cumulative)
                                )
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [Color("AppPrimary").opacity(0.3), Color("AppPrimary").opacity(0.0)],
                                        startPoint: .top,
                                        endPoint: .bottom
                                    )
                                )

                                LineMark(
                                    x: .value("Date", item.date),
                                    y: .value("P&L", item.cumulative)
                                )
                                .foregroundStyle(Color("AppPrimary"))
                            }
                            .frame(height: 200)
                            .padding(.horizontal)
                        } else {
                            // Fallback for older iOS
                            Text("Chart requires iOS 16+")
                                .foregroundColor(.gray)
                                .frame(height: 200)
                        }
                    }
                    .padding(.vertical)
                    .background(Color("Surface"))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    // Win/Loss Distribution
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Win/Loss Distribution")
                            .font(.headline)

                        HStack(spacing: 20) {
                            // Pie chart alternative - circular progress
                            ZStack {
                                Circle()
                                    .stroke(Color("Bearish"), lineWidth: 12)
                                    .frame(width: 100, height: 100)

                                Circle()
                                    .trim(from: 0, to: CGFloat(userStore.stats.winRate / 100))
                                    .stroke(Color("Bullish"), lineWidth: 12)
                                    .frame(width: 100, height: 100)
                                    .rotationEffect(.degrees(-90))

                                VStack {
                                    Text("\(Int(userStore.stats.winRate))%")
                                        .font(.title3)
                                        .fontWeight(.bold)
                                    Text("Win Rate")
                                        .font(.caption2)
                                        .foregroundColor(.gray)
                                }
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Circle()
                                        .fill(Color("Bullish"))
                                        .frame(width: 8, height: 8)
                                    Text("Wins: \(userStore.stats.wins)")
                                        .font(.subheadline)
                                }
                                HStack {
                                    Circle()
                                        .fill(Color("Bearish"))
                                        .frame(width: 8, height: 8)
                                    Text("Losses: \(userStore.stats.losses)")
                                        .font(.subheadline)
                                }
                                HStack {
                                    Circle()
                                        .fill(.gray)
                                        .frame(width: 8, height: 8)
                                    Text("Total: \(userStore.stats.totalTrades)")
                                        .font(.subheadline)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .padding()
                    .background(Color("Surface"))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    // Sector Comparison
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Sector Comparison")
                            .font(.headline)

                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 8) {
                            SectorCard(name: "Tech", winRate: 72, beta: 1.2)
                            SectorCard(name: "Finance", winRate: 65, beta: 1.1)
                            SectorCard(name: "Healthcare", winRate: 68, beta: 0.8)
                            SectorCard(name: "Energy", winRate: 61, beta: 1.4)
                        }
                    }
                    .padding()
                    .background(Color("Surface"))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .background(Color("Background"))
            .navigationTitle("Performance")
        }
    }
}

struct StatCard: View {
    let icon: String
    let iconColor: Color
    let label: String
    let value: String
    var trend: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(iconColor)
                Text(label)
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            if let trend = trend {
                Text(trend)
                    .font(.caption)
                    .foregroundColor(trend.hasPrefix("+") ? Color("Bullish") : Color("Bearish"))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color("Surface"))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color("Border"), lineWidth: 1)
        )
    }
}

struct SectorCard: View {
    let name: String
    let winRate: Int
    let beta: Double

    var body: some View {
        VStack(spacing: 4) {
            Text(name)
                .font(.caption)
                .foregroundColor(.gray)
            Text("\(winRate)%")
                .font(.headline)
                .fontWeight(.bold)
            Text(String(format: "Beta: %.1f", beta))
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color("SurfaceLight"))
        .cornerRadius(8)
    }
}

struct PnLDataPoint: Identifiable {
    let id = UUID()
    let date: Date
    let pnl: Double
    let cumulative: Double
}

func generatePnLHistory() -> [PnLDataPoint] {
    var data: [PnLDataPoint] = []
    var cumulative = 0.0

    for i in (0..<30).reversed() {
        let date = Calendar.current.date(byAdding: .day, value: -i, to: Date())!
        let pnl = Double.random(in: -60...100)
        cumulative += pnl
        data.append(PnLDataPoint(date: date, pnl: pnl, cumulative: cumulative))
    }

    return data
}
