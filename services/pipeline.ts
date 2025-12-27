import { KiriJobStatus } from "../types";

export const PipelineAPI = {
  startKiri: async (projectId: string): Promise<string> => {
    console.log(`[Mock Kiri] Starting job for project ${projectId}`);
    return `job_${Date.now()}`;
  },

  getStatus: async (jobId: string): Promise<KiriJobStatus> => {
    // Mock polling logic: randomly progress
    const stored = sessionStorage.getItem(`job_${jobId}_progress`);
    let progress = stored ? parseInt(stored) : 0;
    
    if (progress < 100) {
      progress += Math.floor(Math.random() * 20) + 5;
      if (progress > 100) progress = 100;
      sessionStorage.setItem(`job_${jobId}_progress`, progress.toString());
    }

    return {
      status: progress === 100 ? 'completed' : 'processing',
      progress,
      previewUrl: progress === 100 ? 'https://picsum.photos/800/600' : undefined
    };
  }
};
