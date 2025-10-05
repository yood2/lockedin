import { useState, useRef, useEffect, useCallback } from 'react'
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

const SessionInProgress = ({ onHide, onExit, onFinish, durationMinutes }: { onHide: () => void, onExit: () => void, onFinish: () => void, durationMinutes: number }): React.JSX.Element => {
  const [intention, setIntention] = useState('Loading intention...')
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60) // Time left in seconds
  const intervalRef = useRef<number>()

  const memoizedOnFinish = useCallback(() => {
    onFinish()
  }, [onFinish])

  useEffect(() => {
    window.api.getSessionIntention().then(i => setIntention(i || 'No intention set'))

    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current)
          memoizedOnFinish()
          return 0
        }
        return t - 1
      })
    }, 1000) as unknown as number

    return () => clearInterval(intervalRef.current)
  }, [memoizedOnFinish])

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return (
    <div className="session-progress">
      <div className="text">Session in progress</div>
      <div className="intention-display">Intention: <code>{intention}</code></div>
      <div className="timer-display" style={{ fontSize: '32px', fontWeight: 'bold', margin: '15px 0', color: '#6988e6' }}>
        {formatTime(timeLeft)}
      </div>
      <div className="actions">
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
  Hidden = 'hidden',
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

  const handleHide = () => {
    window.api.hideSession(sessionViewWidth)
    setAppState(AppState.Hidden)
  }

  const handleShow = () => {
    window.api.showSession(sessionViewWidth, sessionViewHeight)
    setAppState(AppState.Session)
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
      content = <SessionInProgress onHide={handleHide} onExit={handleExit} onFinish={handleFinish} durationMinutes={duration} />
      break
    case AppState.Hidden:
      content = <HiddenOverlay onShow={handleShow} onExit={handleExit} />
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