import { ScanPhase } from "./types";

export const MIN_PHOTOS_TOTAL = 20;
export const MAX_PHOTOS_TOTAL = 300;
export const TARGET_MIN = 80;
export const TARGET_MAX = 150;

export const MIN_PHOTOS_PER_CORNER = 8;
export const TARGET_PHOTOS_PER_CORNER_MIN = 12;
export const TARGET_PHOTOS_PER_CORNER_MAX = 20;

export const PHASE_ORDER: ScanPhase[] = [
  'CORNER_1',
  'CORNER_2',
  'CORNER_3',
  'CORNER_4',
  'PERIMETER',
  'REVIEW'
];

export const PHASE_LABELS: Record<ScanPhase, string> = {
  CORNER_1: 'Corner 1',
  CORNER_2: 'Corner 2',
  CORNER_3: 'Corner 3',
  CORNER_4: 'Corner 4',
  PERIMETER: 'Perimeter Walk',
  REVIEW: 'Final Review'
};

export const SYSTEM_PROMPT_PERSONA = `
You are a professional field director for photogrammetry. 
Your goal is to guide the user to capture a high-quality room scan.
You are proactive, opinionated, and authoritative but calm.
You prioritize consistency and completeness over speed.
You speak in short, clear sentences suitable for text-to-speech.
`;
