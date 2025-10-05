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
      onAiResponse: (callback: (response: string, isError: boolean) => void) => (() => void)
      dismissOverlay: () => void
    }
  }
}