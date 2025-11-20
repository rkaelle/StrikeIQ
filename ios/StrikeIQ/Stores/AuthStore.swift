import Foundation
import Combine

class AuthStore: ObservableObject {
    @Published var isAuthenticated = false
    @Published var user: AppUser?
    @Published var isLoading = false
    @Published var error: String?

    var token: String? {
        UserDefaults.standard.string(forKey: "strikeiq-token")
    }

    private var cancellables = Set<AnyCancellable>()
    private let apiService = APIService.shared

    init() {
        checkAuthentication()
    }

    func checkAuthentication() {
        // Check for saved token
        if let token = UserDefaults.standard.string(forKey: "strikeiq-token"),
           let userData = UserDefaults.standard.data(forKey: "strikeiq-user"),
           let user = try? JSONDecoder().decode(AppUser.self, from: userData) {
            self.user = user
            self.isAuthenticated = true
        }
    }

    func login(email: String, password: String) {
        isLoading = true
        error = nil

        apiService.login(email: email, password: password)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    if case .failure(let err) = completion {
                        self?.error = "Invalid email or password"
                        print("Login error: \(err)")
                    }
                },
                receiveValue: { [weak self] response in
                    self?.saveAuth(response)
                }
            )
            .store(in: &cancellables)
    }

    func register(email: String, password: String, name: String?) {
        isLoading = true
        error = nil

        apiService.register(email: email, password: password, name: name)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    if case .failure(let err) = completion {
                        self?.error = "Failed to create account"
                        print("Register error: \(err)")
                    }
                },
                receiveValue: { [weak self] response in
                    self?.saveAuth(response)
                }
            )
            .store(in: &cancellables)
    }

    private func saveAuth(_ response: AuthResponse) {
        // Save to UserDefaults
        UserDefaults.standard.set(response.token, forKey: "strikeiq-token")
        if let userData = try? JSONEncoder().encode(AppUser(id: response.user.id, email: response.user.email, name: response.user.name)) {
            UserDefaults.standard.set(userData, forKey: "strikeiq-user")
        }

        user = AppUser(id: response.user.id, email: response.user.email, name: response.user.name)
        isAuthenticated = true
    }

    func logout() {
        UserDefaults.standard.removeObject(forKey: "strikeiq-token")
        UserDefaults.standard.removeObject(forKey: "strikeiq-user")
        user = nil
        isAuthenticated = false
    }
}

struct AppUser: Codable {
    let id: String
    let email: String
    let name: String?
}
