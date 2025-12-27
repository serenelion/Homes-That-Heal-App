import { KiriJobStatus } from "../types";
import { Supabase } from "./supabaseClient";
import { SupabaseFunctions } from "./supabaseFunctions";

const mockJobProgress: Record<string, number> = {};

const localStart = (projectId: string) => {
  const id = `job_${Date.now()}`;
  mockJobProgress[id] = 0;
  console.log(`[Mock Kiri] Starting job for project ${projectId}`);
  return id;
};

const localStatus = (jobId: string): KiriJobStatus => {
  let progress = mockJobProgress[jobId] ?? 0;
  if (progress < 100) {
    progress += Math.floor(Math.random() * 20) + 5;
    if (progress > 100) progress = 100;
    mockJobProgress[jobId] = progress;
  }

  return {
    status: progress === 100 ? 'completed' : 'processing',
    progress,
    previewUrl: progress === 100 ? 'https://picsum.photos/800/600' : undefined
  };
};

export const PipelineAPI = {
  startKiri: async (projectId: string): Promise<string> => {
    if (!Supabase.isConfigured) {
      return localStart(projectId);
    }

    const data = await SupabaseFunctions.call<{ jobId: string }>('kiri-start', {
      method: 'POST',
      body: { projectId }
    });

    return data.jobId;
  },

  getStatus: async (jobId: string, projectId?: string): Promise<KiriJobStatus> => {
    if (!Supabase.isConfigured) {
      return localStatus(jobId);
    }

    const payload = await SupabaseFunctions.call<KiriJobStatus>('kiri-status', {
      method: 'GET',
      query: { jobId, projectId }
    });

    return payload;
  }
};
