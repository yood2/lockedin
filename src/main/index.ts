import 'dotenv/config'
import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import * as path from 'path'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import captureService from '../services/capture.service'
import { analyzeScreenshotWithGemini } from '../services/llm.service'
import { checkFocusWithVision } from './services/vision.service'

// Global variables to store extracted app information
declare global {
  var currentApp: string | undefined
  var currentActivity: string | undefined
}

// Keep a reference to the main window
let mainWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null

const initialWidth = 400
const initialHeight = 260
const overlayWidth = 600
const overlayHeight = 100

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    minWidth: initialWidth,
    minHeight: initialHeight,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Center the window initially
  mainWindow.center()

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createOverlayWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const screenWidth = primaryDisplay.workAreaSize.width
  const screenHeight = primaryDisplay.workAreaSize.height

  overlayWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x: Math.floor((screenWidth - overlayWidth) / 2), // Center horizontally
    y: screenHeight - overlayHeight - 20, // Position at the bottom, with a margin
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  
  // Set to ignore mouse events so clicks pass through by default
  overlayWindow.setIgnoreMouseEvents(true) // <-- IMPORTANT

  // Load the same HTML file but pass a query parameter for conditional rendering
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    overlayWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?overlay=true`)
  } else {
    // Note: 'query' option in loadFile only works in Electron 28+
    overlayWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'overlay' })
  }
}

// Global variables for session and capture management
let sessionIntention: string | null = null
let captureInterval: NodeJS.Timeout | null = null

// In-session aggregation for summary
let sessionStartAt: number | null = null
let lastCheckAt: number | null = null
let sessionEndAt: number | null = null
let totalUnfocusedMs = 0
let checkCount = 0
let currentUnfocusedStreakMs = 0
let longestUnfocusedStreakMs = 0
const activityCounts = new Map<string, number>()
const appActivityCounts = new Map<string, number>()
let lastFocused: boolean | null = null
let finalizedTotalUnfocusedMs: number | null = null

function incrementMap(map: Map<string, number>, key: string) {
  if (!key) return
  map.set(key, (map.get(key) || 0) + 1)
}

function getTopEntry(map: Map<string, number>): { key: string; count: number } | null {
  let topKey = ''
  let topCount = 0
  for (const [k, v] of Array.from(map.entries())) {
    if (v > topCount) {
      topCount = v
      topKey = k
    }
  }
  return topCount > 0 ? { key: topKey, count: topCount } : null
}

function appendJsonl(filename: string, data: unknown) {
  try {
    const projectRoot = path.resolve(__dirname, '../../../')
    const jsonLogsDir = join(projectRoot, 'json-logs')
    if (!fs.existsSync(jsonLogsDir)) fs.mkdirSync(jsonLogsDir, { recursive: true })
    const filePath = join(jsonLogsDir, filename)
    fs.appendFileSync(filePath, JSON.stringify(data) + '\n', 'utf-8')
  } catch (e) {
    console.warn('Failed to append JSONL:', filename, e)
  }
}

function updateOverlayVisibility(isVisible: boolean): void {
    if (!overlayWindow) return


    if (isVisible) {
        overlayWindow.show() 
        overlayWindow.setIgnoreMouseEvents(false)
        overlayWindow.setAlwaysOnTop(true, 'normal') 
    } else {
        overlayWindow.hide()
        overlayWindow.setIgnoreMouseEvents(true)
    }
}

/**
 * Captures a screenshot of the desktop and stores the image in a buffer.
 * This function is called by the interval.
 */
async function performScreenCapture(): Promise<void> {
  if (!sessionIntention) {
    console.log('No session intention set, skipping screenshot.')
    return
  }

  try {
    console.log('Capturing screen...')
    
    // Hide both main window and overlay during screenshot capture to avoid UI interference
    const wasMainVisible = mainWindow?.isVisible() || false
    const wasOverlayVisible = overlayWindow?.isVisible() || false
    
    if (mainWindow && wasMainVisible) {
      console.log('📸 [SCREENSHOT] Temporarily hiding main window for clean capture')
      mainWindow.hide()
    }
    
    if (overlayWindow && wasOverlayVisible) {
      console.log('📸 [SCREENSHOT] Temporarily hiding overlay for clean capture')
      overlayWindow.hide()
    }
    
    // Small delay to ensure windows are fully hidden before capture
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const result = await captureService.captureAndProcess()
    console.log(`Screenshot captured successfully. Path: ${result.localPath}`)
    
    // Restore window visibility if they were visible before
    if (mainWindow && wasMainVisible) {
      console.log('📸 [SCREENSHOT] Restoring main window visibility')
      mainWindow.show()
    }
    
    if (overlayWindow && wasOverlayVisible) {
      console.log('📸 [SCREENSHOT] Restoring overlay visibility')
      updateOverlayVisibility(true)
    }
    
    // Clean up old screenshots, keeping only the most recent 10
    captureService.cleanupOldScreenshots(10)
    console.log('Cleaned up old screenshots, keeping the last 10.')
    console.log('Calling Gemini API...')
    
    var textResult = await analyzeScreenshotWithGemini(result.imageBuffer, sessionIntention)

    if (overlayWindow) {
      // 1. Show the window and enable clicks
      updateOverlayVisibility(true) 
      // 2. Send the success message
      overlayWindow.webContents.send('ai-response-update', textResult)
    }
    console.log('Gemini answer: ', textResult)

  } catch (error) {
    console.error('Failed to capture screen or AI analysis:', error)
    
    // Ensure overlay is restored even on error
    if (overlayWindow) {
      updateOverlayVisibility(true) 
      // 2. Send the error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unknown error occurred during AI analysis.'
      overlayWindow.webContents.send('ai-response-error', errorMessage)
    }
  }
}

// IPC Handlers (single registration set)
ipcMain.on('set-intention', (_event, intention: string) => {
  sessionIntention = intention
  console.log('Session Intention Set:', sessionIntention)
})

ipcMain.handle('get-intention', () => {
  return sessionIntention
})

ipcMain.on('start-session', (_event, width: number, height: number) => {
  if (mainWindow) {
    // Resize for "Session in progress" view
    mainWindow.setSize(width, height)
    mainWindow.center()

    // Start the 15-second screenshot interval
    if (captureInterval) clearInterval(captureInterval) // Clear any old interval
    captureInterval = setInterval(performScreenCapture, 15000)
    console.log('Session started. Capturing screen every 15 seconds.')

    // Initialize session aggregation
    sessionStartAt = Date.now()
    sessionEndAt = null
    lastCheckAt = null
    totalUnfocusedMs = 0
    checkCount = 0
    currentUnfocusedStreakMs = 0
    longestUnfocusedStreakMs = 0
    activityCounts.clear()
    appActivityCounts.clear()
    lastFocused = null
    finalizedTotalUnfocusedMs = null
  }
})

ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize()
  }
})

ipcMain.on('show-session', (_event, width: number, height: number) => {
  if (mainWindow) {
    mainWindow.setMinimumSize(initialWidth, initialHeight)
    mainWindow.setSize(width, height)
    mainWindow.center()
  }
})

ipcMain.on('restore-window-and-focus', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus() // Bring the window to the front
  }
})

ipcMain.on('overlay-dismissed', () => {
    if (overlayWindow) {
        overlayWindow.hide()
        overlayWindow.setIgnoreMouseEvents(true)
    }
})

ipcMain.on('exit-app', () => {
  // Stop the interval when exiting
  if (captureInterval) clearInterval(captureInterval)
  if (overlayWindow) overlayWindow.close()
  app.quit()
})

ipcMain.handle('get-current-app-info', () => {
  return {
    currentApp: global.currentApp,
    currentActivity: global.currentActivity
  }
})

ipcMain.handle('check-focus', async (_, imageDataUrl: string) => {
  try {
    // Persist webcam snapshot to disk for debugging
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
    if (match) {
      const mime = match[1]
      const base64 = match[2]
      const buffer = Buffer.from(base64, 'base64')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const ext = mime.includes('jpeg') ? 'jpg' : mime.split('/')[1]
      const webcamDir = join(__dirname, '../../webcam')
      if (!fs.existsSync(webcamDir)) fs.mkdirSync(webcamDir, { recursive: true })
      const filepath = join(webcamDir, `webcam_${timestamp}.${ext}`)
      fs.writeFileSync(filepath, buffer)
      console.log(`Webcam snapshot saved: ${filepath} | size=${buffer.length} bytes | mime=${mime}`)

      // Cleanup old webcam snapshots, keep last 10
      try {
        const files = fs
          .readdirSync(webcamDir)
          .filter(f => f.endsWith(`.${ext}`))
          .map(f => ({ f, t: fs.statSync(join(webcamDir, f)).mtimeMs }))
          .sort((a, b) => b.t - a.t)
          .map(x => x.f)
        const toDelete = files.slice(10)
        toDelete.forEach(f => {
          try { fs.unlinkSync(join(webcamDir, f)) } catch {}
        })
        if (toDelete.length) console.log(`Cleaned ${toDelete.length} old webcam snapshots`)
      } catch (e) {
        console.warn('Webcam cleanup failed:', e)
      }
    } else {
      console.warn('Invalid webcam DataURL received; skipping save')
    }

    const { focused, user_activity, current_app, current_activity } = await checkFocusWithVision(imageDataUrl)
    
    // Log the extracted application and activity information
    console.log('📱 [MAIN] Extracted App Information:', {
      current_app: current_app || 'Not detected',
      current_activity: current_activity || 'Not detected'
    })
    
    // Store these values in variables for later use
    global.currentApp = current_app
    global.currentActivity = current_activity

    // Aggregate for summary
    const now = Date.now()
    if (sessionStartAt) {
      if (lastCheckAt) {
        const deltaMs = Math.max(0, now - lastCheckAt)
        if (!focused) {
          totalUnfocusedMs += deltaMs
          currentUnfocusedStreakMs += deltaMs
          if (currentUnfocusedStreakMs > longestUnfocusedStreakMs) {
            longestUnfocusedStreakMs = currentUnfocusedStreakMs
          }
        } else {
          currentUnfocusedStreakMs = 0
        }
      }
      lastCheckAt = now
      lastFocused = focused
      checkCount += 1
      if (!focused && user_activity) incrementMap(activityCounts, String(user_activity))
      if (current_app && current_activity) incrementMap(appActivityCounts, `${current_app} — ${current_activity}`)

      // Persist logs to json-logs for post-analysis
      appendJsonl('vision-responses.jsonl', {
        ts: new Date(now).toISOString(),
        focused,
        user_activity
      })
      if (current_app || current_activity) {
        appendJsonl('app-info.jsonl', {
          ts: new Date(now).toISOString(),
          current_app,
          current_activity
        })
      }
    }

    return { focused, user_activity, current_app, current_activity }
  } catch (error) {
    console.error('Failed to check focus:', error)
    return { focused: true, user_activity: 'study screen' } // Default on error
  }
})

ipcMain.on('end-session', () => {
  if (captureInterval) clearInterval(captureInterval)
  captureInterval = null
  // Finalize aggregation at end
  const now = Date.now()
  sessionEndAt = now
  if (sessionStartAt && lastCheckAt != null) {
    const tailMs = Math.max(0, now - lastCheckAt)
    const effectiveUnfocused = totalUnfocusedMs + (!lastFocused ? tailMs : 0)
    finalizedTotalUnfocusedMs = effectiveUnfocused
  } else {
    finalizedTotalUnfocusedMs = totalUnfocusedMs
  }
})

ipcMain.handle('get-session-summary', () => {
  const now = Date.now()
  const end = sessionEndAt || now
  const start = sessionStartAt || end
  const totalDurationMs = Math.max(0, end - start)
  const topActivity = getTopEntry(activityCounts)
  const topAppAct = getTopEntry(appActivityCounts)
  // Include tail interval if session isn't finalized
  let effectiveUnfocusedMs = finalizedTotalUnfocusedMs ?? totalUnfocusedMs
  if (finalizedTotalUnfocusedMs == null && lastCheckAt != null) {
    const tailMs = Math.max(0, end - lastCheckAt)
    if (lastFocused === false) effectiveUnfocusedMs += tailMs
  }

  return {
    sessionStart: new Date(start).toISOString(),
    sessionEnd: new Date(end).toISOString(),
    totalDurationSec: Math.round(totalDurationMs / 1000),
    checks: checkCount,
    totalUnfocusedSec: Math.round(effectiveUnfocusedMs / 1000),
    mostCommonDistraction: topActivity
      ? { activity: topActivity.key, occurrences: topActivity.count }
      : null,
    mostUsedAppActivity: topAppAct
      ? ((): { app: string; activity: string; occurrences: number } => {
          const [appName, activity = ''] = topAppAct.key.split(' — ')
          return { app: appName, activity, occurrences: topAppAct.count }
        })()
      : null,
    focusRatio: totalDurationMs > 0 ? Number(((totalDurationMs - effectiveUnfocusedMs) / totalDurationMs).toFixed(3)) : 1,
    longestUnfocusedStreakSec: Math.round(longestUnfocusedStreakMs / 1000)
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  createOverlayWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    if (!overlayWindow) createOverlayWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  // Stop the interval when all windows are closed
  if (captureInterval) clearInterval(captureInterval)
  if (overlayWindow) overlayWindow.close()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})