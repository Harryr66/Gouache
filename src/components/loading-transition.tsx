'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

export function LoadingTransition() {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || 'dark';
  const isDark = currentTheme === 'dark';

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 ${isDark ? 'bg-black' : 'bg-white'}`}>
      <div className="text-center">
        {/* SOMA Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className={`text-2xl md:text-3xl font-bold drop-shadow-lg ${isDark ? 'text-white' : 'text-black'}`}
              style={{
                textShadow: isDark 
                  ? '0 0 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(255, 255, 255, 0.1)'
                  : '0 0 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 0, 0, 0.1)',
                filter: isDark 
                  ? 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.2))'
                  : 'drop-shadow(0 0 10px rgba(0, 0, 0, 0.2))'
              }}>
            SOMA
          </h1>
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
              className={`w-3 h-3 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className={`w-3 h-3 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className={`w-3 h-3 rounded-full ${isDark ? 'bg-white' : 'bg-black'}`}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
