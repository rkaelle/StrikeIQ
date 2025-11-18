'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Eye, Trash2, TrendingUp, TrendingDown, Bell, BellOff } from 'lucide-react'
import { useSignalStore } from '@/store/signalStore'

export default function WatchlistPanel() {
  const { watchlist, removeFromWatchlist } = useSignalStore()

  if (watchlist.length === 0) {
    return (
      <div className="bg-surface rounded-lg border border-border p-8 text-center">
        <Eye size={48} className="mx-auto text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Your Watchlist is Empty</h3>
        <p className="text-gray-400 text-sm">
          Add signals to your watchlist to track them here.
          Click the + button on any signal card to add it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Watchlist</h2>
        <span className="text-sm text-gray-400">{watchlist.length} signals</span>
      </div>

      <AnimatePresence>
        {watchlist.map((signal) => (
          <motion.div
            key={signal.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-surface rounded-lg border border-border p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  signal.direction === 'CALL' ? 'bg-bullish/20' : 'bg-bearish/20'
                }`}>
                  {signal.direction === 'CALL' ? (
                    <TrendingUp className="text-bullish" size={18} />
                  ) : (
                    <TrendingDown className="text-bearish" size={18} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{signal.ticker}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      signal.direction === 'CALL'
                        ? 'bg-bullish/20 text-bullish'
                        : 'bg-bearish/20 text-bearish'
                    }`}>
                      {signal.direction}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    ${signal.strikePrice} • {format(new Date(signal.expirationDate), 'MMM d')}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold">{signal.confidence.toFixed(0)}%</div>
                <div className="text-xs text-gray-400">Confidence</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
              <div className="bg-surface-light rounded p-2 text-center">
                <div className="text-xs text-gray-400">Entry</div>
                <div>${signal.entryPrice.toFixed(2)}</div>
              </div>
              <div className="bg-surface-light rounded p-2 text-center">
                <div className="text-xs text-gray-400">Stop</div>
                <div className="text-bearish">${signal.stopLoss.toFixed(2)}</div>
              </div>
              <div className="bg-surface-light rounded p-2 text-center">
                <div className="text-xs text-gray-400">Target</div>
                <div className="text-bullish">${signal.targetPrice.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div className="flex gap-2">
                <button className="p-2 text-gray-400 hover:text-white hover:bg-surface-light rounded transition-colors">
                  <Bell size={16} />
                </button>
                <button
                  onClick={() => removeFromWatchlist(signal.id)}
                  className="p-2 text-gray-400 hover:text-bearish hover:bg-surface-light rounded transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <span className="text-xs text-gray-400">
                Added {format(new Date(signal.createdAt), 'MMM d, HH:mm')}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
