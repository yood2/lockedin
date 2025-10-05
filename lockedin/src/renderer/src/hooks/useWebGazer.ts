import { useState, useEffect, useCallback, useRef, RefObject } from 'react';
import webgazer from 'webgazer';

type WebGazerStatus = 'loading' | 'ready' | 'error';

// This hook is solely responsible for loading, initializing, and cleaning up the WebGazer instance.
export const useWebGazer = (videoRef: RefObject<HTMLVideoElement> | null) => {
  const [status, setStatus] = useState<WebGazerStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const isInitializing = useRef(false);
  const isInitialized = useRef(false);

  const initialize = useCallback(async () => {
    if (isInitializing.current || isInitialized.current) {
      console.log('ℹ️ WebGazer initialization already in progress or complete.');
      return;
    }
    
    isInitializing.current = true;
    setStatus('loading');
    console.log('⏳ Initializing WebGazer.js from NPM package...');

    try {
      // WebGazer is now imported directly from the NPM package
      console.log('✅ WebGazer.js package is available.');
      
      console.log('🚀 Starting WebGazer...');
      await webgazer.begin();
      setStatus('ready');
      isInitialized.current = true;
      console.log('✅ WebGazer is initialized and ready.');
    } catch (e: any) {
      console.error('❌ Failed to initialize WebGazer:', e);
      setError(e.message || 'Failed to initialize WebGazer.');
      setStatus('error');
    }
    isInitializing.current = false;
  }, []);

  const cleanup = useCallback(() => {
    if (isInitialized.current) {
      console.log('🧹 Shutting down WebGazer...');
      webgazer.end();
      isInitialized.current = false;
    }
    // WebGazer handles camera cleanup internally
  }, []);

  // Effect to run initialization on mount and cleanup on unmount
  useEffect(() => {
    initialize();
    return cleanup;
  }, [initialize, cleanup]);

  return { status, error };
};
