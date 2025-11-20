import SwiftUI
import Charts
import Combine

struct PerformanceView: View {
    @EnvironmentObject var authStore: AuthStore
    @StateObject private var viewModel = PerformanceViewModel()
    @State private var selectedPeriod = "30d"

    let periods = ["7d", "30d", "90d"]

    var body: some View {
        NavigationView {
            Group {
                if viewModel.isLoading {
                    VStack {
                        ProgressView()
                        Text("Loading performance data...")
                            .font(.caption)
                            .foregroundColor(.gray)
                            .padding(.top)
                    }
                } else if let error = viewModel.error {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 50))
                            .foregroundColor(.orange)
                        Text("Failed to load performance data")
                            .font(.headline)
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                        Button("Retry") {
                            viewModel.fetchData(userId: authStore.currentUser?.id, days: getDays(selectedPeriod))
                        }
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                    }
                } else {
                    ScrollView {
                        VStack(spacing: 16) {
                            // Period Selector
                            HStack {
                                ForEach(periods, id: \.self) { period in
                                    Button {
                                        selectedPeriod = period
                                        viewModel.fetchData(userId: authStore.currentUser?.id, days: getDays(period))
                                    } label: {
                                        Text(period)
                                            .font(.caption)
                                            .fontWeight(.medium)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                            .background(selectedPeriod == period ? Color.blue : Color.gray.opacity(0.2))
                                            .foregroundColor(selectedPeriod == period ? .white : .primary)
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
                                    iconColor: .blue,
                                    label: "System Win Rate",
                                    value: viewModel.systemData?.winRate ?? "0%"
                                )
                                StatCard(
                                    icon: "chart.bar.fill",
                                    iconColor: .purple,
                                    label: "Your Win Rate",
                                    value: viewModel.userData?.winRate ?? "0%"
                                )
                                StatCard(
                                    icon: "arrow.up.right",
                                    iconColor: .green,
                                    label: "Total P&L",
                                    value: viewModel.userData?.totalPnl ?? "$0"
                                )
                                StatCard(
                                    icon: "star.fill",
                                    iconColor: .yellow,
                                    label: "Avg Confidence",
                                    value: viewModel.systemData?.avgConfidence ?? "0%"
                                )
                            }
                            .padding(.horizontal)

                            // P&L Chart
                            if !viewModel.pnlHistory.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Cumulative P&L")
                                        .font(.headline)
                                        .padding(.horizontal)

                                    if #available(iOS 16.0, *) {
                                        Chart(viewModel.pnlHistory) { item in
                                            AreaMark(
                                                x: .value("Date", item.date),
                                                y: .value("P&L", item.cumulative)
                                            )
                                            .foregroundStyle(
                                                LinearGradient(
                                                    colors: [Color.blue.opacity(0.3), Color.blue.opacity(0.0)],
                                                    startPoint: .top,
                                                    endPoint: .bottom
                                                )
                                            )

                                            LineMark(
                                                x: .value("Date", item.date),
                                                y: .value("P&L", item.cumulative)
                                            )
                                            .foregroundStyle(Color.blue)
                                        }
                                        .frame(height: 200)
                                        .padding(.horizontal)
                                    } else {
                                        Text("Chart requires iOS 16+")
                                            .foregroundColor(.gray)
                                            .frame(height: 200)
                                    }
                                }
                                .padding(.vertical)
                                .background(Color.gray.opacity(0.1))
                                .cornerRadius(12)
                                .padding(.horizontal)
                            }

                            // Win/Loss Distribution
                            if let userData = viewModel.userData {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Win/Loss Distribution")
                                        .font(.headline)

                                    HStack(spacing: 20) {
                                        // Pie chart alternative - circular progress
                                        let winRate = Double(userData.wins) / Double(max(userData.wins + userData.losses, 1))
                                        ZStack {
                                            Circle()
                                                .stroke(Color.red.opacity(0.3), lineWidth: 12)
                                                .frame(width: 100, height: 100)

                                            Circle()
                                                .trim(from: 0, to: CGFloat(winRate))
                                                .stroke(Color.green, lineWidth: 12)
                                                .frame(width: 100, height: 100)
                                                .rotationEffect(.degrees(-90))

                                            VStack {
                                                Text("\(Int(winRate * 100))%")
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
                                                    .fill(Color.green)
                                                    .frame(width: 8, height: 8)
                                                Text("Wins: \(userData.wins)")
                                                    .font(.subheadline)
                                            }
                                            HStack {
                                                Circle()
                                                    .fill(Color.red)
                                                    .frame(width: 8, height: 8)
                                                Text("Losses: \(userData.losses)")
                                                    .font(.subheadline)
                                            }
                                            HStack {
                                                Circle()
                                                    .fill(.gray)
                                                    .frame(width: 8, height: 8)
                                                Text("Total: \(userData.totalTrades)")
                                                    .font(.subheadline)
                                            }
                                        }
                                    }
                                    .frame(maxWidth: .infinity)
                                }
                                .padding()
                                .background(Color.gray.opacity(0.1))
                                .cornerRadius(12)
                                .padding(.horizontal)
                            }

                            // Win Rate by Type
                            if !viewModel.byType.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Win Rate by Signal Type")
                                        .font(.headline)

                                    ForEach(Array(viewModel.byType.keys.sorted()), id: \.self) { type in
                                        if let stats = viewModel.byType[type] {
                                            HStack {
                                                Text(type)
                                                    .font(.subheadline)
                                                    .frame(width: 100, alignment: .leading)

                                                GeometryReader { geometry in
                                                    ZStack(alignment: .leading) {
                                                        Rectangle()
                                                            .fill(Color.gray.opacity(0.2))
                                                            .frame(height: 20)

                                                        Rectangle()
                                                            .fill(Color.blue)
                                                            .frame(width: geometry.size.width * (CGFloat(stats.winRate) / 100), height: 20)
                                                    }
                                                    .cornerRadius(4)
                                                }
                                                .frame(height: 20)

                                                Text("\(Int(stats.winRate))%")
                                                    .font(.caption)
                                                    .fontWeight(.semibold)
                                                    .frame(width: 40, alignment: .trailing)
                                            }
                                        }
                                    }
                                }
                                .padding()
                                .background(Color.gray.opacity(0.1))
                                .cornerRadius(12)
                                .padding(.horizontal)
                            }
                        }
                        .padding(.vertical)
                    }
                }
            }
            .background(Color.black)
            .navigationTitle("Performance")
            .onAppear {
                viewModel.fetchData(userId: authStore.currentUser?.id, days: getDays(selectedPeriod))
            }
        }
    }

    private func getDays(_ period: String) -> Int {
        switch period {
        case "7d": return 7
        case "30d": return 30
        case "90d": return 90
        default: return 30
        }
    }
}

struct StatCard: View {
    let icon: String
    let iconColor: Color
    let label: String
    let value: String

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
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

struct PnLDataPoint: Identifiable {
    let id = UUID()
    let date: Date
    let pnl: Double
    let cumulative: Double
}

// MARK: - ViewModel

class PerformanceViewModel: ObservableObject {
    @Published var systemData: SystemMetrics?
    @Published var userData: UserMetrics?
    @Published var byType: [String: TypeStats] = [:]
    @Published var pnlHistory: [PnLDataPoint] = []
    @Published var isLoading = false
    @Published var error: String?

    private var cancellables = Set<AnyCancellable>()
    private let apiService = APIService.shared

    func fetchData(userId: String?, days: Int) {
        guard let userId = userId else {
            error = "Please log in to view performance"
            return
        }

        isLoading = true
        error = nil

        // Fetch system metrics
        apiService.fetchSystemMetrics(days: days)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let err) = completion {
                        self?.error = err.localizedDescription
                        self?.isLoading = false
                    }
                },
                receiveValue: { [weak self] response in
                    self?.systemData = SystemMetrics(
                        winRate: response.overall.winRate,
                        avgReturn: response.overall.avgReturn,
                        avgConfidence: response.overall.avgConfidence
                    )

                    // Parse byType
                    self?.byType = response.byType.mapValues { type in
                        TypeStats(winRate: Double(type.winRate) ?? 0, total: type.total)
                    }
                }
            )
            .store(in: &cancellables)

        // Fetch user metrics
        apiService.fetchUserMetrics(userId: userId, days: days)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    if case .failure(let err) = completion {
                        self?.error = err.localizedDescription
                    }
                },
                receiveValue: { [weak self] response in
                    self?.userData = UserMetrics(
                        winRate: response.winRate,
                        totalTrades: response.totalTrades,
                        totalPnl: "$\(response.totalPnl)",
                        wins: response.wins,
                        losses: response.losses
                    )

                    // Generate mock history for now (would need backend endpoint)
                    self?.pnlHistory = self?.generatePnLHistory(finalValue: Double(response.totalPnl) ?? 0) ?? []
                }
            )
            .store(in: &cancellables)
    }

    private func generatePnLHistory(finalValue: Double) -> [PnLDataPoint] {
        var data: [PnLDataPoint] = []
        let steps = 30
        let increment = finalValue / Double(steps)
        var cumulative = 0.0

        for i in (0..<steps).reversed() {
            let date = Calendar.current.date(byAdding: .day, value: -i, to: Date())!
            cumulative += increment + Double.random(in: -increment/2...increment/2)
            data.append(PnLDataPoint(date: date, pnl: increment, cumulative: cumulative))
        }

        return data
    }
}

struct SystemMetrics {
    let winRate: String
    let avgReturn: String
    let avgConfidence: String
}

struct UserMetrics {
    let winRate: String
    let totalTrades: Int
    let totalPnl: String
    let wins: Int
    let losses: Int
}

struct TypeStats {
    let winRate: Double
    let total: Int
}
