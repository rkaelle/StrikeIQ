'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Target, Award, Clock,
  Eye, Trash2, Plus, BarChart3, Newspaper, LogOut
} from 'lucide-react'
import { authService, watchlistService, tradeService, metricsService, marketService } from '@/services/api'

interface UserMetrics {
  totalTrades: number
  wins: number
  losses: number
  winRate: string
  totalPnl: string
  avgPnl: string
  currentStreak: string
}

interface WatchlistItem {
  id: string
  signal: any
  createdAt: string
}

interface Trade {
  id: string
  ticker: string
  direction: string
  entryPrice: number
  exitPrice?: number
  pnl?: number
  status: string
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [metrics, setMetrics] = useState<UserMetrics | null>(null)
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    fetchUserData(currentUser.id)
  }, [router])

  const fetchUserData = async (userId: string) => {
    try {
      const [metricsData, watchlistData, tradesData, newsData] = await Promise.all([
        metricsService.getUser(userId, 30).catch(() => null),
        watchlistService.get(userId).catch(() => []),
        tradeService.get(userId).catch(() => ({ trades: [] })),
        marketService.getNews().catch(() => [])
      ])

      if (metricsData) setMetrics(metricsData)
      setWatchlist(watchlistData || [])
      setTrades(tradesData?.trades || [])
      setNews(newsData?.slice(0, 5) || [])
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    authService.logout()
    router.push('/login')
  }

  const removeFromWatchlist = async (id: string) => {
    try {
      await watchlistService.remove(id)
      setWatchlist(watchlist.filter(item => item.id !== id))
    } catch (error) {
      console.error('Error removing from watchlist:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm">Welcome back, {user?.name || user?.email}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              View Signals
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Performance Metrics */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Your Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface rounded-xl p-4 border border-gray-800"
            >
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm">Total Trades</span>
              </div>
              <p className="text-2xl font-bold text-white">{metrics?.totalTrades || 0}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface rounded-xl p-4 border border-gray-800"
            >
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Target className="w-4 h-4" />
                <span className="text-sm">Win Rate</span>
              </div>
              <p className="text-2xl font-bold text-bullish">{metrics?.winRate || '0'}%</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-surface rounded-xl p-4 border border-gray-800"
            >
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Total P&L</span>
              </div>
              <p className={`text-2xl font-bold ${parseFloat(metrics?.totalPnl || '0') >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                ${metrics?.totalPnl || '0'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-surface rounded-xl p-4 border border-gray-800"
            >
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Award className="w-4 h-4" />
                <span className="text-sm">Current Streak</span>
              </div>
              <p className="text-2xl font-bold text-primary">{metrics?.currentStreak || '0'}</p>
            </motion.div>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Watchlist */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Watchlist</h2>
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                <Plus className="w-4 h-4" />
                Add Signal
              </button>
            </div>
            <div className="bg-surface rounded-xl border border-gray-800 divide-y divide-gray-800">
              {watchlist.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No signals in watchlist</p>
                  <p className="text-sm">Add signals from the main page</p>
                </div>
              ) : (
                watchlist.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{item.signal?.ticker}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          item.signal?.direction === 'CALL' ? 'bg-bullish/20 text-bullish' : 'bg-bearish/20 text-bearish'
                        }`}>
                          {item.signal?.direction}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        ${item.signal?.strikePrice} • {item.signal?.confidence?.toFixed(0)}% conf
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromWatchlist(item.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Recent Trades */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Recent Trades</h2>
            <div className="bg-surface rounded-xl border border-gray-800 divide-y divide-gray-800">
              {trades.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No trades recorded</p>
                  <p className="text-sm">Accept signals to track trades</p>
                </div>
              ) : (
                trades.slice(0, 5).map((trade) => (
                  <div key={trade.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{trade.ticker}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          trade.direction === 'CALL' ? 'bg-bullish/20 text-bullish' : 'bg-bearish/20 text-bearish'
                        }`}>
                          {trade.direction}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Entry: ${trade.entryPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      {trade.pnl !== undefined ? (
                        <p className={`font-semibold ${trade.pnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </p>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500">
                          Open
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Market News */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Market News</h2>
          <div className="bg-surface rounded-xl border border-gray-800 divide-y divide-gray-800">
            {news.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No news available</p>
              </div>
            ) : (
              news.map((article, index) => (
                <a
                  key={index}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-white line-clamp-2">{article.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{article.source}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{article.ticker}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${
                      article.sentiment === 'POSITIVE' ? 'bg-bullish/20 text-bullish' :
                      article.sentiment === 'NEGATIVE' ? 'bg-bearish/20 text-bearish' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {article.sentiment}
                    </span>
                  </div>
                </a>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
