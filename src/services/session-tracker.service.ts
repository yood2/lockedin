import * as fs from 'fs'
import * as path from 'path'

export interface SessionData {
  sessionId: string
  startTime: number
  endTime?: number
  intention: string
  totalDuration: number // in seconds
  focusedTime: number // in seconds
  unfocusedTime: number // in seconds
  distractionEvents: DistractionEvent[]
  appUsage: AppUsage[]
  activities: ActivityEvent[]
  visionResponses: VisionResponse[]
}

export interface DistractionEvent {
  timestamp: number
  userActivity: string
  currentApp?: string
  currentActivity?: string
  duration: number // seconds spent distracted
}

export interface AppUsage {
  appName: string
  totalTime: number // seconds
  sessions: AppSession[]
}

export interface AppSession {
  startTime: number
  endTime: number
  duration: number
}

export interface ActivityEvent {
  timestamp: number
  activity: string
  app?: string
  duration: number
}

export interface VisionResponse {
  timestamp: number
  focused: boolean
  userActivity: string
  currentApp?: string
  currentActivity?: string
  rawResponse: string
}

class SessionTracker {
  private currentSession: SessionData | null = null
  private sessionLogsDir: string
  private lastFocusState: boolean = true
  private lastFocusChangeTime: number = 0
  private currentAppSession: { app: string; startTime: number } | null = null

  constructor() {
    // Create logs directory
    this.sessionLogsDir = path.resolve(__dirname, '../../../session-logs')
    if (!fs.existsSync(this.sessionLogsDir)) {
      fs.mkdirSync(this.sessionLogsDir, { recursive: true })
    }
  }

  startSession(intention: string): string {
    const sessionId = `session_${Date.now()}`
    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      intention,
      totalDuration: 0,
      focusedTime: 0,
      unfocusedTime: 0,
      distractionEvents: [],
      appUsage: [],
      activities: [],
      visionResponses: []
    }
    
    this.lastFocusChangeTime = Date.now()
    this.lastFocusState = true
    
    console.log('📊 [SESSION TRACKER] Started new session:', sessionId)
    return sessionId
  }

  logVisionResponse(data: {
    focused: boolean
    userActivity: string
    currentApp?: string
    currentActivity?: string
    rawResponse: string
  }) {
    if (!this.currentSession) return

    const timestamp = Date.now()
    const visionResponse: VisionResponse = {
      timestamp,
      ...data
    }

    this.currentSession.visionResponses.push(visionResponse)

    // Log to JSON file
    this.logToFile('vision-responses', {
      timestamp: new Date(timestamp).toISOString(),
      ...data
    })

    // Track focus changes
    if (data.focused !== this.lastFocusState) {
      const timeDiff = (timestamp - this.lastFocusChangeTime) / 1000 // seconds
      
      if (this.lastFocusState) {
        // Was focused, now unfocused
        this.currentSession.focusedTime += timeDiff
        this.addDistractionEvent(data, timestamp)
      } else {
        // Was unfocused, now focused
        this.currentSession.unfocusedTime += timeDiff
        this.endCurrentDistraction(timestamp)
      }
      
      this.lastFocusState = data.focused
      this.lastFocusChangeTime = timestamp
    }

    // Track app usage
    if (data.currentApp) {
      this.trackAppUsage(data.currentApp, timestamp)
    }

    // Track activities
    if (data.userActivity) {
      this.addActivityEvent(data, timestamp)
    }

    console.log('📊 [SESSION TRACKER] Vision response logged:', data)
  }

  private addDistractionEvent(data: any, timestamp: number) {
    if (!this.currentSession) return

    const distractionEvent: DistractionEvent = {
      timestamp,
      userActivity: data.userActivity,
      currentApp: data.currentApp,
      currentActivity: data.currentActivity,
      duration: 0 // Will be updated when distraction ends
    }

    this.currentSession.distractionEvents.push(distractionEvent)
    console.log('🚫 [SESSION TRACKER] Distraction started:', data.userActivity)
  }

  private endCurrentDistraction(timestamp: number) {
    if (!this.currentSession || this.currentSession.distractionEvents.length === 0) return

    const lastDistraction = this.currentSession.distractionEvents[this.currentSession.distractionEvents.length - 1]
    lastDistraction.duration = (timestamp - lastDistraction.timestamp) / 1000
    
    console.log('✅ [SESSION TRACKER] Distraction ended, duration:', lastDistraction.duration, 'seconds')
  }

  private trackAppUsage(appName: string, timestamp: number) {
    if (!this.currentSession) return

    // End previous app session if different app
    if (this.currentAppSession && this.currentAppSession.app !== appName) {
      this.endAppSession(timestamp)
    }

    // Start new app session if not already tracking this app
    if (!this.currentAppSession) {
      this.currentAppSession = { app: appName, startTime: timestamp }
      console.log('📱 [SESSION TRACKER] Started tracking app:', appName)
    }
  }

  private endAppSession(timestamp: number) {
    if (!this.currentSession || !this.currentAppSession) return

    const duration = (timestamp - this.currentAppSession.startTime) / 1000
    const appSession: AppSession = {
      startTime: this.currentAppSession.startTime,
      endTime: timestamp,
      duration
    }

    // Find existing app usage or create new
    let appUsage = this.currentSession.appUsage.find(app => app.appName === this.currentAppSession!.app)
    if (!appUsage) {
      appUsage = {
        appName: this.currentAppSession.app,
        totalTime: 0,
        sessions: []
      }
      this.currentSession.appUsage.push(appUsage)
    }

    appUsage.sessions.push(appSession)
    appUsage.totalTime += duration

    console.log('📱 [SESSION TRACKER] App session ended:', this.currentAppSession.app, 'duration:', duration, 'seconds')
    this.currentAppSession = null
  }

  private addActivityEvent(data: any, timestamp: number) {
    if (!this.currentSession) return

    const activityEvent: ActivityEvent = {
      timestamp,
      activity: data.userActivity,
      app: data.currentApp,
      duration: 0 // Could be calculated based on consecutive identical activities
    }

    this.currentSession.activities.push(activityEvent)
  }

  private logToFile(type: string, data: any) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${type}_${timestamp}.json`
    const filepath = path.join(this.sessionLogsDir, filename)
    
    try {
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
      console.log('📝 [SESSION TRACKER] Logged to file:', filename)
    } catch (error) {
      console.error('❌ [SESSION TRACKER] Failed to log to file:', error)
    }
  }

  endSession(): SessionData | null {
    if (!this.currentSession) return null

    const endTime = Date.now()
    this.currentSession.endTime = endTime
    this.currentSession.totalDuration = (endTime - this.currentSession.startTime) / 1000

    // End any ongoing app session
    if (this.currentAppSession) {
      this.endAppSession(endTime)
    }

    // Calculate final focus time
    const timeDiff = (endTime - this.lastFocusChangeTime) / 1000
    if (this.lastFocusState) {
      this.currentSession.focusedTime += timeDiff
    } else {
      this.currentSession.unfocusedTime += timeDiff
    }

    // Save session summary
    this.logToFile('session-summary', this.currentSession)

    console.log('📊 [SESSION TRACKER] Session ended:', this.currentSession.sessionId)
    console.log('📊 [SESSION TRACKER] Total time focused:', this.currentSession.focusedTime, 'seconds')
    console.log('📊 [SESSION TRACKER] Total time unfocused:', this.currentSession.unfocusedTime, 'seconds')

    const sessionData = this.currentSession
    this.currentSession = null
    return sessionData
  }

  getCurrentSession(): SessionData | null {
    return this.currentSession
  }

  generateAnalytics(sessionData: SessionData) {
    // Most used app
    const mostUsedApp = sessionData.appUsage.reduce((max, app) => 
      app.totalTime > max.totalTime ? app : max, 
      { appName: 'None', totalTime: 0, sessions: [] }
    )

    // Most common distraction
    const distractionCounts: { [key: string]: number } = {}
    sessionData.distractionEvents.forEach(event => {
      distractionCounts[event.userActivity] = (distractionCounts[event.userActivity] || 0) + 1
    })
    const mostCommonDistraction = Object.entries(distractionCounts).reduce((max, [activity, count]) => 
      count > max.count ? { activity, count } : max,
      { activity: 'None', count: 0 }
    )

    // Most common activity
    const activityCounts: { [key: string]: number } = {}
    sessionData.activities.forEach(event => {
      activityCounts[event.activity] = (activityCounts[event.activity] || 0) + 1
    })
    const mostCommonActivity = Object.entries(activityCounts).reduce((max, [activity, count]) => 
      count > max.count ? { activity, count } : max,
      { activity: 'None', count: 0 }
    )

    return {
      sessionId: sessionData.sessionId,
      intention: sessionData.intention,
      totalDuration: sessionData.totalDuration,
      focusedTime: sessionData.focusedTime,
      unfocusedTime: sessionData.unfocusedTime,
      focusPercentage: (sessionData.focusedTime / sessionData.totalDuration) * 100,
      mostUsedApp: mostUsedApp.appName,
      mostUsedAppTime: mostUsedApp.totalTime,
      mostCommonDistraction: mostCommonDistraction.activity,
      mostCommonDistractionCount: mostCommonDistraction.count,
      mostCommonActivity: mostCommonActivity.activity,
      mostCommonActivityCount: mostCommonActivity.count,
      totalDistractions: sessionData.distractionEvents.length,
      totalActivities: sessionData.activities.length
    }
  }
}

export default new SessionTracker()
