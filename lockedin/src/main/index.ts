import 'dotenv/config'
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import captureService from '../services/capture.service'
import { analyzeScreenshotWithGemini } from '../services/llm.service'

// Keep a reference to the main window
let mainWindow: BrowserWindow | null = null

const initialWidth = 400
const initialHeight = 260

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

// Global variables for session and capture management
let sessionIntention: string | null = null
let captureInterval: NodeJS.Timeout | null = null

/**
 * Captures a screenshot of the desktop and stores the image in a buffer.
 * This function is called by the interval.
 */
async function performScreenCapture(): Promise<void> {
  // Only capture the screen if a session is active (intention is set)
  if (!sessionIntention) {
    console.log('No session intention set, skipping screenshot.')
    return
  }

  try {
    console.log('Capturing screen...')
    const result = await captureService.captureAndProcess()
    console.log(`Screenshot captured successfully. Path: ${result.localPath}`)
    // The image buffer is available in result.imageBuffer if needed for next steps.
    
    // Clean up old screenshots, keeping only the most recent 10
    captureService.cleanupOldScreenshots(10)
    console.log('Cleaned up old screenshots, keeping the last 10.')
    console.log('Calling Gemini API...')
    var textResult = analyzeScreenshotWithGemini(result.imageBuffer, sessionIntention)
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
  app.quit()
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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  // Stop the interval when all windows are closed
  if (captureInterval) clearInterval(captureInterval)
  if (process.platform !== 'darwin') {
    app.quit()
  }
})