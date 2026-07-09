<div align="center">
  <img src="src-tauri/icons/icon.png" alt="Vetour" width="80" height="80" />
  <h1>Vetour</h1>
  <p><strong>Virtual Tour Creator — Desktop App</strong></p>
  <p>
    <a href="#features">Features</a> •
    <a href="#prerequisites">Prerequisites</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#building">Building</a> •
    <a href="#project-structure">Structure</a> •
    <a href="#contributing">Contributing</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
    <img src="https://img.shields.io/badge/React-19-61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Tauri-2-FFC131" alt="Tauri" />
    <img src="https://img.shields.io/badge/Rust-1.85+-DEA584" alt="Rust" />
  </p>
</div>

---

**Vetour** is a cross-platform desktop application for creating, editing, and presenting immersive 360° virtual tours. Built with [Tauri 2](https://v2.tauri.app/), [React 19](https://react.dev/), and [Photo Sphere Viewer](https://photo-sphere-viewer.js.org/), it offers a smooth, native experience for crafting interactive walkthroughs from panoramic images.

## Features

- **360° Panorama Viewer** — Full-screen panorama exploration with smooth navigation.
- **Hotspots & Links** — Add clickable info markers and navigation links between scenes.
- **Interactive Markers** — Rich hotspot actions: show images, videos, text, or play audio.
- **Virtual Tour Mode** — Seamlessly connect scenes into a guided walkthrough.
- **Asset Manager** — Import and manage images, audio, video, and documents.
- **Present Mode** — Separate full-screen presentation window with a clean interface.
- **Project File (.vetour)** — Save and load projects in a custom file format with compression.
- **Multi-Resolution Processing** — Automatic panorama resizing (low, medium, high) to WebP.
- **Media Conversion** — Automatic audio/video conversion for optimized playback.
- **File Locking** — Safe concurrent access to project files across windows.
- **Drag & Drop Hotspots** — Reposition markers by dragging in the viewer.
- **Theme Support** — Light, dark, and black themes.

> Note: The deploy/publishing feature is maintained as a separate private module and is not included in this open-source build.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Bun** 1.x (or Node.js 22+ with npm/pnpm/yarn)
- **Rust** 1.85+ (via [rustup](https://rustup.rs/))
- **System dependencies** for [Tauri 2](https://v2.tauri.app/start/prerequisites/)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/fazelllyyy/vetour.git
cd vetour

# Install JavaScript dependencies (also downloads ffmpeg sidecar)
bun install

# Run the app in development mode
bun run tauri dev
```

The app will launch with hot-reload enabled. The Tauri window will open automatically once the Vite dev server is ready on port 1420.

### FFmpeg Sidecar

Audio/video conversion requires the **ffmpeg** binary as a Tauri sidecar. During `bun install`, the `postinstall` hook automatically downloads the correct binary for your platform from the following sources:

| Platform         | Source                             |
| ---------------- | ---------------------------------- |
| Windows          | [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) |
| macOS            | [evermeet.cx](https://evermeet.cx/ffmpeg/) |
| Linux            | [johnvansickle.com](https://johnvansickle.com/ffmpeg/) |

> If the download fails, the script falls back to checking for a system-wide `ffmpeg` in your `PATH`. Audio/video conversion will work as long as ffmpeg is available.

### Available Scripts

| Command                  | Description                                     |
| ------------------------ | ----------------------------------------------- |
| `bun run dev`            | Start Vite dev server only                      |
| `bun run build`          | Build the frontend for production               |
| `bun run tauri dev`      | Run the full Tauri desktop app in dev mode      |
| `bun run tauri build`    | Build the desktop app for distribution          |
| `bun run check`          | Run TypeScript type checking                    |
| `bun run lint`           | Run ESLint on all source files                  |
| `bun run sidecar:download` | Manually download/re-download the ffmpeg sidecar |

## Building

To create a distributable package for your platform:

```bash
bun run tauri build
```

The output binaries will be placed in `src-tauri/target/release/bundle/`.

### Build Configuration

- **Identifier**: `com.fazli.vetour`
- **File Association**: `.vetour` — virtual tour project files
- **Supported Targets**: Windows (NSIS installer), macOS (.dmg), Linux (.deb, .AppImage)

## Tech Stack

| Layer              | Technology                                                                           |
| ------------------ | ------------------------------------------------------------------------------------ |
| Desktop Shell      | [Tauri 2](https://v2.tauri.app/)                                                      |
| Frontend           | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)          |
| Styling            | [Tailwind CSS 4](https://tailwindcss.com/)                                            |
| State Management   | [Zustand](https://github.com/pmndrs/zustand)                                          |
| UI Components      | [Radix UI](https://www.radix-ui.com/), [Framer Motion](https://www.framer.com/motion/) |
| Panorama Rendering | [Photo Sphere Viewer](https://photo-sphere-viewer.js.org/)                            |
| Image Processing   | [image crate](https://crates.io/crates/image) (Rust)                                  |
| Packaging          | [Bun](https://bun.sh/)                                                                |

## Project Structure

```
vetour/
├── src/                      # Frontend source (React + TypeScript)
│   ├── components/           # React components
│   │   ├── Editor/           # Main editor (panorama, hotspots, assets)
│   │   ├── Home/             # Home screen and project list
│   │   ├── Present/          # Presentation mode (separate window)
│   │   ├── Settings/         # Settings modal
│   │   └── ui/               # Shared UI primitives
│   ├── lib/                  # Utilities and helpers
│   ├── store/                # Zustand stores
│   ├── types/                # TypeScript type definitions
│   ├── contexts/             # React contexts (theme)
│   └── constants.ts          # Centralized constants
├── src-tauri/                # Tauri backend (Rust)
│   ├── src/
│   │   ├── lib.rs            # App entry point and command registration
│   │   ├── image_processor.rs # Panorama processing (resize, WebP)
│   │   ├── media_processor.rs # Audio/video conversion (FFmpeg)
│   │   └── file_lock.rs      # File locking for project files
│   ├── Cargo.toml
│   └── tauri.conf.json       # Tauri configuration
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Photo Sphere Viewer](https://photo-sphere-viewer.js.org/) for the excellent panorama rendering library.
- [Tauri](https://tauri.app/) for the lightweight, secure desktop runtime.
- All contributors and users who support this project.

---

<p align="center">
  Created by <a href="https://github.com/fazelllyyy">Zulfazli (fazelstudio)</a>
</p>
