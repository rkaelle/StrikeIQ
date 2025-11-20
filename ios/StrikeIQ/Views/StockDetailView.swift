import SwiftUI
import Combine

struct StockDetailView: View {
    let ticker: String
    @StateObject private var viewModel = StockDetailViewModel()
    @Environment(\.dismiss) var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Price Header
                if let quote = viewModel.quote {
                    VStack(spacing: 8) {
                        Text(ticker)
                            .font(.title)
                            .fontWeight(.bold)

                        Text(String(format: "$%.2f", quote.price))
                            .font(.system(size: 36, weight: .bold))

                        HStack {
                            Image(systemName: quote.change >= 0 ? "arrow.up.right" : "arrow.down.right")
                            Text(String(format: "%@%.2f (%.2f%%)",
                                        quote.change >= 0 ? "+" : "",
                                        quote.change,
                                        quote.changePercent))
                        }
                        .foregroundColor(quote.change >= 0 ? Color("Bullish") : Color("Bearish"))
                        .font(.subheadline)
                    }
                    .padding()
                }

                // Today's Stats
                if let quote = viewModel.quote {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Today's Stats")
                            .font(.headline)

                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 12) {
                            StockStatCard(title: "Open", value: String(format: "$%.2f", quote.open))
                            StockStatCard(title: "High", value: String(format: "$%.2f", quote.high), color: Color("Bullish"))
                            StockStatCard(title: "Low", value: String(format: "$%.2f", quote.low), color: Color("Bearish"))
                            StockStatCard(title: "Volume", value: formatVolume(quote.volume))
                        }
                    }
                    .padding()
                    .background(Color("AppSurface"))
                    .cornerRadius(12)
                }

                // Technical Indicators
                VStack(alignment: .leading, spacing: 12) {
                    Text("Technical Indicators")
                        .font(.headline)

                    VStack(spacing: 12) {
                        HStack {
                            Label("RSI (14)", systemImage: "waveform.path.ecg")
                                .foregroundColor(.gray)
                            Spacer()
                            Text(String(format: "%.1f", viewModel.rsi))
                                .foregroundColor(getRSIColor(viewModel.rsi))
                                .fontWeight(.semibold)
                        }

                        Divider()

                        HStack {
                            Label("MACD", systemImage: "chart.line.uptrend.xyaxis")
                                .foregroundColor(.gray)
                            Spacer()
                            Text(String(format: "%.3f", viewModel.macd))
                                .foregroundColor(viewModel.macd >= 0 ? Color("Bullish") : Color("Bearish"))
                                .fontWeight(.semibold)
                        }
                    }
                    .padding()
                    .background(Color("AppBackground"))
                    .cornerRadius(8)
                }
                .padding()
                .background(Color("AppSurface"))
                .cornerRadius(12)

                // News
                VStack(alignment: .leading, spacing: 12) {
                    Text("Latest News")
                        .font(.headline)

                    if viewModel.news.isEmpty {
                        Text("No news available")
                            .foregroundColor(.gray)
                            .frame(maxWidth: .infinity)
                            .padding()
                    } else {
                        ForEach(viewModel.news, id: \.title) { article in
                            NewsRow(article: article)
                        }
                    }
                }
                .padding()
                .background(Color("AppSurface"))
                .cornerRadius(12)
            }
            .padding()
        }
        .background(Color("AppBackground"))
        .navigationTitle(ticker)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.fetchData(ticker: ticker)
        }
    }

    private func getRSIColor(_ rsi: Double) -> Color {
        if rsi >= 70 { return Color("Bearish") }
        if rsi <= 30 { return Color("Bullish") }
        return .yellow
    }

    private func formatVolume(_ volume: Int) -> String {
        if volume >= 1_000_000 {
            return String(format: "%.1fM", Double(volume) / 1_000_000)
        } else if volume >= 1_000 {
            return String(format: "%.1fK", Double(volume) / 1_000)
        }
        return "\(volume)"
    }
}

struct StockStatCard: View {
    let title: String
    let value: String
    var color: Color = .white

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
            Text(value)
                .font(.headline)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color("AppBackground"))
        .cornerRadius(8)
    }
}

struct NewsRow: View {
    let article: NewsArticle

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(article.title)
                .font(.subheadline)
                .fontWeight(.medium)
                .lineLimit(2)

            HStack {
                Text(article.source)
                    .font(.caption)
                    .foregroundColor(.gray)

                Spacer()

                Text(article.sentiment)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(getSentimentColor(article.sentiment).opacity(0.2))
                    .foregroundColor(getSentimentColor(article.sentiment))
                    .cornerRadius(4)
            }
        }
        .padding()
        .background(Color("AppBackground"))
        .cornerRadius(8)
    }

    private func getSentimentColor(_ sentiment: String) -> Color {
        switch sentiment {
        case "POSITIVE": return Color("Bullish")
        case "NEGATIVE": return Color("Bearish")
        default: return .gray
        }
    }
}

class StockDetailViewModel: ObservableObject {
    @Published var quote: Quote?
    @Published var rsi: Double = 50
    @Published var macd: Double = 0
    @Published var news: [NewsArticle] = []
    @Published var isLoading = false

    private var cancellables = Set<AnyCancellable>()
    private let apiService = APIService.shared

    func fetchData(ticker: String) {
        isLoading = true

        // Fetch quote
        apiService.fetchQuote(ticker: ticker)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] quote in
                    self?.quote = quote
                }
            )
            .store(in: &cancellables)

        // For now, use default values for technicals
        // In production, fetch from API
        rsi = 55
        macd = 0.15
        news = []

        isLoading = false
    }
}

struct NewsArticle {
    let title: String
    let source: String
    let url: String
    let sentiment: String
}
