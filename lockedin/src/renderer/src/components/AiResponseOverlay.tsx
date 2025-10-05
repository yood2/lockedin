import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export const AiResponseOverlayContainer = (): React.JSX.Element => {
  const [response, setResponse] = useState('System Initialized...')
  const [isError, setIsError] = useState(false)
  const [showResponse, setShowResponse] = useState(false)
  const hideTimerRef = useRef<number | undefined>(undefined)
  const lastBehaviorRef = useRef<string>('')

  const dismissOverlay = window.api?.dismissOverlay || (() => {})
  
  const handleAiResponse = useCallback((newResponse: string, error: boolean) => {
    const lower = (newResponse || '').toLowerCase().trim()

    // Filter trivial responses
    if (lower === 'good job' || lower === 'good job!' || lower === 'good job.') {
      return
    }

    // Behavior detection
    const isFocusedMsg = lower.includes('study') || lower.includes('focus') || lower.includes('work')
    const isDistractedMsg = lower.includes('away') || lower.includes('phone') || lower.includes('distract') || lower.includes('off-task') || lower.includes('social media') || lower.includes('refocus') || lower.includes('valorant')

    const behavior = isDistractedMsg ? 'distracted' : (isFocusedMsg ? 'focused' : 'neutral')

    // Only show if behavior changed or it's a distraction alert
    const behaviorChanged = behavior !== lastBehaviorRef.current
    const shouldShow = behaviorChanged || isDistractedMsg
    if (!shouldShow) return

    lastBehaviorRef.current = behavior

    setResponse(newResponse)
    setIsError(error)
    setShowResponse(true)

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      setShowResponse(false)
      dismissOverlay()
    }, 8000) as unknown as number
  }, [dismissOverlay])

  useEffect(() => {
    if (!window.api || !window.api.onAiResponse) return
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
              backgroundColor: isError ? 'rgba(204, 68, 68, 0.8)' : 'rgba(26, 10, 46, 0.7)',
              borderRadius: '5px',
              border: `1px solid ${isError ? 'rgba(255, 0, 64, 0.6)' : 'rgba(0, 255, 255, 0.4)'}`,
              boxShadow: 'none',
              textAlign: 'center',
              color: isError ? '#ffcccc' : '#00ffff',
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
