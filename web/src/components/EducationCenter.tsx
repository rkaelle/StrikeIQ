'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Play, Clock, ChevronRight, Award,
  TrendingUp, Shield, Zap, BarChart3, AlertTriangle, DollarSign
} from 'lucide-react'

interface Module {
  id: string
  title: string
  description: string
  duration: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  icon: any
  topics: string[]
  content: string[]
}

const EDUCATION_MODULES: Module[] = [
  {
    id: 'options-basics',
    title: 'Options Trading Basics',
    description: 'Learn the fundamentals of calls, puts, and how options work',
    duration: '15 min',
    level: 'Beginner',
    icon: BookOpen,
    topics: ['Calls vs Puts', 'Strike Prices', 'Expiration Dates', 'Premium'],
    content: [
      'Options are contracts that give the buyer the right, but not the obligation, to buy (call) or sell (put) an underlying asset at a specific price before a certain date.',
      'A CALL option gives you the right to BUY at the strike price. You profit when the stock goes UP.',
      'A PUT option gives you the right to SELL at the strike price. You profit when the stock goes DOWN.',
      'The STRIKE PRICE is the price at which you can exercise the option.',
      'The PREMIUM is what you pay to buy the option contract.',
      'Options EXPIRE - if not exercised or sold by expiration, they become worthless.'
    ]
  },
  {
    id: 'greeks',
    title: 'Understanding the Greeks',
    description: 'Master Delta, Gamma, Theta, and Vega for better trades',
    duration: '20 min',
    level: 'Intermediate',
    icon: BarChart3,
    topics: ['Delta', 'Gamma', 'Theta', 'Vega', 'How Greeks Affect Pricing'],
    content: [
      'DELTA measures how much the option price moves for every $1 move in the underlying. Calls have positive delta (0 to 1), puts have negative delta (0 to -1).',
      'GAMMA measures the rate of change of delta. High gamma means delta changes quickly - important for 0DTE options.',
      'THETA measures time decay - how much value the option loses each day. Options lose value as expiration approaches.',
      'VEGA measures sensitivity to volatility. Higher implied volatility = higher option prices.',
      'For 0DTE trades, focus on high delta and be aware of rapid theta decay.',
      'Weekly options have more time value but lower gamma than 0DTE.'
    ]
  },
  {
    id: 'flow-analysis',
    title: 'Options Flow Analysis',
    description: 'Learn to read unusual options activity and dark pool prints',
    duration: '25 min',
    level: 'Intermediate',
    icon: Zap,
    topics: ['Unusual Volume', 'Sweeps vs Blocks', 'Dark Pool Activity', 'Put/Call Ratios'],
    content: [
      'UNUSUAL OPTIONS ACTIVITY (UOA) occurs when volume significantly exceeds average - often indicates institutional interest.',
      'SWEEPS are large orders split across multiple exchanges to fill quickly - often aggressive directional bets.',
      'BLOCKS are large single orders, typically negotiated off-exchange - can indicate hedging or directional bets.',
      'DARK POOL prints are off-exchange trades - large prints near the ask are bullish, near the bid are bearish.',
      'Look for clusters of unusual activity at specific strikes and expirations.',
      'High PUT/CALL ratio can indicate fear or hedging; low ratio suggests bullish sentiment.'
    ]
  },
  {
    id: 'risk-management',
    title: 'Risk Management',
    description: 'Protect your capital with proper position sizing and stops',
    duration: '20 min',
    level: 'Beginner',
    icon: Shield,
    topics: ['Position Sizing', 'Stop Losses', 'Risk/Reward Ratios', 'Portfolio Risk'],
    content: [
      'Never risk more than 1-2% of your trading account on a single trade.',
      'Set stop losses BEFORE entering the trade - typical stop is 50% of premium.',
      'Always have a profit target - aim for 2:1 or 3:1 risk/reward ratio.',
      'Use position sizing: Risk Amount ÷ (Entry - Stop) = Contracts to trade.',
      'Diversify across different tickers, sectors, and expiration dates.',
      'Keep a trading journal to track wins, losses, and learn from mistakes.'
    ]
  },
  {
    id: '0dte-strategies',
    title: '0DTE Trading Strategies',
    description: 'High-risk, high-reward same-day expiration trading',
    duration: '30 min',
    level: 'Advanced',
    icon: TrendingUp,
    topics: ['0DTE Basics', 'Entry Timing', 'Gamma Risk', 'Exit Strategies'],
    content: [
      '0DTE (zero days to expiration) options expire the same day - maximum gamma exposure.',
      'Best entry times: 9:45-10:30 AM after initial volatility, or 2:00-3:00 PM for momentum plays.',
      'Use ATM or slightly OTM strikes for best gamma exposure.',
      'Set tight stops (30-50%) - 0DTE options can go to zero quickly.',
      'Take profits quickly - aim for 50-100% gains due to rapid decay.',
      'NEVER hold 0DTE overnight - you will lose everything.'
    ]
  },
  {
    id: 'earnings-plays',
    title: 'Earnings Play Strategies',
    description: 'Trading around company earnings announcements',
    duration: '25 min',
    level: 'Advanced',
    icon: DollarSign,
    topics: ['IV Crush', 'Straddles/Strangles', 'Pre-Earnings Plays', 'Post-Earnings Drift'],
    content: [
      'Implied Volatility (IV) typically spikes before earnings and crashes after (IV Crush).',
      'Buying options before earnings is expensive due to high IV - you need a big move to profit.',
      'Consider selling premium before earnings to benefit from IV crush.',
      'STRADDLES (buy call + put same strike) profit from big moves in either direction.',
      'POST-EARNINGS DRIFT: stocks often continue moving in the initial direction for days.',
      'Never use more than 2-3% of account on earnings plays due to binary risk.'
    ]
  }
]

export default function EducationCenter() {
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Education Center</h2>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Award size={16} />
          <span>{EDUCATION_MODULES.length} modules</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedModule ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-surface rounded-lg border border-border p-6"
          >
            <button
              onClick={() => setSelectedModule(null)}
              className="text-sm text-primary mb-4 hover:underline"
            >
              ← Back to modules
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-lg">
                <selectedModule.icon className="text-primary" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{selectedModule.title}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    selectedModule.level === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                    selectedModule.level === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {selectedModule.level}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {selectedModule.duration}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Topics Covered:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedModule.topics.map((topic) => (
                  <span key={topic} className="px-2 py-1 bg-surface-light rounded text-xs">
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {selectedModule.content.map((paragraph, index) => (
                <motion.p
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-gray-300 leading-relaxed"
                >
                  {paragraph}
                </motion.p>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4"
          >
            {EDUCATION_MODULES.map((module, index) => (
              <motion.button
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedModule(module)}
                className="bg-surface rounded-lg border border-border p-4 text-left hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <module.icon className="text-primary" size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{module.title}</h3>
                      <p className="text-sm text-gray-400 mb-2">{module.description}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`px-2 py-0.5 rounded ${
                          module.level === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                          module.level === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {module.level}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Clock size={10} />
                          {module.duration}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-500" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
