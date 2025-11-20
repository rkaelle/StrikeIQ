'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Award, Target, Activity, Loader2 } from 'lucide-react'
import { metricsService, authService } from '@/services/api'

interface PerformanceData {
  system: {
    winRate: string
    totalSignals: number
    avgReturn: string
    avgConfidence: string
  }
  user: {
    winRate: string
    totalTrades: number
    totalPnl: string
    wins: number
    losses: number
  }
  byType: Record<string, { winRate: string; total: number }>
  history: { date: string; pnl: number; cumulative: number }[]
}

export default function PerformanceTracker() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [data, setData] = useState<PerformanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const user = authService.getCurrentUser()
      if (!user) {
        setError('Please log in to view performance data')
        setIsLoading(false)
        return
      }

      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90

      // Fetch system and user metrics in parallel
      const [systemMetrics, userMetrics] = await Promise.all([
        metricsService.getSystem(days),
        metricsService.getUser(user.id, days)
      ])

      // Transform the data
      const transformedData: PerformanceData = {
        system: {
          winRate: systemMetrics.overall.winRate,
          totalSignals: systemMetrics.overall.total,
          avgReturn: systemMetrics.overall.avgReturn,
          avgConfidence: systemMetrics.overall.avgConfidence
        },
        user: {
          winRate: userMetrics.winRate,
          totalTrades: userMetrics.totalTrades,
          totalPnl: userMetrics.totalPnl,
          wins: userMetrics.wins,
          losses: userMetrics.losses
        },
        byType: systemMetrics.byType || {},
        history: generateHistoryData(parseFloat(userMetrics.totalPnl) || 0, days)
      }

      setData(transformedData)
    } catch (err: any) {
      console.error('Error fetching performance data:', err)
      setError(err.response?.data?.error || err.message || 'Failed to load performance data')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-gray-400">Loading performance data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500 text-6xl">⚠️</div>
        <h3 className="text-xl font-semibold">Failed to Load Performance Data</h3>
        <p className="text-gray-400 text-center max-w-md">{error}</p>
        <button
          onClick={fetchData}
          className="px-6 py-2 bg-primary text-black rounded-lg hover:bg-primary/80 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const typeData = Object.entries(data.byType).map(([name, stats]) => ({
    name,
    winRate: parseFloat(stats.winRate) || 0,
    total: stats.total
  }))

  const pieData = [
    { name: 'Wins', value: data.user.wins, color: '#00d4aa' },
    { name: 'Losses', value: data.user.losses, color: '#ff6b6b' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Performance</h2>
        <div className="flex gap-1">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              disabled={isLoading}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                period === p
                  ? 'bg-primary text-black'
                  : 'bg-surface-light text-gray-400 hover:text-white'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="text-primary" size={20} />}
          label="System Win Rate"
          value={`${data.system.winRate}%`}
        />
        <StatCard
          icon={<Activity className="text-secondary" size={20} />}
          label="Your Win Rate"
          value={`${data.user.winRate}%`}
        />
        <StatCard
          icon={<TrendingUp className="text-bullish" size={20} />}
          label="Total P&L"
          value={`$${parseFloat(data.user.totalPnl).toFixed(0)}`}
        />
        <StatCard
          icon={<Award className="text-yellow-500" size={20} />}
          label="Avg Confidence"
          value={`${data.system.avgConfidence}%`}
        />
      </div>

      {/* P&L Chart */}
      {data.history.length > 0 && (
        <div className="bg-surface rounded-lg border border-border p-4">
          <h3 className="font-semibold mb-4">Cumulative P&L (Estimated)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.history}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00d4aa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
              <XAxis
                dataKey="date"
                stroke="#666"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#666"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e1e1e',
                  border: '1px solid #333',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#00d4aa"
                fill="url(#pnlGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Win Rate by Type & Win/Loss Ratio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {typeData.length > 0 && (
          <div className="bg-surface rounded-lg border border-border p-4">
            <h3 className="font-semibold mb-4">Win Rate by Signal Type</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="name" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #333',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="winRate" fill="#00d4aa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {(data.user.wins > 0 || data.user.losses > 0) && (
          <div className="bg-surface rounded-lg border border-border p-4">
            <h3 className="font-semibold mb-4">Your Win/Loss Ratio</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e1e1e',
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-bullish"></div>
                <span className="text-sm">Wins ({data.user.wins})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-bearish"></div>
                <span className="text-sm">Losses ({data.user.losses})</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {data.user.totalTrades === 0 && (
        <div className="bg-surface rounded-lg border border-border p-8 text-center">
          <p className="text-gray-400">No trades yet. Start trading to see your performance metrics!</p>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-lg border border-border p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </motion.div>
  )
}

function generateHistoryData(finalValue: number, days: number) {
  const data = []
  const increment = finalValue / days
  let cumulative = 0

  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const pnl = increment + (Math.random() - 0.5) * increment
    cumulative += pnl

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pnl: Math.round(pnl),
      cumulative: Math.round(cumulative)
    })
  }

  return data
}
