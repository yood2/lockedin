import { useState, useRef, useEffect } from 'react'
import electronLogo from './assets/electron.svg'

// --- Components for different views ---

const IntentionInput = ({ onStartSession }: { onStartSession: (intention: string) => void }): React.JSX.Element => {
  const [intention, setIntention] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (intention.trim()) {
      onStartSession(intention.trim())
    }
  }

  return (
    <form className="intention-input-form" onSubmit={handleSubmit}>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Enter your session intention</div>
      <input
        ref={inputRef}
        type="text"
        value={intention}
        onChange={(e) => setIntention(e.target.value)}
        placeholder="e.g., Focus on coding"
        className="intention-input"
      />
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

const SessionInProgress = ({ onHide, onExit }: { onHide: () => void, onExit: () => void }): React.JSX.Element => {
  const [intention, setIntention] = useState('Loading intention...')

  useEffect(() => {
    window.api.getSessionIntention().then(i => setIntention(i || 'No intention set'))
  }, [])

  return (
    <div className="session-progress">
      <div className="text">Session in progress</div>
      <div className="intention-display">Intention: <code>{intention}</code></div>
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

// --- Main App Component ---

enum AppState {
  Input = 'input',
  Session = 'session',
  Hidden = 'hidden',
}

const sessionViewWidth = 600
const sessionViewHeight = 400

function App(): React.JSX.Element {
  const [appState, setAppState] = useState<AppState>(AppState.Input)

  const handleStartSession = (intention: string) => {
    window.api.setSessionIntention(intention)
    window.api.startSession(sessionViewWidth, sessionViewHeight)
    setAppState(AppState.Session)
  }

  const handleHide = () => {
    window.api.hideSession()
    setAppState(AppState.Hidden)
  }

  const handleShow = () => {
    window.api.showSession(sessionViewWidth, sessionViewHeight)
    setAppState(AppState.Session)
  }

  const handleExit = () => {
    window.api.exitApp()
  }

  // Ensure window is sized correctly on initial state change to session
  useEffect(() => {
    if (appState === AppState.Session) {
      window.api.startSession(sessionViewWidth, sessionViewHeight)
    }
  }, [appState])


  let content
  switch (appState) {
    case AppState.Input:
      content = <IntentionInput onStartSession={handleStartSession} />
      break
    case AppState.Session:
      content = <SessionInProgress onHide={handleHide} onExit={handleExit} />
      break
    case AppState.Hidden:
      content = <HiddenOverlay onShow={handleShow} onExit={handleExit} />
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