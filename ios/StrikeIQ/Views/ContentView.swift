import SwiftUI

struct ContentView: View {
    @EnvironmentObject var signalStore: SignalStore
    @EnvironmentObject var authStore: AuthStore
    @State private var selectedTab = 0

    var body: some View {
        Group {
            if authStore.isAuthenticated {
                TabView(selection: $selectedTab) {
                    SignalsView()
                        .tabItem {
                            Image(systemName: "bolt.fill")
                            Text("Signals")
                        }
                        .tag(0)

                    WatchlistView()
                        .tabItem {
                            Image(systemName: "list.bullet")
                            Text("Watchlist")
                        }
                        .tag(1)

                    PerformanceView()
                        .tabItem {
                            Image(systemName: "chart.line.uptrend.xyaxis")
                            Text("Performance")
                        }
                        .tag(2)

                    ProfileView()
                        .tabItem {
                            Image(systemName: "person.fill")
                            Text("Profile")
                        }
                        .tag(3)
                }
                .accentColor(Color("AppPrimary"))
            } else {
                LoginView()
            }
        }
    }
}

struct ProfileView: View {
    @EnvironmentObject var authStore: AuthStore

    var body: some View {
        NavigationView {
            List {
                Section {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 50))
                            .foregroundColor(Color("AppPrimary"))

                        VStack(alignment: .leading) {
                            Text(authStore.user?.name ?? "User")
                                .font(.headline)
                            Text(authStore.user?.email ?? "")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(.vertical, 8)
                }

                Section("Settings") {
                    NavigationLink(destination: Text("Notifications")) {
                        Label("Notifications", systemImage: "bell")
                    }
                    NavigationLink(destination: Text("Risk Settings")) {
                        Label("Risk Settings", systemImage: "shield")
                    }
                    NavigationLink(destination: Text("Appearance")) {
                        Label("Appearance", systemImage: "paintbrush")
                    }
                }

                Section("Support") {
                    NavigationLink(destination: EducationView()) {
                        Label("Education", systemImage: "book")
                    }
                    NavigationLink(destination: Text("Help")) {
                        Label("Help & FAQ", systemImage: "questionmark.circle")
                    }
                }

                Section {
                    Button(action: { authStore.logout() }) {
                        HStack {
                            Spacer()
                            Text("Sign Out")
                                .foregroundColor(.red)
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Profile")
        }
    }
}

struct SignalsView: View {
    @EnvironmentObject var signalStore: SignalStore
    @State private var showFilters = false

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    // Market Overview
                    MarketOverviewBar()

                    // Filters
                    FilterBar(showFilters: $showFilters)
                        .padding(.horizontal)

                    // Signals List
                    if signalStore.isLoading {
                        ProgressView()
                            .padding(.top, 40)
                    } else if signalStore.filteredSignals.isEmpty {
                        EmptyStateView(
                            icon: "bolt.slash",
                            title: "No Signals",
                            message: "No active signals match your filters"
                        )
                        .padding(.top, 40)
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(signalStore.filteredSignals) { signal in
                                SignalCardView(signal: signal)
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .background(Color("Background"))
            .navigationTitle("StrikeIQ")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showFilters.toggle() }) {
                        Image(systemName: "slider.horizontal.3")
                    }
                }
            }
        }
        .sheet(isPresented: $showFilters) {
            FiltersSheet()
        }
    }
}

struct MarketOverviewBar: View {
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 20) {
                MarketTicker(symbol: "SPY", price: 452.30, change: 0.54)
                MarketTicker(symbol: "QQQ", price: 382.15, change: 1.11)
                MarketTicker(symbol: "VIX", price: 18.50, change: -4.14)
                MarketTicker(symbol: "DIA", price: 385.60, change: 0.34)
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 12)
        .background(Color("Surface"))
    }
}

struct MarketTicker: View {
    let symbol: String
    let price: Double
    let change: Double

    var body: some View {
        HStack(spacing: 8) {
            Text(symbol)
                .font(.system(.subheadline, design: .monospaced))
                .fontWeight(.semibold)

            Text(String(format: "$%.2f", price))
                .font(.system(.subheadline, design: .monospaced))

            HStack(spacing: 2) {
                Image(systemName: change >= 0 ? "arrow.up" : "arrow.down")
                    .font(.caption2)
                Text(String(format: "%.2f%%", abs(change)))
                    .font(.caption)
            }
            .foregroundColor(change >= 0 ? Color("Bullish") : Color("Bearish"))
        }
    }
}

struct FilterBar: View {
    @Binding var showFilters: Bool
    @EnvironmentObject var signalStore: SignalStore

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(
                    label: signalStore.selectedSignalType?.displayName ?? "All Types",
                    isActive: signalStore.selectedSignalType != nil
                ) {
                    showFilters = true
                }

                FilterChip(
                    label: signalStore.selectedDirection?.rawValue ?? "All Directions",
                    isActive: signalStore.selectedDirection != nil
                ) {
                    showFilters = true
                }

                if signalStore.selectedSignalType != nil || signalStore.selectedDirection != nil {
                    Button("Clear") {
                        signalStore.clearFilters()
                    }
                    .font(.caption)
                    .foregroundColor(.gray)
                }
            }
        }
    }
}

struct FilterChip: View {
    let label: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.caption)
                .fontWeight(.medium)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isActive ? Color("AppPrimary") : Color("SurfaceLight"))
                .foregroundColor(isActive ? .black : .white)
                .cornerRadius(16)
        }
    }
}

struct FiltersSheet: View {
    @EnvironmentObject var signalStore: SignalStore
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            Form {
                Section("Signal Type") {
                    ForEach(Signal.SignalType.allCases, id: \.self) { type in
                        Button {
                            signalStore.selectedSignalType = signalStore.selectedSignalType == type ? nil : type
                        } label: {
                            HStack {
                                Text(type.displayName)
                                Spacer()
                                if signalStore.selectedSignalType == type {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(Color("AppPrimary"))
                                }
                            }
                        }
                        .foregroundColor(.white)
                    }
                }

                Section("Direction") {
                    Button {
                        signalStore.selectedDirection = signalStore.selectedDirection == .call ? nil : .call
                    } label: {
                        HStack {
                            Text("CALL")
                            Spacer()
                            if signalStore.selectedDirection == .call {
                                Image(systemName: "checkmark")
                                    .foregroundColor(Color("Bullish"))
                            }
                        }
                    }
                    .foregroundColor(.white)

                    Button {
                        signalStore.selectedDirection = signalStore.selectedDirection == .put ? nil : .put
                    } label: {
                        HStack {
                            Text("PUT")
                            Spacer()
                            if signalStore.selectedDirection == .put {
                                Image(systemName: "checkmark")
                                    .foregroundColor(Color("Bearish"))
                            }
                        }
                    }
                    .foregroundColor(.white)
                }

                Section("Minimum Confidence") {
                    Slider(value: $signalStore.minConfidence, in: 0...90, step: 10)
                    Text("\(Int(signalStore.minConfidence))%")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(.gray)
            Text(title)
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}
