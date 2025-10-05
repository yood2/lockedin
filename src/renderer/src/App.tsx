import { useState, useRef, useEffect, useCallback } from 'react'
import { useLockdown } from './hooks/useLockdown'
import { FuturisticSplash } from './components/FuturisticSplash'
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
  onExit: (message: string) => void
  onFinish: () => void
  durationMinutes: number
}): React.JSX.Element => {
  const [intention, setIntention] = useState('Loading intention...')
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60)
  const [showSplash, setShowSplash] = useState(false)
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
    onHide()
  }

  const handleExit = () => {
    console.log('user has locked in', durationMinutes)
    const elapsedSeconds = Math.max(0, durationMinutes * 60 - timeLeft)
    const message = `You've focused for ${formatTime(elapsedSeconds)} so far.`
    onExit(message)
  }

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return (
    <>
      {/* 
        FIX: The webcam video must remain mounted throughout the session to prevent the 
        webcam stream from being lost when the splash screen or overlay is visible. 
        It is now unconditionally rendered but hidden with CSS 'display: none' when needed.
      */}
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
          opacity: 0.5,
          display: showSplash ? 'none' : 'block' // Hide with CSS, not unmount
        }}
        width="640"
        height="480"
        autoPlay
        muted
        playsInline
      />
      
      {/* Main Session View - Hidden only when splash is showing */}
      {!showSplash && (
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
  onExit,
  exitMessage
}: {
  onRestart: () => void
  onExit: () => void
  exitMessage: string
}): React.JSX.Element => {
  type Summary = {
    sessionStart: string
    sessionEnd: string
    totalDurationSec: number
    checks: number
    totalUnfocusedSec: number
    mostCommonDistraction: { activity: string; occurrences: number } | null
    mostUsedAppActivity: { app: string; activity: string; occurrences: number } | null
    focusRatio: number
    longestUnfocusedStreakSec: number
  }

  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    let mounted = true
    window.api
      .getSessionSummary()
      .then((s) => {
        if (mounted) setSummary(s)
      })
      .catch(() => {
        // best-effort; keep UI resilient
      })
    return () => {
      mounted = false
    }
  }, [])

  const formatSeconds = (sec: number) => {
    const minutes = Math.floor(sec / 60)
    const seconds = sec % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const glassCard: React.CSSProperties = {
    position: 'relative',
    borderRadius: 14,
    padding: 16,
    background: 'linear-gradient( to bottom right, rgba(34,34,34,0.65), rgba(34,34,34,0.35) )',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
    backdropFilter: 'blur(18px) saturate(120%)',
    WebkitBackdropFilter: 'blur(18px) saturate(120%)',
    color: '#f5f5f5'
  }

  // Removed label badge

  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    marginTop: 12
  }

  const cell: React.CSSProperties = {
    ...glassCard,
    padding: 12,
    borderRadius: 10
  }

  return (
    <div className="session-finished">
      <div className="text" style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#69e688' }}>
        Session Finished!
      </div>
      <div className="intention-display" style={{ marginBottom: '16px' }}>
        Your locked-in session has ended.{exitMessage && ` ${exitMessage}`}
      </div>

      <div style={glassCard}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Session Summary</div>

        <div style={grid}>
          <div style={cell}>
            <div style={{ fontSize: 12, color: '#c9c9c9' }}>Total duration</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#69e688' }}>
              {summary ? formatSeconds(summary.totalDurationSec) : '--:--'}
            </div>
            <div style={{ fontSize: 11, color: '#9aa0a6' }}>checks: {summary?.checks ?? '—'}</div>
          </div>
          <div style={cell}>
            <div style={{ fontSize: 12, color: '#c9c9c9' }}>Time not locked-in</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ee8686' }}>
              {summary ? formatSeconds(summary.totalUnfocusedSec) : '--:--'}
            </div>
            <div style={{ fontSize: 11, color: '#9aa0a6' }}>Longest streak: {summary ? formatSeconds(summary.longestUnfocusedStreakSec) : '--:--'}</div>
          </div>
          <div style={cell}>
            <div style={{ fontSize: 12, color: '#c9c9c9' }}>Focus ratio</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#c7d4ff' }}>
              {summary ? `${Math.round(summary.focusRatio * 100)}%` : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#9aa0a6' }}>Higher is better</div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={cell}>
            <div style={{ fontSize: 12, color: '#c9c9c9', marginBottom: 6 }}>Most common distraction</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {summary?.mostCommonDistraction ? summary.mostCommonDistraction.activity : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#9aa0a6' }}>
              {summary?.mostCommonDistraction ? `${summary.mostCommonDistraction.occurrences} occurrences` : 'No distractions detected'}
            </div>
          </div>
          <div style={cell}>
            <div style={{ fontSize: 12, color: '#c9c9c9', marginBottom: 6 }}>Most used app/activity</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {summary?.mostUsedAppActivity ? `${summary.mostUsedAppActivity.app} — ${summary.mostUsedAppActivity.activity}` : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#9aa0a6' }}>
              {summary?.mostUsedAppActivity ? `${summary.mostUsedAppActivity.occurrences} detections` : 'Not detected'}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, ...glassCard, padding: 12, borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#c9c9c9' }}>Timestamps</div>
          <div style={{ fontSize: 12, color: '#9aa0a6', marginTop: 4 }}>
            Start: {summary?.sessionStart ? new Date(summary.sessionStart).toLocaleTimeString() : '—'}
            {' • '}End: {summary?.sessionEnd ? new Date(summary.sessionEnd).toLocaleTimeString() : '—'}
          </div>
        </div>
      </div>

      <div className="actions" style={{ marginTop: 16 }}>
        <div className="action">
          <button onClick={onRestart} className="start-button">Start another session</button>
        </div>
        <div className="action">
          <button onClick={onExit} className="exit-button">Exit</button>
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
const finishedViewWidth = 720
const finishedViewHeight = 520

function App(): React.JSX.Element {

  const isOverlay = new URLSearchParams(window.location.search).get('overlay') === 'true'
                  || window.location.hash === '#overlay'

  if (isOverlay) {
    return <AiResponseOverlayContainer />
  }

  const [appState, setAppState] = useState<AppState>(AppState.Input)
  const [duration, setDuration] = useState(25)
  const [exitMessage, setExitMessage] = useState('')

  const handleStartSession = (intention: string, durationMinutes: number) => {
    window.api.setSessionIntention(intention)
    setDuration(durationMinutes)
    window.api.startSession(sessionViewWidth, sessionViewHeight)
    setAppState(AppState.Session)
  }

  const handleFinish = () => {
    window.api.endSession()
    window.api.showSession(finishedViewWidth, finishedViewHeight)
    setExitMessage('') // Reset exit message for normal finish
    setAppState(AppState.Finished)
  }

  const handleExitWithMessage = (message: string) => {
    setExitMessage(message)
    window.api.endSession()
    window.api.showSession(finishedViewWidth, finishedViewHeight)
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
          onExit={handleExitWithMessage}
          onFinish={handleFinish}
          durationMinutes={duration}
        />
      )
      break
    case AppState.Finished:
      content = <SessionFinished onRestart={handleRestart} onExit={handleExit} exitMessage={exitMessage} />
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