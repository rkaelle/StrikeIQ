import Foundation
import Combine

class SignalStore: ObservableObject {
    @Published var signals: [Signal] = []
    @Published var watchlist: [Signal] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var wsConnected = false

    // Filters
    @Published var selectedSignalType: Signal.SignalType?
    @Published var selectedDirection: Signal.Direction?
    @Published var minConfidence: Double = 0

    private var cancellables = Set<AnyCancellable>()
    private let apiService = APIService.shared
    private let wsService = WebSocketService.shared

    init() {
        setupWebSocket()
        fetchSignals()
    }

    private func setupWebSocket() {
        // Subscribe to WebSocket connection status
        wsService.$isConnected
            .receive(on: DispatchQueue.main)
            .assign(to: &$wsConnected)

        // Subscribe to new signals from WebSocket
        wsService.signalReceived
            .receive(on: DispatchQueue.main)
            .sink { [weak self] signal in
                self?.addSignal(signal)
            }
            .store(in: &cancellables)

        // Connect to WebSocket
        wsService.connect()
    }

    private func addSignal(_ signal: Signal) {
        // Add new signal at the beginning of the list
        if !signals.contains(where: { $0.id == signal.id }) {
            signals.insert(signal, at: 0)
        }
    }

    var filteredSignals: [Signal] {
        signals.filter { signal in
            if let type = selectedSignalType, signal.signalType != type {
                return false
            }
            if let direction = selectedDirection, signal.direction != direction {
                return false
            }
            if signal.confidence < minConfidence {
                return false
            }
            return true
        }
    }

    func fetchSignals() {
        isLoading = true
        error = nil

        apiService.fetchSignals(
            type: selectedSignalType,
            direction: selectedDirection,
            minConfidence: minConfidence > 0 ? minConfidence : nil
        )
        .sink(
            receiveCompletion: { [weak self] completion in
                self?.isLoading = false
                if case .failure(let err) = completion {
                    print("Error fetching signals: \(err)")
                    // Fallback to mock data if API fails
                    self?.signals = Signal.mockSignals()
                    self?.error = "Using demo data - backend not connected"
                }
            },
            receiveValue: { [weak self] signals in
                self?.signals = signals
                self?.isLoading = false
            }
        )
        .store(in: &cancellables)
    }

    func addToWatchlist(_ signal: Signal) {
        guard !watchlist.contains(where: { $0.id == signal.id }) else { return }
        watchlist.append(signal)
    }

    func removeFromWatchlist(_ signalId: String) {
        watchlist.removeAll { $0.id == signalId }
    }

    func acceptSignal(_ signal: Signal) {
        // Handle signal acceptance
        print("Signal accepted: \(signal.id)")
    }

    func rejectSignal(_ signalId: String) {
        signals.removeAll { $0.id == signalId }
    }

    func clearFilters() {
        selectedSignalType = nil
        selectedDirection = nil
        minConfidence = 0
    }
}
