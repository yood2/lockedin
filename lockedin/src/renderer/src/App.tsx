import { useState, useRef, useEffect, useCallback } from 'react'
import { useSimpleEyeTracking } from './hooks/useSimpleEyeTracking'
import { FuturisticSplash } from './components/FuturisticSplash'
// import electronLogo from './assets/electron.svg'

// --- Components for different views ---

const IntentionInput = ({ onStartSession }: { onStartSession: (intention: string, duration: number) => void }): React.JSX.Element => {
  const [intention, setIntention] = useState('')
  const [duration, setDuration] = useState(25)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (intention.trim() && duration > 0 && duration <= 60) {
      onStartSession(intention.trim(), duration)
    }
  }

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value)) {
      if (value < 1) setDuration(1)
      else if (value > 60) setDuration(60)
      else setDuration(value)
    } else {
      setDuration(0)
    }
  }

  return (
    <form className="intention-input-form" onSubmit={handleSubmit}>
      <div className="creator">Enter your session intention</div>
      <input
        ref={inputRef}
        type="text"
        value={intention}
        onChange={(e) => setIntention(e.target.value)}
        placeholder="e.g., Focus on coding"
        className="intention-input"
      />
      <div className="duration-input-container">
        <label htmlFor="duration-input" style={{ fontSize: '14px', color: 'var(--ev-c-text-2)', marginBottom: '5px' }}>
          Duration (mins, max 60)
        </label>
        <input
          id="duration-input"
          type="number"
          min="1"
          max="60"
          value={duration}
          onChange={handleDurationChange}
          placeholder="25"
          className="intention-input duration-input"
        />
      </div>
      <div className="actions">
        <div className="action">
          <button type="submit" className="start-button">
            Start Session
          </button>
        </div>
      </div>
    </form>
  )
}

const CalibrationScreen = ({ onComplete, onSkip }: { onComplete: () => void, onSkip: () => void }): React.JSX.Element => {
  const [clickedPoints, setClickedPoints] = useState<number[]>([])
  const calibrationPoints = [
    { x: 10, y: 10 }, // Top left
    { x: 90, y: 10 }, // Top right
    { x: 50, y: 50 }, // Center
    { x: 10, y: 90 }, // Bottom left
    { x: 90, y: 90 }, // Bottom right
    { x: 30, y: 30 }, // Additional points
    { x: 70, y: 30 },
    { x: 30, y: 70 },
    { x: 70, y: 70 },
  ]

  const handlePointClick = (index: number) => {
    if (!clickedPoints.includes(index)) {
      setClickedPoints([...clickedPoints, index])
      if (clickedPoints.length + 1 >= calibrationPoints.length) {
        setTimeout(onComplete, 500)
      }
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.9)',
      zIndex: 9999
    }}>
      {/* Instructions at the top */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        zIndex: 10001
      }}>
        <div style={{ color: '#fff', fontSize: '24px', marginBottom: '10px' }}>
          Calibration: Click each dot while looking at it
        </div>
        <div style={{ color: '#aaa', fontSize: '14px' }}>
          Progress: {clickedPoints.length} / {calibrationPoints.length}
        </div>
      </div>
      
      {/* Calibration dots - each in its own clickable area */}
      {calibrationPoints.map((point, index) => (
        <div
          key={index}
          onClick={() => handlePointClick(index)}
          style={{
            position: 'absolute',
            left: `${point.x}%`,
            top: `${point.y}%`,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: clickedPoints.includes(index) ? '#69e688' : '#6988e6',
            cursor: 'pointer',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#fff',
            fontWeight: 'bold',
            boxShadow: clickedPoints.includes(index) 
              ? '0 0 20px rgba(105, 230, 136, 0.8)' 
              : '0 0 20px rgba(105, 136, 230, 0.8)',
            transition: 'all 0.3s ease',
            animation: clickedPoints.includes(index) ? 'none' : 'pulse 1s infinite',
            zIndex: 10000,
            userSelect: 'none'
          }}
        >
          {clickedPoints.includes(index) ? '✓' : index + 1}
        </div>
      ))}
      
      <button
        onClick={onSkip}
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          background: '#444',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '14px',
          zIndex: 10001
        }}
      >
        Skip Calibration
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
        }
      `}</style>
    </div>
  )
}

const SessionInProgress = ({ onHide, onExit, onFinish, durationMinutes }: { onHide: () => void, onExit: () => void, onFinish: () => void, durationMinutes: number }): React.JSX.Element => {
  const [intention, setIntention] = useState('Loading intention...')
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60) // Time left in seconds
  const [timeAway, setTimeAway] = useState(0)
  const [showSplash, setShowSplash] = useState(false)
  const [showCalibration, setShowCalibration] = useState(true)
  const [isCalibrated, setIsCalibrated] = useState(false)
  const intervalRef = useRef<number | undefined>(undefined)
  
  // Eye tracking
  const { state: eyeState, videoRef, initialize, cleanup, toggleLookingState } = useSimpleEyeTracking()

  const handleCalibrationComplete = () => {
    setShowCalibration(false)
    setIsCalibrated(true)
  }

  const handleSkipCalibration = () => {
    setShowCalibration(false)
    setIsCalibrated(false)
  }

  const memoizedOnFinish = useCallback(() => {
    onFinish()
  }, [onFinish])

  // Initialize eye tracking
  useEffect(() => {
    const initEyeTracking = async () => {
      await initialize()
    }
    initEyeTracking()
    return cleanup
  }, [initialize, cleanup])

  useEffect(() => {
    window.api.getSessionIntention().then(i => setIntention(i || 'No intention set'))

    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        // Only count down if user is looking at screen
        if (eyeState.isLookingAtScreen && t > 1) {
          return t - 1
        } else if (t <= 1) {
          clearInterval(intervalRef.current)
          memoizedOnFinish()
          return 0
        }
        return t // Don't count down if not looking at screen
      })
    }, 1000) as unknown as number

    return () => clearInterval(intervalRef.current)
  }, [memoizedOnFinish, eyeState.isLookingAtScreen])

  // Track time away from screen
  useEffect(() => {
    if (!eyeState.isLookingAtScreen) {
      const interval = setInterval(() => {
        const timeSinceLastLook = Date.now() - eyeState.lastLookTime
        const secondsAway = Math.floor(timeSinceLastLook / 1000)
        setTimeAway(secondsAway)
        
        // Show splash after 10 seconds
        if (timeSinceLastLook > 10000) {
          setShowSplash(true)
          console.log('Splash screen triggered after', secondsAway, 'seconds away')
        }
      }, 100)
      
      return () => clearInterval(interval)
    } else {
      setTimeAway(0)
      setShowSplash(false)
      console.log('User is back - hiding splash screen')
      return () => {} // Return empty cleanup function
    }
  }, [eyeState.isLookingAtScreen, eyeState.lastLookTime])

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const playSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  // Show calibration if needed
  if (showCalibration) {
    return (
      <>
        <video
          ref={videoRef}
          style={{ display: 'none' }}
          width="640"
          height="480"
          autoPlay
          muted
          playsInline
        />
        <CalibrationScreen 
          onComplete={handleCalibrationComplete}
          onSkip={handleSkipCalibration}
        />
      </>
    )
  }

return (
    <>
      {/* Hidden video element for fallback detection */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        width="640"
        height="480"
        autoPlay
        muted
        playsInline
      />
      
      {/* Focus Box Indicator - Shows where you need to look */}
      <div 
        style={{
          position: 'fixed',
          left: '40%',
          top: '40%',
          width: '20%',
          height: '20%',
          border: eyeState.isLookingAtScreen ? '3px solid #69e688' : '3px solid #ff6b6b',
          borderRadius: '8px',
          pointerEvents: 'none',
          zIndex: 1000,
          boxShadow: eyeState.isLookingAtScreen 
            ? '0 0 20px rgba(105, 230, 136, 0.5)' 
            : '0 0 20px rgba(255, 107, 107, 0.5)',
          transition: 'all 0.3s ease'
        }}
      >
        <div 
          style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: eyeState.isLookingAtScreen ? '#69e688' : '#ff6b6b',
            color: '#000',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}
        >
          {eyeState.isLookingAtScreen ? '✓ In Focus' : '✗ Look Here'}
        </div>
      </div>
      
      {/* Gaze Point Indicator - Shows where WebGazer thinks you're looking */}
      {eyeState.gazeX !== undefined && eyeState.gazeY !== undefined && (
        <div
          style={{
            position: 'fixed',
            left: `${eyeState.gazeX}px`,
            top: `${eyeState.gazeY}px`,
            width: '20px',
            height: '20px',
            background: 'rgba(255, 0, 0, 0.7)',
            border: '2px solid #fff',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 1001,
            transition: 'all 0.1s ease'
          }}
        />
      )}
      
      <div className="session-progress">
        {/* Study Status Indicator - Corrected to ensure proper closing tag */}
        <div 
          className={`study-status ${eyeState.isLookingAtScreen ? 'status-studying' : 'status-away'}`}
          onClick={toggleLookingState}
          style={{ cursor: 'pointer' }}
          title="Click to toggle eye tracking state for testing"
        >
          <div className="status-indicator" />
          {eyeState.isLookingAtScreen ? 'STUDYING' : 'LOOK AWAY DETECTED'}
        </div> 
        
        <div className="text">Session in progress...</div>
        <div className="intention-display">"{intention}"</div>
        <div className="timer-display" style={{ fontSize: '32px', fontWeight: 'bold', margin: '15px 0', color: '#6988e6' }}>
          {formatTime(timeLeft)}
        </div>

        {/* Session Duration from Eye Tracking */}
        {eyeState.isInitialized && (
          <div style={{ fontSize: '14px', color: '#888', marginTop: '10px' }}>
            Focused Time: {formatTime(eyeState.sessionDuration)}
          </div>
        )}
        
        {/* Eye Tracking Instructions */}
        {eyeState.isInitialized && (
          <div style={{ fontSize: '11px', color: '#888', marginTop: '15px', textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ marginBottom: '8px', color: '#aaa' }}>
              📍 Red dot shows where you're looking • Keep your eyes in the {isCalibrated ? 'green' : 'red'} box
            </div>
          </div>
        )}

        {/* Debug Info and Buttons */}
        {eyeState.isInitialized && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
            <div>
              WebGazer: {eyeState.isLookingAtScreen ? 'Looking at screen' : 'Looking away'} | 
              Away for: {timeAway}s
              {eyeState.gazeX !== undefined && eyeState.gazeY !== undefined && (
                <span> | Gaze: ({eyeState.gazeX.toFixed(0)}, {eyeState.gazeY.toFixed(0)})</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                onClick={() => setShowCalibration(true)}
                style={{ 
                  padding: '2px 6px', 
                  fontSize: '10px',
                  background: '#6988e6',
                  color: '#fff',
                  border: '1px solid #8aa8ff',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Recalibrate
              </button>
              <button 
                onClick={() => setShowSplash(!showSplash)}
                style={{ 
                  padding: '2px 6px', 
                  fontSize: '10px',
                  background: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Test Splash
              </button>
              <button 
                onClick={toggleLookingState}
                style={{ 
                  padding: '2px 6px', 
                  fontSize: '10px',
                  background: '#444',
                  color: '#fff',
                  border: '1px solid #666',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Toggle Eye State
              </button>
            </div>
          </div>
        )}
        
        {/* Unified Actions block */}
        <div className="actions" style={{ marginTop: '20px' }}>
          <div className="action">
            <button onClick={onHide} className="hide-button">
              Hide
            </button>
          </div>
          <div className="action">
            <button onClick={onExit} className="exit-button">
              Exit
            </button>
          </div>
        </div>
      </div>
      
      {/* Futuristic Splash Screen */}
      <FuturisticSplash 
        isVisible={showSplash} 
        timeAway={timeAway} 
        onPlaySound={playSound}
      />
    </>
  )
}

const HiddenOverlay = ({ onShow, onExit }: { onShow: () => void, onExit: () => void }): React.JSX.Element => {
  return (
    <div className="hidden-overlay">
      <button onClick={onShow} className="show-button">
        L
      </button>
      <button onClick={onExit} className="exit-hidden-button">
        &times;
      </button>
    </div>
  )
}

const SessionFinished = ({ onRestart, onExit }: { onRestart: () => void, onExit: () => void }): React.JSX.Element => {
  return (
    <div className="session-finished">
      <div className="text" style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#69e688'}}>
        Session Finished!
      </div>
      <div className="intention-display" style={{marginBottom: '20px'}}>
        Your locked-in session has ended. Good work!
      </div>
      <div className="actions">
        <div className="action">
          <button onClick={onRestart} className="start-button">
            Start another session
          </button>
        </div>
        <div className="action">
          <button onClick={onExit} className="exit-button">
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Main App Component ---

enum AppState {
  Input = 'input',
  Session = 'session',
  Finished = 'finished',
}

const sessionViewWidth = 600
const sessionViewHeight = 400
const inputViewWidth = 400
const inputViewHeight = 260

function App(): React.JSX.Element {
  const [appState, setAppState] = useState<AppState>(AppState.Input)
  const [duration, setDuration] = useState(25)

  const handleStartSession = (intention: string, durationMinutes: number) => {
    window.api.setSessionIntention(intention)
    setDuration(durationMinutes)
    window.api.startSession(sessionViewWidth, sessionViewHeight)
    setAppState(AppState.Session)
  }

  const handleFinish = () => {
    window.api.showSession(inputViewWidth, inputViewHeight)
    setAppState(AppState.Finished)
  }

  const handleMinimize = () => {
    window.api.minimizeWindow()
  }

  const handleRestart = () => {
    window.api.showSession(inputViewWidth, inputViewHeight)
    setAppState(AppState.Input)
  }

  const handleExit = () => {
    window.api.exitApp()
  }

  let content
  switch (appState) {
    case AppState.Input:
      content = <IntentionInput onStartSession={handleStartSession} />
      break
    case AppState.Session:
      content = <SessionInProgress onHide={handleMinimize} onExit={handleExit} onFinish={handleFinish} durationMinutes={duration} />
      break
    case AppState.Finished:
      content = <SessionFinished onRestart={handleRestart} onExit={handleExit} />
      break
    default:
      content = null
  }

  return (
    <div id="root-content" className={`app-state-${appState}`}>
      {content}
    </div>
  )
}

export default App