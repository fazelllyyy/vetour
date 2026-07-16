/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

export const DEFAULT_PROJECT_NAME = 'Untitled';
export const APP_NAME = 'Vetour';
export const FAZELSTUDIO_URL = 'https://fazelstudio.vercel.app';

export const PROJECT_ID_PREFIX = 'proj_';
export const SCENE_ID_PREFIX = 'scene_';
export const HOTSPOT_ID_PREFIX = 'hotspot_';
export const ASSET_ID_PREFIX = 'asset_';
export const TOAST_ID_PREFIX = 'toast_';

export const STORAGE_KEY_PROJECTS = 'vetour-projects';
export const STORAGE_KEY_THEME = 'vetour-theme';

export const PRESENT_WINDOW_SIZE_RATIO = 0.7;
export const PRESENT_WINDOW_MIN_RATIO = 0.6;

export const MAX_UPLOAD_SIZE = 15 * 1024 * 1024;
export const MAX_UPLOAD_SIZE_MB = 15;

export const MAX_ASSET_LIMITS: Record<string, number> = {
  image: 20,
  video: 5,
  audio: 5,
  document: 5,
  font: 5,
};
export const MAX_TOASTS = 5;
export const MAX_RECENT_PROJECTS_HOME = 5;
export const MAX_RECENT_PROJECTS_MODAL = 10;

export const FILE_FILTER_NAME = 'Vetour Project';
export const FILE_FILTER_EXTENSIONS = ['vetour'] as const;

export const MODAL_MAX_HEIGHT_RATIO = 0.7;

export const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown',
  csv: 'text/csv', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ttf: 'font/ttf', woff: 'font/woff', woff2: 'font/woff2',
};

export const DEFAULT_MIME_TYPE = 'image/jpeg';

export function getMime(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export function generateId(prefix: string): string {
  return `${prefix}${Math.random().toString(36).substring(2, 9)}`;
}

export function generateProjectId(): string {
  return PROJECT_ID_PREFIX + Date.now();
}

export function generateSceneId(): string {
  return generateId(SCENE_ID_PREFIX);
}

export function generateHotspotId(): string {
  return generateId(HOTSPOT_ID_PREFIX);
}

export function generateAssetId(): string {
  return generateId(ASSET_ID_PREFIX);
}

export function generateToastId(): string {
  return TOAST_ID_PREFIX + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
}

export const HOTSPOT_ACTION_OPTIONS = [
  { value: 'navigate', label: 'Navigate to' },
  { value: 'show_image', label: 'Show Image' },
  { value: 'show_video', label: 'Show Video' },
  { value: 'show_text', label: 'Show Text' },
  { value: 'play_sound', label: 'Play Sound' },
  { value: 'show_document', label: 'Show Document' },
] as const;

export const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const;
