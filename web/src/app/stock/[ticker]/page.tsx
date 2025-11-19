'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, TrendingUp, TrendingDown, Activity,
  BarChart3, Newspaper, Clock, ExternalLink
} from 'lucide-react'
import { marketService } from '@/services/api'

interface Quote {
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
}

interface Technicals {
  rsi: number
  macd: number
  trend: string
}

interface NewsArticle {
  title: string
  source: string
  url: string
  publishedAt: string
  sentiment: string
}

export default function StockDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticker = params.ticker as string

  const [quote, setQuote] = useState<Quote | null>(null)
  const [technicals, setTechnicals] = useState<Technicals | null>(null)
  const [news, setNews] = useState<NewsArticle[]>([])
  const [volatility, setVolatility] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStockData()
  }, [ticker])

  const fetchStockData = async () => {
    try {
      const [quoteData, techData, newsData, volData] = await Promise.all([
        marketService.getQuote(ticker).catch(() => null),
        marketService.getTechnicals(ticker).catch(() => null),
        marketService.getNews(ticker).catch(() => []),
        marketService.getVolatility(ticker).catch(() => null)
      ])

      setQuote(quoteData)
      setTechnicals(techData)
      setNews(newsData || [])
      setVolatility(volData)
    } catch (error) {
      console.error('Error fetching stock data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRSIColor = (rsi: number) => {
    if (rsi >= 70) return 'text-bearish'
    if (rsi <= 30) return 'text-bullish'
    return 'text-yellow-500'
  }

  const getRSILabel = (rsi: number) => {
    if (rsi >= 70) return 'Overbought'
    if (rsi <= 30) return 'Oversold'
    return 'Neutral'
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
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{ticker}</h1>
              {quote && (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-semibold text-white">
                    ${quote.price.toFixed(2)}
                  </span>
                  <span className={`flex items-center gap-1 ${quote.change >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {quote.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Price Stats */}
        {quote && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Today's Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface rounded-xl p-4 border border-gray-800"
              >
                <p className="text-sm text-gray-400 mb-1">Open</p>
                <p className="text-xl font-semibold text-white">${quote.open.toFixed(2)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-surface rounded-xl p-4 border border-gray-800"
              >
                <p className="text-sm text-gray-400 mb-1">High</p>
                <p className="text-xl font-semibold text-bullish">${quote.high.toFixed(2)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-surface rounded-xl p-4 border border-gray-800"
              >
                <p className="text-sm text-gray-400 mb-1">Low</p>
                <p className="text-xl font-semibold text-bearish">${quote.low.toFixed(2)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-surface rounded-xl p-4 border border-gray-800"
              >
                <p className="text-sm text-gray-400 mb-1">Volume</p>
                <p className="text-xl font-semibold text-white">
                  {(quote.volume / 1000000).toFixed(2)}M
                </p>
              </motion.div>
            </div>
          </section>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Technical Indicators */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Technical Indicators</h2>
            <div className="bg-surface rounded-xl border border-gray-800 p-6 space-y-4">
              {technicals ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">RSI (14)</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${getRSIColor(technicals.rsi)}`}>
                        {technicals.rsi.toFixed(1)}
                      </span>
                      <span className={`text-xs ml-2 ${getRSIColor(technicals.rsi)}`}>
                        {getRSILabel(technicals.rsi)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">MACD</span>
                    </div>
                    <span className={`font-semibold ${technicals.macd >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                      {technicals.macd.toFixed(3)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">Trend</span>
                    </div>
                    <span className={`font-semibold ${
                      technicals.trend === 'BULLISH' ? 'text-bullish' :
                      technicals.trend === 'BEARISH' ? 'text-bearish' :
                      'text-yellow-500'
                    }`}>
                      {technicals.trend}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-gray-400 text-center">No technical data available</p>
              )}
            </div>
          </section>

          {/* Volatility */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Volatility</h2>
            <div className="bg-surface rounded-xl border border-gray-800 p-6 space-y-4">
              {volatility ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Implied Volatility</span>
                    <span className="font-semibold text-white">{volatility.iv?.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Historical Volatility</span>
                    <span className="font-semibold text-white">{volatility.hv?.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">IV Rank</span>
                    <span className={`font-semibold ${
                      volatility.ivRank > 50 ? 'text-yellow-500' : 'text-white'
                    }`}>
                      {volatility.ivRank?.toFixed(0)}%
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-gray-400 text-center">No volatility data available</p>
              )}
            </div>
          </section>
        </div>

        {/* News */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Latest News</h2>
          <div className="bg-surface rounded-xl border border-gray-800 divide-y divide-gray-800">
            {news.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No news available for {ticker}</p>
              </div>
            ) : (
              news.slice(0, 10).map((article, index) => (
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
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">{article.source}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(article.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        article.sentiment === 'POSITIVE' ? 'bg-bullish/20 text-bullish' :
                        article.sentiment === 'NEGATIVE' ? 'bg-bearish/20 text-bearish' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {article.sentiment}
                      </span>
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </div>
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
