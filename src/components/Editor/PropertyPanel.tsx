/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useTourStore } from '@/store/useTourStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { ConfirmModal } from '@/components/ui/Modal';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/Select';
import { Trash2, Save, MapPin, Info } from 'lucide-react';
import { TourScene, NavigationHotspot, InfoHotspot } from '@/types/tour';
import { HOTSPOT_ACTION_OPTIONS, TEXT_ALIGN_OPTIONS } from '@/constants';

type ActionType = 'navigate' | 'show_image' | 'show_video' | 'show_text' | 'play_sound' | 'show_document';

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
  const addInfoHotspot = useTourStore((state) => state.addInfoHotspot);
  const setSelectedHotspot = useTourStore((state) => state.setSelectedHotspot);

  const images = useMemo(() => (project?.assets ?? []).filter((a) => a.type === 'image'), [project?.assets]);
  const audioFiles = useMemo(() => (project?.assets ?? []).filter((a) => a.type === 'audio'), [project?.assets]);
  const videoFiles = useMemo(() => (project?.assets ?? []).filter((a) => a.type === 'video'), [project?.assets]);
  const documentFiles = useMemo(() => (project?.assets ?? []).filter((a) => a.type === 'document'), [project?.assets]);

  const activeScene = project?.scenes.find((s) => s.id === activeSceneId);
  const selectedInfoMarker = activeScene?.markers.find(m => m.id === selectedHotspotId);
  const selectedNavMarker = activeScene?.links.find(l => l.id === selectedHotspotId || 'nav_' + l.nodeId === selectedHotspotId);
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
            onHotspotClick={(_markerId, internalId) => {
              setSelectedHotspot(internalId);
            }}
          />
        )}

        {selectedHotspotId && (isNav || isInfo) && (
          <UnifiedHotspotForm
            sceneId={activeScene.id}
            hotspotId={selectedHotspotId}
            isNav={isNav}
            navMarker={selectedNavMarker}
            infoMarker={selectedInfoMarker}
            data={hotspotData}
            action={hotspotAction}
            images={images}
            audioFiles={audioFiles}
            videoFiles={videoFiles}
            documentFiles={documentFiles}
            updateInfoHotspot={updateInfoHotspot}
            deleteInfoHotspot={deleteInfoHotspot}
            updateNavHotspot={updateNavHotspot}
            deleteNavHotspot={deleteNavHotspot}
            addNavHotspot={addNavHotspot}
            addInfoHotspot={addInfoHotspot}
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
  onHotspotClick,
}: {
  scene: TourScene;
  onUpdate: (id: string, updates: Partial<TourScene>) => void;
  onDelete: (id: string) => void;
  onHotspotClick: (markerId: string, internalId: string) => void;
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

      {(scene.markers.length > 0 || scene.links.length > 0) && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold border-b border-border pb-2 text-text-primary mb-3">Hotspots</h3>
          <div className="space-y-2">
            {scene.links.map(link => (
              <Button key={link.id || `nav_${link.nodeId}`} variant="outline" size="sm" className="w-full justify-start text-xs font-normal h-8" onClick={() => onHotspotClick(link.id || `nav_${link.nodeId}`, link.id || `nav_${link.nodeId}`)}>
                <MapPin className="w-3 h-3 mr-2 text-primary" />
                {link.name || 'Navigate'}
              </Button>
            ))}
            {scene.markers.map(marker => {
              const name = typeof marker.tooltip === 'string' ? marker.tooltip : marker.tooltip?.content || 'Hotspot';
              return (
                <Button key={marker.id} variant="outline" size="sm" className="w-full justify-start text-xs font-normal h-8" onClick={() => onHotspotClick(marker.id, marker.id)}>
                  <Info className="w-3 h-3 mr-2 text-blue-500" />
                  {name}
                </Button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function UnifiedHotspotForm({
  sceneId,
  hotspotId,
  isNav,
  navMarker,
  infoMarker,
  data,
  action,
  images,
  audioFiles,
  videoFiles,
  documentFiles,
  updateInfoHotspot,
  deleteInfoHotspot,
  updateNavHotspot,
  deleteNavHotspot,
  addNavHotspot,
  addInfoHotspot,
  setSelectedHotspot,
  scenes,
}: {
  sceneId: string;
  hotspotId: string;
  isNav: boolean;
  navMarker?: NavigationHotspot;
  infoMarker?: InfoHotspot;
  data: Record<string, unknown> | null;
  action: ActionType;
  images: { path: string; name: string }[];
  audioFiles: { path: string; name: string }[];
  videoFiles: { path: string; name: string }[];
  documentFiles: { path: string; name: string }[];
  updateInfoHotspot: (sceneId: string, hotspotId: string, updates: Partial<InfoHotspot>) => void;
  deleteInfoHotspot: (sceneId: string, hotspotId: string) => void;
  updateNavHotspot: (sceneId: string, hotspotId: string, updates: Partial<NavigationHotspot>) => void;
  deleteNavHotspot: (sceneId: string, hotspotId: string) => void;
  addNavHotspot: (sceneId: string, hotspot: NavigationHotspot) => void;
  addInfoHotspot: (sceneId: string, hotspot: InfoHotspot) => void;
  setSelectedHotspot: (id: string | null) => void;
  scenes: { id: string; name?: string }[];
}) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  
  const currentData = data || {};
  const origTooltip = isNav ? (navMarker?.name || '') : (typeof infoMarker?.tooltip === 'string' ? infoMarker.tooltip : infoMarker?.tooltip?.content || '');
  const origAction = action;
  const origImage = infoMarker?.image || '';
  const origContent = infoMarker?.content || '';
  const origVideo = (currentData.video as string) || '';
  const origTextAlign = (currentData.textAlign as string) || 'center';
  const origAutoPlay = !!currentData.autoPlay;
  const origAudio = (currentData.audio as string) || '';
  const origDocument = (currentData.document as string) || '';
  const origNavTarget = isNav ? (navMarker?.nodeId || '') : ((currentData.navTarget as string) || '');

  const [localTooltip, setLocalTooltip] = useState(origTooltip);
  const [localAction, setLocalAction] = useState(origAction);
  const [localImage, setLocalImage] = useState(origImage);
  const [localContent, setLocalContent] = useState(origContent);
  const [localVideo, setLocalVideo] = useState(origVideo);
  const [localTextAlign, setLocalTextAlign] = useState(origTextAlign);
  const [localAutoPlay, setLocalAutoPlay] = useState(origAutoPlay);
  const [localAudio, setLocalAudio] = useState(origAudio);
  const [localDocument, setLocalDocument] = useState(origDocument);
  const [localNavTarget, setLocalNavTarget] = useState(origNavTarget);
  const [hasChanges, setHasChanges] = useState(false);

  const origRef = useRef({ tooltip: origTooltip, action: origAction, image: origImage, content: origContent, video: origVideo, textAlign: origTextAlign, autoPlay: origAutoPlay, audio: origAudio, document: origDocument, navTarget: origNavTarget });
  
  useEffect(() => {
    setLocalTooltip(origTooltip); setLocalAction(origAction); setLocalImage(origImage); setLocalContent(origContent);
    setLocalVideo(origVideo); setLocalTextAlign(origTextAlign); setLocalAutoPlay(origAutoPlay); setLocalAudio(origAudio); setLocalDocument(origDocument); setLocalNavTarget(origNavTarget);
    origRef.current = { tooltip: origTooltip, action: origAction, image: origImage, content: origContent, video: origVideo, textAlign: origTextAlign, autoPlay: origAutoPlay, audio: origAudio, document: origDocument, navTarget: origNavTarget };
    setHasChanges(false);
  }, [hotspotId, origTooltip, origAction, origImage, origContent, origVideo, origTextAlign, origAutoPlay, origAudio, origDocument, origNavTarget]);

  const checkChanged = useCallback(() => {
    const o = origRef.current;
    return localTooltip !== o.tooltip || localAction !== o.action || localImage !== o.image
      || localContent !== o.content || localVideo !== o.video || localTextAlign !== o.textAlign
      || localAutoPlay !== o.autoPlay || localAudio !== o.audio || localDocument !== o.document || localNavTarget !== o.navTarget;
  }, [localTooltip, localAction, localImage, localContent, localVideo, localTextAlign, localAutoPlay, localAudio, localDocument, localNavTarget]);

  useEffect(() => { setHasChanges(checkChanged()); }, [checkChanged]);

  const handleSave = () => {
    const position = isNav ? navMarker?.position : infoMarker?.position;
    
    if (localAction === 'navigate') {
      if (!localNavTarget) return;
      const newNavHotspot: NavigationHotspot = {
        id: isNav ? hotspotId : `hotspot_${Math.random().toString(36).substring(2, 9)}`,
        nodeId: localNavTarget,
        name: localTooltip,
        position,
      };
      
      if (!isNav) {
        deleteInfoHotspot(sceneId, hotspotId);
        addNavHotspot(sceneId, newNavHotspot);
        setSelectedHotspot(newNavHotspot.id!);
      } else {
        updateNavHotspot(sceneId, hotspotId, { name: localTooltip, nodeId: localNavTarget });
      }
    } else {
      const dataUpdates: Record<string, unknown> = { action: localAction };
      if (localAction === 'show_text') dataUpdates.textAlign = localTextAlign;
      if (localAction === 'play_sound') { dataUpdates.audio = localAudio; dataUpdates.autoPlay = localAutoPlay; }
      if (localAction === 'show_video') dataUpdates.video = localVideo;
      if (localAction === 'show_document') dataUpdates.document = localDocument;
      
      const newInfoHotspot: InfoHotspot = {
        id: !isNav ? hotspotId : `hotspot_${Math.random().toString(36).substring(2, 9)}`,
        position,
        tooltip: localTooltip,
        content: localAction === 'show_text' ? localContent : undefined,
        image: localAction === 'show_image' ? localImage : undefined,
        data: dataUpdates,
      };

      if (isNav) {
        deleteNavHotspot(sceneId, hotspotId);
        addInfoHotspot(sceneId, newInfoHotspot);
        setSelectedHotspot(newInfoHotspot.id);
      } else {
        updateInfoHotspot(sceneId, hotspotId, newInfoHotspot);
      }
    }
    
    origRef.current = { tooltip: localTooltip, action: localAction, image: localImage, content: localContent, video: localVideo, textAlign: localTextAlign, autoPlay: localAutoPlay, audio: localAudio, document: localDocument, navTarget: localNavTarget };
    setHasChanges(false);
  };

  const handleDelete = () => {
    if (isNav) deleteNavHotspot(sceneId, hotspotId);
    else deleteInfoHotspot(sceneId, hotspotId);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold border-b border-border pb-2 text-text-primary">Hotspot Properties</h3>
      <div className="space-y-4">
        <div className="space-y-1">
          <Label>Name / Tooltip</Label>
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

        {localAction === 'show_document' && (
          <div className="space-y-1 p-3 bg-surface rounded-lg border border-border">
            <Label>Document Asset</Label>
            {documentFiles.length === 0 ? (
              <p className="text-xs text-text-secondary">No documents in Assets.</p>
            ) : (
              <Select
                value={localDocument}
                onChange={(v) => setLocalDocument(v)}
                placeholder="Select document..."
                options={documentFiles.map(d => ({ value: d.path, label: d.name }))}
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
            <div className="w-full mt-1 bg-background border border-input rounded-md px-3 py-2 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 overflow-hidden">
              <textarea
                value={localContent}
                wrap="off"
                rows={10}
                onChange={(e) => setLocalContent(e.target.value)}
                className="w-full bg-transparent text-text-primary resize-none outline-none whitespace-pre custom-scroll overscroll-none block"
                placeholder="Enter text to display..."
              />
            </div>
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
          <Button variant="danger" size="sm" className="flex-1" onClick={() => setDeleteTarget(hotspotId)}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={!hasChanges}>
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
        </div>
      </div>
      
      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Hotspot"
        description="Are you sure you want to delete this hotspot? This action cannot be undone."
        confirmLabel="Delete"
        isDanger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}