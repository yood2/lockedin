import { useState, useRef, useEffect, useCallback } from 'react'
import { useLockdown } from './hooks/useLockdown'
import { FuturisticSplash } from './components/FuturisticSplash'
import { FuturisticOverlay } from './components/FuturisticOverlay'
import { AnimatePresence, motion } from 'framer-motion'
import { AiResponseOverlayContainer } from './components/AiResponseOverlay'

// --- Components for different views ---

const IntentionInput = ({
  onStartSession
}: {
  onStartSession: (intention: string, duration: number) => void
}): React.JSX.Element => {
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
        <label
          htmlFor="duration-input"
          style={{ fontSize: '14px', color: 'var(--ev-c-text-2)', marginBottom: '5px' }}
        >
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

const SessionInProgress = ({
  onHide,
  onExit,
  onFinish,
  durationMinutes
}: {
  onHide: () => void
  onExit: () => void
  onFinish: () => void
  durationMinutes: number
}): React.JSX.Element => {
  const [intention, setIntention] = useState('Loading intention...')
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60)
  const [showSplash, setShowSplash] = useState(false)
  const [isOverlayVisible, setIsOverlayVisible] = useState(false)
  const intervalRef = useRef<number | undefined>(undefined)

  // Vision-based focus tracking
  const { isFocused, isChecking, userActivity, videoRef, resetFocus } = useLockdown()

  const memoizedOnFinish = useCallback(() => {
    onFinish()
  }, [onFinish])

  useEffect(() => {
    window.api.getSessionIntention().then((i) => setIntention(i || 'No intention set'))

    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (isFocused && t > 1) {
          return t - 1
        } else if (t <= 1) {
          clearInterval(intervalRef.current)
          memoizedOnFinish()
          return 0
        }
        return t
      })
    }, 1000) as unknown as number

    return () => clearInterval(intervalRef.current)
  }, [memoizedOnFinish, isFocused])

  // Show splash screen when not focused (other activity detected)
  useEffect(() => {
    console.log('Focus/Activity changed:', { isFocused, userActivity, showSplash })
    
    if (!isFocused && userActivity) {
      console.log('✅ Off-task detected, showing splash:', userActivity)
      setShowSplash(true)
    } else if (!isFocused && !userActivity) {
      console.log('⚠️ Off-task but no userActivity yet')
    } else if (isFocused) {
      console.log('✓ User is focused')
    }
  }, [isFocused, userActivity])

  const handleReturnToSession = () => {
    console.log('User clicked Ready to Lock In button')
    // Reset focus state to "STUDYING" and resume timer
    resetFocus()
    // Hide splash after resetting focus
    setShowSplash(false)
    console.log('User returned to session - focus reset to true, splash hidden')
  }

  const handleHide = () => {
    setIsOverlayVisible(true)
    onHide()
  }

  const handleExit = () => {
    setIsOverlayVisible(false)
    onExit()
  }

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return (
    <>
      {/* Main Session View - Hidden when overlay is active OR splash is showing */}
      {!isOverlayVisible && !showSplash && (
        <>
          <video
            ref={videoRef}
            style={{
              position: 'fixed',
              top: '10px',
              left: '10px',
              width: '120px',
              height: '90px',
              borderRadius: '4px',
              objectFit: 'cover',
              opacity: 0.5
            }}
            width="640"
            height="480"
            autoPlay
            muted
            playsInline
          />

          <div className="session-progress">
            <div className={`study-status ${isFocused ? 'status-studying' : 'status-away'}`}>
              <div className="status-indicator" />
              {isFocused ? 'STUDYING' : 'OFF-TASK DETECTED'}
            </div>

            {!isFocused && userActivity && (
              <div style={{ fontSize: '12px', color: '#ee8686', marginTop: '4px' }}>
                {userActivity}
              </div>
            )}

            <div className="text">Session in progress...</div>
            <div className="intention-display">"{intention}"</div>
            <div
              className="timer-display"
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                margin: '15px 0',
                color: '#6988e6'
              }}
            >
              {formatTime(timeLeft)}
            </div>

            {isChecking && (
              <div style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
                Checking focus...
              </div>
            )}

            <div className="actions" style={{ marginTop: '20px' }}>
              <div className="action">
                <button onClick={handleHide} className="hide-button">
                  Hide
                </button>
              </div>
              <div className="action">
                <button onClick={handleExit} className="exit-button">
                  Exit
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Futuristic Overlay - Hidden when splash is showing */}
      {!showSplash && (
        <FuturisticOverlay
          isVisible={isOverlayVisible}
          isFocused={isFocused}
          isChecking={isChecking}
          userActivity={userActivity}
          intention={intention}
          timeLeft={timeLeft}
          onHide={() => setIsOverlayVisible(false)}
          onExit={handleExit}
        />
      )}

      {/* Splash Screen for other activity detected - Takes over entire screen */}
      <FuturisticSplash
        isVisible={showSplash}
        userActivity={userActivity}
        onReturnToSession={handleReturnToSession}
      />
    </>
  )
}

const SessionFinished = ({
  onRestart,
  onExit
}: {
  onRestart: () => void
  onExit: () => void
}): React.JSX.Element => {
  return (
    <div className="session-finished">
      <div
        className="text"
        style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#69e688' }}
      >
        Session Finished!
      </div>
      <div className="intention-display" style={{ marginBottom: '20px' }}>
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
  Finished = 'finished'
}

const sessionViewWidth = 600
const sessionViewHeight = 400
const inputViewWidth = 400
const inputViewHeight = 260

function App(): React.JSX.Element {

  const isOverlay = new URLSearchParams(window.location.search).get('overlay') === 'true'
                  || window.location.hash === '#overlay'

  if (isOverlay) {
    return <AiResponseOverlayContainer />
  }

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
      content = (
        <SessionInProgress
          onHide={handleMinimize}
          onExit={handleExit}
          onFinish={handleFinish}
          durationMinutes={duration}
        />
      )
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