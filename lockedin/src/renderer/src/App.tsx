import { useState, useRef, useEffect, useCallback } from 'react'
import { useSimpleEyeTracking } from './hooks/useSimpleEyeTracking'
import { FuturisticSplash } from './components/FuturisticSplash'
import { GazePointer } from './components/EyeTrack'
import { WebGazerCalibration } from './components/WebGazerCalibration'
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
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60)
  const [timeAway, setTimeAway] = useState(0)
  const [showSplash, setShowSplash] = useState(false)
  const [showGazePointer, setShowGazePointer] = useState(true)
  
  const { 
    state: eyeState, 
    webGazerStatus, 
    webGazerError,
    startCalibration, 
    handleCalibrationClick 
  } = useSimpleEyeTracking(null)

  const memoizedOnFinish = useCallback(() => {
    onFinish()
  }, [onFinish])

  useEffect(() => {
    window.api.getSessionIntention().then(i => setIntention(i || 'No intention set'))

    const intervalId = setInterval(() => {
      setTimeLeft(t => {
        if (eyeState.isLookingAtScreen && t > 1) {
          return t - 1
        } else if (t <= 1) {
          clearInterval(intervalId)
          memoizedOnFinish()
          return 0
        }
        return t
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [memoizedOnFinish, eyeState.isLookingAtScreen])

  useEffect(() => {
    let interval: number | undefined;
    if (!eyeState.isLookingAtScreen) {
      interval = setInterval(() => {
        const timeSinceLastLook = Date.now() - eyeState.lastLookTime
        const secondsAway = Math.floor(timeSinceLastLook / 1000)
        setTimeAway(secondsAway)
        
        if (timeSinceLastLook > 10000) {
          setShowSplash(true)
        }
      }, 100) as unknown as number
    } else {
      setTimeAway(0)
      setShowSplash(false)
    }
    return () => clearInterval(interval)
  }, [eyeState.isLookingAtScreen, eyeState.lastLookTime])
  
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const playSound = () => {
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

  const getStatusIndicator = () => {
    switch (webGazerStatus) {
      case 'loading':
        return <div className="status-indicator loading" />;
      case 'error':
        return <div className="status-indicator error" />;
      case 'ready':
        return <div className={`status-indicator ${eyeState.isLookingAtScreen ? 'studying' : 'away'}`} />;
      default:
        return null;
    }
  }

  const getStatusText = () => {
    if (webGazerStatus === 'error') return 'EYE TRACKING ERROR';
    if (webGazerStatus === 'loading') return 'LOADING TRACKER...';
    if (eyeState.isInitialized) {
      return eyeState.isLookingAtScreen ? 'STUDYING' : 'LOOK AWAY DETECTED';
    }
    return 'INITIALIZING...';
  }

  return (
    <>
      <GazePointer
        gazeX={eyeState.gazeX}
        gazeY={eyeState.gazeY}
        isLookingAtScreen={eyeState.isLookingAtScreen}
        isInitialized={eyeState.isInitialized}
        showPointer={showGazePointer}
      />
      
      <div className="session-progress">
        <div className={`study-status ${eyeState.isLookingAtScreen ? 'status-studying' : 'status-away'}`}>
          {getStatusIndicator()}
          {getStatusText()}
        </div> 
        
        <div className="text">Session in progress...</div>
        <div className="intention-display">"{intention}"</div>
        <div className="timer-display">{formatTime(timeLeft)}</div>

        <div className="debug-info">
            <div>Focused Time: {formatTime(eyeState.sessionDuration)}</div>
            {webGazerError && <div className="error-text">Error: {webGazerError}</div>}
            <div>Away for: {timeAway}s</div>
            {eyeState.gazeX !== undefined && 
              <span> | Gaze: ({eyeState.gazeX.toFixed(0)}, {eyeState.gazeY.toFixed(0)})</span>
            }
        </div>
            
        <div className="controls">
          <button onClick={startCalibration} disabled={webGazerStatus !== 'ready' || eyeState.isCalibrating}>
            {eyeState.isCalibrating ? 'Calibrating...' : 'Calibrate Eyes'}
          </button>
          <div className="toggle-switch">
            <input
              type="checkbox"
              id="gaze-toggle"
              checked={showGazePointer}
              onChange={() => setShowGazePointer(!showGazePointer)}
            />
            <label htmlFor="gaze-toggle">Show Pointer</label>
          </div>
        </div>
        
        <div className="actions">
          <button onClick={onHide} className="hide-button">Hide</button>
          <button onClick={onExit} className="exit-button">Exit</button>
        </div>
      </div>
      
      <WebGazerCalibration
        isCalibrating={eyeState.isCalibrating}
        calibrationProgress={eyeState.calibrationProgress}
        points={eyeState.calibrationPoints}
        currentIndex={eyeState.currentCalibrationIndex}
        onPointClick={handleCalibrationClick}
      />

      <FuturisticSplash 
        isVisible={showSplash} 
        timeAway={timeAway} 
        onPlaySound={playSound}
      />
    </>
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