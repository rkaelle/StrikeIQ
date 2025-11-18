'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, LineData, CandlestickData } from 'lightweight-charts'
import { TrendingUp, TrendingDown, Target } from 'lucide-react'

interface ChartComponentProps {
  ticker: string
}

export default function ChartComponent({ ticker }: ChartComponentProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle')

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 250,
      layout: {
        background: { color: '#141414' },
        textColor: '#888888',
      },
      grid: {
        vertLines: { color: '#1e1e1e' },
        horzLines: { color: '#1e1e1e' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: '#333333',
      },
      timeScale: {
        borderColor: '#333333',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00d4aa',
      downColor: '#ff6b6b',
      borderDownColor: '#ff6b6b',
      borderUpColor: '#00d4aa',
      wickDownColor: '#ff6b6b',
      wickUpColor: '#00d4aa',
    })

    seriesRef.current = candlestickSeries

    // Generate mock data
    const data = generateMockCandleData()
    candlestickSeries.setData(data)

    // Add buy zone marker
    const buyZonePrice = data[data.length - 1].close * 0.98
    const targetPrice = data[data.length - 1].close * 1.05

    // Support line
    candlestickSeries.createPriceLine({
      price: buyZonePrice,
      color: '#00d4aa',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Buy Zone',
    })

    // Target line
    candlestickSeries.createPriceLine({
      price: targetPrice,
      color: '#ffd93d',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Target',
    })

    // Fit content
    chart.timeScale().fitContent()

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [ticker])

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{ticker}</span>
          <span className="text-xs bg-surface-light px-2 py-1 rounded text-gray-400">1D</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-bullish">
            <TrendingUp size={12} />
            <span>Bullish</span>
          </div>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full" />

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-bullish"></div>
            <span>Buy Zone</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-yellow-500"></div>
            <span>Target</span>
          </div>
        </div>
        <Target size={14} />
      </div>
    </div>
  )
}

function generateMockCandleData(): CandlestickData[] {
  const data: CandlestickData[] = []
  let basePrice = 450
  const now = new Date()

  for (let i = 100; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    const open = basePrice + (Math.random() - 0.5) * 5
    const close = open + (Math.random() - 0.5) * 5
    const high = Math.max(open, close) + Math.random() * 2
    const low = Math.min(open, close) - Math.random() * 2

    data.push({
      time: date.toISOString().split('T')[0] as any,
      open,
      high,
      low,
      close,
    })

    basePrice = close
  }

  return data
}
