import React, { useState } from 'react';
import { useScan } from '../core/ScanContext';
import { Check, AlertTriangle, UploadCloud } from 'lucide-react';
import { PipelineAPI } from '../services/pipeline';
import { MIN_PHOTOS_TOTAL } from '../constants';

interface ResultsProps {
  onNavigate: (page: string) => void;
}

export const Results: React.FC<ResultsProps> = ({ onNavigate }) => {
  const { state } = useScan();
  const [uploading, setUploading] = useState(false);

  const isValid = state.totalPhotos >= MIN_PHOTOS_TOTAL;

  const handleProcess = async () => {
    if (!state.project) return;
    setUploading(true);
    // Simulate upload/start
    try {
      await PipelineAPI.startKiri(state.project.id);
      onNavigate('processing');
    } catch (e) {
      console.error(e);
      setUploading(false);
    }
  };

  return (
    <div className="h-full w-full bg-zinc-900 text-white p-6 flex flex-col">
      <h2 className="text-2xl font-bold mb-6 text-yellow-500">Scan Summary</h2>
      
      <div className="flex-1 space-y-6">
        <div className="bg-zinc-800 p-6 rounded-2xl border border-zinc-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-zinc-400">Total Photos</span>
            <span className={`text-2xl font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
              {state.totalPhotos}
            </span>
          </div>
          <div className="h-2 w-full bg-zinc-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`} 
              style={{ width: `${Math.min(100, (state.totalPhotos / 150) * 100)}%` }}
            />
          </div>
          {!isValid && (
            <div className="flex items-center text-red-400 text-sm mt-3">
              <AlertTriangle size={16} className="mr-2" />
              Minimum 20 photos required.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-zinc-300">Phase Breakdown</h3>
          {['CORNER_1', 'CORNER_2', 'CORNER_3', 'CORNER_4', 'PERIMETER'].map(phase => {
            const count = state.photos.filter(p => p.phase === phase).length;
            return (
              <div key={phase} className="flex justify-between items-center text-sm border-b border-zinc-800 pb-2">
                <span className="capitalize">{phase.replace('_', ' ').toLowerCase()}</span>
                <span className="font-mono">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-col space-y-3">
        <button 
           onClick={() => onNavigate('scan')}
           className="w-full py-3 bg-zinc-700 rounded-xl font-semibold"
        >
          Add More Photos
        </button>
        
        <button 
           onClick={handleProcess}
           disabled={!isValid || uploading}
           className={`w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-2 
             ${!isValid || uploading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'}`}
        >
           {uploading ? (
             <span>Uploading...</span>
           ) : (
             <>
               <UploadCloud size={20} />
               <span>Generate 3D Model</span>
             </>
           )}
        </button>
      </div>
    </div>
  );
};
