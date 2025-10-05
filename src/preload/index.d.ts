import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      setSessionIntention: (intention: string) => void
      getSessionIntention: () => Promise<string | null>
      startSession: (width: number, height: number) => void
      minimizeWindow: () => void
      showSession: (width: number, height: number) => void
      exitApp: () => void
      checkFocus: (imageDataUrl: string) => Promise<{ focused: boolean; user_activity: string; current_app?: string; current_activity?: string }>
      getCurrentAppInfo: () => Promise<{ currentApp?: string; currentActivity?: string }>
      getSessionAnalytics: () => Promise<any>
      endSessionAndGetAnalytics: () => Promise<any>
      stopSession: () => void
      onAiResponse: (callback: (response: string, isError: boolean) => void) => (() => void)
      dismissOverlay: () => void
    }
  }
}