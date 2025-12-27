export type ScanPhase = 
  | 'CORNER_1' 
  | 'CORNER_2' 
  | 'CORNER_3' 
  | 'CORNER_4' 
  | 'PERIMETER' 
  | 'REVIEW';

export interface Photo {
  id: string;
  url: string; // Blob URL
  timestamp: number;
  phase: ScanPhase;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  photos: Photo[];
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED';
}

export interface ScanState {
  currentPhase: ScanPhase;
  photos: Photo[];
  totalPhotos: number;
  lastAction: 'PHOTO_TAKEN' | 'PHASE_CHANGED' | 'IDLE';
}

// Service Adapter Interfaces
export interface AgentResponse {
  assistantText: string;
  warnings: string[];
  nextAction?: 'STAY' | 'ADVANCE_PHASE';
  shouldSpeak: boolean;
}

export interface KiriJobStatus {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  previewUrl?: string;
}
