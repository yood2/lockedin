import { useState, useEffect, useRef } from 'react'

export const useLockdown = () => {
  const [isFocused, setIsFocused] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [userActivity, setUserActivity] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const intervalRef = useRef<number | null>(null)

  const start = () => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        console.log('Webcam stream started')
      })
      .catch((err) => {
        console.error('Failed to get webcam access:', err)
      })

    // Check focus every 15 seconds
    intervalRef.current = setInterval(checkFocus, 15000) as unknown as number
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
    if (isChecking || !videoRef.current || videoRef.current.readyState < 3) {
      return
    }

    setIsChecking(true)

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setIsChecking(false)
      return
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    // Use lower quality JPEG (0.6) for faster upload and processing
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.6)

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
    
    // Restart the focus check interval if it was stopped
    if (!intervalRef.current) {
      console.log('Restarting focus check interval')
      intervalRef.current = setInterval(checkFocus, 15000) as unknown as number
    }
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
    resetFocus
  }
}
