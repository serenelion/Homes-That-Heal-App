import React, { useEffect, useState } from 'react';
import { PipelineAPI } from '../services/pipeline';
import { Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { useScan } from '../core/ScanContext';

interface ProcessingProps {
  onNavigate: (page: string) => void;
}

export const Processing: React.FC<ProcessingProps> = ({ onNavigate }) => {
  const { state } = useScan();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('initializing');
  const [glbUrl, setGlbUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!state.activeJobId) {
      setStatus('no-job');
      return;
    }

    const interval = setInterval(async () => {
      const job = await PipelineAPI.getStatus(state.activeJobId ?? '', state.project?.id); 
      setProgress(job.progress);
      setStatus(job.status);
      if (job.glbUrl) {
        setGlbUrl(job.glbUrl);
      }
      
      if (job.status === 'completed') {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [state.activeJobId, state.project?.id]);

  return (
    <div className="h-full w-full bg-zinc-900 text-white flex flex-col items-center justify-center p-8">
       {status === 'no-job' ? (
         <div className="text-center">
           <p className="text-zinc-400 mb-6">No processing job found. Start a scan to generate a model.</p>
           <button
             onClick={() => onNavigate('home')}
             className="px-6 py-3 bg-yellow-500 text-black font-semibold rounded-xl"
           >
             Back to Home
           </button>
         </div>
       ) : status === 'failed' ? (
         <div className="text-center space-y-4">
           <p className="text-red-400 font-semibold">Processing failed.</p>
           <p className="text-zinc-400 text-sm">Retry from the results screen after checking your upload coverage.</p>
           <button
             onClick={() => onNavigate('results')}
             className="px-6 py-3 bg-yellow-500 text-black font-semibold rounded-xl"
           >
             Back to Results
           </button>
         </div>
       ) : status === 'completed' ? (
         <div className="text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
              <CheckCircle size={48} className="text-black" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Processing Complete!</h2>
            <p className="text-zinc-400 mb-4">Your 3D model is ready for viewing.</p>
            {glbUrl && (
              <a 
                href={glbUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-zinc-800 text-sm text-yellow-400 border border-zinc-700 hover:bg-zinc-700 mb-4"
              >
                <ExternalLink size={16} />
                <span>Open GLB</span>
              </a>
            )}
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
