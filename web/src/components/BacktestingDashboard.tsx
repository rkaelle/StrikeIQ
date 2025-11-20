'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlayCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  DollarSign,
  BarChart3,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface BacktestRun {
  id: string
  name: string
  description?: string
  startDate: string
  endDate: string
  initialCapital: number
  positionSize: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalReturn: number
  totalPnL: number
  avgReturn: number
  maxDrawdown: number
  sharpeRatio: number
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  completedAt?: string
}

interface BacktestTrade {
  id: string
  ticker: string
  signalType: string
  direction: string
  entryPrice: number
  exitPrice: number
  entryDate: string
  exitDate: string
  pnl: number
  returnPercent: number
  outcome: string
}

export default function BacktestingDashboard() {
  const [runs, setRuns] = useState<BacktestRun[]>([])
  const [selectedRun, setSelectedRun] = useState<BacktestRun | null>(null)
  const [trades, setTrades] = useState<BacktestTrade[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBacktestRuns()
  }, [])

  const fetchBacktestRuns = async () => {
    try {
      const token = localStorage.getItem('strikeiq-token')
      const response = await fetch('http://localhost:3001/api/backtesting?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      setRuns(data.runs || [])
    } catch (error) {
      console.error('Error fetching backtest runs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBacktestDetails = async (id: string) => {
    try {
      const token = localStorage.getItem('strikeiq-token')
      const response = await fetch(`http://localhost:3001/api/backtesting/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      setSelectedRun(data)
      setTrades(data.trades || [])
    } catch (error) {
      console.error('Error fetching backtest details:', error)
    }
  }

  const deleteBacktest = async (id: string) => {
    try {
      const token = localStorage.getItem('strikeiq-token')
      await fetch(`http://localhost:3001/api/backtesting/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      setRuns(runs.filter(r => r.id !== id))
      if (selectedRun?.id === id) {
        setSelectedRun(null)
        setTrades([])
      }
    } catch (error) {
      console.error('Error deleting backtest:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-surface-light rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-surface-light rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Backtesting Lab</h1>
            <p className="text-gray-400 mt-1">
              Test your strategies against historical data
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlayCircle size={20} />
            New Backtest
          </button>
        </div>

        {/* Summary Cards */}
        {runs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              icon={<BarChart3 className="text-blue-500" />}
              label="Total Backtests"
              value={runs.length.toString()}
            />
            <SummaryCard
              icon={<TrendingUp className="text-bullish" />}
              label="Avg Win Rate"
              value={`${(runs.reduce((sum, r) => sum + (r.winRate || 0), 0) / runs.length).toFixed(1)}%`}
            />
            <SummaryCard
              icon={<DollarSign className="text-green-500" />}
              label="Best Return"
              value={`${Math.max(...runs.map(r => r.totalReturn || 0)).toFixed(1)}%`}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Backtest List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-xl font-bold">Backtest Runs</h2>
            {runs.length === 0 ? (
              <div className="bg-surface rounded-lg border border-border p-8 text-center">
                <Activity size={48} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">No backtests yet</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 text-primary hover:underline"
                >
                  Create your first backtest
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {runs.map((run) => (
                  <BacktestRunCard
                    key={run.id}
                    run={run}
                    isSelected={selectedRun?.id === run.id}
                    onClick={() => fetchBacktestDetails(run.id)}
                    onDelete={() => deleteBacktest(run.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-2">
            {selectedRun ? (
              <BacktestDetails run={selectedRun} trades={trades} />
            ) : (
              <div className="bg-surface rounded-lg border border-border p-12 text-center">
                <Eye size={64} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">
                  Select a backtest to view details
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Create Backtest Modal */}
        <AnimatePresence>
          {showCreateForm && (
            <CreateBacktestModal
              onClose={() => setShowCreateForm(false)}
              onSuccess={() => {
                setShowCreateForm(false)
                fetchBacktestRuns()
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-surface-light rounded-lg">{icon}</div>
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}

function BacktestRunCard({
  run,
  isSelected,
  onClick,
  onDelete
}: {
  run: BacktestRun
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={`bg-surface rounded-lg border p-4 cursor-pointer transition-all ${
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold">{run.name}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-1 hover:bg-surface-light rounded text-bearish"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className={`flex items-center gap-1 ${run.totalReturn >= 0 ? 'text-bullish' : 'text-bearish'}`}>
          {run.totalReturn >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {run.totalReturn?.toFixed(1)}%
        </div>
        <div className="text-gray-400">{run.totalTrades} trades</div>
        <div className="text-gray-400">{run.winRate?.toFixed(0)}% WR</div>
      </div>

      <div className={`mt-2 text-xs px-2 py-1 rounded inline-block ${
        run.status === 'COMPLETED' ? 'bg-bullish/20 text-bullish' :
        run.status === 'RUNNING' ? 'bg-blue-500/20 text-blue-500' :
        run.status === 'FAILED' ? 'bg-bearish/20 text-bearish' :
        'bg-gray-500/20 text-gray-400'
      }`}>
        {run.status}
      </div>
    </div>
  )
}

function BacktestDetails({ run, trades }: { run: BacktestRun; trades: BacktestTrade[] }) {
  const [showAllTrades, setShowAllTrades] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface rounded-lg border border-border p-6">
        <h2 className="text-2xl font-bold mb-2">{run.name}</h2>
        {run.description && <p className="text-gray-400 mb-4">{run.description}</p>}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Period:</span>
            <span className="ml-2">
              {new Date(run.startDate).toLocaleDateString()} - {new Date(run.endDate).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Capital:</span>
            <span className="ml-2">${run.initialCapital.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Win Rate" value={`${run.winRate?.toFixed(1)}%`} positive={run.winRate >= 50} />
        <MetricCard label="Total Return" value={`${run.totalReturn?.toFixed(1)}%`} positive={run.totalReturn >= 0} />
        <MetricCard label="Total P&L" value={`$${run.totalPnL?.toFixed(2)}`} positive={run.totalPnL >= 0} />
        <MetricCard label="Sharpe Ratio" value={run.sharpeRatio?.toFixed(2)} />
        <MetricCard label="Avg Return" value={`${run.avgReturn?.toFixed(2)}%`} positive={run.avgReturn >= 0} />
        <MetricCard label="Max Drawdown" value={`${run.maxDrawdown?.toFixed(1)}%`} positive={false} />
        <MetricCard label="Winning Trades" value={run.winningTrades.toString()} />
        <MetricCard label="Losing Trades" value={run.losingTrades.toString()} />
      </div>

      {/* Trades List */}
      <div className="bg-surface rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Trade History</h3>
          <span className="text-sm text-gray-400">{trades.length} trades</span>
        </div>

        <div className="space-y-2">
          {trades.slice(0, showAllTrades ? trades.length : 10).map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))}
        </div>

        {trades.length > 10 && (
          <button
            onClick={() => setShowAllTrades(!showAllTrades)}
            className="mt-4 w-full btn btn-secondary flex items-center justify-center gap-2"
          >
            {showAllTrades ? (
              <>
                <ChevronUp size={16} />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                Show All {trades.length} Trades
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="bg-surface-light rounded-lg p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${
        positive === true ? 'text-bullish' :
        positive === false ? 'text-bearish' :
        ''
      }`}>
        {value}
      </p>
    </div>
  )
}

function TradeRow({ trade }: { trade: BacktestTrade }) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface-light rounded-lg">
      <div className="flex items-center gap-4">
        <div>
          <p className="font-semibold">{trade.ticker}</p>
          <p className="text-xs text-gray-400">
            {trade.direction} • {new Date(trade.entryDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={`font-semibold ${trade.pnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
            ${trade.pnl.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">{trade.returnPercent.toFixed(1)}%</p>
        </div>
        <div className={`px-2 py-1 rounded text-xs ${
          trade.outcome === 'WIN' ? 'bg-bullish/20 text-bullish' : 'bg-bearish/20 text-bearish'
        }`}>
          {trade.outcome}
        </div>
      </div>
    </div>
  )
}

function CreateBacktestModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    initialCapital: 10000,
    positionSize: 1000,
    minConfidence: 0,
    signalTypes: [] as string[]
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('strikeiq-token')
      await fetch('http://localhost:3001/api/backtesting/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      onSuccess()
    } catch (error) {
      console.error('Error creating backtest:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-surface rounded-xl border border-border p-6 max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6">Create New Backtest</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-surface-light border border-border rounded-lg px-4 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-surface-light border border-border rounded-lg px-4 py-2"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-surface-light border border-border rounded-lg px-4 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full bg-surface-light border border-border rounded-lg px-4 py-2"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Initial Capital</label>
              <input
                type="number"
                value={formData.initialCapital}
                onChange={(e) => setFormData({ ...formData, initialCapital: Number(e.target.value) })}
                className="w-full bg-surface-light border border-border rounded-lg px-4 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Position Size</label>
              <input
                type="number"
                value={formData.positionSize}
                onChange={(e) => setFormData({ ...formData, positionSize: Number(e.target.value) })}
                className="w-full bg-surface-light border border-border rounded-lg px-4 py-2"
                required
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn btn-primary"
            >
              {loading ? 'Running...' : 'Run Backtest'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
