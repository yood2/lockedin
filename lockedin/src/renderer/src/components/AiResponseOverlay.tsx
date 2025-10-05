import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// --- NEW COMPONENT FOR THE OVERLAY WINDOW'S RENDERER ---
export const AiResponseOverlayContainer = (): React.JSX.Element => {
  const [response, setResponse] = useState('System Initialized...')
  const [isError, setIsError] = useState(false)
  const [showResponse, setShowResponse] = useState(false)
  const hideTimerRef = useRef<number | undefined>(undefined)

  // Use a stable reference for the function
  const dismissOverlay = window.api?.dismissOverlay || (() => {})
  
  const handleAiResponse = useCallback((newResponse: string, error: boolean) => {
    setResponse(newResponse)
    setIsError(error)
    setShowResponse(true)
    
    // Clear any existing timer
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    
    // Set a timer to hide the response content after 10 seconds
    hideTimerRef.current = setTimeout(() => {
      setShowResponse(false)
      dismissOverlay() // Notify main process to enable click-through
    }, 10000) as unknown as number
    
  }, [dismissOverlay])

  useEffect(() => {
    if (!window.api || !window.api.onAiResponse) {
      console.error('API for AI response not available in preload.')
      return
    }

    // Subscribe to AI responses and clean up on unmount
    const cleanup = window.api.onAiResponse(handleAiResponse)
    
    return () => {
      cleanup()
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [handleAiResponse])

  // Click handler to dismiss early
  const handleClick = () => {
    setShowResponse(false)
    dismissOverlay()
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = undefined
  }

  // Use the Orbitron font in the component style for consistency
  const fontFamily = "'Orbitron', 'Courier New', monospace"

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
              padding: '15px 25px',
              backgroundColor: isError ? '#cc4444' : '#1a0a2e',
              borderRadius: '10px',
              border: `1px solid ${isError ? '#ff0040' : '#00ffff'}`,
              boxShadow: `0 0 15px ${isError ? '#ff0040' : '#00ffff'}40, inset 0 0 5px ${isError ? '#ff0040' : '#00ffff'}20`,
              textAlign: 'center',
              fontFamily: fontFamily,
              color: isError ? '#ffcccc' : '#00ffff',
              cursor: 'pointer', // Indicates it can be clicked
              minWidth: '400px',
              maxWidth: '600px'
            }}
            onClick={handleClick}
          >
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {response}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}