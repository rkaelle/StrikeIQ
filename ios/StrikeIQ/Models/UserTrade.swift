import Foundation

struct UserTrade: Identifiable, Codable {
    let id: String
    let ticker: String
    let direction: Signal.Direction
    let strikePrice: Double
    let expirationDate: Date
    let entryPrice: Double
    var exitPrice: Double?
    let quantity: Int
    var status: TradeStatus
    var outcome: TradeOutcome?
    var pnl: Double?
    var pnlPercentage: Double?
    let enteredAt: Date
    var exitedAt: Date?
    var notes: String?

    enum TradeStatus: String, Codable {
        case open = "OPEN"
        case closed = "CLOSED"
    }

    enum TradeOutcome: String, Codable {
        case win = "WIN"
        case loss = "LOSS"
        case breakeven = "BREAKEVEN"
    }
}

struct PerformanceStats: Codable {
    let totalTrades: Int
    let wins: Int
    let losses: Int
    let winRate: Double
    let totalPnl: Double
    let avgPnl: Double
}
