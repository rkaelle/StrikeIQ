import SwiftUI

struct BacktestingView: View {
    @EnvironmentObject var authStore: AuthStore
    @StateObject private var viewModel = BacktestingViewModel()
    @State private var showCreateSheet = false
    @State private var selectedRun: BacktestRun?

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Summary Cards
                    if !viewModel.runs.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                SummaryCard(
                                    title: "Total Backtests",
                                    value: "\(viewModel.runs.count)",
                                    icon: "chart.bar.fill",
                                    color: .blue
                                )

                                SummaryCard(
                                    title: "Avg Win Rate",
                                    value: String(format: "%.1f%%", viewModel.averageWinRate),
                                    icon: "arrow.up.right",
                                    color: Color("Bullish")
                                )

                                SummaryCard(
                                    title: "Best Return",
                                    value: String(format: "%.1f%%", viewModel.bestReturn),
                                    icon: "star.fill",
                                    color: .green
                                )
                            }
                            .padding(.horizontal)
                        }
                    }

                    // Backtest Runs List
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Backtest Runs")
                            .font(.headline)
                            .padding(.horizontal)

                        if viewModel.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                                .padding()
                        } else if viewModel.runs.isEmpty {
                            EmptyBacktestState {
                                showCreateSheet = true
                            }
                        } else {
                            ForEach(viewModel.runs) { run in
                                BacktestRunCard(run: run, isSelected: selectedRun?.id == run.id) {
                                    selectedRun = run
                                    viewModel.fetchBacktestDetails(id: run.id, token: authStore.token ?? "")
                                }
                                .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
            .background(Color("Background"))
            .navigationTitle("Backtesting Lab")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showCreateSheet = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                    }
                }
            }
            .sheet(isPresented: $showCreateSheet) {
                CreateBacktestSheet(viewModel: viewModel)
            }
            .sheet(item: $selectedRun) { run in
                BacktestDetailsView(run: run, viewModel: viewModel)
            }
            .onAppear {
                if let token = authStore.token {
                    viewModel.fetchBacktestRuns(token: token)
                }
            }
        }
    }
}

struct SummaryCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Text(value)
                .font(.title2)
                .fontWeight(.bold)
        }
        .frame(width: 140, height: 80)
        .padding()
        .background(Color("Surface"))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color("Border"), lineWidth: 1)
        )
    }
}

struct BacktestRunCard: View {
    let run: BacktestRun
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 12) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(run.name)
                            .font(.headline)
                            .foregroundColor(.white)

                        if let description = run.description {
                            Text(description)
                                .font(.caption)
                                .foregroundColor(.gray)
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    StatusBadge(status: run.status)
                }

                // Metrics
                HStack(spacing: 20) {
                    MetricLabel(
                        label: "Return",
                        value: String(format: "%.1f%%", run.totalReturn ?? 0),
                        color: (run.totalReturn ?? 0) >= 0 ? Color("Bullish") : Color("Bearish")
                    )

                    MetricLabel(
                        label: "Win Rate",
                        value: String(format: "%.0f%%", run.winRate ?? 0),
                        color: .blue
                    )

                    MetricLabel(
                        label: "Trades",
                        value: "\(run.totalTrades)",
                        color: .gray
                    )
                }

                // Date Range
                Text("\(run.startDate.formatted(date: .abbreviated, time: .omitted)) - \(run.endDate.formatted(date: .abbreviated, time: .omitted))")
                    .font(.caption2)
                    .foregroundColor(.gray)
            }
            .padding()
            .background(Color("Surface"))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color("AppPrimary") : Color("Border"), lineWidth: isSelected ? 2 : 1)
            )
        }
    }
}

struct MetricLabel: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.gray)
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(color)
        }
    }
}

struct StatusBadge: View {
    let status: String

    var badgeColor: Color {
        switch status {
        case "COMPLETED": return Color("Bullish")
        case "RUNNING": return .blue
        case "FAILED": return Color("Bearish")
        default: return .gray
        }
    }

    var body: some View {
        Text(status)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(badgeColor.opacity(0.2))
            .foregroundColor(badgeColor)
            .cornerRadius(6)
    }
}

struct EmptyBacktestState: View {
    let onCreate: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "chart.bar.xaxis")
                .font(.system(size: 64))
                .foregroundColor(.gray)

            Text("No Backtests Yet")
                .font(.headline)

            Text("Test your strategies against historical data to optimize your trading approach")
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button(action: onCreate) {
                Text("Create Your First Backtest")
                    .fontWeight(.semibold)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color("AppPrimary"))
                    .foregroundColor(.black)
                    .cornerRadius(10)
            }
        }
        .padding(.vertical, 60)
    }
}

struct CreateBacktestSheet: View {
    @EnvironmentObject var authStore: AuthStore
    @ObservedObject var viewModel: BacktestingViewModel
    @Environment(\.dismiss) var dismiss

    @State private var name = ""
    @State private var description = ""
    @State private var startDate = Calendar.current.date(byAdding: .month, value: -3, to: Date()) ?? Date()
    @State private var endDate = Date()
    @State private var initialCapital = 10000.0
    @State private var positionSize = 1000.0

    var body: some View {
        NavigationView {
            Form {
                Section("Backtest Info") {
                    TextField("Name", text: $name)
                    TextField("Description (Optional)", text: $description)
                }

                Section("Date Range") {
                    DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
                    DatePicker("End Date", selection: $endDate, displayedComponents: .date)
                }

                Section("Capital Settings") {
                    HStack {
                        Text("Initial Capital")
                        Spacer()
                        Text("$\(Int(initialCapital))")
                            .foregroundColor(.gray)
                    }
                    Slider(value: $initialCapital, in: 1000...100000, step: 1000)

                    HStack {
                        Text("Position Size")
                        Spacer()
                        Text("$\(Int(positionSize))")
                            .foregroundColor(.gray)
                    }
                    Slider(value: $positionSize, in: 100...10000, step: 100)
                }
            }
            .navigationTitle("New Backtest")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Run") {
                        createBacktest()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }

    private func createBacktest() {
        guard let token = authStore.token else { return }

        viewModel.createBacktest(
            name: name,
            description: description.isEmpty ? nil : description,
            startDate: startDate,
            endDate: endDate,
            initialCapital: initialCapital,
            positionSize: positionSize,
            token: token
        ) {
            dismiss()
        }
    }
}

struct BacktestDetailsView: View {
    let run: BacktestRun
    @ObservedObject var viewModel: BacktestingViewModel
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        Text(run.name)
                            .font(.title2)
                            .fontWeight(.bold)

                        if let description = run.description {
                            Text(description)
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }

                        HStack {
                            Text("\(run.startDate.formatted(date: .abbreviated, time: .omitted)) - \(run.endDate.formatted(date: .abbreviated, time: .omitted))")
                            Spacer()
                            Text("$\(Int(run.initialCapital)) capital")
                        }
                        .font(.caption)
                        .foregroundColor(.gray)
                    }
                    .padding()
                    .background(Color("Surface"))
                    .cornerRadius(12)

                    // Metrics Grid
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        DetailMetricCard(label: "Win Rate", value: String(format: "%.1f%%", run.winRate ?? 0))
                        DetailMetricCard(label: "Total Return", value: String(format: "%.1f%%", run.totalReturn ?? 0))
                        DetailMetricCard(label: "Total P&L", value: String(format: "$%.2f", run.totalPnL ?? 0))
                        DetailMetricCard(label: "Sharpe Ratio", value: String(format: "%.2f", run.sharpeRatio ?? 0))
                        DetailMetricCard(label: "Max Drawdown", value: String(format: "%.1f%%", run.maxDrawdown ?? 0))
                        DetailMetricCard(label: "Avg Return", value: String(format: "%.2f%%", run.avgReturn ?? 0))
                    }
                    .padding(.horizontal)

                    // Trade History
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Trade History")
                            .font(.headline)
                            .padding(.horizontal)

                        if viewModel.selectedRunTrades.isEmpty {
                            Text("No trades available")
                                .foregroundColor(.gray)
                                .frame(maxWidth: .infinity)
                                .padding()
                        } else {
                            ForEach(viewModel.selectedRunTrades.prefix(20)) { trade in
                                TradeRowView(trade: trade)
                                    .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
            .background(Color("Background"))
            .navigationTitle("Backtest Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct DetailMetricCard: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(.gray)
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color("SurfaceLight"))
        .cornerRadius(8)
    }
}

struct TradeRowView: View {
    let trade: BacktestTrade

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(trade.ticker)
                    .font(.headline)
                Text("\(trade.direction) • \(trade.entryDate.formatted(date: .abbreviated, time: .omitted))")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(String(format: "$%.2f", trade.pnl))
                    .font(.headline)
                    .foregroundColor(trade.pnl >= 0 ? Color("Bullish") : Color("Bearish"))
                Text(String(format: "%.1f%%", trade.returnPercent))
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Text(trade.outcome)
                .font(.caption2)
                .fontWeight(.medium)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(trade.outcome == "WIN" ? Color("Bullish").opacity(0.2) : Color("Bearish").opacity(0.2))
                .foregroundColor(trade.outcome == "WIN" ? Color("Bullish") : Color("Bearish"))
                .cornerRadius(6)
        }
        .padding()
        .background(Color("SurfaceLight"))
        .cornerRadius(8)
    }
}

// MARK: - ViewModel

class BacktestingViewModel: ObservableObject {
    @Published var runs: [BacktestRun] = []
    @Published var selectedRunTrades: [BacktestTrade] = []
    @Published var isLoading = false
    @Published var error: String?

    var averageWinRate: Double {
        guard !runs.isEmpty else { return 0 }
        return runs.reduce(0) { $0 + ($1.winRate ?? 0) } / Double(runs.count)
    }

    var bestReturn: Double {
        runs.map { $0.totalReturn ?? 0 }.max() ?? 0
    }

    func fetchBacktestRuns(token: String) {
        isLoading = true

        guard let url = URL(string: "http://localhost:3001/api/backtesting?limit=50") else { return }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                self?.isLoading = false

                guard let data = data, error == nil else {
                    self?.error = error?.localizedDescription
                    return
                }

                do {
                    let response = try JSONDecoder().decode(BacktestRunsResponse.self, from: data)
                    self?.runs = response.runs
                } catch {
                    print("Error decoding backtest runs: \(error)")
                    self?.error = error.localizedDescription
                }
            }
        }.resume()
    }

    func fetchBacktestDetails(id: String, token: String) {
        guard let url = URL(string: "http://localhost:3001/api/backtesting/\(id)") else { return }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let data = data, error == nil else { return }

                do {
                    let decoder = JSONDecoder()
                    decoder.dateDecodingStrategy = .iso8601
                    let run = try decoder.decode(BacktestRunDetails.self, from: data)
                    self?.selectedRunTrades = run.trades
                } catch {
                    print("Error decoding backtest details: \(error)")
                }
            }
        }.resume()
    }

    func createBacktest(
        name: String,
        description: String?,
        startDate: Date,
        endDate: Date,
        initialCapital: Double,
        positionSize: Double,
        token: String,
        completion: @escaping () -> Void
    ) {
        guard let url = URL(string: "http://localhost:3001/api/backtesting/run") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "name": name,
            "description": description ?? "",
            "startDate": ISO8601DateFormatter().string(from: startDate),
            "endDate": ISO8601DateFormatter().string(from: endDate),
            "initialCapital": initialCapital,
            "positionSize": positionSize
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if error == nil {
                    self?.fetchBacktestRuns(token: token)
                    completion()
                }
            }
        }.resume()
    }
}

// MARK: - Models

struct BacktestRun: Identifiable, Codable {
    let id: String
    let name: String
    let description: String?
    let startDate: Date
    let endDate: Date
    let initialCapital: Double
    let positionSize: Double
    let totalTrades: Int
    let winningTrades: Int
    let losingTrades: Int
    let winRate: Double?
    let totalReturn: Double?
    let totalPnL: Double?
    let avgReturn: Double?
    let maxDrawdown: Double?
    let sharpeRatio: Double?
    let status: String
    let createdAt: Date
    let completedAt: Date?
}

struct BacktestTrade: Identifiable, Codable {
    let id: String
    let ticker: String
    let signalType: String
    let direction: String
    let entryPrice: Double
    let exitPrice: Double
    let entryDate: Date
    let exitDate: Date
    let pnl: Double
    let returnPercent: Double
    let outcome: String
}

struct BacktestRunsResponse: Codable {
    let runs: [BacktestRun]
}

struct BacktestRunDetails: Codable {
    let id: String
    let trades: [BacktestTrade]
}
