import SwiftUI

struct WatchlistView: View {
    @EnvironmentObject var signalStore: SignalStore
    @EnvironmentObject var authStore: AuthStore
    @State private var showingFolderManagement = false
    @State private var selectedFolderId: String?

    var body: some View {
        NavigationView {
            ZStack {
                Color("Background").ignoresSafeArea()

                if signalStore.watchlist.isEmpty {
                    EmptyStateView(
                        icon: "eye",
                        title: "Your Watchlist is Empty",
                        message: "Add signals to your watchlist to track them here. Click the + button on any signal card."
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            // Folders Section
                            if !signalStore.watchlistFolders.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text("Folders")
                                            .font(.headline)
                                            .foregroundColor(.gray)

                                        Spacer()

                                        Button {
                                            showingFolderManagement = true
                                        } label: {
                                            Text("Manage")
                                                .font(.subheadline)
                                                .foregroundColor(.blue)
                                        }
                                    }
                                    .padding(.horizontal)

                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 12) {
                                            ForEach(signalStore.watchlistFolders) { folder in
                                                FolderChip(folder: folder, isSelected: selectedFolderId == folder.id) {
                                                    selectedFolderId = folder.id
                                                }
                                            }

                                            // Clear filter
                                            if selectedFolderId != nil {
                                                Button {
                                                    selectedFolderId = nil
                                                } label: {
                                                    HStack {
                                                        Image(systemName: "xmark.circle.fill")
                                                        Text("Clear")
                                                    }
                                                    .font(.subheadline)
                                                    .foregroundColor(.gray)
                                                    .padding(.horizontal, 12)
                                                    .padding(.vertical, 8)
                                                    .background(Color("SurfaceLight"))
                                                    .cornerRadius(20)
                                                }
                                            }
                                        }
                                        .padding(.horizontal)
                                    }
                                }
                            }

                            // Watchlist Items
                            ForEach(signalStore.watchlist) { signal in
                                WatchlistItemView(signal: signal)
                            }
                        }
                        .padding(.vertical)
                    }
                }
            }
            .navigationTitle("Watchlist")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingFolderManagement = true
                    } label: {
                        Image(systemName: "folder")
                    }
                }
            }
            .sheet(isPresented: $showingFolderManagement) {
                WatchlistFolderManagementView()
            }
            .onAppear {
                if let token = authStore.token {
                    signalStore.fetchWatchlistFolders(token: token)
                }
            }
        }
    }
}

struct FolderChip: View {
    let folder: WatchlistFolder
    let isSelected: Bool
    let onTap: () -> Void

    var folderColor: Color {
        if let colorHex = folder.color {
            return Color(hex: colorHex) ?? .blue
        }
        return .blue
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 6) {
                Image(systemName: "folder.fill")
                    .font(.caption)

                Text(folder.name)
                    .font(.subheadline)
                    .fontWeight(.medium)

                if let count = folder.itemCount, count > 0 {
                    Text("\(count)")
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(folderColor.opacity(0.3))
                        .cornerRadius(8)
                }
            }
            .foregroundColor(isSelected ? .white : folderColor)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? folderColor : folderColor.opacity(0.2))
            .cornerRadius(20)
        }
    }
}

struct WatchlistItemView: View {
    let signal: Signal
    @EnvironmentObject var signalStore: SignalStore

    private var isBullish: Bool { signal.direction == .call }

    var body: some View {
        VStack(spacing: 12) {
            // Header
            HStack {
                ZStack {
                    Circle()
                        .fill(isBullish ? Color("Bullish").opacity(0.2) : Color("Bearish").opacity(0.2))
                        .frame(width: 36, height: 36)

                    Image(systemName: isBullish ? "arrow.up.right" : "arrow.down.right")
                        .font(.caption)
                        .foregroundColor(isBullish ? Color("Bullish") : Color("Bearish"))
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(signal.ticker)
                            .font(.headline)
                            .fontWeight(.bold)

                        Text(signal.direction.rawValue)
                            .font(.caption2)
                            .fontWeight(.medium)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 2)
                            .background(isBullish ? Color("Bullish").opacity(0.2) : Color("Bearish").opacity(0.2))
                            .foregroundColor(isBullish ? Color("Bullish") : Color("Bearish"))
                            .cornerRadius(4)
                    }

                    Text("$\(Int(signal.strikePrice)) • \(signal.expirationDate.formatted(date: .abbreviated, time: .omitted))")
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(Int(signal.confidence))%")
                        .font(.headline)
                        .fontWeight(.bold)
                    Text("Confidence")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
            }

            // Metrics
            HStack(spacing: 6) {
                WatchlistMetric(label: "Entry", value: String(format: "$%.2f", signal.entryPrice))
                WatchlistMetric(label: "Stop", value: String(format: "$%.2f", signal.stopLoss), color: Color("Bearish"))
                WatchlistMetric(label: "Target", value: String(format: "$%.2f", signal.targetPrice), color: Color("Bullish"))
            }

            // Actions
            HStack {
                Button {
                    // Set alert
                } label: {
                    Image(systemName: "bell")
                        .font(.subheadline)
                        .padding(8)
                        .background(Color("SurfaceLight"))
                        .foregroundColor(.gray)
                        .cornerRadius(6)
                }

                Button {
                    signalStore.removeFromWatchlist(signal.id)
                } label: {
                    Image(systemName: "trash")
                        .font(.subheadline)
                        .padding(8)
                        .background(Color("SurfaceLight"))
                        .foregroundColor(Color("Bearish"))
                        .cornerRadius(6)
                }

                Spacer()

                Text("Added \(signal.createdAt.formatted(date: .abbreviated, time: .shortened))")
                    .font(.caption2)
                    .foregroundColor(.gray)
            }
        }
        .padding()
        .background(Color("Surface"))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color("Border"), lineWidth: 1)
        )
    }
}

struct WatchlistMetric: View {
    let label: String
    let value: String
    var color: Color = .white

    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundColor(.gray)
            Text(value)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(Color("SurfaceLight"))
        .cornerRadius(6)
    }
}
