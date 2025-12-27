import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { useScan } from '../core/ScanContext';
import { PHASE_LABELS, PHASE_ORDER } from '../constants';

interface CameraInterfaceProps {
  onCapture: (blob: Blob) => void;
  onNextPhase: () => void;
  instruction: string;
}

export const CameraInterface: React.FC<CameraInterfaceProps> = ({ onCapture, onNextPhase, instruction }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { state } = useScan();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [flash, setFlash] = useState(false);

  // Initialize Camera
  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: 'environment' } }, // Try back camera first
          audio: false
        }).catch(() => {
          // Fallback to any camera if environment not found (desktop testing)
          return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        });
        
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera access denied", err);
      }
    }
    setupCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []); // Run once on mount

  const takePhoto = useCallback(() => {
    if (!videoRef.current) return;
    
    // Visual flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) onCapture(blob);
      }, 'image/jpeg', 0.85);
    }
  }, [onCapture]);

  const currentPhasePhotos = state.photos.filter(p => p.phase === state.currentPhase).length;
  const isPerimeter = state.currentPhase === 'PERIMETER';
  
  // Progress Logic
  const currentIndex = PHASE_ORDER.indexOf(state.currentPhase);
  const totalPhases = PHASE_ORDER.length;

  return (
    <div className="relative h-full w-full bg-black overflow-hidden flex flex-col">
      {/* Video Viewfinder */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Flash Overlay */}
      <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 ${flash ? 'opacity-80' : 'opacity-0'}`} />

      {/* HUD - Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex justify-between items-start">
           <div>
              <div className="flex items-center space-x-2">
                 <span className="text-yellow-400 font-bold text-lg uppercase tracking-wider">{PHASE_LABELS[state.currentPhase]}</span>
                 <div className="px-2 py-0.5 bg-gray-800/80 rounded-full text-xs text-white border border-gray-600">
                    Step {currentIndex + 1}/{totalPhases}
                 </div>
              </div>
              <p className="text-white/90 text-sm mt-1 max-w-[80%] font-medium drop-shadow-md">
                "{instruction}"
              </p>
           </div>
           
           <div className="flex flex-col items-end">
             <div className="flex items-center space-x-1">
                <Camera size={16} className="text-white/70" />
                <span className="text-xl font-mono font-bold">{state.totalPhotos}</span>
             </div>
             <span className="text-xs text-white/50">Total</span>
           </div>
        </div>
      </div>

      {/* Grid Overlay for Alignment */}
      <div className="absolute inset-0 pointer-events-none opacity-20 flex flex-col">
        <div className="flex-1 border-b border-white/50"></div>
        <div className="flex-1 border-b border-white/50"></div>
        <div className="flex-1"></div>
        <div className="absolute inset-0 flex">
           <div className="flex-1 border-r border-white/50"></div>
           <div className="flex-1 border-r border-white/50"></div>
           <div className="flex-1"></div>
        </div>
      </div>

      {/* Controls - Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 flex flex-col items-center">
        
        {/* Phase Specific Counter */}
        <div className="mb-6 px-4 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-sm">
          {state.currentPhase} Photos: <span className="font-bold text-yellow-400">{currentPhasePhotos}</span>
          {!isPerimeter && <span className="text-white/50"> / 12-20 Target</span>}
        </div>

        <div className="flex items-center justify-between w-full max-w-md px-4">
          
          {/* Previous/Misc Button (Placeholder for manual override) */}
          <button className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center text-white/50 hover:bg-gray-700/50 backdrop-blur-sm">
            <RefreshCw size={20} />
          </button>

          {/* Shutter Button */}
          <button 
            onClick={takePhoto}
            className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 shadow-lg active:scale-95 transition-transform flex items-center justify-center relative group"
            aria-label="Capture Photo"
          >
            <div className="w-16 h-16 rounded-full border-2 border-black/10 group-active:bg-gray-100"></div>
          </button>

          {/* Next Phase Button */}
          <button 
            onClick={onNextPhase}
            className="w-12 h-12 rounded-full bg-yellow-500/90 text-black flex items-center justify-center shadow-lg hover:bg-yellow-400 backdrop-blur-sm active:scale-95 transition-transform"
            aria-label="Next Step"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
