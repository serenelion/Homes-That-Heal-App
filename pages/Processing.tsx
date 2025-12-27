import React, { useEffect, useState } from 'react';
import { PipelineAPI } from '../services/pipeline';
import { Loader2, CheckCircle } from 'lucide-react';

interface ProcessingProps {
  onNavigate: (page: string) => void;
}

export const Processing: React.FC<ProcessingProps> = ({ onNavigate }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('initializing');

  useEffect(() => {
    // Mock polling
    const interval = setInterval(async () => {
      // In a real app we'd use the ID from context/props
      const job = await PipelineAPI.getStatus('mock-id'); 
      setProgress(job.progress);
      setStatus(job.status);
      
      if (job.status === 'completed') {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full bg-zinc-900 text-white flex flex-col items-center justify-center p-8">
       {status === 'completed' ? (
         <div className="text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
              <CheckCircle size={48} className="text-black" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Processing Complete!</h2>
            <p className="text-zinc-400 mb-8">Your 3D model is ready for viewing.</p>
            <button 
              onClick={() => onNavigate('home')}
              className="px-8 py-3 bg-white text-black font-bold rounded-full"
            >
              Back to Home
            </button>
         </div>
       ) : (
         <div className="text-center w-full max-w-xs">
            <div className="mb-8 relative">
               <Loader2 size={64} className="text-yellow-500 animate-spin mx-auto" />
               <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-xs font-bold">
                 {progress}%
               </span>
            </div>
            <h2 className="text-xl font-semibold mb-2 capitalize">{status}...</h2>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mt-4">
               <div 
                 className="h-full bg-yellow-500 transition-all duration-500 ease-out" 
                 style={{ width: `${progress}%` }} 
               />
            </div>
            <p className="text-xs text-zinc-500 mt-6">
              Sending data to Kiri Engine...
              <br/>This may take a few minutes.
            </p>
         </div>
       )}
    </div>
  );
};
