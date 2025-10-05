import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  setSessionIntention: (intention: string): void => ipcRenderer.send('set-intention', intention),
  getSessionIntention: (): Promise<string | null> => ipcRenderer.invoke('get-intention'),
  startSession: (width: number, height: number): void => ipcRenderer.send('start-session', width, height),
  minimizeWindow: (): void => ipcRenderer.send('minimize-window'),
  showSession: (width: number, height: number): void => ipcRenderer.send('show-session', width, height),
  exitApp: (): void => ipcRenderer.send('exit-app')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}