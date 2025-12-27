import React, { useEffect, useState, useCallback } from 'react';
import { CameraInterface } from '../components/CameraInterface';
import { useScan } from '../core/ScanContext';
import { AgentAPI } from '../services/agent';
import { SpeechOut } from '../services/speech';
import { StorageAPI } from '../services/storage';

interface ScanSessionProps {
  onNavigate: (page: string) => void;
}

export const ScanSession: React.FC<ScanSessionProps> = ({ onNavigate }) => {
  const { state, dispatch } = useScan();
  const [instruction, setInstruction] = useState("Initializing scan protocol...");
  
  // Initial greeting
  useEffect(() => {
    const start = async () => {
      const response = await AgentAPI.send({ 
        ...state, 
        lastAction: 'PHASE_CHANGED', // Force intro 
        currentPhase: 'CORNER_1' 
      });
      setInstruction(response.assistantText);
      if (response.shouldSpeak) {
        SpeechOut.speak(response.assistantText);
      }
    };
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once

  const handleCapture = useCallback(async (blob: Blob) => {
    if (!state.project) return;
    
    // Save locally
    const photo = await StorageAPI.addPhoto(state.project.id, blob, state.currentPhase);
    dispatch({ type: 'ADD_PHOTO', payload: photo });

    // Consult Agent
    const nextState = {
      ...state,
      photos: [...state.photos, photo],
      totalPhotos: state.totalPhotos + 1,
      lastAction: 'PHOTO_TAKEN' as const
    };

    const response = await AgentAPI.send(nextState);
    
    if (response.assistantText) {
      setInstruction(response.assistantText);
      if (response.shouldSpeak) {
        SpeechOut.speak(response.assistantText);
      }
    }
  }, [state, dispatch]);

  const handleNextPhase = useCallback(async () => {
    if (state.currentPhase === 'REVIEW') {
      onNavigate('results');
      return;
    }

    dispatch({ type: 'NEXT_PHASE' });

    // Agent needs to know about the phase change immediately
    // Note: dispatch is async in terms of render cycle, so we predict next phase for the immediate call
    // or wait for useEffect. Let's use useEffect on state.currentPhase for the robust consultant reaction.
  }, [state.currentPhase, dispatch, onNavigate]);

  // React to phase changes for Agent instructions
  useEffect(() => {
    const reactToPhase = async () => {
      if (state.lastAction === 'PHASE_CHANGED') {
        const response = await AgentAPI.send(state);
        setInstruction(response.assistantText);
        if (response.shouldSpeak) {
          SpeechOut.speak(response.assistantText);
        }
      }
    };
    reactToPhase();
  }, [state]);

  return (
    <div className="h-full w-full">
      <CameraInterface 
        onCapture={handleCapture}
        onNextPhase={handleNextPhase}
        instruction={instruction}
      />
    </div>
  );
};
