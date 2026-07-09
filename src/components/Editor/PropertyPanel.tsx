/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useTourStore } from '@/store/useTourStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/Select';
import { Trash2, Save } from 'lucide-react';
import { TourScene, NavigationHotspot } from '@/types/tour';
import { HOTSPOT_ACTION_OPTIONS, TEXT_ALIGN_OPTIONS } from '@/constants';

type ActionType = 'navigate' | 'show_image' | 'show_video' | 'show_text' | 'play_sound';

export const PropertyPanel = () => {
  const project = useTourStore((state) => state.project);
  const activeSceneId = useTourStore((state) => state.activeSceneId);
  const selectedHotspotId = useTourStore((state) => state.selectedHotspotId);
  const updateScene = useTourStore((state) => state.updateScene);
  const deleteScene = useTourStore((state) => state.deleteScene);
  const updateInfoHotspot = useTourStore((state) => state.updateInfoHotspot);
  const deleteInfoHotspot = useTourStore((state) => state.deleteInfoHotspot);
  const updateNavHotspot = useTourStore((state) => state.updateNavHotspot);
  const deleteNavHotspot = useTourStore((state) => state.deleteNavHotspot);
  const addNavHotspot = useTourStore((state) => state.addNavHotspot);
  const setSelectedHotspot = useTourStore((state) => state.setSelectedHotspot);

  const images = useMemo(() => (project?.assets ?? []).filter((a) => a.type === 'image'), [project?.assets]);
  const audioFiles = useMemo(() => (project?.assets ?? []).filter((a) => a.type === 'audio'), [project?.assets]);
  const videoFiles = useMemo(() => (project?.assets ?? []).filter((a) => a.type === 'video'), [project?.assets]);

  const activeScene = project?.scenes.find((s) => s.id === activeSceneId);
  const selectedInfoMarker = activeScene?.markers.find(m => m.id === selectedHotspotId);
  const selectedNavMarker = activeScene?.links.find(l => l.nodeId === selectedHotspotId);
  const isNav = !!selectedNavMarker;
  const isInfo = !!selectedInfoMarker;

  const hotspotData = (isInfo && selectedInfoMarker?.data) as Record<string, unknown> | null;
  const hotspotAction: ActionType = isNav
    ? 'navigate'
    : (hotspotData?.action as ActionType) || (selectedInfoMarker?.image ? 'show_image' : 'show_text');

  if (!activeScene) {
    return (
      <div className="h-full flex flex-col bg-card">
        <div className="p-4 border-b border-border font-medium text-text-primary">Properties</div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-text-secondary text-center px-4">Select a scene to edit properties.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-4 border-b border-border font-medium text-text-primary">Properties</div>
      <ScrollArea className="flex-1 p-4">
        {!selectedHotspotId && (
          <ScenePropertiesForm
            scene={activeScene}
            onUpdate={updateScene}
            onDelete={deleteScene}
          />
        )}

        {selectedHotspotId && isNav && selectedNavMarker && (
          <NavHotspotForm
            sceneId={activeScene.id}
            hotspotId={selectedHotspotId}
            marker={selectedNavMarker}
            scenes={project?.scenes || []}
            updateNavHotspot={updateNavHotspot}
            deleteNavHotspot={deleteNavHotspot}
          />
        )}

        {selectedHotspotId && isInfo && selectedInfoMarker && (
          <InfoHotspotForm
            sceneId={activeScene.id}
            hotspotId={selectedHotspotId}
            marker={selectedInfoMarker}
            data={hotspotData}
            action={hotspotAction}
            images={images}
            audioFiles={audioFiles}
            videoFiles={videoFiles}
            updateInfoHotspot={updateInfoHotspot}
            deleteInfoHotspot={deleteInfoHotspot}
            addNavHotspot={addNavHotspot}
            setSelectedHotspot={setSelectedHotspot}
            scenes={project?.scenes || []}
          />
        )}
      </ScrollArea>
    </div>
  );
};

function ScenePropertiesForm({
  scene,
  onUpdate,
  onDelete,
}: {
  scene: TourScene;
  onUpdate: (id: string, updates: Partial<TourScene>) => void;
  onDelete: (id: string) => void;
}) {
  const [localName, setLocalName] = useState(scene.name || '');
  const [localCaption, setLocalCaption] = useState(scene.caption || '');
  const originalRef = useRef({ name: scene.name || '', caption: scene.caption || '' });
  const [hasChanges, setHasChanges] = useState(false);

  const checkChanges = useCallback((name: string, caption: string) => {
    const orig = originalRef.current;
    return name !== orig.name || caption !== orig.caption;
  }, []);

  useEffect(() => {
    setLocalName(scene.name || '');
    setLocalCaption(scene.caption || '');
    originalRef.current = { name: scene.name || '', caption: scene.caption || '' };
    setHasChanges(false);
  }, [scene.id, scene.name, scene.caption]);

  const handleNameChange = (v: string) => {
    setLocalName(v);
    setHasChanges(checkChanges(v, localCaption));
  };

  const handleCaptionChange = (v: string) => {
    setLocalCaption(v);
    setHasChanges(checkChanges(localName, v));
  };

  const handleSave = () => {
    onUpdate(scene.id, { name: localName, caption: localCaption });
    originalRef.current = { name: localName, caption: localCaption };
    setHasChanges(false);
  };

  const handleDelete = () => {
    onDelete(scene.id);
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold border-b border-border pb-2 text-text-primary">Scene Properties</h3>
      <div className="flex flex-col flex-1">
        <div className="space-y-4 flex-1">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={localName}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Caption</Label>
            <Input
              value={localCaption}
              onChange={(e) => handleCaptionChange(e.target.value)}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border mt-4 flex gap-2">
          <Button variant="danger" size="sm" className="flex-1" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={!hasChanges}>
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function NavHotspotForm({
  sceneId,
  hotspotId,
  marker,
  scenes,
  updateNavHotspot,
  deleteNavHotspot,
}: {
  sceneId: string;
  hotspotId: string;
  marker: NavigationHotspot;
  scenes: { id: string; name?: string }[];
  updateNavHotspot: (sceneId: string, hotspotId: string, updates: Record<string, unknown>) => void;
  deleteNavHotspot: (sceneId: string, hotspotId: string) => void;
}) {
  const [localName, setLocalName] = useState(marker.name || '');
  const [localNodeId, setLocalNodeId] = useState(marker.nodeId || '');
  const originalRef = useRef({ name: marker.name || '', nodeId: marker.nodeId || '' });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalName(marker.name || '');
    setLocalNodeId(marker.nodeId || '');
    originalRef.current = { name: marker.name || '', nodeId: marker.nodeId || '' };
    setHasChanges(false);
  }, [hotspotId, marker.name, marker.nodeId]);

  const checkChanges = useCallback((name: string, nodeId: string) => {
    const orig = originalRef.current;
    return name !== orig.name || nodeId !== orig.nodeId;
  }, []);

  const handleSave = () => {
    updateNavHotspot(sceneId, hotspotId, { name: localName, nodeId: localNodeId });
    originalRef.current = { name: localName, nodeId: localNodeId };
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold border-b border-border pb-2 text-text-primary">Navigation Hotspot</h3>
      <div className="space-y-4">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input value={localName} onChange={(e) => { setLocalName(e.target.value); setHasChanges(checkChanges(e.target.value, localNodeId)); }} />
        </div>
        <div className="space-y-1 p-3 bg-surface rounded-lg border border-border">
          <Label>Target Scene</Label>
          <Select
            value={localNodeId}
            onChange={(v) => { setLocalNodeId(v); setHasChanges(checkChanges(localName, v)); }}
            placeholder="Select a scene..."
            options={scenes.filter(s => s.id !== sceneId).map(s => ({ value: s.id, label: s.name || s.id }))}
          />
        </div>
        <div className="pt-4 border-t border-border flex gap-2">
          <Button variant="danger" size="sm" className="flex-1" onClick={() => deleteNavHotspot(sceneId, hotspotId)}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={!hasChanges}>
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoHotspotForm({
  sceneId,
  hotspotId,
  marker,
  data,
  action,
  images,
  audioFiles,
  videoFiles,
  updateInfoHotspot,
  deleteInfoHotspot,
  addNavHotspot,
  setSelectedHotspot,
  scenes,
}: {
  sceneId: string;
  hotspotId: string;
  marker: { tooltip?: string | { content?: string }; image?: string; content?: string; position?: { yaw: string | number; pitch: string | number } };
  data: Record<string, unknown> | null;
  action: ActionType;
  images: { path: string; name: string }[];
  audioFiles: { path: string; name: string }[];
  videoFiles: { path: string; name: string }[];
  updateInfoHotspot: (sceneId: string, hotspotId: string, updates: Record<string, unknown>) => void;
  deleteInfoHotspot: (sceneId: string, hotspotId: string) => void;
  addNavHotspot: (sceneId: string, hotspot: NavigationHotspot) => void;
  setSelectedHotspot: (id: string | null) => void;
  scenes: { id: string; name?: string }[];
}) {
  const currentData = data || {};
  const origTooltip = typeof marker.tooltip === 'string' ? marker.tooltip : marker.tooltip?.content || '';
  const origImage = marker.image || '';
  const origContent = marker.content || '';
  const origAction = action;
  const origVideo = (currentData.video as string) || '';
  const origTextAlign = (currentData.textAlign as string) || 'center';
  const origAutoPlay = !!currentData.autoPlay;
  const origAudio = (currentData.audio as string) || '';
  const origNavTarget = (currentData.navTarget as string) || '';

  const [localTooltip, setLocalTooltip] = useState(origTooltip);
  const [localAction, setLocalAction] = useState(origAction);
  const [localImage, setLocalImage] = useState(origImage);
  const [localContent, setLocalContent] = useState(origContent);
  const [localVideo, setLocalVideo] = useState(origVideo);
  const [localTextAlign, setLocalTextAlign] = useState(origTextAlign);
  const [localAutoPlay, setLocalAutoPlay] = useState(origAutoPlay);
  const [localAudio, setLocalAudio] = useState(origAudio);
  const [localNavTarget, setLocalNavTarget] = useState(origNavTarget);
  const [hasChanges, setHasChanges] = useState(false);

  const origRef = useRef({ tooltip: origTooltip, action: origAction, image: origImage, content: origContent, video: origVideo, textAlign: origTextAlign, autoPlay: origAutoPlay, audio: origAudio, navTarget: origNavTarget });
  useEffect(() => {
    const v = typeof marker.tooltip === 'string' ? marker.tooltip : marker.tooltip?.content || '';
    const a = action;
    const img = marker.image || '';
    const c = marker.content || '';
    const vid = (currentData.video as string) || '';
    const ta = (currentData.textAlign as string) || 'center';
    const ap = !!currentData.autoPlay;
    const au = (currentData.audio as string) || '';
    const nt = (currentData.navTarget as string) || '';
    setLocalTooltip(v); setLocalAction(a); setLocalImage(img); setLocalContent(c);
    setLocalVideo(vid); setLocalTextAlign(ta); setLocalAutoPlay(ap); setLocalAudio(au); setLocalNavTarget(nt);
    origRef.current = { tooltip: v, action: a, image: img, content: c, video: vid, textAlign: ta, autoPlay: ap, audio: au, navTarget: nt };
    setHasChanges(false);
  }, [hotspotId, marker.tooltip, marker.image, marker.content, action, currentData.video, currentData.textAlign, currentData.autoPlay, currentData.audio, currentData.navTarget]);

  const checkChanged = useCallback(() => {
    const o = origRef.current;
    return localTooltip !== o.tooltip || localAction !== o.action || localImage !== o.image
      || localContent !== o.content || localVideo !== o.video || localTextAlign !== o.textAlign
      || localAutoPlay !== o.autoPlay || localAudio !== o.audio || localNavTarget !== o.navTarget;
  }, [localTooltip, localAction, localImage, localContent, localVideo, localTextAlign, localAutoPlay, localAudio, localNavTarget]);

  useEffect(() => { setHasChanges(checkChanged()); }, [checkChanged]);

  const handleSave = () => {
    if (localAction === 'navigate') {
      if (!localNavTarget) return;
      const navHotspot: NavigationHotspot = {
        nodeId: localNavTarget,
        name: localTooltip,
        position: marker.position,
      };
      deleteInfoHotspot(sceneId, hotspotId);
      addNavHotspot(sceneId, navHotspot);
      setSelectedHotspot(localNavTarget);
      return;
    }

    const dataUpdates: Record<string, unknown> = { action: localAction };
    if (localAction === 'show_text') dataUpdates.textAlign = localTextAlign;
    if (localAction === 'play_sound') { dataUpdates.audio = localAudio; dataUpdates.autoPlay = localAutoPlay; }
    if (localAction === 'show_video') dataUpdates.video = localVideo;
    updateInfoHotspot(sceneId, hotspotId, {
      tooltip: localTooltip,
      content: localAction === 'show_text' ? localContent : undefined,
      image: localAction === 'show_image' ? localImage : undefined,
      data: dataUpdates,
    });
    origRef.current = { tooltip: localTooltip, action: localAction, image: localImage, content: localContent, video: localVideo, textAlign: localTextAlign, autoPlay: localAutoPlay, audio: localAudio, navTarget: localNavTarget };
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold border-b border-border pb-2 text-text-primary">Info Hotspot</h3>
      <div className="space-y-4">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input value={localTooltip} onChange={(e) => setLocalTooltip(e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label>Action</Label>
          <Select
            value={localAction}
            onChange={(v) => setLocalAction(v as ActionType)}
            options={[...HOTSPOT_ACTION_OPTIONS]}
          />
        </div>

        {localAction === 'show_image' && (
          <div className="space-y-1 p-3 bg-surface rounded-lg border border-border">
            <Label>Image Asset</Label>
            {images.length === 0 ? (
              <p className="text-xs text-text-secondary">No images in Assets.</p>
            ) : (
              <Select
                value={localImage}
                onChange={(v) => setLocalImage(v)}
                placeholder="Select an image..."
                options={images.map(img => ({ value: img.path, label: img.name }))}
              />
            )}
          </div>
        )}

        {localAction === 'navigate' && (
          <div className="space-y-1 p-3 bg-surface rounded-lg border border-border">
            <Label>Target Scene</Label>
            <Select
              value={localNavTarget}
              onChange={(v) => setLocalNavTarget(v)}
              placeholder="Select a scene..."
              options={scenes.filter(s => s.id !== sceneId).map(s => ({ value: s.id, label: s.name || s.id }))}
            />
          </div>
        )}

        {localAction === 'show_video' && (
          <div className="space-y-1 p-3 bg-surface rounded-lg border border-border">
            <Label>Video Asset</Label>
            {videoFiles.length === 0 ? (
              <p className="text-xs text-text-secondary">No videos in Assets.</p>
            ) : (
              <Select
                value={localVideo}
                onChange={(v) => setLocalVideo(v)}
                placeholder="Select video..."
                options={videoFiles.map(v => ({ value: v.path, label: v.name }))}
              />
            )}
          </div>
        )}

        {localAction === 'show_text' && (
          <div className="space-y-1 p-3 bg-surface rounded-lg border border-border">
            <Label>Text Alignment</Label>
            <Select
              value={localTextAlign}
              onChange={(v) => setLocalTextAlign(v)}
              options={[...TEXT_ALIGN_OPTIONS]}
            />
            <Label className="mt-3 block">Display Text</Label>
            <textarea
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-text-primary min-h-[80px] mt-1"
              placeholder="Enter text to display..."
            />
          </div>
        )}

        {localAction === 'play_sound' && (
          <div className="space-y-1 p-3 bg-surface rounded-lg border border-border">
            {audioFiles.length === 0 ? (
              <>
                <Label>Audio Asset</Label>
                <p className="text-xs text-text-secondary">No audio in Assets.</p>
              </>
            ) : (
              <>
                <Label>Play Mode</Label>
                <Select
                  value={localAutoPlay ? 'auto' : 'click'}
                  onChange={(v) => setLocalAutoPlay(v === 'auto')}
                  options={[
                    { value: 'click', label: 'Click to Play' },
                    ...(localAutoPlay ? [] : [{ value: 'auto', label: 'Auto Play' }]),
                  ]}
                />
                <Label className="mt-3 block">Audio Asset</Label>
                <Select
                  value={localAudio}
                  onChange={(v) => setLocalAudio(v)}
                  placeholder="Select audio..."
                  options={audioFiles.map(a => ({ value: a.path, label: a.name }))}
                />
              </>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-border flex gap-2">
          <Button variant="danger" size="sm" className="flex-1" onClick={() => deleteInfoHotspot(sceneId, hotspotId)}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={!hasChanges}>
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}