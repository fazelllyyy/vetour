/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTourStore } from '@/store/useTourStore';
import { GridCard } from '../ui/GridCard';
import { Modal, ConfirmModal } from '../ui/Modal';
import { ContextMenu } from '../ui/ContextMenu';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { getAssetUrl } from '@/lib/panorama';
import { PSVViewer } from './PSVViewer';
import { PropertyPanel } from './PropertyPanel';
import { Play, Trash2, MapPin, X } from 'lucide-react';
import type { InfoHotspot } from '@/types/tour';
import { DEFAULT_PROJECT_NAME, generateProjectId, generateSceneId, generateHotspotId, MODAL_MAX_HEIGHT_RATIO } from '@/constants';

export const PanoramaPage = () => {
  const project = useTourStore((state) => state.project);
  const activeSceneId = useTourStore((state) => state.activeSceneId);
  const setProject = useTourStore((state) => state.setProject);
  const addScene = useTourStore((state) => state.addScene);
  const deleteScene = useTourStore((state) => state.deleteScene);
  const addInfoHotspot = useTourStore((state) => state.addInfoHotspot);
  const images = useMemo(() => (project?.assets ?? []).filter((a) => a.type === 'image'), [project?.assets]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; sceneId: string | null }>({
    open: false, x: 0, y: 0, sceneId: null
  });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [hotspotConfirmPos, setHotspotConfirmPos] = useState<{
    pos: { yaw: number; pitch: number };
    screenX: number;
    screenY: number;
  } | null>(null);

  const [previewHotspot, setPreviewHotspot] = useState<{
    sceneId: string;
    marker: InfoHotspot;
  } | null>(null);

  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      if (hotspotConfirmPos && popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setHotspotConfirmPos(null);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [hotspotConfirmPos]);

  const handleSelectFromAssets = (assetId: string) => {
    const asset = images.find((a) => a.id === assetId);
    if (!asset) return;
    if (!project) {
      setProject({
        id: generateProjectId(),
        name: DEFAULT_PROJECT_NAME,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scenes: [],
        assets: [],
      });
      useTourStore.getState().setSavedPath(null);
    }
    addScene({
      id: generateSceneId(),
      assetId: asset.id,
      name: asset.name.replace(/\.[^/.]+$/, ''),
      panorama: asset.path,
      thumbnail: asset.path,
      links: [],
      markers: [],
    });
    setIsAddModalOpen(false);
    setSelectedAssetId(null);
  };

  const handleSetDefault = (sceneId: string) => {
    if (!project) return;
    const reordered = [...project.scenes];
    const idx = reordered.findIndex((s) => s.id === sceneId);
    if (idx > 0) {
      const [item] = reordered.splice(idx, 1);
      reordered.unshift(item);
      setProject({ ...project, scenes: reordered, defaultSceneId: sceneId });
      useTourStore.getState().setUnsavedChanges(true);
    }
  };

  const handleActionClick = (e: React.MouseEvent, sceneId: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenu({ open: true, x: rect.right, y: rect.bottom, sceneId });
  };

  const handleDeleteRequest = (sceneId: string) => {
    setContextMenu((prev) => ({ ...prev, open: false }));
    setDeleteTarget(sceneId);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) deleteScene(deleteTarget);
    setDeleteTarget(null);
  };

  const handleRightClickPlace = useCallback((pos: { yaw: number; pitch: number }, screenX: number, screenY: number) => {
    setHotspotConfirmPos({ pos, screenX, screenY });
  }, []);

  const handleHotspotDoubleClick = useCallback((sceneId: string, markerId: string) => {
    const s = useTourStore.getState();
    const scene = s.project?.scenes.find(sc => sc.id === sceneId);
    const marker = scene?.markers.find(m => m.id === markerId);
    if (marker) {
      setPreviewHotspot({ sceneId, marker });
    }
  }, []);

  const handleConfirmHotspot = useCallback(() => {
    if (!hotspotConfirmPos || !activeSceneId) return;
    addInfoHotspot(activeSceneId, {
      id: generateHotspotId(),
      position: hotspotConfirmPos.pos,
      tooltip: 'New Hotspot',
      content: 'New Info Hotspot',
      html: '<div style="background:#fff;padding:6px 10px;border-radius:6px;color:#000;font-weight:bold;cursor:pointer;font-size:14px;">i</div>',
      data: { action: 'show_text', textAlign: 'center' },
    });
    setHotspotConfirmPos(null);
  }, [hotspotConfirmPos, activeSceneId, addInfoHotspot]);

  const sceneName = deleteTarget
    ? project?.scenes.find((s) => s.id === deleteTarget)?.name || 'this scene'
    : '';

  const activeScene = project?.scenes.find((s) => s.id === activeSceneId);

  const scenes = project?.scenes ?? [];

  const sceneRef = useRef<HTMLDivElement>(null);
  const [sceneHeight, setSceneHeight] = useState(0);

  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSceneHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const modalMaxH = sceneHeight ? sceneHeight * MODAL_MAX_HEIGHT_RATIO : 500;

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">

      {/* Left: Preview + Cards */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Center: Preview Area */}
        <div ref={sceneRef} className="flex-1 relative bg-black overflow-hidden min-h-0">
          {!activeSceneId ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white/50 text-center">
                <p className="text-lg">No Scene Selected</p>
                <p className="text-sm">Select or import a panorama below</p>
              </div>
            </div>
          ) : (
            <div id="psv-container" className="w-full h-full relative">
              <PSVViewer onRightClickPlace={handleRightClickPlace} onCancelPlace={() => setHotspotConfirmPos(null)} onHotspotDoubleClick={handleHotspotDoubleClick} />
            </div>
          )}

          {hotspotConfirmPos && (
            <div
              ref={popupRef}
              className="absolute z-20"
              style={{
                left: hotspotConfirmPos.screenX,
                top: hotspotConfirmPos.screenY,
                transform: 'translate(-50%, -100%)',
                marginTop: '-16px'
              }}
            >
              <div className="bg-surface border border-border rounded-xl p-3 shadow-2xl flex flex-col items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-text-primary">Add Hotspot Here?</span>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-xs px-3" onClick={() => setHotspotConfirmPos(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-7 text-xs px-3" onClick={handleConfirmHotspot}>
                    Yes
                  </Button>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-surface" />
              </div>
              <div className="flex justify-center mt-[-2px]">
                <div className="w-3 h-3 bg-primary rounded-full border-2 border-white shadow-[0_0_8px_rgba(0,0,0,0.5)] animate-pulse" />
              </div>
            </div>
          )}

          {previewHotspot && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40" onClick={() => setPreviewHotspot(null)}>
              <div className="bg-surface border border-border rounded-lg shadow-2xl flex flex-col" style={{ maxHeight: modalMaxH, width: 'auto', maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
                  <h3 className="font-semibold text-lg truncate text-text-primary">
                    {typeof previewHotspot.marker.tooltip === 'string' ? previewHotspot.marker.tooltip : previewHotspot.marker.tooltip?.content || 'Preview'}
                  </h3>
                  <button onClick={() => setPreviewHotspot(null)} className="text-text-secondary hover:text-text-primary transition-colors p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="flex items-center justify-center p-4">
                    {(() => {
                      const marker = previewHotspot.marker;
                      const data = marker.data ?? {};
                      const action = (data.action as string) || 'show_text';
                      const contentMaxH = modalMaxH - 65;

                      if (action === 'show_image' && marker.image) {
                        return <img src={getAssetUrl(marker.image)} alt="Preview" style={{ maxWidth: '100%', maxHeight: contentMaxH, width: 'auto', height: 'auto', objectFit: 'contain' }} />;
                      }
                      if (action === 'show_video' && (data.video as string)) {
                        return (
                          <video controls autoPlay style={{ maxWidth: '100%', maxHeight: contentMaxH, width: 'auto', height: 'auto' }}>
                            <source src={getAssetUrl(data.video as string)} />
                          </video>
                        );
                      }
                      if (action === 'show_text' && marker.content) {
                        return (
                          <div style={{ maxWidth: '600px' }}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ textAlign: (data.textAlign as React.CSSProperties['textAlign']) || 'center' }}>{marker.content}</p>
                          </div>
                        );
                      }
                      if (action === 'show_document' && marker.content) {
                        return (
                          <div style={{ maxWidth: '700px' }}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{marker.content}</p>
                          </div>
                        );
                      }
                      if (action === 'play_sound' && (data.audio as string)) {
                        return (
                          <div className="flex flex-col items-center gap-4 p-6">
                            <audio controls autoPlay={!!data.autoPlay} className="w-80 max-w-full">
                              <source src={getAssetUrl(data.audio as string)} />
                            </audio>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        {/* Panorama Cards */}
        <div className="shrink-0 border-t border-border bg-surface">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Panoramas</h2>
            {activeScene && (
              <span className="text-xs text-text-secondary">— {activeScene.name || activeScene.id}</span>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 py-3 custom-scroll">
            {scenes.map((scene) => (
              <div key={scene.id} className="min-w-[140px] w-[140px] shrink-0">
                <GridCard
                  title={scene.name ?? ''}
                  image={scene.thumbnail ? getAssetUrl(scene.thumbnail) : (scene.panorama ? getAssetUrl(scene.panorama) : undefined)}
                  badge={project?.defaultSceneId ? (project.defaultSceneId === scene.id ? 'Start' : undefined) : (scenes[0]?.id === scene.id ? 'Start' : undefined)}
                  isActive={activeSceneId === scene.id}
                  onClick={() => useTourStore.getState().setActiveScene(scene.id)}
                  onActionClick={(e) => handleActionClick(e, scene.id)}
                />
              </div>
            ))}
            <div className="min-w-[140px] w-[140px] shrink-0">
              <GridCard
                title="Add Panorama"
                isAddCard
                icon={<span className="text-2xl font-light">+</span>}
                onClick={() => setIsAddModalOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Properties Panel (full height) */}
      <div className="w-80 shrink-0 border-l border-border">
        <PropertyPanel />
      </div>

      {/* Add Panorama Modal */}
      <Modal
        open={isAddModalOpen}
        onOpenChange={(open) => { setIsAddModalOpen(open); if (!open) setSelectedAssetId(null); }}
        title="Add Panorama"
        description="Select an image from Assets to add as a panorama scene."
        size="lg"
        actions={
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            {selectedAssetId && <Button onClick={() => handleSelectFromAssets(selectedAssetId)}>Add</Button>}
          </div>
        }
      >
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl bg-surface">
            <p className="text-text-secondary text-sm text-center mb-4">
              No images in Assets yet. Upload images from the Assets tab first.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2 max-h-[320px] overflow-y-auto custom-scroll p-1">
            {images.map((asset) => {
              const isSelected = selectedAssetId === asset.id;
              return (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`flex flex-col items-center gap-2 p-2 rounded-xl border transition-colors text-center ${
                    isSelected ? 'border-primary bg-primary-subtle' : 'border-border bg-surface hover:border-primary hover:bg-primary-subtle'
                  }`}
                >
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-background flex items-center justify-center">
                    <img src={getAssetUrl(asset.path)} alt={asset.name} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-text-primary truncate w-full" title={asset.name}>{asset.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </Modal>

      <ContextMenu
        open={contextMenu.open}
        onClose={() => setContextMenu((prev) => ({ ...prev, open: false }))}
        anchorRect={contextMenu.open ? new DOMRect(contextMenu.x, contextMenu.y, 0, 0) : undefined}
        actions={
          contextMenu.sceneId
            ? [
                ...((project?.defaultSceneId !== contextMenu.sceneId && scenes[0]?.id !== contextMenu.sceneId)
                  ? [{ label: 'Set as Start', icon: <Play className="w-4 h-4" />, onClick: () => handleSetDefault(contextMenu.sceneId!) }]
                  : []),
                { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => handleDeleteRequest(contextMenu.sceneId!), danger: true },
              ]
            : []
        }
      />

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Panorama"
        description={`Delete "${sceneName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDanger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};