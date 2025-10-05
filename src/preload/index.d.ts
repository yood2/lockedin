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
      checkFocus: (imageDataUrl: string) => Promise<boolean | { focused: boolean; user_activity: string }>
      onAiResponse: (callback: (response: string, isError: boolean) => void) => (() => void)
      dismissOverlay: () => void
      getSessionSummary: () => Promise<{
        sessionStart: string
        sessionEnd: string
        totalDurationSec: number
        checks: number
        totalUnfocusedSec: number
        mostCommonDistraction: { activity: string; occurrences: number } | null
        mostUsedAppActivity: { app: string; activity: string; occurrences: number } | null
        focusRatio: number
        longestUnfocusedStreakSec: number
      }>
      endSession: () => void
      restoreWindowAndFocus: () => void
    }
  }
}