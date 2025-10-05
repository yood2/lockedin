import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FuturisticSplashProps {
  isVisible: boolean
  timeAway: number
  onPlaySound: () => void
}

export const FuturisticSplash: React.FC<FuturisticSplashProps> = ({
  isVisible,
  timeAway,
  onPlaySound
}) => {
  const hasPlayedSound = useRef(false)

  useEffect(() => {
    if (isVisible && !hasPlayedSound.current) {
      onPlaySound()
      hasPlayedSound.current = true
    } else if (!isVisible) {
      hasPlayedSound.current = false
    }
  }, [isVisible, onPlaySound])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTitle = () => {
    if (timeAway >= 600) return 'LOCK TF IN'
    return 'GO BACK TO STUDYING'
  }

  const getTitleColor = () => {
    if (timeAway >= 600) return '#ff0040'
    return '#ff4444'
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="futuristic-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Background with glassmorphism effect */}
          <div className="splash-background">
            <div className="glass-overlay" />
            <div className="neon-grid" />
          </div>

          {/* Main content */}
          <motion.div
            className="splash-content"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Title with glitch effect */}
            <motion.h1
              className="splash-title"
              style={{ color: getTitleColor() }}
              animate={{
                textShadow: [
                  '0 0 20px currentColor',
                  '0 0 40px currentColor',
                  '0 0 60px currentColor',
                  '0 0 40px currentColor',
                  '0 0 20px currentColor'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {getTitle()}
            </motion.h1>

            {/* Timer with pulsing effect */}
            <motion.div
              className="splash-timer"
              animate={{
                scale: [1, 1.05, 1],
                textShadow: [
                  '0 0 20px currentColor',
                  '0 0 30px currentColor',
                  '0 0 20px currentColor'
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {formatTime(timeAway)}
            </motion.div>

            {/* Progress bar */}
            <motion.div className="progress-container">
              <motion.div
                className="progress-bar"
                initial={{ width: '0%' }}
                animate={{ 
                  width: timeAway >= 600 ? '100%' : `${(timeAway / 600) * 100}%`
                }}
                transition={{ duration: 0.5 }}
              />
              <motion.div
                className="progress-glow"
                animate={{
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.div>

            {/* Orbiting particles */}
            <div className="orbit-container">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="orbit-particle"
                  animate={{
                    rotate: 360,
                    scale: [0.5, 1, 0.5]
                  }}
                  transition={{
                    rotate: { duration: 4 + i, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity }
                  }}
                  style={{
                    '--orbit-delay': `${i * 0.5}s`,
                    '--orbit-radius': `${100 + i * 20}px`
                  } as React.CSSProperties}
                />
              ))}
            </div>

            {/* Floating particles */}
            <div className="floating-particles">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="floating-particle"
                  animate={{
                    x: [0, Math.random() * 200 - 100],
                    y: [0, Math.random() * 200 - 100],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0]
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 3
                  }}
                />
              ))}
            </div>

            {/* Glitch lines */}
            <div className="glitch-lines">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="glitch-line"
                  animate={{
                    opacity: [0, 1, 0],
                    x: [0, Math.random() * 100 - 50]
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
