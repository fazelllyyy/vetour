/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { useTourStore } from '@/store/useTourStore';
import { resolvePanoramaUrl } from '@/lib/panorama';
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

async function buildNodesLazy(
  project: TourProject,
  activeId: string | undefined,
  onReady: (nodes: VirtualTourNode[], activeId?: string) => void
): Promise<void> {
  const allNodes: VirtualTourNode[] = [];

  if (activeId) {
    const idx = project.scenes.findIndex((s) => s.id === activeId);
    if (idx >= 0) {
      const scene = project.scenes[idx];
      try {
        const panoUrl = await resolvePanoramaUrl(scene.panorama);
        allNodes.push({
          id: scene.id,
          panorama: panoUrl,
          name: scene.name,
          caption: scene.caption,
          sphereCorrection: scene.sphereCorrection,
          gps: scene.gps,
          map: scene.map as VirtualTourNode['map'],
          plan: scene.plan as VirtualTourNode['plan'],
        });
      } catch (err) {
        console.warn(`[PSV] Active scene "${scene.name || scene.id}" failed:`, err);
      }
    }
  }

  // We process the activeId first so it's first in the array (optional, but good for ordering)

  for (const scene of project.scenes) {
    if (allNodes.some((n) => n.id === scene.id)) continue;
    try {
      const panoUrl = await resolvePanoramaUrl(scene.panorama);
      allNodes.push({
        id: scene.id,
        panorama: panoUrl,
        name: scene.name,
        caption: scene.caption,
        sphereCorrection: scene.sphereCorrection,
        gps: scene.gps,
        map: scene.map as VirtualTourNode['map'],
        plan: scene.plan as VirtualTourNode['plan'],
      });
    } catch (err) {
      console.warn(`[PSV] Skipping scene "${scene.name || scene.id}" — panorama load failed:`, err);
    }
  }

  onReady([...allNodes], activeId);
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
  const [isLoading, setIsLoading] = useState(true);
  const setViewerLoading = useTourStore((s) => s.setViewerLoading);
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
      // Only reload nodes if the id or panorama image changes.
      // Name, markers, and links are handled manually or outside the viewer, so they shouldn't trigger a full 3D scene reload.
      return s.id === o.id && s.panorama === o.panorama;
    });
  }

  // Reset loading flags on mount and unmount to prevent stale state from previous sessions
  useEffect(() => {
    return () => {
      useTourStore.getState().setViewerLoading(false);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || viewerRef.current) return;

    const state = useTourStore.getState();
    const project = state.project;
    const activeId = state.activeSceneId ?? project?.scenes[0]?.id;
    prevProjectRef.current = project;
    prevActiveSceneRef.current = state.activeSceneId;

    const viewer = new Viewer({
      container: el,
      panorama: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      navbar: [],
      loadingImg: '',
      loadingTxt: '',
      lang: { loadError: '' },
      plugins: [
        [MarkersPlugin, {}],
        [VirtualTourPlugin, { positionMode: 'manual', renderMode: '3d', preload: true, transitionOptions: { showLoader: false } }],
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

    viewer.addEventListener('panorama-load', () => {
      console.log('[PSVViewer] panorama-load event fired!');
      // We handle loading state explicitly in subscribe to prevent false positives
    });

    viewer.addEventListener('panorama-loaded', () => {
      setViewerLoading(false);
      setIsLoading(false);
    });

    viewer.addEventListener('panorama-error', () => {
      // Still hide loading on error so it doesn't get stuck forever
      setIsLoading(false);
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
              mp.clearMarkers();
              setTimeout(() => {
                try { vp.setCurrentNode(targetId); } catch(err) { console.warn(err); }
              }, 50);
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

    const handleFocusMarker = (e: Event) => {
      const ce = e as CustomEvent<string>;
      try {
        const markerId = ce.detail;
        console.log('[PSVViewer] Focusing marker:', markerId);
        const marker = mp.getMarker(markerId);
        if (marker && marker.config.position) {
          const pos = marker.config.position as { yaw: number; pitch: number };
          viewer.animate({
            yaw: pos.yaw,
            pitch: pos.pitch,
            speed: '1s'
          });
        } else {
          console.warn('[PSVViewer] Marker not found or has no position:', markerId);
        }
      } catch (err) {
        console.warn('[PSV] animate to marker failed:', err);
      }
    };
    window.addEventListener('focus-marker', handleFocusMarker);

    viewerRef.current = viewer;
    virtualTourRef.current = vp;

    // Persistent listener — clears loading state every time a panorama fully renders
    const onPanoramaLoaded = () => {
      useTourStore.getState().setViewerLoading(false);
      setIsLoading(false);
    };
    viewer.addEventListener('panorama-loaded', onPanoramaLoaded);

    const initNodes = () => {
      if (project && project.scenes.length > 0) {
        setIsLoading(true);
        buildNodesLazy(project, activeId, (nodes, passedActiveId) => {
          const plugin = virtualTourRef.current;
          if (!plugin || !viewerRef.current) return;
          try {
            // Temporarily suppress harmless PSV warnings about no links, because we intentionally handle them manually as custom markers
            const originalWarn = console.warn;
            console.warn = (...args) => {
              if (typeof args[0] === 'string') {
                if (args[0].includes('Multiple instances of Three.js')) return;
                if (args[0].includes('has no links')) return;
                if (args[0].includes('is never linked to')) return;
              }
              originalWarn.apply(console, args);
            };

            plugin.setNodes(nodes, passedActiveId);

            // Restore console.warn after a short delay to catch asynchronous warnings during load
            setTimeout(() => {
              console.warn = originalWarn;
            }, 1000);

            // Dispatch resize to ensure WebGL canvas fills the container properly
            setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
            }, 50);

            // Ensure markers are shown for the initial scene
            if (passedActiveId) {
              setTimeout(() => {
                const initialScene = project.scenes.find(s => s.id === passedActiveId);
                if (initialScene && mp) updateSceneMarkers(mp, initialScene);
              }, 300);
            }
          } catch (err) {
            console.error('[PSV] setNodes failed:', err);
          }
          // panorama-loaded listener will clear loading state. Fallback below covers cached/instant renders.
          if (nodes.length === project.scenes.length) {
            setTimeout(() => {
              setIsLoading(false);
              setViewerLoading(false);
            }, 800);
          }
        });
      } else {
        setIsLoading(false);
        setViewerLoading(false);
      }
    };

    let isReady = false;
    viewer.addEventListener('ready', () => {
      if (isReady) return;
      isReady = true;
      initNodes();
    }, { once: true });

    // Fallback in case ready event is missed or doesn't fire
    setTimeout(() => {
      if (!isReady) {
        isReady = true;
        initNodes();
      }
    }, 250);

    return () => {
      window.removeEventListener('pointerdown', handleWindowPointerDown, true);
      window.removeEventListener('pointermove', handleWindowPointerMove, true);
      window.removeEventListener('pointerup', handleWindowPointerUp, true);
      window.removeEventListener('contextmenu', handleWindowContextMenu, true);
      window.removeEventListener('focus-marker', handleFocusMarker);
      
      viewer.destroy();
      viewerRef.current = null;
      virtualTourRef.current = null;
    };
  }, [setViewerLoading]);

  useEffect(() => {
    const unsub = useTourStore.subscribe((state) => {
      if (state.isPresentMode || !virtualTourRef.current || !viewerRef.current || !state.project) return;

      const mp = viewerRef.current.getPlugin(MarkersPlugin) as MarkersPlugin;
      const projectChanged = state.project !== prevProjectRef.current;
      let scenesChanged = false;

      if (projectChanged) {
        scenesChanged = !prevProjectRef.current || !isSameScenes(state.project, prevProjectRef.current);
        if (scenesChanged) {
           console.log('[PSVViewer] scenesChanged is TRUE!', { 
             prev: prevProjectRef.current?.scenes.map(s => s.id),
             curr: state.project.scenes.map(s => s.id)
           });
        }
        prevProjectRef.current = state.project;

        if (scenesChanged) {
          const activeId = state.activeSceneId ?? state.project.scenes[0]?.id;
          console.log('[PSVViewer] Calling buildNodesLazy');
          buildNodesLazy(state.project, activeId, (nodes, passedActiveId) => {
            if (!virtualTourRef.current || !viewerRef.current) return;
            try {
              // Temporarily suppress harmless PSV warnings about no links
              const originalWarn = console.warn;
              console.warn = (...args) => {
                if (typeof args[0] === 'string') {
                  if (args[0].includes('Multiple instances of Three.js')) return;
                  if (args[0].includes('has no links')) return;
                  if (args[0].includes('is never linked to')) return;
                }
                originalWarn.apply(console, args);
              };

              virtualTourRef.current.setNodes(nodes, passedActiveId);

              setTimeout(() => {
                console.warn = originalWarn;
              }, 1000);

              // Dispatch resize to ensure WebGL canvas fills the container properly
              setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
              }, 50);

              if (passedActiveId) {
                setTimeout(() => {
                  const initialScene = state.project?.scenes.find(s => s.id === passedActiveId);
                  if (initialScene && mp) updateSceneMarkers(mp, initialScene);
                }, 300);
              }
            } catch (err) {
              console.error('[PSV] setNodes (subscribe) failed:', err);
            }
            // After setNodes, loading will be cleared by the panorama-loaded listener.
            // But add a safety fallback in case panorama-loaded doesn't fire (e.g. cached).
            setTimeout(() => {
              setIsLoading(false);
              setViewerLoading(false);
            }, 800);
          });
        }
      }

      if (state.activeSceneId !== prevActiveSceneRef.current) {
        prevActiveSceneRef.current = state.activeSceneId;
        if (mp) {
          if (virtualTourRef.current && state.activeSceneId && !scenesChanged) {
            try {
              if (virtualTourRef.current.getCurrentNode()?.id !== state.activeSceneId) {
                mp.clearMarkers();
                setTimeout(() => {
                  virtualTourRef.current?.setCurrentNode(state.activeSceneId!);
                }, 50);
              }
            } catch(e) {
              console.warn('[PSV] setCurrentNode failed:', e);
            }
          }
        }
      } else if (projectChanged && !scenesChanged) {
        // Project metadata changed but scenes are the same (e.g. re-opening same file).
        // The viewer is already showing the right panorama, so clear loading immediately.
        setIsLoading(false);
        setViewerLoading(false);
        const activeScene = state.project.scenes.find(s => s.id === state.activeSceneId);
        if (mp && activeScene) {
          updateSceneMarkers(mp, activeScene);
        }
      }
    });
    return unsub;
  }, [setViewerLoading]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <svg className="w-8 h-8 text-primary animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium text-text-primary">Loading panorama...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full [&_.psv-navbar]:!hidden [&_.psv-loader-container]:!hidden [&_.psv-overlay]:!hidden [&_.psv-notification]:!hidden [&_.psv-error]:!hidden" />
    </div>
  );
};