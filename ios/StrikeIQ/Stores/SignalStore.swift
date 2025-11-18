import Foundation
import Combine

class SignalStore: ObservableObject {
    @Published var signals: [Signal] = []
    @Published var watchlist: [Signal] = []
    @Published var isLoading = false
    @Published var error: String?

    // Filters
    @Published var selectedSignalType: Signal.SignalType?
    @Published var selectedDirection: Signal.Direction?
    @Published var minConfidence: Double = 0

    private var cancellables = Set<AnyCancellable>()

    init() {
        fetchSignals()
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

        // In production, fetch from API
        // For now, use mock data
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.signals = Signal.mockSignals()
            self.isLoading = false
        }
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
