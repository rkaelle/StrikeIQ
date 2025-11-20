import Foundation
import Combine

class WebSocketService: ObservableObject {
    static let shared = WebSocketService()

    // Configure for production: use wss:// and your backend domain
    #if DEBUG
    private let wsURL = "ws://localhost:3001"
    #else
    private let wsURL = "wss://strikeiq-backend.onrender.com"  // Update with your production WebSocket URL
    #endif

    private var webSocketTask: URLSessionWebSocketTask?
    private var cancellables = Set<AnyCancellable>()

    @Published var isConnected = false
    @Published var lastSignal: Signal?

    let signalReceived = PassthroughSubject<Signal, Never>()

    private init() {}

    func connect() {
        guard let url = URL(string: wsURL) else { return }

        let session = URLSession(configuration: .default)
        webSocketTask = session.webSocketTask(with: url)
        webSocketTask?.resume()

        isConnected = true
        receiveMessage()
    }

    func disconnect() {
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
        webSocketTask = nil
        isConnected = false
    }

    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self?.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self?.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                // Continue listening for messages
                self?.receiveMessage()

            case .failure(let error):
                print("WebSocket error: \(error)")
                DispatchQueue.main.async {
                    self?.isConnected = false
                }
                // Attempt to reconnect after delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                    self?.connect()
                }
            }
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }

        do {
            // Try to decode as a WebSocket message envelope
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601

            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let eventType = json["event"] as? String {

                switch eventType {
                case "newSignal":
                    if let signalData = json["data"],
                       let signalJson = try? JSONSerialization.data(withJSONObject: signalData),
                       let signal = try? decoder.decode(Signal.self, from: signalJson) {
                        DispatchQueue.main.async {
                            self.lastSignal = signal
                            self.signalReceived.send(signal)
                        }
                    }

                case "signalUpdate":
                    if let signalData = json["data"],
                       let signalJson = try? JSONSerialization.data(withJSONObject: signalData),
                       let signal = try? decoder.decode(Signal.self, from: signalJson) {
                        DispatchQueue.main.async {
                            self.lastSignal = signal
                            self.signalReceived.send(signal)
                        }
                    }

                default:
                    break
                }
            }
        } catch {
            print("Failed to decode WebSocket message: \(error)")
        }
    }

    func send(_ message: String) {
        webSocketTask?.send(.string(message)) { error in
            if let error = error {
                print("WebSocket send error: \(error)")
            }
        }
    }
}
