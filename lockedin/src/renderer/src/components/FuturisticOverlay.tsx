interface FuturisticOverlayProps {
  isVisible: boolean
  isFocused: boolean
  isChecking: boolean
  userActivity: string
  intention: string
  timeLeft: number
  onHide: () => void
  onExit: () => void
}

export const FuturisticOverlay = ({
  isVisible,
  isFocused,
  isChecking,
  userActivity,
  intention,
  timeLeft,
  onHide,
  onExit
}: FuturisticOverlayProps) => {
  if (!isVisible) return null

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return (
    <div className="futuristic-overlay-container">
      <div className="overlay-content">
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
            <button onClick={onHide} className="hide-button">
              Show
            </button>
          </div>
          <div className="action">
            <button onClick={onExit} className="exit-button">
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
