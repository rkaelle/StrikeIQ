'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '@/components/Navbar'
import SignalCard from '@/components/SignalCard'
import WatchlistPanel from '@/components/WatchlistPanel'
import PerformanceTracker from '@/components/PerformanceTracker'
import ChartComponent from '@/components/ChartComponent'
import DisclaimerModal from '@/components/DisclaimerModal'
import MarketOverview from '@/components/MarketOverview'
import SignalFilters from '@/components/SignalFilters'
import { useSignalStore } from '@/store/signalStore'

export default function Home() {
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const [activeTab, setActiveTab] = useState<'signals' | 'watchlist' | 'performance' | 'education'>('signals')
  const { signals, fetchSignals, filters, isLoading } = useSignalStore()

  useEffect(() => {
    fetchSignals()
    // Check if user has accepted disclaimer
    const accepted = localStorage.getItem('strikeiq-disclaimer-accepted')
    if (accepted) setShowDisclaimer(false)
  }, [fetchSignals])

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('strikeiq-disclaimer-accepted', 'true')
    setShowDisclaimer(false)
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="container mx-auto px-4 py-6">
        {/* Market Overview Bar */}
        <MarketOverview />

        {/* Main Content */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'signals' && (
              <>
                <SignalFilters />
                <div className="space-y-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    Active Signals
                  </h2>

                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {signals.length > 0 ? (
                        signals.map((signal, index) => (
                          <motion.div
                            key={signal.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <SignalCard signal={signal} />
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          No active signals matching your filters
                        </div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              </>
            )}

            {activeTab === 'watchlist' && <WatchlistPanel />}

            {activeTab === 'performance' && <PerformanceTracker />}

            {activeTab === 'education' && (
              <div className="bg-surface rounded-lg border border-border p-6">
                <h2 className="text-xl font-bold mb-4">Education Center</h2>
                <p className="text-gray-400">Learn about options trading, Greeks, risk management, and more.</p>
                {/* Education content will be rendered here */}
              </div>
            )}
          </div>

          {/* Right Column - Chart & Quick Stats */}
          <div className="space-y-6">
            <ChartComponent ticker="SPY" />

            <div className="bg-surface rounded-lg border border-border p-4">
              <h3 className="font-semibold mb-3">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Today's Win Rate</span>
                  <span className="text-primary font-medium">68%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Signals</span>
                  <span className="font-medium">{signals.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Confidence</span>
                  <span className="font-medium">
                    {signals.length > 0
                      ? (signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length).toFixed(0)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Warning Card */}
            <div className="bg-surface rounded-lg border border-yellow-500/30 p-4">
              <div className="flex items-start gap-3">
                <span className="text-yellow-500 text-xl">⚠️</span>
                <div>
                  <h4 className="font-semibold text-yellow-500">Risk Warning</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Options trading involves substantial risk. Only trade with capital you can afford to lose.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer Modal */}
      <AnimatePresence>
        {showDisclaimer && (
          <DisclaimerModal onAccept={handleAcceptDisclaimer} />
        )}
      </AnimatePresence>
    </main>
  )
}
