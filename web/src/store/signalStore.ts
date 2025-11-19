import { create } from 'zustand'
import { signalService, watchlistService, metricsService, initializeWebSocket, authService } from '@/services/api'

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

interface SignalStore {
  signals: Signal[]
  watchlist: Signal[]
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
}

export const useSignalStore = create<SignalStore>((set, get) => ({
  signals: [],
  watchlist: [],
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
  }
}))

// Mock data generator for development/fallback
function generateMockSignals(): Signal[] {
  const tickers = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'AMD', 'AMZN', 'META']
  const signalTypes = ['0DTE', 'WEEKLY', 'EARNINGS', 'DARK_POOL', 'NEWS']
  const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME']

  return Array.from({ length: 8 }, (_, i) => {
    const ticker = tickers[Math.floor(Math.random() * tickers.length)]
    const direction: 'CALL' | 'PUT' = Math.random() > 0.5 ? 'CALL' : 'PUT'
    const confidence = 50 + Math.floor(Math.random() * 40)
    const basePrice: Record<string, number> = {
      'SPY': 450, 'QQQ': 380, 'AAPL': 175, 'TSLA': 250,
      'NVDA': 500, 'AMD': 120, 'AMZN': 180, 'META': 350
    }

    const strikePrice = Math.round((basePrice[ticker] || 100) / 5) * 5 + (direction === 'CALL' ? 5 : -5)
    const entryPrice = 2 + Math.random() * 8
    const stopLoss = entryPrice * 0.5
    const targetPrice = entryPrice * 1.5

    return {
      id: `signal-${i + 1}`,
      ticker,
      signalType: signalTypes[Math.floor(Math.random() * signalTypes.length)],
      direction,
      strikePrice,
      expirationDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      entryPrice,
      stopLoss,
      targetPrice,
      confidence,
      flowScore: 40 + Math.random() * 50,
      volumeScore: 40 + Math.random() * 50,
      oiScore: 40 + Math.random() * 50,
      technicalScore: 40 + Math.random() * 50,
      sentimentScore: 40 + Math.random() * 50,
      volatilityScore: 40 + Math.random() * 50,
      riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
      maxLoss: entryPrice - stopLoss,
      potentialGain: targetPrice - entryPrice,
      riskReward: (targetPrice - entryPrice) / (entryPrice - stopLoss),
      reasoning: `Strong ${direction.toLowerCase()} flow detected with ${confidence}% confidence. Technical indicators align with entry point.`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      isActive: true
    }
  })
}
