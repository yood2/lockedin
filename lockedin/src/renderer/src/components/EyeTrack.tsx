import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimpleEyeTracking } from '../hooks/useSimpleEyeTracking'

interface EyeTrackingOverlayProps {
  onFocusLost: () => void
  onFocusRegained: () => void
}

export const EyeTrackingOverlay: React.FC<EyeTrackingOverlayProps> = ({
  onFocusLost,
  onFocusRegained
}) => {
  const { state, videoRef, initialize, cleanup, toggleLookingState } = useSimpleEyeTracking()
  const [timeAway, setTimeAway] = useState(0)
  const [showOverlay, setShowOverlay] = useState(false)
  const [sessionTime, setSessionTime] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize eye tracking on mount
  useEffect(() => {
    const initEyeTracking = async () => {
      const success = await initialize()
      setIsInitialized(success)
    }
    
    initEyeTracking()
    
    return cleanup
  }, [initialize, cleanup])

  // Track time away from screen
  useEffect(() => {
    if (!state.isLookingAtScreen) {
      const interval = setInterval(() => {
        const timeSinceLastLook = Date.now() - state.lastLookTime
        setTimeAway(Math.floor(timeSinceLastLook / 1000))
        
        // Show overlay after 5 seconds
        if (timeSinceLastLook > 5000) {
          setShowOverlay(true)
          onFocusLost()
        }
        
        // Full screen red overlay after 10 seconds
        if (timeSinceLastLook > 10000) {
          window.api.showFocusOverlay()
        }
      }, 100)
      
      return () => clearInterval(interval)
    } else {
      setTimeAway(0)
      setShowOverlay(false)
      window.api.hideFocusOverlay()
      onFocusRegained()
      return () => {} // Return empty cleanup function
    }
  }, [state.isLookingAtScreen, state.lastLookTime, onFocusLost, onFocusRegained])

  // Track session time (only when looking at screen)
  useEffect(() => {
    if (state.isLookingAtScreen) {
      const interval = setInterval(() => {
        setSessionTime(prev => prev + 1)
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [state.isLookingAtScreen])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusText = () => {
    if (timeAway >= 600) return 'LOCK TF IN'
    if (timeAway >= 10) return 'GO BACK TO STUDYING'
    if (state.isLookingAtScreen) return 'STUDYING'
    return 'FOCUS REQUIRED'
  }

  const getStatusColor = () => {
    if (timeAway >= 600) return '#ff0040' // Bright red for 10+ minutes
    if (timeAway >= 10) return '#ff4444' // Red for 10+ seconds
    if (state.isLookingAtScreen) return '#00ff88' // Green for studying
    return '#ffaa00' // Orange for focus required
  }

  if (!isInitialized) {
    return (
      <div className="eye-tracking-overlay">
        <div className="loading-container">
          <motion.div
            className="loading-spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          <p>Initializing Eye Tracking...</p>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
            Starting camera and initializing tracking...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="eye-tracking-overlay">
      {/* Hidden video element for face detection */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        width="640"
        height="480"
        autoPlay
        muted
        playsInline
      />
      
      {/* Status Display */}
      <motion.div
        className="status-display"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h2
          className="status-text"
          style={{ cursor: 'pointer', color: getStatusColor() }}
          animate={{ 
            textShadow: timeAway >= 10 ? '0 0 20px currentColor' : 'none'
          }}
          transition={{ duration: 0.5, repeat: timeAway >= 10 ? Infinity : 0 }}
          onClick={toggleLookingState}
        >
          {getStatusText()}
        </motion.h2>
        
        {state.isLookingAtScreen && (
          <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
            Click status to test looking away
          </p>
        )}
        
        <div className="timer-display">
          <div className="session-timer">
            <span className="timer-label">Session Time</span>
            <span className="timer-value">{formatTime(sessionTime)}</span>
          </div>
          
          {timeAway > 0 && (
            <motion.div
              className="away-timer"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <span className="timer-label">Time Away</span>
              <span className="timer-value away">{formatTime(timeAway)}</span>
            </motion.div>
          )}
        </div>

        {/* Focus Indicator */}
        <motion.div
          className="focus-indicator"
          animate={{
            backgroundColor: state.isLookingAtScreen ? '#00ff88' : '#ff4444',
            boxShadow: state.isLookingAtScreen 
              ? '0 0 20px #00ff88, inset 0 0 20px rgba(0,255,136,0.3)' 
              : '0 0 20px #ff4444, inset 0 0 20px rgba(255,68,68,0.3)'
          }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="focus-pulse"
            animate={{
              scale: state.isLookingAtScreen ? [1, 1.2, 1] : [1, 0.8, 1],
              opacity: state.isLookingAtScreen ? [0.7, 1, 0.7] : [1, 0.5, 1]
            }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>

      {/* Full Screen Overlay */}
      <AnimatePresence>
        {showOverlay && timeAway >= 10 && (
          <motion.div
            className="full-screen-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="overlay-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <motion.h1
                className="overlay-title"
                animate={{
                  textShadow: [
                    '0 0 20px currentColor',
                    '0 0 40px currentColor',
                    '0 0 20px currentColor'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {timeAway >= 600 ? 'LOCK TF IN' : 'GO BACK TO STUDYING'}
              </motion.h1>
              
              <motion.div
                className="overlay-timer"
                animate={{ 
                  textShadow: [
                    '0 0 20px currentColor',
                    '0 0 40px currentColor',
                    '0 0 20px currentColor'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {formatTime(timeAway)}
              </motion.div>

              {/* Particle Effects */}
              <div className="particles">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="particle"
                    animate={{
                      x: [0, Math.random() * 100 - 50],
                      y: [0, Math.random() * 100 - 50],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
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
    </div>
  )
}
