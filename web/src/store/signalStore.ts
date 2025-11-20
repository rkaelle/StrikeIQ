import { create } from 'zustand'
import { signalService, watchlistService, watchlistFolderService, metricsService, initializeWebSocket, authService } from '@/services/api'

export interface Signal {
  id: string
  ticker: string
  signalType: string
  direction: 'CALL' | 'PUT'
  strikePrice: number
  expirationDate: string
  entryPrice: number
  stopLoss: number
  targetPrice: number
  confidence: number
  flowScore: number
  volumeScore: number
  oiScore: number
  technicalScore: number
  sentimentScore: number
  volatilityScore: number
  riskLevel: string
  maxLoss: number
  potentialGain: number
  riskReward: number
  reasoning: string
  createdAt: string
  expiresAt: string
  isActive: boolean
  accuracy?: {
    outcome: string
    actualReturn?: number
  }
}

interface Filters {
  signalType: string | null
  direction: string | null
  minConfidence: number
  ticker: string | null
}

interface SystemMetrics {
  period: string
  overall: {
    total: number
    wins: number
    losses: number
    pending: number
    winRate: string
    avgReturn: string
    avgConfidence: string
    avgRiskReward: string
  }
  byType: Record<string, { total: number; wins: number; losses: number; winRate: string }>
}

export interface WatchlistFolder {
  id: string
  userId: string
  name: string
  color?: string
  order: number
  createdAt: string
  updatedAt: string
  itemCount?: number
}

interface SignalStore {
  signals: Signal[]
  watchlist: Signal[]
  activatedSignals: Set<string>
  watchlistFolders: WatchlistFolder[]
  isLoading: boolean
  error: string | null
  filters: Filters
  metrics: SystemMetrics | null
  wsConnected: boolean

  // Actions
  setFilters: (filters: Partial<Filters>) => void
  fetchSignals: () => Promise<void>
  fetchWatchlist: () => Promise<void>
  fetchMetrics: (days?: number) => Promise<void>
  addToWatchlist: (signal: Signal) => void
  removeFromWatchlist: (signalId: string) => void
  acceptSignal: (signal: Signal) => void
  rejectSignal: (signalId: string) => void
  initWebSocket: () => void
  addSignal: (signal: Signal) => void
  isSignalActivated: (signalId: string) => boolean
  activateSignal: (signalId: string) => Promise<void>
  deactivateSignal: (signalId: string) => Promise<void>
  toggleActivation: (signalId: string) => Promise<void>
  fetchActivatedSignals: () => Promise<void>

  // Watchlist folders
  fetchWatchlistFolders: () => Promise<void>
  createFolder: (name: string, color?: string) => Promise<void>
  updateFolder: (id: string, name?: string, color?: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  moveToFolder: (folderId: string, watchlistItemId: string) => Promise<void>
}

export const useSignalStore = create<SignalStore>((set, get) => ({
  signals: [],
  watchlist: [],
  activatedSignals: new Set<string>(),
  watchlistFolders: [],
  isLoading: false,
  error: null,
  metrics: null,
  wsConnected: false,
  filters: {
    signalType: null,
    direction: null,
    minConfidence: 0,
    ticker: null
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }))
    get().fetchSignals()
  },

  fetchSignals: async () => {
    set({ isLoading: true, error: null })
    try {
      const { filters } = get()
      const params: any = {}

      if (filters.signalType) params.type = filters.signalType
      if (filters.direction) params.direction = filters.direction
      if (filters.minConfidence) params.minConfidence = filters.minConfidence
      if (filters.ticker) params.ticker = filters.ticker

      const signals = await signalService.getAll(params)
      set({ signals, isLoading: false })
    } catch (error) {
      console.error('Error fetching signals:', error)
      // Fallback to mock data if backend is not available
      set({
        signals: generateMockSignals(),
        isLoading: false,
        error: 'Using demo data - backend not connected'
      })
    }
  },

  fetchWatchlist: async () => {
    try {
      const user = authService.getCurrentUser()
      if (!user) return

      const watchlistData = await watchlistService.get(user.id)
      const signals = watchlistData.map((item: any) => item.signal)
      set({ watchlist: signals })
    } catch (error) {
      console.error('Error fetching watchlist:', error)
    }
  },

  fetchMetrics: async (days = 30) => {
    try {
      const metrics = await metricsService.getSystem(days)
      set({ metrics })
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  },

  addToWatchlist: async (signal) => {
    try {
      const user = authService.getCurrentUser()
      if (user) {
        await watchlistService.add(user.id, signal.id)
      }
      set((state) => ({
        watchlist: [...state.watchlist, signal]
      }))
    } catch (error) {
      console.error('Error adding to watchlist:', error)
      // Still add locally even if API fails
      set((state) => ({
        watchlist: [...state.watchlist, signal]
      }))
    }
  },

  removeFromWatchlist: async (signalId) => {
    try {
      // In a real app, we'd need the watchlist item ID
      set((state) => ({
        watchlist: state.watchlist.filter(s => s.id !== signalId)
      }))
    } catch (error) {
      console.error('Error removing from watchlist:', error)
    }
  },

  acceptSignal: (signal) => {
    // Record that user accepted this signal
    console.log('Signal accepted:', signal.id)
    // Could create a trade record here
  },

  rejectSignal: (signalId) => {
    set((state) => ({
      signals: state.signals.filter(s => s.id !== signalId)
    }))
  },

  initWebSocket: () => {
    initializeWebSocket((signal: Signal) => {
      get().addSignal(signal)
    })
    set({ wsConnected: true })
  },

  addSignal: (signal) => {
    set((state) => ({
      signals: [signal, ...state.signals]
    }))
  },

  isSignalActivated: (signalId) => {
    return get().activatedSignals.has(signalId)
  },

  activateSignal: async (signalId) => {
    try {
      await signalService.activate(signalId)
      set((state) => ({
        activatedSignals: new Set(state.activatedSignals).add(signalId)
      }))
    } catch (error) {
      console.error('Error activating signal:', error)
    }
  },

  deactivateSignal: async (signalId) => {
    try {
      await signalService.deactivate(signalId)
      set((state) => {
        const newActivated = new Set(state.activatedSignals)
        newActivated.delete(signalId)
        return { activatedSignals: newActivated }
      })
    } catch (error) {
      console.error('Error deactivating signal:', error)
    }
  },

  toggleActivation: async (signalId) => {
    if (get().isSignalActivated(signalId)) {
      await get().deactivateSignal(signalId)
    } else {
      await get().activateSignal(signalId)
    }
  },

  fetchActivatedSignals: async () => {
    try {
      const activatedSignals = await signalService.getActivated()
      const signalIds = new Set(activatedSignals.map((s: Signal) => s.id))
      set({ activatedSignals: signalIds })
    } catch (error) {
      console.error('Error fetching activated signals:', error)
    }
  },

  fetchWatchlistFolders: async () => {
    try {
      const folders = await watchlistFolderService.getAll()
      set({ watchlistFolders: folders })
    } catch (error) {
      console.error('Error fetching watchlist folders:', error)
    }
  },

  createFolder: async (name: string, color?: string) => {
    try {
      const response = await watchlistFolderService.create(name, color)
      set((state) => ({
        watchlistFolders: [...state.watchlistFolders, response.folder].sort((a, b) => a.order - b.order)
      }))
    } catch (error) {
      console.error('Error creating folder:', error)
    }
  },

  updateFolder: async (id: string, name?: string, color?: string) => {
    try {
      const response = await watchlistFolderService.update(id, { name, color })
      set((state) => ({
        watchlistFolders: state.watchlistFolders.map((f) =>
          f.id === id ? response.folder : f
        )
      }))
    } catch (error) {
      console.error('Error updating folder:', error)
    }
  },

  deleteFolder: async (id: string) => {
    try {
      await watchlistFolderService.delete(id)
      set((state) => ({
        watchlistFolders: state.watchlistFolders.filter((f) => f.id !== id)
      }))
    } catch (error) {
      console.error('Error deleting folder:', error)
    }
  },

  moveToFolder: async (folderId: string, watchlistItemId: string) => {
    try {
      await watchlistFolderService.moveItem(folderId, watchlistItemId)
      // Refresh folders to update item counts
      get().fetchWatchlistFolders()
    } catch (error) {
      console.error('Error moving item to folder:', error)
    }
  }
}))

// Empty fallback - returns empty array when backend is unavailable
function generateMockSignals(): Signal[] {
  return []
}
