import Foundation

struct Signal: Identifiable, Codable {
    let id: String
    let ticker: String
    let signalType: SignalType
    let direction: Direction
    let strikePrice: Double
    let expirationDate: Date
    let entryPrice: Double
    let stopLoss: Double
    let targetPrice: Double
    let confidence: Double
    let flowScore: Double
    let volumeScore: Double
    let oiScore: Double
    let technicalScore: Double
    let sentimentScore: Double
    let volatilityScore: Double
    let riskLevel: RiskLevel
    let maxLoss: Double
    let potentialGain: Double
    let riskReward: Double
    let reasoning: String
    let createdAt: Date
    let expiresAt: Date
    let isActive: Bool
    var accuracy: SignalAccuracy?

    enum SignalType: String, Codable, CaseIterable {
        case zeroDTE = "0DTE"
        case weekly = "WEEKLY"
        case earnings = "EARNINGS"
        case darkPool = "DARK_POOL"
        case news = "NEWS"

        var displayName: String {
            switch self {
            case .zeroDTE: return "0DTE"
            case .weekly: return "Weekly"
            case .earnings: return "Earnings"
            case .darkPool: return "Dark Pool"
            case .news: return "News"
            }
        }
    }

    enum Direction: String, Codable {
        case call = "CALL"
        case put = "PUT"
    }

    enum RiskLevel: String, Codable {
        case low = "LOW"
        case medium = "MEDIUM"
        case high = "HIGH"
        case extreme = "EXTREME"
    }
}

struct SignalAccuracy: Codable {
    let outcome: String
    let actualReturn: Double?
}

// Empty fallback - returns empty array when backend is unavailable
extension Signal {
    static func mockSignals() -> [Signal] {
        []
    }
}
