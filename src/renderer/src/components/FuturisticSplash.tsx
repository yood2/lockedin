import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FuturisticSplashProps {
  isVisible: boolean
  userActivity?: string
  onReturnToSession: () => void
}

export const FuturisticSplash = ({
  isVisible,
  userActivity,
  onReturnToSession
}: FuturisticSplashProps) => {
  const hasPlayedSound = useRef(false)

  useEffect(() => {
    if (isVisible && !hasPlayedSound.current) {
      playSound()
      hasPlayedSound.current = true
    } else if (!isVisible) {
      hasPlayedSound.current = false
    }
  }, [isVisible])

  const playSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="liquid-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* iOS 26 Liquid Glass Background */}
          <div className="liquid-background">
            <div className="liquid-glass-overlay" />
            <div className="liquid-gradient-orb liquid-orb-1" />
            <div className="liquid-gradient-orb liquid-orb-2" />
            <div className="liquid-gradient-orb liquid-orb-3" />
          </div>

          {/* Main content card */}
          <motion.div
            className="liquid-content-card"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.6,
              ease: [0.34, 1.56, 0.64, 1]
            }}
          >
            {/* Status indicator */}
            <motion.div
              className="liquid-status-badge"
              animate={{
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="liquid-status-dot" />
              <span>Other Activity Detected</span>
            </motion.div>

            {/* Main message */}
            <motion.h1
              className="liquid-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Time to refocus
            </motion.h1>

            {/* Activity description */}
            {userActivity && (
              <motion.p
                className="liquid-activity-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {userActivity}
              </motion.p>
            )}

            {/* Call to action button */}
            <motion.button
              className="liquid-cta-button"
              onClick={onReturnToSession}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="liquid-button-glow" />
              <span className="liquid-button-text">Ready to Lock In</span>
            </motion.button>

            {/* Subtle hint text */}
            <motion.p
              className="liquid-hint-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Return to your session when you're ready
            </motion.p>
          </motion.div>

          {/* Floating particles for ambiance */}
          <div className="liquid-particles">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="liquid-particle"
                animate={{
                  x: [0, Math.random() * 100 - 50],
                  y: [0, Math.random() * 100 - 50],
                  opacity: [0, 0.6, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 4 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "easeInOut"
                }}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}