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

// Mock data generator
extension Signal {
    static func mockSignals() -> [Signal] {
        let tickers = ["SPY", "QQQ", "AAPL", "TSLA", "NVDA", "AMD", "AMZN", "META"]
        let signalTypes: [SignalType] = [.zeroDTE, .weekly, .earnings, .darkPool, .news]
        let riskLevels: [RiskLevel] = [.low, .medium, .high, .extreme]

        return (0..<8).map { i in
            let ticker = tickers[Int.random(in: 0..<tickers.count)]
            let direction: Direction = Bool.random() ? .call : .put
            let confidence = Double.random(in: 50...90)
            let basePrice: Double = {
                switch ticker {
                case "SPY": return 450
                case "QQQ": return 380
                case "AAPL": return 175
                case "TSLA": return 250
                case "NVDA": return 500
                case "AMD": return 120
                case "AMZN": return 180
                case "META": return 350
                default: return 100
                }
            }()

            let strikePrice = (basePrice / 5).rounded() * 5 + (direction == .call ? 5 : -5)
            let entryPrice = 2 + Double.random(in: 0...8)
            let stopLoss = entryPrice * 0.5
            let targetPrice = entryPrice * 1.5

            return Signal(
                id: "signal-\(i + 1)",
                ticker: ticker,
                signalType: signalTypes[Int.random(in: 0..<signalTypes.count)],
                direction: direction,
                strikePrice: strikePrice,
                expirationDate: Date().addingTimeInterval(Double.random(in: 0...604800)),
                entryPrice: entryPrice,
                stopLoss: stopLoss,
                targetPrice: targetPrice,
                confidence: confidence,
                flowScore: Double.random(in: 40...90),
                volumeScore: Double.random(in: 40...90),
                oiScore: Double.random(in: 40...90),
                technicalScore: Double.random(in: 40...90),
                sentimentScore: Double.random(in: 40...90),
                volatilityScore: Double.random(in: 40...90),
                riskLevel: riskLevels[Int.random(in: 0..<riskLevels.count)],
                maxLoss: entryPrice - stopLoss,
                potentialGain: targetPrice - entryPrice,
                riskReward: (targetPrice - entryPrice) / (entryPrice - stopLoss),
                reasoning: "Strong \(direction.rawValue.lowercased()) flow detected with \(Int(confidence))% confidence.",
                createdAt: Date(),
                expiresAt: Date().addingTimeInterval(28800),
                isActive: true
            )
        }
    }
}
