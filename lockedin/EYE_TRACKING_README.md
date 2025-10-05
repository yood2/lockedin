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

### 3. Gaze Pointer & Calibration
- **Location**: `src/renderer/src/components/EyeTrack.tsx`
- **Features**:
  - **Visual Gaze Pointer**: Real-time indicator showing where WebGazer thinks you're looking
    - Green dot = Looking at screen
    - Red dot = Looking away from screen
    - Shows exact coordinates in debug mode
  - **Eye Calibration System**: 9-point calibration sequence to improve accuracy
    - Automated calibration overlay
    - Progress tracking
    - Helps WebGazer learn screen boundaries
    - Reduces false positives when looking away

### 4. Futuristic Splash Screen
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

### 5. Sound Effects
- **Implementation**: Web Audio API
- **Trigger**: Plays a beep sound when splash screen appears
- **Location**: `playSound()` function in `App.tsx`

## How It Works

1. **Initialization**: When a session starts, the eye tracking hook initializes WebGazer.js and camera access
2. **Gaze Estimation**: WebGazer uses regression algorithms to predict gaze direction from webcam input
3. **Coordinate Calculation**: System calculates gaze coordinates on screen in real-time
4. **Boundary Detection**: System checks if gaze coordinates are within screen boundaries (±150px tolerance)
5. **Stability Filtering**: Requires 3 consecutive frames of consistent detection to change state
6. **Visual Feedback**: Gaze pointer shows where the system thinks you're looking (green=on screen, red=away)
7. **Calibration**: 9-point calibration process trains WebGazer's prediction model
8. **Status Updates**: Updates study status in real-time based on gaze position
9. **Timer Management**:
   - Session timer continues normally
   - Focused time only increments when looking at screen
10. **Splash Screen**: After 10 seconds of looking away, shows futuristic overlay
11. **Sound Alert**: Plays audio cue when splash screen appears

## Technical Details

### Face Detection
- **WebGazer.js Primary**: Uses Brown's University WebGazer library for gaze estimation
  - Regression-based gaze prediction using webcam input
  - Real-time gaze coordinate calculation with configurable accuracy
  - Built-in calibration system for improved accuracy
- **Fallback Detection**: Uses advanced video analysis including:
  - Motion detection between frames
  - Skin tone recognition
  - Brightness analysis
  - Hysteresis to prevent flickering (requires 3 consecutive detections to change state)
- Thresholds: Screen bounds with 150px tolerance, stable detection over 3 frames

### Performance
- WebGazer.js: Real-time gaze estimation (typically 30-60 FPS)
- Ridge regression algorithm for gaze prediction
- Fallback face detection runs every 500ms when WebGazer fails
- Duration timer updates every second only when looking at screen
- Timer updates every 100ms when tracking time away
- Automatic cleanup prevents memory leaks
- Hysteresis prevents unnecessary state changes and re-renders

### Styling
- CSS includes glassmorphism effects with backdrop blur
- Particle animations and orbital effects
- Responsive design with proper z-indexing
- Import of Orbitron font for futuristic appearance

## Usage

The eye tracking is automatically active during study sessions. Users will see:
1. A status indicator showing their focus state
2. A focused time counter
3. A **gaze pointer** (green/red dot) showing where the system thinks you're looking
4. Debug information showing gaze coordinates and screen boundaries
5. A **"Calibrate Eyes"** button to improve tracking accuracy
6. A splash screen overlay if they look away for too long
7. Audio feedback when the splash screen appears

### Calibration Process
1. Click the "Calibrate Eyes" button during a session
2. Look at each green dot as it appears on screen (9 points total)
3. Keep your head still and follow the dot with your eyes
4. Calibration takes about 18 seconds to complete
5. This significantly improves gaze tracking accuracy

## Browser Permissions

The application requires camera access permission for eye tracking to function. Users will be prompted to allow camera access when starting their first session.