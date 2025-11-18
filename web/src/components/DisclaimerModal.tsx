'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Shield, Info } from 'lucide-react'

interface DisclaimerModalProps {
  onAccept: () => void
}

export default function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-surface rounded-xl border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="text-yellow-500" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Important Disclaimer</h2>
              <p className="text-sm text-gray-400">Please read before using StrikeIQ</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-surface-light rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="text-primary mt-0.5" size={18} />
              <div>
                <h3 className="font-semibold mb-1">Not Financial Advice</h3>
                <p className="text-sm text-gray-400">
                  StrikeIQ provides trading signals for educational and informational purposes only.
                  This is NOT financial advice, and you should NOT rely solely on these signals for
                  trading decisions.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-light rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-risk-high mt-0.5" size={18} />
              <div>
                <h3 className="font-semibold mb-1">Risk Warning</h3>
                <p className="text-sm text-gray-400">
                  Options trading involves substantial risk of loss and is not suitable for all investors.
                  You could lose your entire investment. Only trade with capital you can afford to lose.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-light rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="text-secondary mt-0.5" size={18} />
              <div>
                <h3 className="font-semibold mb-1">Do Your Own Research</h3>
                <p className="text-sm text-gray-400">
                  Always conduct your own research and analysis before making any trading decisions.
                  Past performance does not guarantee future results. Consult with a qualified
                  financial advisor before trading.
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 leading-relaxed">
            By clicking "I Understand & Accept", you acknowledge that you have read and understood
            this disclaimer, that you are aware of the risks involved in options trading, and that
            you will not hold StrikeIQ liable for any losses incurred from using this application.
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <button
            onClick={onAccept}
            className="w-full btn btn-primary py-3 text-lg font-semibold"
          >
            I Understand & Accept
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
