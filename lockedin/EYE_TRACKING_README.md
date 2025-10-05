# Eye Tracking Implementation

This document describes the eye tracking functionality added to the LockedIn application.

## Features

### 1. Eye Tracking Hook (`useSimpleEyeTracking`)
- **Location**: `src/renderer/src/hooks/useSimpleEyeTracking.ts`
- **Purpose**: Provides eye tracking state and functionality
- **Key Features**:
  - Camera access and face detection
  - Session duration tracking (only when looking at screen)
  - Looking away detection
  - Automatic cleanup

### 2. Study Status Indicator
- **Location**: Integrated into `SessionInProgress` component in `App.tsx`
- **Features**:
  - Shows "STUDYING" when user is looking at screen
  - Shows "LOOK AWAY DETECTED" when user looks away
  - Displays focused time counter
  - Glassmorphism design with pulsing indicator

### 3. Futuristic Splash Screen
- **Location**: `src/renderer/src/components/FuturisticSplash.tsx`
- **Features**:
  - Activates after 10 seconds of looking away
  - Shows "GO BACK TO STUDYING" initially
  - Changes to "LOCK TF IN" after 10 minutes
  - Futuristic design with:
    - Glassmorphism effects
    - Glowing borders and particles
    - Smooth animations
    - Glitch effects
    - Orbitron font for sci-fi feel

### 4. Sound Effects
- **Implementation**: Web Audio API
- **Trigger**: Plays a beep sound when splash screen appears
- **Location**: `playSound()` function in `App.tsx`

## How It Works

1. **Initialization**: When a session starts, the eye tracking hook initializes camera access
2. **Monitoring**: Continuously monitors for face presence using brightness detection
3. **Status Updates**: Updates study status in real-time
4. **Timer Management**: 
   - Session timer continues normally
   - Focused time only increments when looking at screen
5. **Splash Screen**: After 10 seconds of looking away, shows futuristic overlay
6. **Sound Alert**: Plays audio cue when splash screen appears

## Technical Details

### Face Detection
- Uses simplified brightness detection as a proxy for face presence
- In a production environment, this would be replaced with proper ML-based face detection
- Threshold: Average brightness > 80 (adjustable)

### Performance
- Face detection runs every 500ms
- Timer updates every 100ms when looking away
- Automatic cleanup prevents memory leaks

### Styling
- CSS includes glassmorphism effects with backdrop blur
- Particle animations and orbital effects
- Responsive design with proper z-indexing
- Import of Orbitron font for futuristic appearance

## Usage

The eye tracking is automatically active during study sessions. Users will see:
1. A status indicator showing their focus state
2. A focused time counter
3. A splash screen overlay if they look away for too long
4. Audio feedback when the splash screen appears

## Browser Permissions

The application requires camera access permission for eye tracking to function. Users will be prompted to allow camera access when starting their first session.