import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export const AiResponseOverlayContainer = (): React.JSX.Element => {
  const [response, setResponse] = useState('System Initialized...')
  const [isError, setIsError] = useState(false)
  const [showResponse, setShowResponse] = useState(false)
  const hideTimerRef = useRef<number | undefined>(undefined)

  const dismissOverlay = window.api?.dismissOverlay || (() => {})

  // Play sound when the overlay becomes visible
  useEffect(() => {
    if (showResponse) {
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
  }, [showResponse])
  
  const handleAiResponse = useCallback((newResponse: string, error: boolean) => {
    setResponse(newResponse)
    setIsError(error)
    
    // Check if response is a short positive feedback (≤4 words)
    const wordCount = newResponse.trim().split(/\s+/).length
    const isShortPositive = wordCount <= 4 && 
      (newResponse.toLowerCase().includes('good job') || 
       newResponse.toLowerCase().includes('great') ||
       newResponse.toLowerCase().includes('well done') ||
       newResponse.toLowerCase().includes('keep it up') ||
       newResponse.toLowerCase().includes('nice work'))
    
    // Don't show overlay for short positive responses
    if (isShortPositive) {
      console.log('🎉 [OVERLAY] Short positive response detected, hiding overlay:', newResponse)
      setShowResponse(false)
      dismissOverlay()
      return
    }
    
    // Show overlay for longer responses or errors
    console.log('📢 [OVERLAY] Showing overlay for response:', newResponse)
    setShowResponse(true)
    
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    
    hideTimerRef.current = setTimeout(() => {
      setShowResponse(false)
      dismissOverlay()
    }, 10000) as unknown as number
    
  }, [dismissOverlay])

  useEffect(() => {
    if (!window.api || !window.api.onAiResponse) {
      console.error('API for AI response not available in preload.')
      return
    }

    const cleanup = window.api.onAiResponse(handleAiResponse)
    
    return () => {
      cleanup()
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [handleAiResponse])

  const handleClick = () => {
    setShowResponse(false)
    dismissOverlay()
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = undefined
  }

  return (
<div id="ai-response-root">
      <AnimatePresence>
        {showResponse && (
          <motion.div
            className="ai-response-box"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', duration: 0.5 }}
            style={{
              padding: '12px 20px',
              // Updated to dark background like the main app card, distinct red for error
              backgroundColor: isError ? 'rgba(150, 40, 40, 0.8)' : 'rgba(34, 34, 34, 0.7)',
              // Updated to match main app card
              borderRadius: '8px',
              border: isError ? '1px solid rgba(255, 85, 85, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)', // Added subtle shadow
              textAlign: 'center',
              // Updated to light text color for better coherence
              color: isError ? '#ffcccc' : '#f5f5f5',
              cursor: 'pointer',
              minWidth: '350px',
              maxWidth: '550px',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)'
            }}
            onClick={handleClick}
          >
            <div style={{ fontSize: '13px', fontWeight: '500' }}>
              {response}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}