import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      setSessionIntention: (intention: string) => void
      getSessionIntention: () => Promise<string | null>
      startSession: (width: number, height: number) => void
      hideSession: (wdith: number) => void
      showSession: (width: number, height: number) => void
      exitApp: () => void
    }
  }
}