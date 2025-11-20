'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { marketService } from '@/services/api'

interface MarketData {
  ticker: string
  price: number
  change: number
  changePercent: number
}

export default function MarketOverview() {
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [marketStatus, setMarketStatus] = useState('Loading...')

  useEffect(() => {
    fetchMarketData()
    // Refresh every 60 seconds
    const interval = setInterval(fetchMarketData, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchMarketData = async () => {
    const tickers = ['SPY', 'QQQ', 'VIX', 'DIA']
    const data: MarketData[] = []

    for (const ticker of tickers) {
      try {
        const quote = await marketService.getQuote(ticker)
        data.push({
          ticker,
          price: quote.price || quote.close || 0,
          change: quote.change || 0,
          changePercent: quote.changePercent || 0
        })
      } catch (error) {
        // Use placeholder if API fails
        data.push({
          ticker,
          price: 0,
          change: 0,
          changePercent: 0
        })
      }
    }

    setMarketData(data)
    setIsLoading(false)

    // Check market status
    const now = new Date()
    const hour = now.getUTCHours() - 5 // EST
    const day = now.getDay()
    const isWeekday = day >= 1 && day <= 5
    const isMarketHours = hour >= 9.5 && hour < 16

    setMarketStatus(isWeekday && isMarketHours ? 'Market Open' : 'Market Closed')
  }

  if (isLoading) {
    return (
      <div className="bg-surface rounded-lg border border-border p-3">
        <div className="flex items-center justify-center py-2">
          <div className="animate-pulse text-gray-400">Loading market data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-lg border border-border p-3">
      <div className="flex items-center justify-between overflow-x-auto gap-6">
        {marketData.map((data) => (
          <div key={data.ticker} className="flex items-center gap-3 min-w-fit">
            <span className="font-semibold">{data.ticker}</span>
            <span className="font-mono">
              {data.price > 0 ? `$${data.price.toFixed(2)}` : '--'}
            </span>
            {data.price > 0 && (
              <div className={`flex items-center gap-1 text-sm ${
                data.change >= 0 ? 'text-bullish' : 'text-bearish'
              }`}>
                {data.change >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                <span>{data.change >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%</span>
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center gap-2 ml-auto text-sm">
          <span className={`w-2 h-2 rounded-full ${
            marketStatus === 'Market Open' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
          }`}></span>
          <span className="text-gray-400">{marketStatus}</span>
        </div>
      </div>
    </div>
  )
}
