import SwiftUI

struct WatchlistFolderManagementView: View {
    @EnvironmentObject var signalStore: SignalStore
    @EnvironmentObject var authStore: AuthStore
    @Environment(\.dismiss) var dismiss
    @State private var showingCreateFolder = false
    @State private var folderToEdit: WatchlistFolder?

    var body: some View {
        NavigationView {
            ZStack {
                Color("Background").ignoresSafeArea()

                if signalStore.watchlistFolders.isEmpty {
                    EmptyStateView(
                        icon: "folder",
                        title: "No Folders Yet",
                        message: "Create folders to organize your watchlist signals."
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(signalStore.watchlistFolders) { folder in
                                FolderRow(folder: folder, onEdit: {
                                    folderToEdit = folder
                                })
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Manage Folders")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingCreateFolder = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingCreateFolder) {
                CreateFolderSheet()
            }
            .sheet(item: $folderToEdit) { folder in
                EditFolderSheet(folder: folder)
            }
            .onAppear {
                if let token = authStore.token {
                    signalStore.fetchWatchlistFolders(token: token)
                }
            }
        }
    }
}

struct FolderRow: View {
    let folder: WatchlistFolder
    let onEdit: () -> Void
    @EnvironmentObject var signalStore: SignalStore
    @EnvironmentObject var authStore: AuthStore
    @State private var showingDeleteAlert = false

    var folderColor: Color {
        if let colorHex = folder.color {
            return Color(hex: colorHex) ?? .blue
        }
        return .blue
    }

    var body: some View {
        HStack(spacing: 12) {
            // Folder icon with color
            ZStack {
                Circle()
                    .fill(folderColor.opacity(0.2))
                    .frame(width: 40, height: 40)

                Image(systemName: "folder.fill")
                    .font(.system(size: 16))
                    .foregroundColor(folderColor)
            }

            // Folder info
            VStack(alignment: .leading, spacing: 2) {
                Text(folder.name)
                    .font(.headline)

                if let count = folder.itemCount {
                    Text("\(count) signal\(count == 1 ? "" : "s")")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }

            Spacer()

            // Actions
            HStack(spacing: 8) {
                Button {
                    onEdit()
                } label: {
                    Image(systemName: "pencil")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                        .padding(8)
                        .background(Color("SurfaceLight"))
                        .cornerRadius(6)
                }

                Button {
                    showingDeleteAlert = true
                } label: {
                    Image(systemName: "trash")
                        .font(.subheadline)
                        .foregroundColor(Color("Bearish"))
                        .padding(8)
                        .background(Color("SurfaceLight"))
                        .cornerRadius(6)
                }
            }
        }
        .padding()
        .background(Color("Surface"))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color("Border"), lineWidth: 1)
        )
        .alert("Delete Folder", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                if let token = authStore.token {
                    signalStore.deleteFolder(id: folder.id, token: token)
                }
            }
        } message: {
            Text("Are you sure you want to delete '\(folder.name)'? Signals in this folder will be moved to 'Uncategorized'.")
        }
    }
}

struct CreateFolderSheet: View {
    @EnvironmentObject var signalStore: SignalStore
    @EnvironmentObject var authStore: AuthStore
    @Environment(\.dismiss) var dismiss
    @State private var folderName = ""
    @State private var selectedColor: String?

    let colorOptions = [
        "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
        "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"
    ]

    var body: some View {
        NavigationView {
            Form {
                Section("Folder Name") {
                    TextField("Enter folder name", text: $folderName)
                }

                Section("Color (Optional)") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(colorOptions, id: \.self) { colorHex in
                                Button {
                                    selectedColor = colorHex
                                } label: {
                                    ZStack {
                                        Circle()
                                            .fill(Color(hex: colorHex) ?? .blue)
                                            .frame(width: 44, height: 44)

                                        if selectedColor == colorHex {
                                            Image(systemName: "checkmark")
                                                .foregroundColor(.white)
                                                .font(.headline)
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            .navigationTitle("Create Folder")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Create") {
                        createFolder()
                    }
                    .disabled(folderName.isEmpty)
                }
            }
        }
    }

    private func createFolder() {
        guard let token = authStore.token else { return }
        signalStore.createFolder(name: folderName, color: selectedColor, token: token)
        dismiss()
    }
}

struct EditFolderSheet: View {
    let folder: WatchlistFolder
    @EnvironmentObject var signalStore: SignalStore
    @EnvironmentObject var authStore: AuthStore
    @Environment(\.dismiss) var dismiss
    @State private var folderName: String
    @State private var selectedColor: String?

    let colorOptions = [
        "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
        "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"
    ]

    init(folder: WatchlistFolder) {
        self.folder = folder
        _folderName = State(initialValue: folder.name)
        _selectedColor = State(initialValue: folder.color)
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Folder Name") {
                    TextField("Enter folder name", text: $folderName)
                }

                Section("Color") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(colorOptions, id: \.self) { colorHex in
                                Button {
                                    selectedColor = colorHex
                                } label: {
                                    ZStack {
                                        Circle()
                                            .fill(Color(hex: colorHex) ?? .blue)
                                            .frame(width: 44, height: 44)

                                        if selectedColor == colorHex {
                                            Image(systemName: "checkmark")
                                                .foregroundColor(.white)
                                                .font(.headline)
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
            }
            .navigationTitle("Edit Folder")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        updateFolder()
                    }
                    .disabled(folderName.isEmpty)
                }
            }
        }
    }

    private func updateFolder() {
        guard let token = authStore.token else { return }
        signalStore.updateFolder(
            id: folder.id,
            name: folderName != folder.name ? folderName : nil,
            color: selectedColor != folder.color ? selectedColor : nil,
            token: token
        )
        dismiss()
    }
}

// Color extension to support hex colors
extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0

        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }

        self.init(
            red: Double((rgb & 0xFF0000) >> 16) / 255.0,
            green: Double((rgb & 0x00FF00) >> 8) / 255.0,
            blue: Double(rgb & 0x0000FF) / 255.0
        )
    }
}
