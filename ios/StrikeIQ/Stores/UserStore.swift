import Foundation
import Combine

class UserStore: ObservableObject {
    @Published var trades: [UserTrade] = []
    @Published var isLoading = false

    var openTrades: [UserTrade] {
        trades.filter { $0.status == .open }
    }

    var closedTrades: [UserTrade] {
        trades.filter { $0.status == .closed }
    }

    var stats: PerformanceStats {
        let closed = closedTrades
        let wins = closed.filter { $0.outcome == .win }.count
        let losses = closed.filter { $0.outcome == .loss }.count
        let totalPnl = closed.reduce(0) { $0 + ($1.pnl ?? 0) }

        return PerformanceStats(
            totalTrades: closed.count,
            wins: wins,
            losses: losses,
            winRate: closed.isEmpty ? 0 : Double(wins) / Double(closed.count) * 100,
            totalPnl: totalPnl,
            avgPnl: closed.isEmpty ? 0 : totalPnl / Double(closed.count)
        )
    }

    func createTrade(from signal: Signal, quantity: Int) {
        let trade = UserTrade(
            id: UUID().uuidString,
            ticker: signal.ticker,
            direction: signal.direction,
            strikePrice: signal.strikePrice,
            expirationDate: signal.expirationDate,
            entryPrice: signal.entryPrice,
            quantity: quantity,
            status: .open,
            enteredAt: Date()
        )
        trades.append(trade)
    }

    func closeTrade(_ tradeId: String, exitPrice: Double) {
        guard let index = trades.firstIndex(where: { $0.id == tradeId }) else { return }

        var trade = trades[index]
        let pnl = (exitPrice - trade.entryPrice) * Double(trade.quantity) * 100

        trade.exitPrice = exitPrice
        trade.pnl = pnl
        trade.pnlPercentage = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100
        trade.outcome = pnl > 0 ? .win : pnl < 0 ? .loss : .breakeven
        trade.status = .closed
        trade.exitedAt = Date()

        trades[index] = trade
    }
}
