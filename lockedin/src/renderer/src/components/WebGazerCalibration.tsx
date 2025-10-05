import React from 'react';

interface CalibrationPoint {
  x: number;
  y: number;
}

interface WebGazerCalibrationProps {
  isCalibrating: boolean;
  calibrationProgress: number;
  points: CalibrationPoint[];
  currentIndex: number;
  onPointClick: () => void;
}

export const WebGazerCalibration: React.FC<WebGazerCalibrationProps> = ({
  isCalibrating,
  calibrationProgress,
  points,
  currentIndex,
  onPointClick,
}) => {
  if (!isCalibrating) {
    return null;
  }

  const currentPoint = points[currentIndex];
  const screenX = currentPoint ? `${currentPoint.x * 100}%` : '50%';
  const screenY = currentPoint ? `${currentPoint.y * 100}%` : '50%';

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
    color: 'white',
    fontFamily: 'monospace',
  };

  const pointStyle: React.CSSProperties = {
    position: 'absolute',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 69, 58, 0.9)',
    border: '3px solid white',
    boxShadow: '0 0 25px rgba(255, 69, 58, 0.9)',
    left: screenX,
    top: screenY,
    transform: 'translate(-50%, -50%)',
    animation: 'pulse 1.5s infinite',
    cursor: 'pointer',
  };

  const progressContainerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '50px',
    width: '80%',
    maxWidth: '400px',
    textAlign: 'center',
  };
  
  const progressBarStyle: React.CSSProperties = {
    width: '100%',
    height: '25px',
    backgroundColor: '#333',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #555',
  };

  const progressFillStyle: React.CSSProperties = {
    width: `${calibrationProgress}%`,
    height: '100%',
    backgroundColor: '#4CAF50',
    transition: 'width 0.3s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  };

  return (
    <div style={overlayStyle}>
      <style>{`
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.95); box-shadow: 0 0 0 0 rgba(255, 69, 58, 0.7); }
          70% { transform: translate(-50%, -50%) scale(1.1); box-shadow: 0 0 10px 20px rgba(255, 69, 58, 0); }
          100% { transform: translate(-50%, -50%) scale(0.95); box-shadow: 0 0 0 0 rgba(255, 69, 58, 0); }
        }
      `}</style>

      <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>Eye Tracking Calibration</h2>
      <p style={{ textAlign: 'center', marginBottom: '40px', maxWidth: '450px', fontSize: '16px', lineHeight: '1.5' }}>
        Please click on the red dot. Do this for all 9 dots that appear on the screen to calibrate the eye tracker.
      </p>

      {currentPoint && <div style={pointStyle} onClick={onPointClick} />}
      
      <div style={progressContainerStyle}>
        <div style={progressBarStyle}>
          <div style={progressFillStyle}>
            {Math.round(calibrationProgress)}%
          </div>
        </div>
        <p style={{ marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
          Point {currentIndex + 1} of {points.length}
        </p>
      </div>
    </div>
  );
};
