import { useState, useEffect, useRef, useCallback } from 'react'

// WebGazer types
interface WebGazerPrediction {
  x: number
  y: number
}

interface EyeTrackingState {
  isLookingAtScreen: boolean
  lastLookTime: number
  sessionDuration: number // in seconds
  isInitialized: boolean
  gazeX?: number
  gazeY?: number
}

// Declare WebGazer global
declare global {
  interface Window {
    webgazer: {
      begin: () => Promise<void>
      end: () => void
      pause: () => void
      resume: () => void
      setGazeListener: (callback: (data: WebGazerPrediction | null, clock: number) => void) => void
      setRegression: (regression: string) => void
      showVideoPreview: (show: boolean) => void
      showFaceOverlay: (show: boolean) => void
      showFaceFeedbackBox: (show: boolean) => void
    }
  }
}

export const useSimpleEyeTracking = () => {
  const [state, setState] = useState<EyeTrackingState>({
    isLookingAtScreen: true,
    lastLookTime: Date.now(),
    sessionDuration: 0,
    isInitialized: false
  })
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const durationIntervalRef = useRef<number | null>(null)
  const lookAwayTimerRef = useRef<number | null>(null)
  const fallbackIntervalRef = useRef<number | null>(null)

  const initialize = useCallback(async () => {
    try {
      if (!window.webgazer) {
        console.error('WebGazer not loaded')
        return false
      }

      console.log('Initializing WebGazer...')
      
      window.webgazer.setRegression('ridge')
      window.webgazer.showVideoPreview(true) // Show video preview for calibration
      window.webgazer.showFaceOverlay(true) // Show face overlay for debugging
      window.webgazer.showFaceFeedbackBox(true) // Show feedback box
      
      window.webgazer.setGazeListener((data: WebGazerPrediction | null, clock: number) => {
        const now = Date.now()
        
        // Define a very small center box for focused studying
        // These values create a box in the center of the screen
        const screenWidth = window.innerWidth
        const screenHeight = window.innerHeight
        
        // Make the box VERY small - only 20% of screen width and height, centered
        const boxWidth = screenWidth * 0.2
        const boxHeight = screenHeight * 0.2
        const boxLeft = (screenWidth - boxWidth) / 2
        const boxRight = boxLeft + boxWidth
        const boxTop = (screenHeight - boxHeight) / 2
        const boxBottom = boxTop + boxHeight
        
        // Check if gaze is within the small center box
        let isLookingAtScreen = false
        if (data !== null) {
          const { x, y } = data
          isLookingAtScreen = (
            x >= boxLeft && 
            x <= boxRight && 
            y >= boxTop && 
            y <= boxBottom
          )
          
          if (!isLookingAtScreen) {
            console.log(`Gaze outside bounds: (${x.toFixed(0)}, ${y.toFixed(0)}) - Box: ${boxLeft.toFixed(0)}-${boxRight.toFixed(0)} x ${boxTop.toFixed(0)}-${boxBottom.toFixed(0)}`)
          }
        } else {
          console.log('WebGazer - No face detected')
        }

        if (isLookingAtScreen) {
          if (lookAwayTimerRef.current) {
            clearTimeout(lookAwayTimerRef.current)
            lookAwayTimerRef.current = null
          }
          
          setState(prev => ({
            ...prev,
            isLookingAtScreen: true,
            lastLookTime: now,
            gazeX: data!.x,
            gazeY: data!.y,
            isInitialized: true
          }))
          
        } else {
          if (state.isLookingAtScreen) {
            setState(prev => ({
              ...prev,
              isLookingAtScreen: false,
              isInitialized: true
            }))
            console.log('WebGazer - User is looking away from center box')
          }
        }
      })
      
      await window.webgazer.begin()
      
      console.log('WebGazer initialized successfully')
      return true
      
    } catch (error) {
      console.error('Failed to initialize WebGazer:', error)
      console.log('Falling back to simple camera detection...')
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          } 
        })
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          
          const checkForFace = () => {
            if (!videoRef.current) return
            
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) return
            
            canvas.width = videoRef.current.videoWidth
            canvas.height = videoRef.current.videoHeight
            ctx.drawImage(videoRef.current, 0, 0)
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data
            
            let totalBrightness = 0
            let pixelCount = 0
            
            for (let i = 0; i < data.length; i += 4) {
              const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
              totalBrightness += brightness
              pixelCount++
            }
            
            const averageBrightness = totalBrightness / pixelCount
            const hasFace = averageBrightness > 30 && averageBrightness < 200
            
            setState(prev => ({
              ...prev,
              isLookingAtScreen: hasFace,
              lastLookTime: hasFace ? Date.now() : prev.lastLookTime,
              isInitialized: true
            }))
          }
          
          fallbackIntervalRef.current = setInterval(checkForFace, 500) as unknown as number
          return true
        }
      } catch (fallbackError) {
        console.error('Fallback detection also failed:', fallbackError)
      }
      
      return false
    }
  }, [state.isLookingAtScreen])

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    
    if (lookAwayTimerRef.current) {
      clearTimeout(lookAwayTimerRef.current)
      lookAwayTimerRef.current = null
    }
    
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current)
      fallbackIntervalRef.current = null
    }
    
    if (window.webgazer) {
      try {
        window.webgazer.end()
        console.log('WebGazer stopped')
      } catch (error) {
        console.error('Error stopping WebGazer:', error)
      }
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }, [])

  const toggleLookingState = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLookingAtScreen: !prev.isLookingAtScreen,
      lastLookTime: prev.isLookingAtScreen ? Date.now() : prev.lastLookTime
    }))
  }, [])

  useEffect(() => {
    if (state.isLookingAtScreen && state.isInitialized) {
      durationIntervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          sessionDuration: prev.sessionDuration + 1
        }))
      }, 1000) as unknown as number
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
    }
  }, [state.isLookingAtScreen, state.isInitialized])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    state,
    videoRef,
    initialize,
    cleanup,
    toggleLookingState
  }
}