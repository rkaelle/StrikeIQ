'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MarketData {
  ticker: string
  price: number
  change: number
  changePercent: number
}

export default function MarketOverview() {
  const [marketData, setMarketData] = useState<MarketData[]>([
    { ticker: 'SPY', price: 452.30, change: 2.45, changePercent: 0.54 },
    { ticker: 'QQQ', price: 382.15, change: 4.20, changePercent: 1.11 },
    { ticker: 'VIX', price: 18.50, change: -0.80, changePercent: -4.14 },
    { ticker: 'DIA', price: 385.60, change: 1.30, changePercent: 0.34 },
  ])

  return (
    <div className="bg-surface rounded-lg border border-border p-3">
      <div className="flex items-center justify-between overflow-x-auto gap-6">
        {marketData.map((data) => (
          <div key={data.ticker} className="flex items-center gap-3 min-w-fit">
            <span className="font-semibold">{data.ticker}</span>
            <span className="font-mono">${data.price.toFixed(2)}</span>
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
          </div>
        ))}

        <div className="flex items-center gap-2 ml-auto text-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-gray-400">Market Open</span>
        </div>
      </div>
    </div>
  )
}
