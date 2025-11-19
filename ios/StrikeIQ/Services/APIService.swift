import Foundation
import Combine

class APIService {
    static let shared = APIService()

    private let baseURL = "http://localhost:3001/api"
    private var cancellables = Set<AnyCancellable>()

    private init() {}

    // MARK: - Signals

    func fetchSignals(
        type: Signal.SignalType? = nil,
        direction: Signal.Direction? = nil,
        minConfidence: Double? = nil
    ) -> AnyPublisher<[Signal], Error> {
        var components = URLComponents(string: "\(baseURL)/signals")!
        var queryItems: [URLQueryItem] = []

        if let type = type {
            queryItems.append(URLQueryItem(name: "type", value: type.rawValue))
        }
        if let direction = direction {
            queryItems.append(URLQueryItem(name: "direction", value: direction.rawValue))
        }
        if let minConfidence = minConfidence {
            queryItems.append(URLQueryItem(name: "minConfidence", value: String(minConfidence)))
        }

        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }

        return fetch(components.url!)
    }

    func fetchSignal(id: String) -> AnyPublisher<Signal, Error> {
        fetch(URL(string: "\(baseURL)/signals/\(id)")!)
    }

    // MARK: - Market Data

    func fetchQuote(ticker: String) -> AnyPublisher<Quote, Error> {
        fetch(URL(string: "\(baseURL)/market/quote/\(ticker)")!)
    }

    func fetchVIX() -> AnyPublisher<VIXData, Error> {
        fetch(URL(string: "\(baseURL)/market/vix")!)
    }

    // MARK: - User

    func login(email: String, password: String) -> AnyPublisher<AuthResponse, Error> {
        let body = ["email": email, "password": password]
        return post(URL(string: "\(baseURL)/auth/login")!, body: body)
    }

    func register(email: String, password: String, name: String?) -> AnyPublisher<AuthResponse, Error> {
        var body = ["email": email, "password": password]
        if let name = name {
            body["name"] = name
        }
        return post(URL(string: "\(baseURL)/auth/register")!, body: body)
    }

    // MARK: - Watchlist

    func fetchWatchlist(userId: String) -> AnyPublisher<[WatchlistItem], Error> {
        fetch(URL(string: "\(baseURL)/watchlist/\(userId)")!)
    }

    func addToWatchlist(userId: String, signalId: String) -> AnyPublisher<WatchlistItem, Error> {
        let body = ["userId": userId, "signalId": signalId]
        return post(URL(string: "\(baseURL)/watchlist")!, body: body)
    }

    // MARK: - Trades

    func fetchTrades(userId: String) -> AnyPublisher<TradesResponse, Error> {
        fetch(URL(string: "\(baseURL)/trades/\(userId)")!)
    }

    // MARK: - Metrics

    func fetchSystemMetrics(days: Int = 30) -> AnyPublisher<SystemMetrics, Error> {
        var components = URLComponents(string: "\(baseURL)/metrics/system")!
        components.queryItems = [URLQueryItem(name: "days", value: String(days))]
        return fetch(components.url!)
    }

    func fetchUserMetrics(userId: String, days: Int = 30) -> AnyPublisher<UserMetrics, Error> {
        var components = URLComponents(string: "\(baseURL)/metrics/user/\(userId)")!
        components.queryItems = [URLQueryItem(name: "days", value: String(days))]
        return fetch(components.url!)
    }

    // MARK: - Education

    func fetchEducationModules() -> AnyPublisher<[EducationModule], Error> {
        fetch(URL(string: "\(baseURL)/education/modules")!)
    }

    func fetchEducationModule(id: String) -> AnyPublisher<EducationModule, Error> {
        fetch(URL(string: "\(baseURL)/education/modules/\(id)")!)
    }

    func fetchGlossary() -> AnyPublisher<[GlossaryTerm], Error> {
        fetch(URL(string: "\(baseURL)/education/glossary")!)
    }

    // MARK: - Generic HTTP Methods

    private func fetch<T: Decodable>(_ url: URL) -> AnyPublisher<T, Error> {
        URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: T.self, decoder: jsonDecoder)
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }

    private func post<T: Decodable>(_ url: URL, body: [String: Any]) -> AnyPublisher<T, Error> {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        return URLSession.shared.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: T.self, decoder: jsonDecoder)
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }

    private var jsonDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}

// MARK: - Response Types

struct Quote: Codable {
    let ticker: String
    let price: Double
    let change: Double
    let changePercent: Double
    let volume: Int
    let high: Double
    let low: Double
    let open: Double
}

struct VIXData: Codable {
    let current: Double
    let change: Double
    let high: Double
    let low: Double
}

struct AuthResponse: Codable {
    let user: User
    let token: String
}

struct User: Codable {
    let id: String
    let email: String
    let name: String?
}

struct WatchlistItem: Codable {
    let id: String
    let userId: String
    let signalId: String
    let signal: Signal
    let createdAt: Date
}

struct TradesResponse: Codable {
    let trades: [UserTrade]
    let stats: PerformanceStats
}

struct SystemMetrics: Codable {
    let period: String
    let overall: OverallMetrics
    let byType: [String: TypeMetrics]
}

struct OverallMetrics: Codable {
    let total: Int
    let wins: Int
    let losses: Int
    let pending: Int
    let winRate: String
    let avgReturn: String
    let avgConfidence: String
    let avgRiskReward: String
}

struct TypeMetrics: Codable {
    let total: Int
    let wins: Int
    let losses: Int
    let winRate: String
}

struct UserMetrics: Codable {
    let period: String
    let totalTrades: Int
    let openTrades: Int
    let closedTrades: Int
    let wins: Int
    let losses: Int
    let winRate: String
    let totalPnl: String
    let avgPnl: String
    let currentStreak: String
}

struct EducationModule: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let difficulty: String
    let duration: String
    let topics: [String]
    let content: String?
}

struct GlossaryTerm: Codable, Identifiable {
    let id: String
    let term: String
    let definition: String
    let category: String
}
