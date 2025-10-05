import * as React from 'react'

interface GazePointerProps {
  gazeX?: number
  gazeY?: number
  isLookingAtScreen: boolean
  isInitialized: boolean
  showDebugInfo?: boolean
  showPointer?: boolean;
}

export const GazePointer: React.FC<GazePointerProps> = ({
  gazeX,
  gazeY,
  isLookingAtScreen,
  isInitialized,
  showDebugInfo = false,
  showPointer = true,
}) => {
  if (!isInitialized || gazeX === undefined || gazeY === undefined || !showPointer) {
    return null
  }

  const pointerStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${gazeX}px`,
    top: `${gazeY}px`,
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: isLookingAtScreen ? 'rgba(105, 232, 110, 0.7)' : 'rgba(255, 69, 58, 0.7)',
    border: `3px solid ${isLookingAtScreen ? '#4CAF50' : '#F44336'}`,
    boxShadow: `0 0 15px 5px ${isLookingAtScreen ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`,
    pointerEvents: 'none',
    zIndex: 9999,
    transform: 'translate(-50%, -50%)',
    transition: 'all 0.1s ease-out'
  }

  const crosshairStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '2px',
    height: '2px',
    backgroundColor: 'white',
    transform: 'translate(-50%, -50%)',
    borderRadius: '2px'
  }

  const debugInfoStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '10px',
    borderRadius: '5px',
    fontSize: '12px',
    fontFamily: 'monospace',
    zIndex: 10000,
    maxWidth: '300px'
  }

  return (
    <>
      {/* Gaze Pointer */}
      <div style={pointerStyle}>
        <div style={crosshairStyle} />
      </div>

      {/* Debug Info */}
      {showDebugInfo && (
        <div style={debugInfoStyle}>
          <div>Gaze: ({gazeX.toFixed(0)}, {gazeY.toFixed(0)})</div>
          <div>Status: {isLookingAtScreen ? 'ON SCREEN' : 'OFF SCREEN'}</div>
          <div>Screen: {window.innerWidth}×{window.innerHeight}</div>
          <div style={{ color: '#888', fontSize: '10px', marginTop: '5px' }}>
            Red dot tracks the latest gaze point.<br />
            Status indicates if WebGazer thinks you are on-screen.
          </div>
        </div>
      )}
    </>
  )
}

// Legacy component for backward compatibility
interface EyeTrackingOverlayProps {
  onFocusLost: () => void
  onFocusRegained: () => void
}

interface CalibrationOverlayProps {
  isCalibrating: boolean
  calibrationProgress: number
  currentPoint?: { x: number; y: number }
}

export const CalibrationOverlay: React.FC<CalibrationOverlayProps> = ({
  isCalibrating,
  calibrationProgress,
  currentPoint
}) => {
  if (!isCalibrating) return null

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
    color: 'white',
    fontFamily: 'monospace'
  }

  const pointStyle: React.CSSProperties = {
    position: 'absolute',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: '#4CAF50',
    border: '3px solid white',
    boxShadow: '0 0 20px rgba(76, 175, 80, 0.8)',
    left: currentPoint ? `${currentPoint.x * 100}%` : '50%',
    top: currentPoint ? `${currentPoint.y * 100}%` : '50%',
    transform: 'translate(-50%, -50%)',
    animation: 'pulse 1s infinite'
  }

  const progressStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '50px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '300px',
    height: '20px',
    backgroundColor: '#333',
    borderRadius: '10px',
    overflow: 'hidden'
  }

  const progressBarStyle: React.CSSProperties = {
    width: `${calibrationProgress}%`,
    height: '100%',
    backgroundColor: '#4CAF50',
    transition: 'width 0.3s ease'
  }

  return (
    <div style={overlayStyle}>
      <style>{`
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>

      <h2 style={{ marginBottom: '20px' }}>Eye Tracking Calibration</h2>
      <p style={{ textAlign: 'center', marginBottom: '40px', maxWidth: '400px' }}>
        Look at the green dot and keep your head still. The calibration will move through 9 points.
      </p>

      <div style={pointStyle} />

      <div style={progressStyle}>
        <div style={progressBarStyle} />
      </div>

      <p style={{ marginTop: '20px', fontSize: '14px', opacity: 0.7 }}>
        Progress: {Math.round(calibrationProgress)}%
      </p>
    </div>
  )
}

export const EyeTrackingOverlay: React.FC<EyeTrackingOverlayProps> = () => {
  // This component is now integrated into the main App.tsx
  // The eye tracking functionality has been moved to the SessionInProgress component
  return null
}
