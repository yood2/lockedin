import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { useWebGazer } from './useWebGazer';
import webgazer from 'webgazer';

// WebGazer types
interface WebGazerPrediction {
  x: number
  y: number
}

interface CalibrationPoint {
  x: number;
  y: number;
}

interface EyeTrackingState {
  isLookingAtScreen: boolean
  lastLookTime: number
  sessionDuration: number // in seconds
  isInitialized: boolean
  gazeX?: number
  gazeY?: number
  isCalibrating: boolean
  calibrationProgress: number
  calibrationPoints: CalibrationPoint[]
  currentCalibrationIndex: number
  faceDetected?: boolean
}

const CALIBRATION_POINTS: CalibrationPoint[] = [
  { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.9, y: 0.1 },
  { x: 0.1, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.5 },
  { x: 0.1, y: 0.9 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.9 }
];


export const useSimpleEyeTracking = (videoRef: RefObject<HTMLVideoElement> | null) => {
  const { status: webGazerStatus, error: webGazerError } = useWebGazer(videoRef);
  
  const [state, setState] = useState<EyeTrackingState>({
    isLookingAtScreen: true,
    lastLookTime: Date.now(),
    sessionDuration: 0,
    isInitialized: false,
    isCalibrating: false,
    calibrationProgress: 0,
    calibrationPoints: CALIBRATION_POINTS,
    currentCalibrationIndex: 0,
    faceDetected: false
  });
  
  const durationIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (webGazerStatus === 'ready') {
      console.log('🔧 Configuring WebGazer settings...');
      webgazer.setRegression('ridge');
      webgazer.showVideoPreview(false);
      webgazer.showFaceOverlay(false);
      webgazer.showFaceFeedbackBox(false);
      webgazer.showPredictionPoints(false);
      
      console.log('🎧 Attaching Gaze Listener...');
      webgazer.setGazeListener((data: WebGazerPrediction | null) => {
        if (data) {
          const { x, y } = data;
          const now = Date.now();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const margin = 150;

          const isLooking = x >= -margin && x <= viewportWidth + margin && y >= -margin && y <= viewportHeight + margin;
          
          console.log(`👁️ Gaze: (${x.toFixed(1)}, ${y.toFixed(1)}) | On Screen: ${isLooking}`);

          setState(prev => ({
            ...prev,
            isLookingAtScreen: isLooking,
            lastLookTime: isLooking ? now : prev.lastLookTime,
            gazeX: x,
            gazeY: y,
            faceDetected: true,
            isInitialized: true
          }));
        } else {
            console.log('🚫 No face detected.');
            setState(prev => ({ ...prev, faceDetected: false, isLookingAtScreen: false }));
        }
      });
      
      setState(prev => ({ ...prev, isInitialized: true }));
    }
  }, [webGazerStatus]);

  const startCalibration = useCallback(async () => {
    if (webGazerStatus !== 'ready') {
      console.error("❌ Cannot calibrate: WebGazer is not ready.");
      return;
    }
    console.log('🎯 Starting WebGazer calibration...');
    await webgazer.clearData();
    setState(prev => ({
      ...prev,
      isCalibrating: true,
      calibrationProgress: 0,
      currentCalibrationIndex: 0
    }));
  }, [webGazerStatus]);

  const handleCalibrationClick = useCallback(() => {
    const currentIndex = state.currentCalibrationIndex;
    if (!state.isCalibrating || currentIndex >= state.calibrationPoints.length) return;
    
    const nextIndex = currentIndex + 1;
    const progress = (nextIndex / state.calibrationPoints.length) * 100;
    
    console.log(`✅ Clicked calibration point ${nextIndex}/${state.calibrationPoints.length}`);

    if (nextIndex >= state.calibrationPoints.length) {
        setState(prev => ({ ...prev, isCalibrating: false, calibrationProgress: 100 }));
        console.log('✅ WebGazer calibration completed!');
    } else {
        setState(prev => ({
          ...prev,
          currentCalibrationIndex: nextIndex,
          calibrationProgress: progress
        }));
    }
  }, [state.currentCalibrationIndex, state.isCalibrating, state.calibrationPoints.length]);

  useEffect(() => {
    let intervalId: number | null = null;
    if (state.isLookingAtScreen && state.isInitialized) {
      console.log('⏱️  Starting duration timer');
      intervalId = setInterval(() => {
        setState(prev => ({ ...prev, sessionDuration: prev.sessionDuration + 1 }));
      }, 1000) as unknown as number;
    } else {
        if (durationIntervalRef.current) {
            console.log('⏸️  Pausing duration timer');
        }
    }
    
    durationIntervalRef.current = intervalId;

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [state.isLookingAtScreen, state.isInitialized]);

  return {
    state,
    webGazerStatus,
    webGazerError,
    startCalibration,
    handleCalibrationClick,
  };
};