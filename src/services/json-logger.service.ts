import * as fs from 'fs'
import * as path from 'path'

class JsonLogger {
  private logsDir: string
  private currentSessionId: string | null = null

  constructor() {
    this.logsDir = path.resolve(__dirname, '../../../json-logs')
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true })
    }
  }

  setSessionId(sessionId: string) {
    this.currentSessionId = sessionId
  }

  logVisionResponse(data: {
    timestamp: number
    focused: boolean
    userActivity: string
    currentApp?: string
    currentActivity?: string
    rawResponse: string
  }) {
    const logEntry = {
      type: 'vision_response',
      sessionId: this.currentSessionId,
      timestamp: new Date(data.timestamp).toISOString(),
      data: {
        focused: data.focused,
        userActivity: data.userActivity,
        currentApp: data.currentApp,
        currentActivity: data.currentActivity,
        rawResponse: data.rawResponse
      }
    }

    this.appendToLogFile('vision-responses', logEntry)
  }

  logAppInfo(data: {
    timestamp: number
    currentApp?: string
    currentActivity?: string
  }) {
    const logEntry = {
      type: 'app_info',
      sessionId: this.currentSessionId,
      timestamp: new Date(data.timestamp).toISOString(),
      data: {
        currentApp: data.currentApp,
        currentActivity: data.currentActivity
      }
    }

    this.appendToLogFile('app-info', logEntry)
  }

  logSessionEvent(eventType: string, data: any) {
    const logEntry = {
      type: eventType,
      sessionId: this.currentSessionId,
      timestamp: new Date().toISOString(),
      data
    }

    this.appendToLogFile('session-events', logEntry)
  }

  private appendToLogFile(filename: string, logEntry: any) {
    const filepath = path.join(this.logsDir, `${filename}.jsonl`)
    const logLine = JSON.stringify(logEntry) + '\n'
    
    try {
      fs.appendFileSync(filepath, logLine)
      console.log('📝 [JSON LOGGER] Logged to', filename, ':', logEntry.type)
    } catch (error) {
      console.error('❌ [JSON LOGGER] Failed to log to file:', error)
    }
  }

  getLogFiles(): string[] {
    try {
      return fs.readdirSync(this.logsDir)
        .filter(file => file.endsWith('.jsonl'))
        .map(file => path.join(this.logsDir, file))
    } catch (error) {
      console.error('❌ [JSON LOGGER] Failed to read log files:', error)
      return []
    }
  }
}

export default new JsonLogger()
