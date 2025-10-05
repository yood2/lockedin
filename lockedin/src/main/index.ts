import 'dotenv/config'
import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import captureService from '../services/capture.service'
import { analyzeScreenshotWithGemini } from '../services/llm.service'

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

function updateOverlayVisibility(isVisible: boolean): void {
    if (!overlayWindow) return

    if (isVisible) {
        overlayWindow.showInactive()
        overlayWindow.setIgnoreMouseEvents(false)
    } else {
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
    const result = await captureService.captureAndProcess()
    console.log(`Screenshot captured successfully. Path: ${result.localPath}`)
    
    // Clean up old screenshots, keeping only the most recent 10
    captureService.cleanupOldScreenshots(10)
    console.log('Cleaned up old screenshots, keeping the last 10.')
    console.log('Calling Gemini API...')
    var textResult = await analyzeScreenshotWithGemini(result.imageBuffer, sessionIntention)

    if (overlayWindow) {
      overlayWindow.webContents.send('ai-response-update', textResult)
      updateOverlayVisibility(true)
    }
    console.log('Gemini answer: ', textResult)

  } catch (error) {
    console.error('Failed to capture screen:', error)
  }
}

// IPC Handlers
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

    // Start the 5-second screenshot interval
    if (captureInterval) clearInterval(captureInterval) // Clear any old interval
    captureInterval = setInterval(performScreenCapture, 5000)
    console.log('Session started. Capturing screen every 5 seconds.')
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

ipcMain.on('exit-app', () => {
  // Stop the interval when exiting
  if (captureInterval) clearInterval(captureInterval)
  if (overlayWindow) overlayWindow.close()
  app.quit()
})

ipcMain.on('overlay-dismissed', () => {
  updateOverlayVisibility(false)
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