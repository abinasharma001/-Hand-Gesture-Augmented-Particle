import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ParticleSystem } from './components/ParticleSystem';
import { Controls } from './components/Controls';
import { gestureService } from './services/gestureService';
import { AppState, ShapeType, THEMES } from './types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fingerCountRef = useRef<number>(0);
  const stabilityFrameCount = useRef<number>(0); // Count frames for stability
  const currentShapeRef = useRef<ShapeType>(ShapeType.SPHERE);
  const arrowSequenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [appState, setAppState] = useState<AppState>({
    particleCount: 8000,
    particleSize: 1.2,
    noiseStrength: 0.2,
    color: THEMES[ShapeType.SPHERE],
    shape: ShapeType.SPHERE,
    useCamera: false,
    gestureOpen: 0,
    gestureDistance: 0.5,
    fingerCount: 0,
    isExploding: false
  });

  // Keep ref in sync for callbacks
  useEffect(() => {
    currentShapeRef.current = appState.shape;
  }, [appState.shape]);

  const triggerBowSequence = useCallback(() => {
    console.log("Triggering Bow Sequence");
    // 1. Set to Bow
    setAppState(prev => ({ 
      ...prev, 
      shape: ShapeType.BOW, 
      color: THEMES[ShapeType.BOW],
      isExploding: false 
    }));

    // Clear any existing sequence
    if (arrowSequenceRef.current) clearTimeout(arrowSequenceRef.current);
    
    arrowSequenceRef.current = setTimeout(() => {
        // 2. Switch to Heart (Arrow hit)
        setAppState(prev => ({ 
            ...prev, 
            shape: ShapeType.HEART, 
            color: THEMES[ShapeType.HEART] 
        }));

        // 3. Wait and Destroy
        setTimeout(() => {
            setAppState(prev => ({ ...prev, isExploding: true }));
            
            // Reset explosion after animation
            setTimeout(() => {
                setAppState(prev => ({ ...prev, isExploding: false }));
            }, 1500);
        }, 800);

    }, 1500); // Wait 1.5s showing Bow
  }, []);

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      
      await gestureService.initialize();
      gestureService.start(videoRef.current);
      
      gestureService.onResults = (openness, distance, fingerCount, isHandsDetected) => {
        
        // Stability Logic: Increment if same as last frame, else reset
        if (fingerCount === fingerCountRef.current) {
            stabilityFrameCount.current++;
        } else {
            stabilityFrameCount.current = 0;
            fingerCountRef.current = fingerCount;
        }

        // Require 15 frames of consistency (approx 0.5s at 30fps)
        const isStable = stabilityFrameCount.current > 15;

        // Determine updates
        let nextShape: ShapeType | null = null;
        let shouldTriggerSeq = false;

        if (isStable && isHandsDetected) {
            const currentShape = currentShapeRef.current;
            
            if (fingerCount === 2) {
                if (currentShape !== ShapeType.TEXT_ABINASH) nextShape = ShapeType.TEXT_ABINASH;
            } else if (fingerCount === 4) {
                if (currentShape !== ShapeType.TEXT_AS) nextShape = ShapeType.TEXT_AS;
            } else if (fingerCount === 3) {
                if (currentShape !== ShapeType.JAGANNATH) nextShape = ShapeType.JAGANNATH;
            } else if (fingerCount === 1) {
                // Only trigger if we aren't already in the bow/heart/explode flow
                // We check if current shape is NOT Bow and NOT Heart to allow re-triggering only after reset or change
                if (currentShape !== ShapeType.BOW && currentShape !== ShapeType.HEART) {
                    shouldTriggerSeq = true;
                }
            }
        }

        // Apply State Updates
        if (shouldTriggerSeq) {
            triggerBowSequence();
            // Reset stability to prevent double firing immediately
            stabilityFrameCount.current = 0; 
        } else if (nextShape) {
            setAppState(prev => ({
                ...prev,
                shape: nextShape!,
                color: THEMES[nextShape!] || prev.color,
                isExploding: false // Stop any previous explosion
            }));
        } else {
            // Regular update for openness/distance
            setAppState(prev => ({
                ...prev,
                gestureOpen: openness,
                gestureDistance: distance,
                fingerCount: fingerCount
            }));
        }
      };

    } catch (err) {
      console.error("Camera access denied or failed", err);
      setAppState(prev => ({ ...prev, useCamera: false }));
      alert("Camera access failed. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    gestureService.stop();
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (appState.useCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.useCamera]);

  const handleUpdate = useCallback((partial: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...partial }));
  }, []);

  return (
    <div className="relative w-full h-screen bg-black">
      <video 
        ref={videoRef} 
        className="fixed bottom-4 left-4 w-32 h-24 object-cover opacity-50 rounded-lg border border-white/20 z-50 pointer-events-none transform scale-x-[-1]" 
        style={{ display: appState.useCamera ? 'block' : 'none' }}
        muted 
        playsInline 
      />

      <Canvas camera={{ position: [0, 0, 8], fov: 60 }} dpr={[1, 2]}>
        <color attach="background" args={['#050505']} />
        <ParticleSystem appState={appState} />
        <OrbitControls 
          enableZoom={true} 
          enablePan={false} 
          autoRotate={!appState.useCamera && appState.gestureOpen === 0} 
          autoRotateSpeed={0.5}
        />
      </Canvas>

      <Controls state={appState} onUpdate={handleUpdate} />

      {!appState.useCamera && (
        <div className="fixed bottom-8 left-8 max-w-sm text-gray-500 text-xs z-0 pointer-events-none select-none hidden md:block">
          <h3 className="uppercase font-bold mb-1 text-gray-400">Zen Particle Flow</h3>
          <p>Enable Camera to control particles with gestures.</p>
        </div>
      )}
      
      {appState.useCamera && (
         <div className="fixed bottom-32 left-8 max-w-sm text-white/50 text-xs z-0 pointer-events-none select-none">
           <div className="bg-black/40 p-3 rounded backdrop-blur border border-white/10">
             <span className="font-bold block mb-2 text-white">Gesture Guide:</span>
             <ul className="space-y-1">
               <li className={appState.fingerCount === 1 ? "text-green-400 font-bold" : ""}>☝️ 1 Finger: Bow & Arrow (Animation)</li>
               <li className={appState.fingerCount === 2 ? "text-green-400 font-bold" : ""}>✌️ 2 Fingers: "Abinash Sharma"</li>
               <li className={appState.fingerCount === 3 ? "text-green-400 font-bold" : ""}>🤟 3 Fingers: Jagannath God</li>
               <li className={appState.fingerCount === 4 ? "text-green-400 font-bold" : ""}>🖖 4 Fingers: "A & S"</li>
             </ul>
             <p className="mt-2 text-[10px] opacity-70 border-t border-white/10 pt-1">
                Active Fingers: {appState.fingerCount}
             </p>
           </div>
         </div>
      )}
    </div>
  );
};

export default App;