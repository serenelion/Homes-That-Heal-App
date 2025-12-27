import React, { useState } from 'react';
import { Plus, Box } from 'lucide-react';
import { StorageAPI } from '../services/storage';
import { useScan } from '../core/ScanContext';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { dispatch } = useScan();
  const [loading, setLoading] = useState(false);

  const startNewScan = async () => {
    setLoading(true);
    const name = `Room Scan ${new Date().toLocaleTimeString()}`;
    const project = await StorageAPI.createProject(name);
    
    dispatch({ type: 'INIT_PROJECT', payload: project });
    
    // Simulate brief load
    setTimeout(() => {
      setLoading(false);
      onNavigate('scan');
    }, 500);
  };

  return (
    <div className="h-full w-full bg-zinc-900 flex flex-col p-6 text-white overflow-y-auto">
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold text-yellow-500 tracking-tight">Homes That Heal</h1>
        <p className="text-zinc-400 mt-2">AI-Guided Photogrammetry Assistant</p>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        <div className="w-32 h-32 bg-zinc-800 rounded-3xl flex items-center justify-center mb-4 shadow-xl border border-zinc-700">
           <Box size={64} className="text-zinc-500" />
        </div>

        <button 
          onClick={startNewScan}
          disabled={loading}
          className="w-full max-w-sm py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2"
        >
           {loading ? (
             <span>Initializing...</span>
           ) : (
             <>
               <Plus size={24} />
               <span>New Room Scan</span>
             </>
           )}
        </button>
        
        <p className="text-xs text-center text-zinc-600 max-w-xs leading-relaxed">
          High-quality capture requires 80-150 photos per room. 
          The assistant will guide you through corners and perimeter.
        </p>
      </div>

      <footer className="mt-auto py-4 border-t border-zinc-800">
        <p className="text-center text-zinc-700 text-xs">Prototype v0.1 • Kiri Engine Optimized</p>
      </footer>
    </div>
  );
};
