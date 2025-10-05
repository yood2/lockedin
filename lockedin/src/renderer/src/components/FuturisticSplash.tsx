import { useState, useEffect } from 'react'

interface FuturisticSplashProps {
  isVisible: boolean
  onReturnToSession: () => void
}

export const FuturisticSplash = ({
  isVisible,
  onReturnToSession
}: FuturisticSplashProps): React.JSX.Element => {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleLockIn = () => {
    setIsAnimating(true)
  }

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false)
        onReturnToSession()
      }, 2000) // Animation duration
      return () => clearTimeout(timer)
    }
  }, [isAnimating, onReturnToSession])

  if (!isVisible) {
    return null
  }

  return (
    <div className={`splash-overlay ${isAnimating ? 'animating' : ''}`}>
      <div className="splash-content">
        <div className="scanline"></div>
        <div className="fairy-container">
          <img src="./resources/fairy.gif" alt="Fairy" />
        </div>
        <div className="title">
          {isAnimating ? 'RE-ENGAGING FOCUS...' : 'Are you still studying?'}
        </div>

        {!isAnimating && (
          <>
            <div className="message">
              It seems you're not focused. Take a short break, or get back to it!
            </div>
            <button className="lock-in-button" onClick={handleLockIn}>
              I AM LOCKED IN
            </button>
          </>
        )}

        {isAnimating && (
          <div className="animation-text">
            <span>Synchronizing neural pathways...</span>
            <span>Enhancing cognitive flow...</span>
            <span>Focus matrix re-aligned!</span>
          </div>
        )}
      </div>

      <style>{`
        .splash-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.5s, visibility 0.5s;
          color: #0f0;
          font-family: 'Courier New', Courier, monospace;
        }

        .splash-overlay.visible, .splash-overlay.animating {
          opacity: 1;
          visibility: visible;
        }

        .splash-content {
          text-align: center;
          position: relative;
        }
        
        // ... (rest of the CSS from your original file)
        
        .lock-in-button {
          background-color: #0f0;
          color: #000;
          border: 2px solid #0f0;
          padding: 12px 24px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          margin-top: 30px;
          transition: all 0.3s;
          box-shadow: 0 0 15px #0f0;
        }

        .lock-in-button:hover {
          background-color: #000;
          color: #0f0;
        }

        .splash-overlay.animating .lock-in-button,
        .splash-overlay.animating .message,
        .splash-overlay.animating .fairy-container {
          display: none;
        }

        .animation-text {
          display: flex;
          flex-direction: column;
          margin-top: 20px;
          overflow: hidden;
          height: 80px; /* Adjust height based on font size and line height */
        }

        .animation-text span {
          display: block;
          opacity: 0;
          animation: slide-in 2s forwards;
          font-size: 14px;
        }

        .animation-text span:nth-child(1) { animation-delay: 0s; }
        .animation-text span:nth-child(2) { animation-delay: 0.7s; }
        .animation-text span:nth-child(3) { animation-delay: 1.4s; }

        @keyframes slide-in {
          0% { transform: translateY(100%); opacity: 0; }
          20%, 80% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-100%); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
