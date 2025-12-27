import { Photo, Project, ScanPhase } from "../types";
import { Supabase } from "./supabaseClient";
import { Device } from "./device";

// In-memory storage as Local Mode fallback
const localProjects: Project[] = [];
const bucketId = 'scan-photos';

const nowTs = () => Date.now();

const mapProjectRow = (row: any): Project => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : nowTs(),
  photos: [],
  status: row.status ?? 'scanning',
  reconJobId: undefined
});

export const StorageAPI = {
  createProject: async (name: string): Promise<Project> => {
    if (!Supabase.isConfigured || !Supabase.client) {
      const newProject: Project = {
        id: crypto.randomUUID(),
        name,
        createdAt: nowTs(),
        photos: [],
        status: 'scanning'
      };
      localProjects.push(newProject);
      return newProject;
    }

    const { data, error } = await Supabase.client
      .from('scan_projects')
      .insert({
        name,
        status: 'scanning',
        device_id: Device.getId()
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to create project', error);
      throw new Error('Could not create project');
    }

    return mapProjectRow(data);
  },

  getProject: async (id: string): Promise<Project | undefined> => {
    if (!Supabase.isConfigured || !Supabase.client) {
      return localProjects.find(p => p.id === id);
    }

    const { data, error } = await Supabase.client
      .from('scan_projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      console.error('Failed to fetch project', error);
      return undefined;
    }

    const project = mapProjectRow(data);
    const assets = await Supabase.client
      .from('scan_assets')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true });

    if (!assets.error && assets.data) {
      project.photos = assets.data.map(asset => ({
        id: asset.id,
        storagePath: asset.storage_path,
        timestamp: asset.created_at ? new Date(asset.created_at).getTime() : nowTs(),
        phase: asset.step,
        url: undefined
      }));
    }

    return project;
  },

  addPhoto: async (projectId: string, blob: Blob, phase: ScanPhase): Promise<Photo> => {
    if (!Supabase.isConfigured || !Supabase.client) {
      const project = localProjects.find(p => p.id === projectId);
      if (!project) throw new Error("Project not found");

      const url = URL.createObjectURL(blob);
      const photo: Photo = {
        id: crypto.randomUUID(),
        url,
        timestamp: nowTs(),
        phase
      };

      project.photos.push(photo);
      return photo;
    }

    const assetId = crypto.randomUUID();
    const ext = 'jpg';
    const path = `${Supabase.deviceId}/${projectId}/${assetId}.${ext}`;

    const upload = await Supabase.client.storage
      .from(bucketId)
      .upload(path, blob, {
        cacheControl: '3600',
        contentType: 'image/jpeg',
        upsert: false
      });

    if (upload.error) {
      console.error('Failed to upload photo', upload.error);
      throw new Error('Upload failed');
    }

    const { data, error } = await Supabase.client
      .from('scan_assets')
      .insert({
        id: assetId,
        project_id: projectId,
        step: phase,
        storage_path: path,
        metadata_json: { captured_at: new Date().toISOString() }
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to record photo', error);
      throw new Error('Could not record photo');
    }

    const signed = await Supabase.client.storage.from(bucketId).createSignedUrl(path, 3600);
    return {
      id: assetId,
      url: signed.data?.signedUrl,
      storagePath: path,
      timestamp: data.created_at ? new Date(data.created_at).getTime() : nowTs(),
      phase
    };
  },

  getAllProjects: async (): Promise<Project[]> => {
    if (!Supabase.isConfigured || !Supabase.client) {
      return localProjects;
    }

    const { data, error } = await Supabase.client
      .from('scan_projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('Failed to load projects', error);
      return [];
    }

    return data.map(mapProjectRow);
  }
};
