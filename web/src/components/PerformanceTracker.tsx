'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Award, Target, Activity } from 'lucide-react'

interface PerformanceData {
  system: {
    winRate: number
    totalSignals: number
    avgReturn: number
    avgConfidence: number
  }
  user: {
    winRate: number
    totalTrades: number
    totalPnl: number
    wins: number
    losses: number
  }
  byType: Record<string, { winRate: number; total: number }>
  history: { date: string; pnl: number; cumulative: number }[]
}

export default function PerformanceTracker() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [data, setData] = useState<PerformanceData>({
    system: {
      winRate: 68.5,
      totalSignals: 247,
      avgReturn: 45.2,
      avgConfidence: 72.3
    },
    user: {
      winRate: 62.5,
      totalTrades: 24,
      totalPnl: 1250.50,
      wins: 15,
      losses: 9
    },
    byType: {
      '0DTE': { winRate: 58, total: 42 },
      'WEEKLY': { winRate: 72, total: 85 },
      'EARNINGS': { winRate: 65, total: 38 },
      'DARK_POOL': { winRate: 75, total: 52 },
      'NEWS': { winRate: 61, total: 30 }
    },
    history: generateHistoryData()
  })

  const typeData = Object.entries(data.byType).map(([name, stats]) => ({
    name,
    winRate: stats.winRate,
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
              className={`px-3 py-1 rounded text-sm transition-colors ${
                period === p
                  ? 'bg-primary text-black'
                  : 'bg-surface-light text-gray-400 hover:text-white'
              }`}
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
          trend={+2.3}
        />
        <StatCard
          icon={<Activity className="text-secondary" size={20} />}
          label="Your Win Rate"
          value={`${data.user.winRate}%`}
          trend={+5.1}
        />
        <StatCard
          icon={<TrendingUp className="text-bullish" size={20} />}
          label="Total P&L"
          value={`$${data.user.totalPnl.toFixed(0)}`}
          trend={+12.5}
        />
        <StatCard
          icon={<Award className="text-yellow-500" size={20} />}
          label="Avg Confidence"
          value={`${data.system.avgConfidence}%`}
        />
      </div>

      {/* P&L Chart */}
      <div className="bg-surface rounded-lg border border-border p-4">
        <h3 className="font-semibold mb-4">Cumulative P&L</h3>
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

      {/* Win Rate by Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      {/* Competitor Comparison */}
      <div className="bg-surface rounded-lg border border-border p-4">
        <h3 className="font-semibold mb-4">Sector Comparison</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Tech', winRate: 72, beta: 1.2 },
            { name: 'Finance', winRate: 65, beta: 1.1 },
            { name: 'Healthcare', winRate: 68, beta: 0.8 },
            { name: 'Energy', winRate: 61, beta: 1.4 }
          ].map((sector) => (
            <div key={sector.name} className="bg-surface-light rounded-lg p-3 text-center">
              <div className="text-sm text-gray-400">{sector.name}</div>
              <div className="text-lg font-bold">{sector.winRate}%</div>
              <div className="text-xs text-gray-500">Beta: {sector.beta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  trend
}: {
  icon: React.ReactNode
  label: string
  value: string
  trend?: number
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
      {trend && (
        <div className={`text-xs mt-1 ${trend > 0 ? 'text-bullish' : 'text-bearish'}`}>
          {trend > 0 ? '+' : ''}{trend}% vs last period
        </div>
      )}
    </motion.div>
  )
}

function generateHistoryData() {
  const data = []
  let cumulative = 0

  for (let i = 30; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const pnl = (Math.random() - 0.4) * 100
    cumulative += pnl

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pnl: Math.round(pnl),
      cumulative: Math.round(cumulative)
    })
  }

  return data
}
