'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, TrendingUp, Zap, BarChart3, ArrowRight, X } from 'lucide-react'

interface OnboardingFlowProps {
  onComplete: () => void
  onSkip: () => void
}

const steps = [
  {
    icon: TrendingUp,
    title: 'Welcome to StrikeIQ',
    description: 'Professional-grade 0DTE options signals powered by institutional AI analytics.'
  },
  {
    icon: BarChart3,
    title: '5-Pillar System',
    description: 'Our institutional-grade system analyzes:\n\n✓ Trend State\n✓ Institutional Flow\n✓ Volatility Conditions\n✓ Liquidity\n✓ Market Correlation'
  },
  {
    icon: Zap,
    title: 'Signal Types',
    description: '• 0DTE: Same-day expiration (high precision)\n• WEEKLY: Multi-day plays (more time)\n• DARK POOL: Large institutional activity\n• NEWS: Catalyst-driven moves'
  },
  {
    icon: CheckCircle,
    title: 'How to Use Signals',
    description: '1. Browse signals on the Signals tab\n2. Click "Activate" to watch a signal\n3. Enter trades in your brokerage\n4. Log trades in StrikeIQ to track performance'
  }
]

export default function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const Icon = steps[currentStep].icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
    >
      <div className="relative max-w-2xl w-full">
        <button
          onClick={onSkip}
          className="absolute -top-12 right-0 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-surface rounded-2xl border border-border p-12 text-center"
          >
            <div className="flex justify-center mb-8">
              <div className="p-6 bg-primary/20 rounded-full">
                <Icon size={64} className="text-primary" />
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-4">
              {steps[currentStep].title}
            </h2>

            <p className="text-lg text-gray-400 mb-8 whitespace-pre-line leading-relaxed">
              {steps[currentStep].description}
            </p>

            <div className="flex items-center justify-center gap-2 mb-8">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'w-8 bg-primary'
                      : index < currentStep
                      ? 'w-2 bg-primary/50'
                      : 'w-2 bg-surface-lighter'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="btn btn-primary flex items-center justify-center gap-2 mx-auto px-8"
            >
              {currentStep < steps.length - 1 ? (
                <>
                  Next <ArrowRight size={20} />
                </>
              ) : (
                'Get Started'
              )}
            </button>

            {currentStep < steps.length - 1 && (
              <button
                onClick={onSkip}
                className="mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Skip tutorial
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
