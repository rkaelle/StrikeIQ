'use client'

import { useSignalStore } from '@/store/signalStore'
import { Filter, X } from 'lucide-react'

export default function SignalFilters() {
  const { filters, setFilters } = useSignalStore()

  const signalTypes = ['0DTE', 'WEEKLY', 'EARNINGS', 'DARK_POOL', 'NEWS']
  const directions = ['CALL', 'PUT']

  const hasActiveFilters = filters.signalType || filters.direction || filters.minConfidence > 0

  const clearFilters = () => {
    setFilters({
      signalType: null,
      direction: null,
      minConfidence: 0,
      ticker: null
    })
  }

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <span className="font-semibold">Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Signal Type */}
        <div className="flex flex-wrap gap-1">
          {signalTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilters({
                signalType: filters.signalType === type ? null : type
              })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.signalType === type
                  ? 'bg-primary text-black'
                  : 'bg-surface-light text-gray-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="w-px bg-border" />

        {/* Direction */}
        <div className="flex gap-1">
          {directions.map((dir) => (
            <button
              key={dir}
              onClick={() => setFilters({
                direction: filters.direction === dir ? null : dir
              })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.direction === dir
                  ? dir === 'CALL' ? 'bg-bullish text-black' : 'bg-bearish text-white'
                  : 'bg-surface-light text-gray-400 hover:text-white'
              }`}
            >
              {dir}
            </button>
          ))}
        </div>

        <div className="w-px bg-border" />

        {/* Min Confidence */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Min Confidence:</span>
          <select
            value={filters.minConfidence}
            onChange={(e) => setFilters({ minConfidence: Number(e.target.value) })}
            className="bg-surface-light border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
          >
            <option value={0}>Any</option>
            <option value={50}>50%+</option>
            <option value={60}>60%+</option>
            <option value={70}>70%+</option>
            <option value={80}>80%+</option>
          </select>
        </div>
      </div>
    </div>
  )
}
