import { useState, useEffect, useRef } from 'react'

export const useLockdown = () => {
  const [isFocused, setIsFocused] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [userActivity, setUserActivity] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const intervalRef = useRef<number | null>(null)

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
    // Lower quality for speed
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.6)

    try {
      const result = await window.api.checkFocus(imageDataUrl)
      if (typeof result === 'boolean') {
        setIsFocused(result)
        setUserActivity('')
      } else {
        setIsFocused(Boolean(result?.focused))
        setUserActivity((result?.user_activity || '').toString())
      }
    } catch (_error) {
      // Default to focused on errors to avoid interrupting the user
      setIsFocused(true)
      setUserActivity('')
    } finally {
      setIsChecking(false)
    }
  }

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
      })
      .catch((_err) => {
        // swallow
      })

    // Check focus every 15 seconds
    if (!intervalRef.current) {
      intervalRef.current = setInterval(checkFocus, 15000) as unknown as number
    }
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
    }
  }

  const resetFocus = () => {
    // Mark focused and clear activity
    setIsFocused(true)
    setUserActivity('')

    // Ensure camera stream is active
    if (!videoRef.current || !videoRef.current.srcObject) {
      start()
    }

    // Ensure interval is running
    if (!intervalRef.current) {
      intervalRef.current = setInterval(checkFocus, 15000) as unknown as number
    }

    // Kick an immediate check so status updates right away
    setTimeout(() => {
      checkFocus()
    }, 300)
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
