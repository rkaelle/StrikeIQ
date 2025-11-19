'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Activity, List, TrendingUp, BookOpen, Bell, User, LogIn } from 'lucide-react'
import { authService } from '@/services/api'

interface NavbarProps {
  activeTab: 'signals' | 'watchlist' | 'performance' | 'education'
  setActiveTab: (tab: 'signals' | 'watchlist' | 'performance' | 'education') => void
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
  }, [])

  const tabs = [
    { id: 'signals', label: 'Signals', icon: Activity },
    { id: 'watchlist', label: 'Watchlist', icon: List },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'education', label: 'Learn', icon: BookOpen },
  ]

  return (
    <nav className="bg-surface border-b border-border sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold">
              Strike<span className="text-primary">IQ</span>
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'text-primary' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                      transition={{ type: 'spring', duration: 0.3 }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-surface-light rounded-lg transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
            </button>

            {user ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-surface-light rounded-lg transition-colors"
              >
                <User size={20} />
                <span className="hidden sm:inline text-sm">{user.name || 'Dashboard'}</span>
              </button>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-black font-medium rounded-lg transition-colors"
              >
                <LogIn size={18} />
                <span className="hidden sm:inline text-sm">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
