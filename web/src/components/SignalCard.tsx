'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  TrendingUp, TrendingDown, Clock, Target, Shield,
  ChevronDown, ChevronUp, Plus, Check, X, AlertTriangle
} from 'lucide-react'
import { Signal, useSignalStore } from '@/store/signalStore'

interface SignalCardProps {
  signal: Signal
}

export default function SignalCard({ signal }: SignalCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const { addToWatchlist, acceptSignal, rejectSignal } = useSignalStore()

  const isBullish = signal.direction === 'CALL'

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-risk-low bg-risk-low/20'
      case 'MEDIUM': return 'text-risk-medium bg-risk-medium/20'
      case 'HIGH': return 'text-risk-high bg-risk-high/20'
      case 'EXTREME': return 'text-risk-extreme bg-risk-extreme/20'
      default: return 'text-gray-400 bg-gray-400/20'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return 'bg-primary'
    if (confidence >= 60) return 'bg-yellow-500'
    return 'bg-orange-500'
  }

  const handleAccept = () => {
    setShowConfirmation(true)
  }

  const handleConfirmAccept = () => {
    acceptSignal(signal)
    setShowConfirmation(false)
  }

  const handleReject = () => {
    rejectSignal(signal.id)
  }

  const handleAddToWatchlist = () => {
    addToWatchlist(signal)
  }

  return (
    <motion.div
      layout
      className={`signal-card ${isBullish ? 'signal-card-bullish' : 'signal-card-bearish'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isBullish ? 'bg-bullish/20' : 'bg-bearish/20'}`}>
            {isBullish ? (
              <TrendingUp className="text-bullish" size={24} />
            ) : (
              <TrendingDown className="text-bearish" size={24} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/stock/${signal.ticker}`)}
                className="text-xl font-bold hover:text-primary transition-colors"
              >
                {signal.ticker}
              </button>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                isBullish ? 'bg-bullish/20 text-bullish' : 'bg-bearish/20 text-bearish'
              }`}>
                {signal.direction}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-surface-lighter text-gray-300">
                {signal.signalType}
              </span>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              ${signal.strikePrice} Strike • Exp {format(new Date(signal.expirationDate), 'MMM d')}
            </div>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="text-right">
          <div className="text-2xl font-bold">{signal.confidence.toFixed(0)}%</div>
          <div className="text-xs text-gray-400">Confidence</div>
          <div className="mt-1 w-20 h-1.5 bg-surface-lighter rounded-full overflow-hidden">
            <div
              className={`h-full ${getConfidenceColor(signal.confidence)} transition-all duration-500`}
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-3 mt-4">
        <div className="bg-surface-light rounded-lg p-2 text-center">
          <div className="text-xs text-gray-400">Entry</div>
          <div className="font-semibold">${signal.entryPrice.toFixed(2)}</div>
        </div>
        <div className="bg-surface-light rounded-lg p-2 text-center">
          <div className="text-xs text-gray-400">Stop</div>
          <div className="font-semibold text-bearish">${signal.stopLoss.toFixed(2)}</div>
        </div>
        <div className="bg-surface-light rounded-lg p-2 text-center">
          <div className="text-xs text-gray-400">Target</div>
          <div className="font-semibold text-bullish">${signal.targetPrice.toFixed(2)}</div>
        </div>
        <div className="bg-surface-light rounded-lg p-2 text-center">
          <div className="text-xs text-gray-400">R:R</div>
          <div className="font-semibold">{signal.riskReward.toFixed(1)}</div>
        </div>
      </div>

      {/* Risk Level */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-gray-400" />
          <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(signal.riskLevel)}`}>
            {signal.riskLevel} RISK
          </span>
          {signal.riskLevel === 'EXTREME' || signal.riskLevel === 'HIGH' ? (
            <AlertTriangle size={16} className="text-risk-high" />
          ) : null}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={12} />
          {format(new Date(signal.createdAt), 'HH:mm')}
        </div>
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full mt-3 pt-3 border-t border-border flex items-center justify-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
      >
        {expanded ? (
          <>Hide Details <ChevronUp size={16} /></>
        ) : (
          <>Show Details <ChevronDown size={16} /></>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              {/* Signal Reasoning */}
              <div className="bg-surface-light rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Signal Reasoning</div>
                <p className="text-sm">{signal.reasoning}</p>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 gap-2">
                <ScoreBar label="Flow" value={signal.flowScore} />
                <ScoreBar label="Volume" value={signal.volumeScore} />
                <ScoreBar label="OI" value={signal.oiScore} />
                <ScoreBar label="Technical" value={signal.technicalScore} />
                <ScoreBar label="Sentiment" value={signal.sentimentScore} />
                <ScoreBar label="Volatility" value={signal.volatilityScore} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleReject}
          className="flex-1 btn btn-secondary flex items-center justify-center gap-2"
        >
          <X size={16} />
          Pass
        </button>
        <button
          onClick={handleAddToWatchlist}
          className="btn btn-secondary flex items-center justify-center"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={handleAccept}
          className={`flex-1 btn flex items-center justify-center gap-2 ${
            isBullish ? 'btn-bullish' : 'btn-bearish'
          }`}
        >
          <Check size={16} />
          Accept
        </button>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={() => setShowConfirmation(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface rounded-xl border border-border p-6 max-w-md mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-2">Confirm Trade Decision</h3>
              <p className="text-gray-400 mb-4">
                You are about to accept this {signal.direction} signal for {signal.ticker}.
                This is not financial advice. Please ensure you have done your own research.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAccept}
                  className="flex-1 btn btn-primary"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-light rounded p-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span>{value.toFixed(0)}</span>
      </div>
      <div className="h-1 bg-surface-lighter rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
