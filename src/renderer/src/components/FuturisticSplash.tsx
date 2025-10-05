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
          className="study-splash-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Main content card */}
          <motion.div
            className="splash-content-card"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.3,
              ease: 'easeOut'
            }}
          >
            {/* Main message */}
            <motion.h1
              className="splash-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Time to refocus
            </motion.h1>

            {/* Activity description */}
            {userActivity && (
              <motion.p
                className="splash-activity-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Detected Activity: {userActivity}
              </motion.p>
            )}

            {/* Call to action button */}
            <motion.button
              className="splash-cta-button"
              onClick={onReturnToSession}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Ready to Lock In
            </motion.button>

            {/* Subtle hint text */}
            <motion.p
              className="splash-hint-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Clicking the button will hide this screen and resume your timer.
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}