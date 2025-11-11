'use client';

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'

import { Alice } from 'next/font/google'
import { cn } from '@/lib/utils'

const alice = Alice({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-alice',
})

export function LoadingTransition() {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<'light' | 'dark'>('light')

  // Track mount so we can safely reference theme values
  useEffect(() => {
    setMounted(true)
  }, [])

  // Update mode whenever next-themes values change
  useEffect(() => {
    const resolved = resolvedTheme ?? theme ?? 'light'
    setMode(resolved === 'dark' ? 'dark' : 'light')
  }, [theme, resolvedTheme])

  // Observe the html class list so toggles applied outside next-themes still update us
  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = document.documentElement

    const updateFromDom = () => {
      if (root.classList.contains('dark')) {
        setMode('dark')
      } else if (root.classList.contains('light')) {
        setMode('light')
      }
    }

    updateFromDom()
    const observer = new MutationObserver(updateFromDom)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const isDark = mode === 'dark'

  const dotColors = React.useMemo(
    () =>
      isDark
        ? ['#51C4D3', '#77ACF1', '#EF88AD']
        : ['#1e3a8a', '#3b82f6', '#60a5fa'],
    [isDark]
  )

  if (!mounted) {
    return (
      <div
        className={cn(
          alice.variable,
          'fixed inset-0 flex items-center justify-center z-50',
          isDark ? 'bg-black' : 'bg-white'
        )}
      >
        <div className="text-center">
          <div className="mb-6" aria-hidden="true" />
          <div className="flex items-center justify-center space-x-2 mt-4">
            <div className="flex space-x-1">
              {dotColors.map((color, index) => (
                <div
                  key={color}
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ backgroundColor: color, animationDelay: `${index * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        alice.variable,
        'fixed inset-0 flex items-center justify-center z-50',
        isDark ? 'bg-black' : 'bg-white'
      )}
    >
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span
            className={cn(
              'alice-regular text-4xl font-normal tracking-wide drop-shadow-lg capitalize',
              isDark ? 'text-white' : 'text-slate-900'
            )}
          >
            Gouache
          </span>
        </motion.div>

        {/* Loading Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex items-center justify-center space-x-2"
        >
          <div className="flex space-x-1">
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: dotColors[0] }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: dotColors[1] }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: dotColors[2] }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
