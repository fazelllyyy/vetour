#!/usr/bin/env bun
/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *
 *  Downloads the ffmpeg sidecar binary for the current platform.
 *  Tries in order:
 *    1. Check if already exists
 *    2. Download from GitHub Release assets
 *    3. Download from canonical ffmpeg source
 *    4. Check for system ffmpeg
 *-----------------------------------------------------------------------------------------------*/

import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = 'fazelllyyy/vetour';
const VERSION = process.env.SIDECAR_VERSION || 'ffmpeg-sidecar-v1';
const SIDECAR_DIR = join(__dirname, '..', 'src-tauri', 'binaries');

const platformMap = [
  { key: 'win32-x64',   binary: 'ffmpeg-x86_64-pc-windows-msvc.exe', canonicalUrl: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.7z', extractCmd: '7z', extractArgs: ['e', '-aoa', '-obb'] },
  { key: 'darwin-x64',  binary: 'ffmpeg-x86_64-apple-darwin',        canonicalUrl: 'https://evermeet.cx/ffmpeg/ffmpeg-7.1.7z',                       extractCmd: '7z', extractArgs: ['e', '-aoa', '-obb'] },
  { key: 'darwin-arm64',binary: 'ffmpeg-aarch64-apple-darwin',       canonicalUrl: 'https://evermeet.cx/ffmpeg/ffmpeg-7.1.7z',                       extractCmd: '7z', extractArgs: ['e', '-aoa', '-obb'] },
  { key: 'linux-x64',   binary: 'ffmpeg-x86_64-unknown-linux-gnu',  canonicalUrl: 'https://johnvansickle.com/ffmpeg/release/ffmpeg-release-amd64-static.tar.xz', extractCmd: 'tar', extractArgs: [] },
  { key: 'linux-arm64', binary: 'ffmpeg-aarch64-unknown-linux-gnu', canonicalUrl: 'https://johnvansickle.com/ffmpeg/release/ffmpeg-release-arm64-static.tar.xz', extractCmd: 'tar', extractArgs: [] },
];

async function download(url: string, dest: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const fs = await import('fs/promises');
  await fs.writeFile(dest, Buffer.from(await resp.arrayBuffer()));
}

async function extract(archive: string, extractDir: string, entry: { extractCmd: string; extractArgs: string[] }): Promise<void> {
  const { spawnSync } = await import('child_process');
  if (entry.extractCmd === 'tar') {
    const args = ['-xf', archive, '--strip-components=1', '--wildcards', '*/ffmpeg', '-C', extractDir];
    const result = spawnSync('tar', args, { stdio: 'pipe' });
    if (result.status !== 0) throw new Error(`tar: ${result.stderr}`);
  } else {
    const args = [...entry.extractArgs, `-o${extractDir}/`, archive];
    const result = spawnSync(entry.extractCmd, args, { stdio: 'pipe' });
    if (result.status !== 0) throw new Error(`${entry.extractCmd}: ${result.stderr}`);
  }
}

async function downloadFromCanonical(entry: typeof platformMap[0], targetPath: string): Promise<boolean> {
  console.log(`[sidecar] Trying canonical source...`);
  try {
    const tmpDir = join(SIDECAR_DIR, '.tmp');
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

    const archivePath = join(tmpDir, 'archive');
    await download(entry.canonicalUrl, archivePath);
    await extract(archivePath, tmpDir, entry);

    const extracted = join(tmpDir, 'ffmpeg');
    const fs = await import('fs/promises');
    if (existsSync(extracted)) {
      await fs.rename(extracted, targetPath);
      if (process.platform !== 'win32') await fs.chmod(targetPath, 0o755);
      await fs.rm(tmpDir, { recursive: true, force: true });
      console.log(`[sidecar] Downloaded ${entry.binary} from canonical source`);
      return true;
    }
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch (e) {
    console.log(`[sidecar] Canonical download failed: ${e}`);
  }
  return false;
}

async function main() {
  const arch = process.arch === 'x64' ? 'x64' : process.arch === 'arm64' ? 'arm64' : null;
  const key = `${process.platform}-${arch}`;
  const entry = platformMap.find(p => p.key === key);

  if (!entry) {
    console.log(`[sidecar] Unknown platform: ${key}`);
    process.exit(1);
  }

  if (!existsSync(SIDECAR_DIR)) mkdirSync(SIDECAR_DIR, { recursive: true });
  const targetPath = join(SIDECAR_DIR, entry.binary);

  if (existsSync(targetPath)) {
    console.log(`[sidecar] ${entry.binary} already exists, skipping.`);
    process.exit(0);
  }

  // Try GitHub Release
  const releaseUrl = `https://github.com/${REPO}/releases/download/${VERSION}/${entry.binary}`;
  console.log(`[sidecar] Downloading ${entry.binary} from ${releaseUrl}...`);
  try {
    await download(releaseUrl, targetPath);
    if (process.platform !== 'win32') {
      const fs = await import('fs/promises');
      await fs.chmod(targetPath, 0o755);
    }
    const { statSync } = await import('fs');
    const size = statSync(targetPath).size;
    console.log(`[sidecar] Downloaded ${entry.binary} (${(size / 1024 / 1024).toFixed(1)} MB)`);
    process.exit(0);
  } catch {
    console.log(`[sidecar] GitHub Release unavailable, trying alternative...`);
    try {
      const fs = await import('fs/promises');
      await fs.rm(targetPath, { force: true });
    } catch { /* ignore */ }
  }

  // Fallback to canonical source
  if (await downloadFromCanonical(entry, targetPath)) {
    process.exit(0);
  }

  // Last resort: system ffmpeg
  console.log(`[sidecar] Checking for system ffmpeg...`);
  const { spawnSync } = await import('child_process');
  const result = spawnSync('ffmpeg', ['-version'], { stdio: 'pipe' });
  if (result.status === 0) {
    const sysPath = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    const { copyFileSync } = await import('fs');
    copyFileSync(sysPath, targetPath);
    if (process.platform !== 'win32') {
      const fs = await import('fs/promises');
      await fs.chmod(targetPath, 0o755);
    }
    console.log(`[sidecar] Using system ffmpeg`);
    process.exit(0);
  }

  console.log(`[sidecar] No ffmpeg found. Tauri build will fail!`);
  process.exit(1);
}

main();
