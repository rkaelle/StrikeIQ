'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, TrendingUp, TrendingDown, Activity, ArrowUpRight } from 'lucide-react'

interface Stock {
  ticker: string
  price: number
  change: number
  changePercent: number
  volume: number
  rsi: number
  hasData: boolean
}

export default function StocksBrowser() {
  const router = useRouter()
  const [stocks, setStocks] = useState<Stock[]>([])
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'ticker' | 'changePercent' | 'volume'>('ticker')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStocks()
  }, [])

  useEffect(() => {
    let result = stocks.filter(s =>
      s.ticker.toLowerCase().includes(searchQuery.toLowerCase())
    )

    result.sort((a, b) => {
      if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker)
      if (sortBy === 'changePercent') return b.changePercent - a.changePercent
      if (sortBy === 'volume') return b.volume - a.volume
      return 0
    })

    setFilteredStocks(result)
  }, [stocks, searchQuery, sortBy])

  const fetchStocks = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/market/stocks`
      )
      const data = await response.json()
      setStocks(data)
    } catch (error) {
      console.error('Error fetching stocks:', error)
      // Fallback to ticker list
      setStocks([
        'SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
        'AMD', 'INTC', 'JPM', 'BAC', 'GS', 'WMT', 'COST', 'HD', 'XOM', 'CVX'
      ].map(ticker => ({
        ticker,
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        rsi: 50,
        hasData: false
      })))
    } finally {
      setIsLoading(false)
    }
  }

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`
    return vol.toString()
  }

  if (isLoading) {
    return (
      <div className="bg-surface rounded-lg border border-border p-6">
        <div className="animate-pulse text-center text-gray-400">Loading stocks...</div>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Browse Stocks ({stocks.length})</h2>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-background border border-border rounded px-2 py-1 text-sm"
          >
            <option value="ticker">A-Z</option>
            <option value="changePercent">% Change</option>
            <option value="volume">Volume</option>
          </select>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search stocks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredStocks.map((stock, index) => (
          <motion.button
            key={stock.ticker}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            onClick={() => router.push(`/stock/${stock.ticker}`)}
            className="w-full flex items-center justify-between p-3 bg-background hover:bg-surface-light rounded-lg transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold">{stock.ticker}</span>
              {stock.price > 0 && (
                <span className="text-sm text-gray-400">
                  ${stock.price.toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {stock.hasData && (
                <>
                  <div className="text-xs text-gray-500">
                    Vol: {formatVolume(stock.volume)}
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${
                    stock.changePercent >= 0 ? 'text-bullish' : 'text-bearish'
                  }`}>
                    {stock.changePercent >= 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    <span>{stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                  </div>
                </>
              )}
              <ArrowUpRight size={14} className="text-gray-500" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
