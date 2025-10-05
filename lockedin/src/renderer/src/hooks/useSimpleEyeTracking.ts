import { useState, useEffect, useRef, useCallback } from "react"

interface WebGazerPrediction {
  x: number
  y: number
}

// Declare WebGazer global
declare global {
  interface Window {
    webgazer: {
      begin: () => Promise<void>
      end: () => void
      pause: () => void
      resume: () => void
      setGazeListener: (callback: (data: WebGazerPrediction | null) => void) => void
      setRegression: (regression: string) => void
      setTracker: (tracker: string) => void
      showVideoPreview: (show: boolean) => void
      showFaceOverlay: (show: boolean) => void
      showFaceFeedbackBox: (show: boolean) => void
    }
  }
}

interface EyeTrackingState {
  isLookingAtScreen: boolean
  lastLookTime: number
  sessionDuration: number
  isInitialized: boolean
  gazeX?: number
  gazeY?: number
}

export function useSimpleEyeTracking() {
  const [state, setState] = useState<EyeTrackingState>({
    isLookingAtScreen: true,
    lastLookTime: Date.now(),
    sessionDuration: 0,
    isInitialized: false
  })

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const lookAwayTimerRef = useRef<number | null>(null)
  const durationIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !("webgazer" in window)) {
      console.log('WebGazer not available, using fallback detection')
      // Fallback to simple detection
      setState(prev => ({ ...prev, isInitialized: true }))
      return
    }

    console.log('Initializing WebGazer...')

    window.webgazer.setRegression("ridge")
    window.webgazer.setTracker("clmtrackr")
    window.webgazer.setGazeListener((data: WebGazerPrediction | null) => {
        const now = Date.now()
        const latest = stateRef.current
        const MARGIN = 150

        const isGazeOnScreen =
          !!data &&
          !Number.isNaN(data.x) &&
          !Number.isNaN(data.y) &&
          data.x >= -MARGIN &&
          data.x <= window.innerWidth + MARGIN &&
          data.y >= -MARGIN &&
          data.y <= window.innerHeight + MARGIN

        if (isGazeOnScreen) {
          if (lookAwayTimerRef.current) {
            clearTimeout(lookAwayTimerRef.current)
            lookAwayTimerRef.current = null
          }

          setState(prev => ({
            ...prev,
            isLookingAtScreen: true,
            lastLookTime: now,
            gazeX: data?.x,
            gazeY: data?.y
          }))
          return
        }

        if (latest.isLookingAtScreen && !lookAwayTimerRef.current) {
          lookAwayTimerRef.current = window.setTimeout(() => {
            setState(prev => ({
              ...prev,
              isLookingAtScreen: false
            }))
            lookAwayTimerRef.current = null
          }, 10000) // 10 seconds for splash screen
        }
      })

    window.webgazer.begin()
      .then(() => {
        console.log('WebGazer initialized successfully')
        setState(prev => ({ ...prev, isInitialized: true }))
      })
      .catch((error) => {
        console.error('WebGazer initialization failed:', error)
        setState(prev => ({ ...prev, isInitialized: true }))
      })

    return () => {
      if (lookAwayTimerRef.current) {
        clearTimeout(lookAwayTimerRef.current)
        lookAwayTimerRef.current = null
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
      if ("webgazer" in window) {
        try {
          window.webgazer.end()
          console.log('WebGazer stopped')
        } catch (error) {
          console.error('Error stopping WebGazer:', error)
        }
      }
    }
  }, [])

  const toggleLookingState = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLookingAtScreen: !prev.isLookingAtScreen,
      lastLookTime: !prev.isLookingAtScreen ? Date.now() : prev.lastLookTime
    }))
  }, [])

  useEffect(() => {
    if (state.isLookingAtScreen && state.isInitialized) {
      durationIntervalRef.current = window.setInterval(() => {
        setState(prev => ({
          ...prev,
          sessionDuration: prev.sessionDuration + 1
        }))
      }, 1000)
    } else if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
    }
  }, [state.isLookingAtScreen, state.isInitialized])

  return {
    ...state,
    toggleLookingState
  }
}
