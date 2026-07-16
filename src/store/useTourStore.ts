/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { create } from 'zustand';
import { TourProject, TourScene, InfoHotspot, NavigationHotspot, AssetEntry } from '../types/tour';
import { generateHotspotId } from '@/constants';

interface TourState {
  project: TourProject | null;
  projectLoading: boolean;
  viewerLoading: boolean;
  activeSceneId: string | null;
  selectedHotspotId: string | null;
  hotspotMode: 'info' | 'nav' | null;
  unsavedChanges: boolean;
  isPresentMode: boolean;
  savedPath: string | null;
  
  // Actions
  setProject: (project: TourProject) => void;
  setProjectLoading: (loading: boolean) => void;
  setViewerLoading: (loading: boolean) => void;
  updateProject: (project: TourProject) => void;
  loadProject: (project: TourProject) => void;
  setSavedPath: (path: string | null) => void;
  setActiveScene: (sceneId: string) => void;
  setSelectedHotspot: (hotspotId: string | null) => void;
  setHotspotMode: (mode: 'info' | 'nav' | null) => void;
  setUnsavedChanges: (unsaved: boolean) => void;
  setPresentMode: (present: boolean) => void;
  
  // Scene actions
  addScene: (scene: TourScene) => void;
  updateScene: (sceneId: string, updates: Partial<TourScene>) => void;
  deleteScene: (sceneId: string) => void;
  
  addInfoHotspot: (sceneId: string, hotspot: InfoHotspot) => void;
  updateInfoHotspot: (sceneId: string, hotspotId: string, updates: Partial<InfoHotspot>) => void;
  deleteInfoHotspot: (sceneId: string, hotspotId: string) => void;

  addNavHotspot: (sceneId: string, hotspot: NavigationHotspot) => void;
  updateNavHotspot: (sceneId: string, hotspotId: string, updates: Partial<NavigationHotspot>) => void;
  deleteNavHotspot: (sceneId: string, hotspotId: string) => void;

  // Asset actions
  addAsset: (asset: AssetEntry) => void;
  removeAsset: (id: string) => void;
  renameAsset: (id: string, name: string) => void;
  updateAsset: (id: string, updates: Partial<AssetEntry>) => void;
}

export const useTourStore = create<TourState>((set) => ({
  project: null,
  projectLoading: false,
  viewerLoading: false,
  activeSceneId: null,
  selectedHotspotId: null,
  hotspotMode: null,
  unsavedChanges: false,
  isPresentMode: false,
  savedPath: null,

  setProjectLoading: (loading) => set({ projectLoading: loading }),
  setViewerLoading: (loading) => set({ viewerLoading: loading }),
  setProject: (project) => {
    project.scenes.forEach(s => {
      s.markers.forEach(m => {
        if (!m.id) m.id = generateHotspotId();
      });
      s.links.forEach(l => {
        if (!l.id) l.id = generateHotspotId();
      });
    });
    set({ project, activeSceneId: project.defaultSceneId || (project.scenes.length > 0 ? project.scenes[0].id : null), projectLoading: false, viewerLoading: project.scenes.length > 0 });
  },
  loadProject: (project) => {
    project.scenes.forEach(s => {
      s.markers.forEach(m => {
        if (!m.id) m.id = generateHotspotId();
      });
      s.links.forEach(l => {
        if (!l.id) l.id = generateHotspotId();
      });
    });
    set({ project, activeSceneId: project.defaultSceneId || (project.scenes.length > 0 ? project.scenes[0].id : null), unsavedChanges: false, projectLoading: false, viewerLoading: project.scenes.length > 0, selectedHotspotId: null, hotspotMode: null });
  },
  updateProject: (project) => {
    project.scenes.forEach(s => {
      s.markers.forEach(m => {
        if (!m.id) m.id = generateHotspotId();
      });
      s.links.forEach(l => {
        if (!l.id) l.id = generateHotspotId();
      });
    });
    set({ project, projectLoading: false });
  },
  setSavedPath: (savedPath) => set({ savedPath }),
  setActiveScene: (sceneId) => set({ activeSceneId: sceneId, selectedHotspotId: null, hotspotMode: null }),
  setSelectedHotspot: (hotspotId) => set({ selectedHotspotId: hotspotId, hotspotMode: null }),
  setHotspotMode: (mode) => set({ hotspotMode: mode, selectedHotspotId: null }),
  setUnsavedChanges: (unsaved) => set({ unsavedChanges: unsaved }),
  setPresentMode: (present) => set({ isPresentMode: present, selectedHotspotId: null, hotspotMode: null }),

  addScene: (scene) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        scenes: [...state.project.scenes, scene],
      },
      unsavedChanges: true,
      activeSceneId: scene.id
    };
  }),

  updateScene: (sceneId, updates) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        scenes: state.project.scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s),
      },
      unsavedChanges: true
    };
  }),

  deleteScene: (sceneId) => set((state) => {
    if (!state.project) return state;
    const remainingScenes = state.project.scenes.filter(s => s.id !== sceneId);
    return {
      project: {
        ...state.project,
        scenes: remainingScenes,
      },
      activeSceneId: state.activeSceneId === sceneId ? (remainingScenes.length > 0 ? remainingScenes[0].id : null) : state.activeSceneId,
      unsavedChanges: true
    };
  }),

  addInfoHotspot: (sceneId, hotspot) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        scenes: state.project.scenes.map(s => 
          s.id === sceneId ? { ...s, markers: [...s.markers, hotspot] } : s
        )
      },
      unsavedChanges: true
    };
  }),

  updateInfoHotspot: (sceneId, hotspotId, updates) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        scenes: state.project.scenes.map(s => 
          s.id === sceneId ? {
            ...s,
            markers: s.markers.map(h => h.id === hotspotId ? { ...h, ...updates } : h)
          } : s
        )
      },
      unsavedChanges: true
    };
  }),

  deleteInfoHotspot: (sceneId, hotspotId) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        scenes: state.project.scenes.map(s => 
          s.id === sceneId ? {
            ...s,
            markers: s.markers.filter(h => h.id !== hotspotId)
          } : s
        )
      },
      selectedHotspotId: state.selectedHotspotId === hotspotId ? null : state.selectedHotspotId,
      unsavedChanges: true
    };
  }),

  addNavHotspot: (sceneId, hotspot) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        scenes: state.project.scenes.map(s => 
          s.id === sceneId ? { ...s, links: [...s.links, hotspot] } : s
        )
      },
      unsavedChanges: true
    };
  }),

  updateNavHotspot: (sceneId, hotspotId, updates) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        scenes: state.project.scenes.map(s => 
          s.id === sceneId ? {
            ...s,
            links: s.links.map(h => h.id === hotspotId ? { ...h, ...updates } : h)
          } : s
        )
      },
      unsavedChanges: true
    };
  }),

  deleteNavHotspot: (sceneId, hotspotId) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        scenes: state.project.scenes.map(s => 
          s.id === sceneId ? {
            ...s,
            links: s.links.filter(h => h.id !== hotspotId)
          } : s
        )
      },
      selectedHotspotId: state.selectedHotspotId === hotspotId ? null : state.selectedHotspotId,
      unsavedChanges: true
    };
  }),

  // Asset actions
  addAsset: (asset) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        assets: [...state.project.assets, asset],
      },
      unsavedChanges: true,
    };
  }),

  removeAsset: (id) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        assets: state.project.assets.filter((a) => a.id !== id),
      },
      unsavedChanges: true,
    };
  }),

  renameAsset: (id, name) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        assets: state.project.assets.map((a) => a.id === id ? { ...a, name } : a),
      },
      unsavedChanges: true,
    };
  }),

  updateAsset: (id, updates) => set((state) => {
    if (!state.project) return state;
    return {
      project: {
        ...state.project,
        assets: state.project.assets.map((a) => a.id === id ? { ...a, ...updates } : a),
      },
      unsavedChanges: true,
    };
  }),
}));