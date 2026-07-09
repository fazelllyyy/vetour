/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { useEffect, useRef } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { useTourStore } from '@/store/useTourStore';
import { resolvePanoramaUrl, revokePanoramaBlobs } from '@/lib/panorama';
import { revokeVetourBlobs } from '@/lib/vetourFile';
import type { VirtualTourNode } from '@photo-sphere-viewer/virtual-tour-plugin';
import type { TourProject, TourScene, NavigationHotspot, InfoHotspot } from '@/types/tour';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import '@photo-sphere-viewer/virtual-tour-plugin/index.css';



function getActionMarkerIcon(action: string, label: string): string {
  let iconSvg: string;
  switch (action) {
    case 'navigate':
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
      break;
    case 'show_image':
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
      break;
    case 'show_video':
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
      break;
    case 'show_text':
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`;
      break;
    case 'show_document':
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;
      break;
    case 'play_sound':
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
      break;
    default:
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
  }

  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      border-radius: 9999px;
      font-family: sans-serif;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(4px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      transition: all 0.2s ease-in-out;
      white-space: nowrap;
    " onmouseover="this.style.background='rgba(0, 0, 0, 0.8)';this.style.border='1px solid rgba(255, 255, 255, 0.4)'" onmouseout="this.style.background='rgba(0, 0, 0, 0.6)';this.style.border='1px solid rgba(255, 255, 255, 0.2)'">
      ${iconSvg}
      <span>${label}</span>
    </div>
  `;
}

function getMarkerId(m: NavigationHotspot | InfoHotspot): string {
  if ('nodeId' in m) return 'nav_' + m.nodeId;
  return m.id || `hotspot_${Math.random().toString(36).substring(2, 9)}`;
}

function getMarkerData(m: NavigationHotspot | InfoHotspot): { id: string; position: { yaw: number; pitch: number }; html: string; anchor?: string } {
  const id = getMarkerId(m);
  const pos = m.position
    ? { yaw: Number(m.position.yaw) || 0, pitch: Number(m.position.pitch) || 0 }
    : { yaw: 0, pitch: 0 };

  if ('nodeId' in m) {
    const name = m.name || 'Navigate';
    return {
      id,
      position: pos,
      html: getActionMarkerIcon('navigate', name),
      anchor: 'center center',
    };
  }

  const md = (m.data ?? {}) as Record<string, unknown>;
  const action = (md.action as string) || (m.image ? 'show_image' : m.content ? 'show_text' : 'show_text');
  const tooltip = typeof m.tooltip === 'string' ? m.tooltip : m.tooltip?.content || 'Hotspot';
  return {
    id,
    position: pos,
    html: getActionMarkerIcon(action, tooltip),
    anchor: 'center center',
  };
}

function getSceneMarkers(scene: TourScene) {
  const markers: Array<ReturnType<typeof getMarkerData>> = [];
  for (const link of scene.links) {
    if (link.nodeId === scene.id) continue;
    markers.push(getMarkerData(link));
  }
  for (const m of scene.markers) {
    markers.push(getMarkerData(m));
  }
  return markers;
}

async function buildNodesAsync(project: TourProject): Promise<VirtualTourNode[]> {
  return Promise.all(project.scenes.map(async (scene): Promise<VirtualTourNode> => ({
    id: scene.id,
    panorama: await resolvePanoramaUrl(scene.panorama),
    name: scene.name,
    caption: scene.caption,
    sphereCorrection: scene.sphereCorrection,
    gps: scene.gps,
    map: scene.map as VirtualTourNode['map'],
    plan: scene.plan as VirtualTourNode['plan'],
  })));
}

interface PSVViewerProps {
  onPresentMarkerClick?: (markerId: string) => void;
  onRightClickPlace?: (pos: { yaw: number; pitch: number }, screenX: number, screenY: number) => void;
  onCancelPlace?: () => void;
  onHotspotDoubleClick?: (sceneId: string, markerId: string) => void;
}

export const PSVViewer = ({ onPresentMarkerClick, onRightClickPlace, onCancelPlace, onHotspotDoubleClick }: PSVViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const virtualTourRef = useRef<VirtualTourPlugin | null>(null);
  const onPresentMarkerClickRef = useRef(onPresentMarkerClick);
  onPresentMarkerClickRef.current = onPresentMarkerClick;
  const onRightClickPlaceRef = useRef(onRightClickPlace);
  onRightClickPlaceRef.current = onRightClickPlace;
  const onCancelPlaceRef = useRef(onCancelPlace);
  onCancelPlaceRef.current = onCancelPlace;
  const onHotspotDoubleClickRef = useRef(onHotspotDoubleClick);
  onHotspotDoubleClickRef.current = onHotspotDoubleClick;
  const prevProjectRef = useRef<TourProject | null>(null);
  const prevActiveSceneRef = useRef<string | null>(null);
  const lastClickRef = useRef<{ markerId: string; time: number } | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateSceneMarkers(markersPlugin: MarkersPlugin, scene: TourScene) {
    markersPlugin.clearMarkers();
    const markers = getSceneMarkers(scene);
    markersPlugin.setMarkers(markers);
  }

  function isSameScenes(a: TourProject, b: TourProject): boolean {
    if (a.scenes.length !== b.scenes.length) return false;
    return a.scenes.every((s, i) => {
      const o = b.scenes[i];
      return s.id === o.id && s.name === o.name && s.panorama === o.panorama
        && s.links.length === o.links.length && s.markers.length === o.markers.length;
    });
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el || viewerRef.current) return;

    const state = useTourStore.getState();
    const project = state.project;
    const activeId = state.activeSceneId ?? project?.scenes[0]?.id;
    prevProjectRef.current = project ? { ...project } : null;
    prevActiveSceneRef.current = state.activeSceneId;

    const viewer = new Viewer({
      container: el,
      panorama: undefined,
      navbar: [],
      plugins: [
        [MarkersPlugin, {}],
        [VirtualTourPlugin, { positionMode: 'manual', renderMode: '3d', preload: true }],
      ],
    });

    const vp = viewer.getPlugin(VirtualTourPlugin) as VirtualTourPlugin;
    const mp = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;

    vp.addEventListener('node-changed', (e) => {
      const s = useTourStore.getState();
      s.setActiveScene(e.node.id);
      const scene = s.project?.scenes.find(sc => sc.id === e.node.id);
      if (scene) {
        updateSceneMarkers(mp, scene);
      }
    });

    viewer.addEventListener('click', (e) => {
      const s = useTourStore.getState();
      if (s.isPresentMode) return;

      if (e.data?.rightclick && s.activeSceneId) {
        const pos = { yaw: e.data.yaw ?? 0, pitch: e.data.pitch ?? 0 };
        const sp = viewer.dataHelper.sphericalCoordsToViewerCoords(pos);
        onRightClickPlaceRef.current?.(pos, sp.x, sp.y);
        return;
      }

      if (e.data?.rightclick) return;
      onCancelPlaceRef.current?.();
    });

    viewer.addEventListener('position-updated', () => {
      onCancelPlaceRef.current?.();
    });

    mp.addEventListener('select-marker', (e) => {
      const s = useTourStore.getState();
      const markerId = e.marker?.id ?? null;
      if (!markerId) return;

      const prev = lastClickRef.current;
      if (prev && prev.markerId === markerId && Date.now() - prev.time < 350) {
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        lastClickRef.current = null;

        if (!s.isPresentMode && !markerId.startsWith('nav_') && s.activeSceneId) {
          onHotspotDoubleClickRef.current?.(s.activeSceneId, markerId);
        }
        return;
      }

      lastClickRef.current = { markerId, time: Date.now() };

      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        const state = useTourStore.getState();

        if (markerId.startsWith('nav_')) {
          const targetId = markerId.slice(4);
          if (state.project?.scenes.some(sc => sc.id === targetId)) {
            if (state.isPresentMode) {
              vp.setCurrentNode(targetId);
            } else {
              state.setSelectedHotspot(targetId);
            }
          }
          return;
        }

        if (state.isPresentMode) {
          onPresentMarkerClickRef.current?.(markerId);
          return;
        }
        state.setSelectedHotspot(markerId);
      }, 300);
    });

    let hoveredMarkerId: string | null = null;
    let draggingMarkerId: string | null = null;
    let draggingInitialPos: Parameters<MarkersPlugin['updateMarker']>[0]['position'] | null = null;

    mp.addEventListener('enter-marker', (e) => {
      if (useTourStore.getState().isPresentMode) return;
      hoveredMarkerId = e.marker.id;
    });

    mp.addEventListener('leave-marker', (e) => {
      if (hoveredMarkerId === e.marker.id) {
        hoveredMarkerId = null;
      }
    });

    let hasDraggedRightClick = false;

    const isInsideViewer = (target: EventTarget | null) => {
      if (!target || !el) return false;
      return el.contains(target as Node);
    };

    const handleWindowPointerDown = (e: PointerEvent) => {
      if (!isInsideViewer(e.target)) return;
      if (e.button === 1 || e.button === 2) {
        viewerRef.current?.setOption('mousemove', false);
      }
      
      if (e.button === 2) {
        hasDraggedRightClick = false;
        if (hoveredMarkerId) {
          draggingMarkerId = hoveredMarkerId;
          const marker = mp.getMarker(hoveredMarkerId);
          if (marker && marker.config.position) {
            draggingInitialPos = marker.config.position;
          }
        }
      }
    };

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (draggingMarkerId) {
        hasDraggedRightClick = true;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
          const pos = viewer.dataHelper.viewerCoordsToSphericalCoords({ x, y });
          if (pos) {
            mp.updateMarker({ id: draggingMarkerId, position: { yaw: pos.yaw, pitch: pos.pitch } });
          }
        }
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      if (e.button === 1 || e.button === 2) {
        viewerRef.current?.setOption('mousemove', true);
      }

      if (e.button === 2 && draggingMarkerId) {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        let validPos = null;
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
          validPos = viewer.dataHelper.viewerCoordsToSphericalCoords({ x, y });
        }

        const state = useTourStore.getState();
        const activeSceneId = state.activeSceneId;

        if (validPos && activeSceneId) {
          if (draggingMarkerId.startsWith('nav_')) {
            const targetId = draggingMarkerId.slice(4);
            state.updateNavHotspot(activeSceneId, targetId, { position: { yaw: validPos.yaw, pitch: validPos.pitch } });
          } else {
            state.updateInfoHotspot(activeSceneId, draggingMarkerId, { position: { yaw: validPos.yaw, pitch: validPos.pitch } });
          }
        } else if (draggingInitialPos) {
          mp.updateMarker({ id: draggingMarkerId, position: draggingInitialPos });
        }

        draggingMarkerId = null;
        draggingInitialPos = null;
      }
    };

    const handleWindowContextMenu = (e: MouseEvent) => {
      if (!isInsideViewer(e.target)) return;
      e.preventDefault();

      if (hasDraggedRightClick || draggingMarkerId) {
        hasDraggedRightClick = false;
        return;
      }

      const s = useTourStore.getState();
      if (s.isPresentMode || !s.activeSceneId) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pos = viewer.dataHelper.viewerCoordsToSphericalCoords({ x, y });
      
      if (pos) {
        const sp = viewer.dataHelper.sphericalCoordsToViewerCoords(pos);
        onRightClickPlaceRef.current?.(pos, sp.x, sp.y);
      }
    };

    window.addEventListener('pointerdown', handleWindowPointerDown, true);
    window.addEventListener('pointermove', handleWindowPointerMove, true);
    window.addEventListener('pointerup', handleWindowPointerUp, true);
    window.addEventListener('contextmenu', handleWindowContextMenu, true);

    viewerRef.current = viewer;
    virtualTourRef.current = vp;

    if (project && project.scenes.length > 0) {
      buildNodesAsync(project).then((nodes) => {
        const plugin = virtualTourRef.current;
        if (!plugin || !viewerRef.current) return;
        try {
          plugin.setNodes(nodes, activeId);
        } catch (err) {
          console.error('[PSV] setNodes failed:', err);
        }
      });
    }

    return () => {
      window.removeEventListener('pointerdown', handleWindowPointerDown, true);
      window.removeEventListener('pointermove', handleWindowPointerMove, true);
      window.removeEventListener('pointerup', handleWindowPointerUp, true);
      window.removeEventListener('contextmenu', handleWindowContextMenu, true);
      
      revokePanoramaBlobs();
      revokeVetourBlobs();
      viewer.destroy();
      viewerRef.current = null;
      virtualTourRef.current = null;
    };
  }, []);

  useEffect(() => {
    const unsub = useTourStore.subscribe((state) => {
      if (state.isPresentMode || !virtualTourRef.current || !viewerRef.current || !state.project) return;

      const mp = viewerRef.current.getPlugin(MarkersPlugin) as MarkersPlugin;
      const projectChanged = state.project !== prevProjectRef.current;

      if (projectChanged) {
        const scenesChanged = !prevProjectRef.current || !isSameScenes(state.project, prevProjectRef.current);
        prevProjectRef.current = { ...state.project };

        if (scenesChanged) {
          const activeId = state.activeSceneId ?? state.project.scenes[0]?.id;
          buildNodesAsync(state.project).then((nodes) => {
            if (!virtualTourRef.current || !viewerRef.current) return;
            try {
              virtualTourRef.current.setNodes(nodes, activeId);
            } catch (err) {
              console.error('[PSV] setNodes (subscribe) failed:', err);
            }
          });
        }
      }

      if (state.activeSceneId !== prevActiveSceneRef.current) {
        prevActiveSceneRef.current = state.activeSceneId;
        const activeScene = state.project.scenes.find(s => s.id === state.activeSceneId);
        if (mp && activeScene) {
          updateSceneMarkers(mp, activeScene);
          if (virtualTourRef.current && state.activeSceneId) {
            virtualTourRef.current.setCurrentNode(state.activeSceneId!);
          }
        }
      } else if (projectChanged) {
        const activeScene = state.project.scenes.find(s => s.id === state.activeSceneId);
        if (mp && activeScene) {
          updateSceneMarkers(mp, activeScene);
        }
      }
    });
    return unsub;
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full [&_.psv-navbar]:!hidden" />
  );
};