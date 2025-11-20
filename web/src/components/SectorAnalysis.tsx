'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PieChart, TrendingUp, TrendingDown, Building2, Zap } from 'lucide-react'

interface SectorBreakdown {
  sector: string
  count: number
  percentage: number
  tickers: string[]
}

interface PortfolioAnalysis {
  totalSignals: number
  sectors: SectorBreakdown[]
  diversificationScore: number
  concentration: {
    topSector: string
    topSectorPercentage: number
  }
}

export default function SectorAnalysis() {
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSectorAnalysis()
  }, [])

  const fetchSectorAnalysis = async () => {
    try {
      const token = localStorage.getItem('strikeiq-token')
      const response = await fetch('http://localhost:3001/api/sector-analysis/portfolio', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      setAnalysis(data)
    } catch (error) {
      console.error('Error fetching sector analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-surface rounded-lg border border-border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-surface-light rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-surface-light rounded"></div>
            <div className="h-4 bg-surface-light rounded"></div>
            <div className="h-4 bg-surface-light rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!analysis || analysis.totalSignals === 0) {
    return (
      <div className="bg-surface rounded-lg border border-border p-6 text-center">
        <PieChart size={48} className="mx-auto text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Active Signals</h3>
        <p className="text-gray-400 text-sm">
          Activate signals to see sector analysis and portfolio breakdown.
        </p>
      </div>
    )
  }

  const getDiversificationRating = (score: number) => {
    if (score >= 75) return { label: 'Excellent', color: 'text-bullish' }
    if (score >= 50) return { label: 'Good', color: 'text-blue-500' }
    if (score >= 25) return { label: 'Moderate', color: 'text-yellow-500' }
    return { label: 'Poor', color: 'text-bearish' }
  }

  const diversificationRating = getDiversificationRating(analysis.diversificationScore)

  const getSectorIcon = (sector: string) => {
    if (sector.includes('Technology')) return <Zap size={16} />
    if (sector.includes('Financial')) return <Building2 size={16} />
    return <Building2 size={16} />
  }

  const getSectorColor = (index: number) => {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16', // Lime
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <PieChart size={24} />
          Portfolio Sector Analysis
        </h2>
        <span className="text-sm text-gray-400">
          {analysis.totalSignals} Active Signal{analysis.totalSignals === 1 ? '' : 's'}
        </span>
      </div>

      {/* Diversification Score */}
      <div className="bg-surface rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Diversification Score</span>
          <span className={`font-bold ${diversificationRating.color}`}>
            {diversificationRating.label}
          </span>
        </div>
        <div className="relative w-full h-3 bg-surface-light rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${analysis.diversificationScore}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-primary to-bullish"
          />
        </div>
        <div className="text-right text-xs text-gray-400 mt-1">
          {analysis.diversificationScore}%
        </div>
      </div>

      {/* Concentration Warning */}
      {analysis.concentration.topSectorPercentage > 50 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex gap-3">
          <TrendingDown className="text-yellow-500 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-yellow-500">High Concentration</p>
            <p className="text-sm text-gray-400">
              {analysis.concentration.topSector} represents {analysis.concentration.topSectorPercentage}% of your portfolio.
              Consider diversifying across more sectors.
            </p>
          </div>
        </div>
      )}

      {/* Sector Breakdown */}
      <div className="bg-surface rounded-lg border border-border p-4">
        <h3 className="font-semibold mb-4">Sector Breakdown</h3>
        <div className="space-y-3">
          {analysis.sectors.map((sector, index) => (
            <div key={sector.sector}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getSectorColor(index) }}
                  />
                  <span className="text-sm font-medium">{sector.sector}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">
                    {sector.count} signal{sector.count === 1 ? '' : 's'}
                  </span>
                  <span className="text-sm font-semibold">
                    {sector.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="relative w-full h-2 bg-surface-light rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${sector.percentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="h-full"
                  style={{ backgroundColor: getSectorColor(index) }}
                />
              </div>
              {sector.tickers.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {sector.tickers.map((ticker) => (
                    <span
                      key={ticker}
                      className="text-xs px-2 py-0.5 bg-surface-light rounded"
                    >
                      {ticker}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {analysis.diversificationScore < 50 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
          <TrendingUp className="text-blue-500 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-blue-500">Diversification Tips</p>
            <ul className="text-sm text-gray-400 mt-1 space-y-1">
              <li>• Consider signals from underrepresented sectors</li>
              <li>• Aim for 4-6 different sectors in your portfolio</li>
              <li>• Balance cyclical and defensive sectors</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
