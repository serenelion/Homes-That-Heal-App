import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Project, Photo, ScanPhase, ScanState } from '../types';
import { PHASE_ORDER } from '../constants';

interface State extends ScanState {
  project: Project | null;
}

type Action =
  | { type: 'INIT_PROJECT'; payload: Project }
  | { type: 'ADD_PHOTO'; payload: Photo }
  | { type: 'SET_PHASE'; payload: ScanPhase }
  | { type: 'NEXT_PHASE' }
  | { type: 'SET_JOB_ID'; payload: string | undefined };

const initialState: State = {
  project: null,
  currentPhase: 'CORNER_1',
  photos: [],
  totalPhotos: 0,
  lastAction: 'IDLE',
  activeJobId: undefined
};

const ScanContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

function scanReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INIT_PROJECT':
      return {
        ...initialState,
        project: action.payload,
        photos: action.payload.photos,
        totalPhotos: action.payload.photos.length,
        activeJobId: action.payload.reconJobId
      };
    case 'ADD_PHOTO':
      return {
        ...state,
        photos: [...state.photos, action.payload],
        totalPhotos: state.totalPhotos + 1,
        lastAction: 'PHOTO_TAKEN'
      };
    case 'SET_PHASE':
      return {
        ...state,
        currentPhase: action.payload,
        lastAction: 'PHASE_CHANGED'
      };
    case 'NEXT_PHASE':
      const currentIndex = PHASE_ORDER.indexOf(state.currentPhase);
      const nextPhase = PHASE_ORDER[currentIndex + 1] || 'REVIEW';
      return {
        ...state,
        currentPhase: nextPhase,
        lastAction: 'PHASE_CHANGED'
      };
    case 'SET_JOB_ID':
      return {
        ...state,
        activeJobId: action.payload
      };
    default:
      return state;
  }
}

export const ScanProvider = ({ children }: { children?: ReactNode }) => {
  const [state, dispatch] = useReducer(scanReducer, initialState);
  return (
    <ScanContext.Provider value={{ state, dispatch }}>
      {children}
    </ScanContext.Provider>
  );
};

export const useScan = () => {
  const context = useContext(ScanContext);
  if (!context) throw new Error("useScan must be used within ScanProvider");
  return context;
};
