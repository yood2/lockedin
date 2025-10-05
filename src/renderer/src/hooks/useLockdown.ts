import { useState, useEffect, useRef } from 'react'

export const useLockdown = () => {
  const [isFocused, setIsFocused] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [userActivity, setUserActivity] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const intervalRef = useRef<number | null>(null)

  const start = () => {
    console.log('🎥 [WEBCAM] Starting webcam initialization...')
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      })
      .then((stream) => {
        console.log('✅ [WEBCAM] Webcam stream obtained:', stream.getTracks().length, 'tracks')
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          console.log('🎥 [WEBCAM] Stream assigned to video element')
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            console.log('🎥 [WEBCAM] Video metadata loaded:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight)
          }
        } else {
          console.warn('⚠️ [WEBCAM] videoRef.current is null')
        }
      })
      .catch((err) => {
        console.error('❌ [WEBCAM] Failed to get webcam access:', err)
      })

    // Check focus every 15 seconds
    intervalRef.current = setInterval(checkFocus, 15000) as unknown as number
    console.log('⏰ [WEBCAM] Focus checking interval started')
  }

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
      console.log('Webcam stream stopped')
    }
  }

  const checkFocus = async () => {
    if (isChecking) {
      console.log('🔄 [FOCUS] Already checking, skipping...')
      return
    }

    if (!videoRef.current) {
      console.warn('⚠️ [FOCUS] videoRef.current is null')
      return
    }

    console.log('🎥 [FOCUS] Video readyState:', videoRef.current.readyState, 'videoWidth:', videoRef.current.videoWidth, 'videoHeight:', videoRef.current.videoHeight)

    if (videoRef.current.readyState < 3) {
      console.log('⏳ [FOCUS] Video not ready yet, skipping...')
      return
    }

    setIsChecking(true)
    console.log('🔍 [FOCUS] Starting focus check...')

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 640
    canvas.height = videoRef.current.videoHeight || 480

    console.log('🎨 [FOCUS] Canvas created:', canvas.width, 'x', canvas.height)

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('❌ [FOCUS] Failed to get canvas context')
      setIsChecking(false)
      return
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    const imageDataUrl = canvas.toDataURL('image/jpeg')
    console.log('📷 [FOCUS] Image captured, size:', imageDataUrl.length, 'characters')

    try {
      console.log('Sending webcam snapshot for focus check...')
      const result = await window.api.checkFocus(imageDataUrl)
      // Support both legacy boolean and new structured response
      if (typeof result === 'boolean') {
        setIsFocused(result)
        setUserActivity('')
        console.log(`Focus check complete. isFocused=${result}`)
      } else {
        setIsFocused(Boolean(result?.focused))
        setUserActivity((result?.user_activity || '').toString())
        console.log(
          `Focus check complete. isFocused=${Boolean(result?.focused)} activity="${(result?.user_activity || '').toString()}"`
        )
      }
    } catch (error) {
      console.error('Focus check failed:', error)
      // Default to focused to avoid interrupting the user on API errors
      setIsFocused(true)
      setUserActivity('')
    } finally {
      setIsChecking(false)
    }
  }

  const resetFocus = () => {
    console.log('Manually resetting focus to true')
    setIsFocused(true)
    setUserActivity('')
  }

  useEffect(() => {
    start()
    return () => {
      stop()
    }
  }, [])

  return {
    isFocused,
    isChecking,
    userActivity,
    videoRef,
    resetFocus,
    stopTracking: stop
  }
}
