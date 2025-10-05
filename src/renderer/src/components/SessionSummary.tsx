import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface SessionAnalytics {
  sessionId: string
  intention: string
  totalDuration: number
  focusedTime: number
  unfocusedTime: number
  focusPercentage: number
  mostUsedApp: string
  mostUsedAppTime: number
  mostCommonDistraction: string
  mostCommonDistractionCount: number
  mostCommonActivity: string
  mostCommonActivityCount: number
  totalDistractions: number
  totalActivities: number
}

export const SessionSummary = ({
  onRestart,
  onExit,
  elapsedTime,
  duration
}: {
  onRestart: () => void
  onExit: () => void
  elapsedTime: number
  duration: number
}): React.JSX.Element => {
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await window.api.endSessionAndGetAnalytics()
        console.log('📊 [SUMMARY] Analytics data:', data)
        setAnalytics(data)
      } catch (error) {
        console.error('Failed to fetch session analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatPercentage = (value: number): string => {
    return `${Math.round(value)}%`
  }

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            textAlign: 'center',
            color: 'white'
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <div style={{ fontSize: '18px', fontWeight: '500' }}>Analyzing your session...</div>
        </motion.div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        color: 'white',
        textAlign: 'center',
        padding: '40px'
      }}>
        <div>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Session Completed</h2>
          <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '32px' }}>
            You focused for {formatTime(elapsedTime)} out of {duration} minutes
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button onClick={onRestart} style={{
              padding: '12px 32px',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Start Another Session
            </button>
            <button onClick={onExit} style={{
              padding: '12px 32px',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Exit
            </button>
          </div>
        </div>
      </div>
    )
  }

  const focusScore = Math.round(analytics.focusPercentage)

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      overflow: 'auto'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          width: '100%',
          maxWidth: '1200px',
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '32px',
          padding: '48px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.5)',
          color: 'white'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1))',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto 24px',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
            }}
          >
            🎯
          </motion.div>
          <h1 style={{
            fontSize: '42px',
            fontWeight: '700',
            margin: '0 0 12px 0',
            letterSpacing: '-0.5px'
          }}>
            Session Complete
          </h1>
          <p style={{
            fontSize: '20px',
            opacity: 0.9,
            margin: 0,
            fontWeight: '500'
          }}>
            "{analytics.intention}"
          </p>
        </div>

        {/* Main Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {/* Focus Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '24px',
              padding: '28px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: `linear-gradient(90deg, rgba(76, 217, 100, 0.8) ${focusScore}%, transparent ${focusScore}%)`
            }} />
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
              Focus Score
            </div>
            <div style={{ fontSize: '56px', fontWeight: '700', marginBottom: '4px', lineHeight: 1 }}>
              {focusScore}%
            </div>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>
              {formatTime(analytics.focusedTime)} focused
            </div>
          </motion.div>

          {/* Total Time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '24px',
              padding: '28px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
              Total Time
            </div>
            <div style={{ fontSize: '56px', fontWeight: '700', marginBottom: '4px', lineHeight: 1 }}>
              {formatTime(elapsedTime)}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>
              out of {duration} min
            </div>
          </motion.div>

          {/* Time Not Locked In */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '24px',
              padding: '28px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
              Distracted
            </div>
            <div style={{ fontSize: '56px', fontWeight: '700', marginBottom: '4px', lineHeight: 1 }}>
              {formatTime(analytics.unfocusedTime)}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.7 }}>
              {analytics.totalDistractions} interruptions
            </div>
          </motion.div>
        </div>

        {/* Detailed Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '24px',
            padding: '32px',
            marginBottom: '32px'
          }}
        >
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: '0 0 24px 0',
            opacity: 0.95
          }}>
            Session Insights
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0
              }}>
                📱
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', opacity: 0.7, marginBottom: '4px' }}>Most Used App</div>
                <div style={{ fontSize: '18px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {analytics.mostUsedApp}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.6 }}>{formatTime(analytics.mostUsedAppTime)}</div>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0
              }}>
                🚫
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', opacity: 0.7, marginBottom: '4px' }}>Top Distraction</div>
                <div style={{ fontSize: '18px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {analytics.mostCommonDistraction}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.6 }}>{analytics.mostCommonDistractionCount}× occurred</div>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0
              }}>
                ⚡
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', opacity: 0.7, marginBottom: '4px' }}>Main Activity</div>
                <div style={{ fontSize: '18px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {analytics.mostCommonActivity}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.6 }}>{analytics.totalActivities} activities</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center'
          }}
        >
          <button
            onClick={onRestart}
            style={{
              padding: '16px 48px',
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '16px',
              color: 'white',
              fontSize: '17px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
          >
            Start Another Session
          </button>
          <button
            onClick={onExit}
            style={{
              padding: '16px 48px',
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              color: 'white',
              fontSize: '17px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
          >
            Exit
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}