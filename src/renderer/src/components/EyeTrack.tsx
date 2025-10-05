// This component is now simplified and integrated into App.tsx
// Keeping this file for potential future use but removing the complex overlay

import * as React from 'react'

interface EyeTrackingOverlayProps {
  onFocusLost: () => void
  onFocusRegained: () => void
}

export const EyeTrackingOverlay: React.FC<EyeTrackingOverlayProps> = () => {
  // This component is now integrated into the main App.tsx
  // The eye tracking functionality has been moved to the SessionInProgress component
  return null
}
