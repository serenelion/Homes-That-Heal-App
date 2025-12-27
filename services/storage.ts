import { Photo, Project, ScanPhase } from "../types";

// In-memory storage for the prototype session
// In a real app, this would use IndexedDB or FileSystem API
let projects: Project[] = [];

export const StorageAPI = {
  createProject: async (name: string): Promise<Project> => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      photos: [],
      status: 'DRAFT'
    };
    projects.push(newProject);
    return newProject;
  },

  getProject: async (id: string): Promise<Project | undefined> => {
    return projects.find(p => p.id === id);
  },

  addPhoto: async (projectId: string, blob: Blob, phase: ScanPhase): Promise<Photo> => {
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error("Project not found");

    const url = URL.createObjectURL(blob);
    const photo: Photo = {
      id: crypto.randomUUID(),
      url,
      timestamp: Date.now(),
      phase
    };

    project.photos.push(photo);
    return photo;
  },

  getAllProjects: async (): Promise<Project[]> => {
    return projects;
  }
};
