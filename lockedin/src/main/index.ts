import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// Services
// Screen capture (image-based)
const captureService = require("./src/services/capture.service");
// const speechService = require("./src/services/speech.service");
const llmService = require("./src/services/llm.service");

// Keep a reference to the main window
let mainWindow: BrowserWindow | null = null

const initialWidth = 400
const initialHeight = 200
const overlaySize = 60 // For the "minimized" button

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    minWidth: overlaySize,
    minHeight: overlaySize,
    show: false,
    autoHideMenuBar: true,
    frame: false, // Frameless window for overlay look
    transparent: true, // Transparent background
    alwaysOnTop: true, // Always on top
    hasShadow: false, // No shadow for a cleaner overlay look
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

// Global variable to store session intention
let sessionIntention: string | null = null

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

ipcMain.on('hide-session', () => {
  if (mainWindow) {
    // Change to small overlay button size
    mainWindow.setSize(overlaySize, overlaySize)
    const display = require('electron').screen.getPrimaryDisplay()
    const x = display.bounds.width - overlaySize - 20 // 20px padding from right
    const y = display.bounds.height - overlaySize - 20 // 20px padding from bottom
    mainWindow.setPosition(x, y, true)
  }
})

ipcMain.on('show-session', (event, width: number, height: number) => {
  if (mainWindow) {
    // Restore size to "Session in progress" view
    mainWindow.setSize(width, height)
    mainWindow.center()
  }
})

ipcMain.on('exit-app', () => {
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

const capture = await captureService.captureAndProcess();