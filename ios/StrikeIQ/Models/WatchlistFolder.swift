import Foundation

struct WatchlistFolder: Codable, Identifiable {
    let id: String
    let userId: String
    let name: String
    let color: String?
    let order: Int
    let createdAt: Date
    let updatedAt: Date

    // For local UI state
    var itemCount: Int?
}

struct WatchlistFolderResponse: Codable {
    let folders: [WatchlistFolderWithCount]
}

struct WatchlistFolderWithCount: Codable {
    let id: String
    let userId: String
    let name: String
    let color: String?
    let order: Int
    let createdAt: Date
    let updatedAt: Date
    let itemCount: Int

    var asFolder: WatchlistFolder {
        WatchlistFolder(
            id: id,
            userId: userId,
            name: name,
            color: color,
            order: order,
            createdAt: createdAt,
            updatedAt: updatedAt,
            itemCount: itemCount
        )
    }
}

struct WatchlistFolderDetailResponse: Codable {
    let folder: WatchlistFolderWithCount
    let items: [WatchlistItemWithSignal]
}

struct WatchlistItemWithSignal: Codable, Identifiable {
    let id: String
    let userId: String
    let signalId: String
    let folderId: String?
    let signal: Signal
    let createdAt: Date
}

struct CreateFolderRequest: Codable {
    let name: String
    let color: String?
}

struct UpdateFolderRequest: Codable {
    let name: String?
    let color: String?
}

struct ReorderFoldersRequest: Codable {
    let folders: [FolderOrder]
}

struct FolderOrder: Codable {
    let id: String
    let order: Int
}

struct MoveToFolderRequest: Codable {
    let watchlistItemId: String
}

struct WatchlistFolderCreateResponse: Codable {
    let message: String
    let folder: WatchlistFolderWithCount
}

struct WatchlistFolderUpdateResponse: Codable {
    let message: String
    let folder: WatchlistFolderWithCount
}
