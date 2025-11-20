'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Eye, Trash2, TrendingUp, TrendingDown, Bell, Folder, Settings } from 'lucide-react'
import { useSignalStore } from '@/store/signalStore'
import WatchlistFolderManagement from './WatchlistFolderManagement'

export default function WatchlistPanel() {
  const { watchlist, watchlistFolders, fetchWatchlistFolders, removeFromWatchlist } = useSignalStore()
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [showFolderManagement, setShowFolderManagement] = useState(false)

  useEffect(() => {
    fetchWatchlistFolders()
  }, [])

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
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{watchlist.length} signals</span>
          <button
            onClick={() => setShowFolderManagement(true)}
            className="p-2 hover:bg-surface-light rounded-lg transition-colors"
            title="Manage Folders"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Folder Chips */}
      {watchlistFolders.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedFolderId === null
                ? 'bg-primary text-white'
                : 'bg-surface-light text-gray-400 hover:bg-surface-lighter'
            }`}
          >
            All
          </button>
          {watchlistFolders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                selectedFolderId === folder.id
                  ? 'text-white'
                  : 'bg-surface-light hover:bg-surface-lighter'
              }`}
              style={{
                backgroundColor: selectedFolderId === folder.id ? folder.color || '#3B82F6' : undefined,
                color: selectedFolderId === folder.id ? 'white' : undefined,
              }}
            >
              <Folder size={14} />
              {folder.name}
              {folder.itemCount ? (
                <span className="px-1.5 py-0.5 rounded text-xs bg-black/20">
                  {folder.itemCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

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

      {/* Folder Management Modal */}
      <WatchlistFolderManagement
        isOpen={showFolderManagement}
        onClose={() => setShowFolderManagement(false)}
      />
    </div>
  )
}
