import { app, shell, BrowserWindow, ipcMain, desktopCapturer, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { promises as fs } from 'fs'

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

let sessionIntention: string | null = null
let screenshotInterval: NodeJS.Timeout | null = null

const screenshotsDir = join(__dirname, '../../screenshots')

async function takeScreenshot() {
  try {
    await fs.mkdir(screenshotsDir, { recursive: true })

    const primaryDisplay = screen.getPrimaryDisplay()
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: primaryDisplay.size.width, height: primaryDisplay.size.height }
    })

    const primarySource = sources.find(source => source.display_id.toString() === primaryDisplay.id.toString())
    if (!primarySource) {
      console.error('Primary screen source not found.')
      return
    }
    
    // Capture the entire screen
    const thumbnail = primarySource.thumbnail.toPNG() // Get as PNG Buffer
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `screenshot-${timestamp}.png`
    const filePath = join(screenshotsDir, filename)

    await fs.writeFile(filePath, thumbnail)
    console.log(`Screenshot saved to: ${filePath}`)

  } catch (error) {
    console.error('Error taking or saving screenshot:', error)
  }
}

// IPC Handlers
ipcMain.on('set-intention', (event, intention: string) => {
  sessionIntention = intention
  console.log('Session Intention Set:', sessionIntention)
})

ipcMain.handle('get-intention', () => {
  return sessionIntention
})

ipcMain.on('start-session', (event, width: number, height: number) => {
  if (mainWindow) {
    // Resize for "Session in progress" view
    mainWindow.setSize(width, height)
    mainWindow.center()
  }
})

ipcMain.on('start-screenshot-timer', () => {
  if (screenshotInterval) {
    clearInterval(screenshotInterval)
  }
  // Take screenshot immediately and then every 10 seconds (10000ms)
  takeScreenshot()
  screenshotInterval = setInterval(takeScreenshot, 10000)
  console.log('Screenshot timer started. Interval: 10 seconds.')
})

ipcMain.on('stop-screenshot-timer', () => {
  if (screenshotInterval) {
    clearInterval(screenshotInterval)
    screenshotInterval = null
    console.log('Screenshot timer stopped.')
  }
})

ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize()
  }
})

ipcMain.on('show-session', (event, width: number, height: number) => {
  if (mainWindow) {
    mainWindow.setMinimumSize(initialWidth, initialHeight)
    mainWindow.setSize(width, height)
    mainWindow.center()
  }
})

ipcMain.on('exit-app', () => {
  if (screenshotInterval) {
    clearInterval(screenshotInterval)
  }
  app.quit()
})


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.