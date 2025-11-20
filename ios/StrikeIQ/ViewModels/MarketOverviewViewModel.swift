import Foundation
import Combine

class MarketOverviewViewModel: ObservableObject {
    @Published var spyQuote: Quote?
    @Published var qqqQuote: Quote?
    @Published var vixQuote: Quote?
    @Published var diaQuote: Quote?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var cancellables = Set<AnyCancellable>()
    private var timer: Timer?
    private let apiService = APIService.shared

    private let tickers = ["SPY", "QQQ", "VIX", "DIA"]

    init() {
        fetchAllQuotes()
        startAutoRefresh()
    }

    deinit {
        timer?.invalidate()
    }

    func fetchAllQuotes() {
        isLoading = true
        errorMessage = nil

        // Fetch all tickers in parallel
        let publishers = tickers.map { ticker in
            apiService.fetchQuote(ticker: ticker)
                .catch { error -> Just<Quote?> in
                    print("Error fetching \(ticker): \(error.localizedDescription)")
                    return Just(nil)
                }
                .eraseToAnyPublisher()
        }

        Publishers.MergeMany(publishers)
            .collect()
            .sink { [weak self] quotes in
                self?.isLoading = false
                self?.updateQuotes(quotes.compactMap { $0 })
            }
            .store(in: &cancellables)
    }

    private func updateQuotes(_ quotes: [Quote]) {
        for quote in quotes {
            switch quote.ticker {
            case "SPY":
                spyQuote = quote
            case "QQQ":
                qqqQuote = quote
            case "VIX":
                vixQuote = quote
            case "DIA":
                diaQuote = quote
            default:
                break
            }
        }

        // If we didn't get all quotes, show error
        if quotes.count < tickers.count {
            let fetchedTickers = Set(quotes.map { $0.ticker })
            let missing = Set(tickers).subtracting(fetchedTickers)
            errorMessage = "Failed to load: \(missing.joined(separator: ", "))"
        }
    }

    private func startAutoRefresh() {
        // Refresh every 30 seconds during market hours
        timer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.fetchAllQuotes()
        }
    }

    func retry() {
        fetchAllQuotes()
    }
}
