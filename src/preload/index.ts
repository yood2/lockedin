import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
export const api = {
  setSessionIntention: (intention: string): void => ipcRenderer.send('set-intention', intention),
  getSessionIntention: (): Promise<string | null> => ipcRenderer.invoke('get-intention'),
  startSession: (width: number, height: number): void => ipcRenderer.send('start-session', width, height),
  minimizeWindow: (): void => ipcRenderer.send('minimize-window'),
  showSession: (width: number, height: number): void => ipcRenderer.send('show-session', width, height),
  checkFocus: (imageDataUrl: string): Promise<{ focused: boolean; user_activity: string; current_app?: string; current_activity?: string }> => {
    return ipcRenderer.invoke('check-focus', imageDataUrl)
  },
  getCurrentAppInfo: (): Promise<{ currentApp?: string; currentActivity?: string }> => {
    return ipcRenderer.invoke('get-current-app-info')
  },
  getSessionAnalytics: (): Promise<any> => {
    return ipcRenderer.invoke('get-session-analytics')
  },
  endSessionAndGetAnalytics: (): Promise<any> => {
    return ipcRenderer.invoke('end-session-and-get-analytics')
  },
  stopSession: (): void => ipcRenderer.send('stop-session'),
  exitApp: (): void => ipcRenderer.send('exit-app'),
  onAiResponse: (callback: (response: string, isError: boolean) => void): (() => void) => {
    const updateHandler = (_event: Electron.IpcRendererEvent, response: string) => callback(response, false)
    const errorHandler = (_event: Electron.IpcRendererEvent, response: string) => callback(response, true)

    ipcRenderer.on('ai-response-update', updateHandler)
    ipcRenderer.on('ai-response-error', errorHandler)
    
    return () => {
        ipcRenderer.off('ai-response-update', updateHandler)
        ipcRenderer.off('ai-response-error', errorHandler)
    }
  },
  dismissOverlay: (): void => ipcRenderer.send('overlay-dismissed')
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