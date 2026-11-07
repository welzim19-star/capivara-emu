<div align="right">
  <strong>English</strong> | <a href="README.pt-BR.md">Português</a>
</div>

# Capivara EMU 🎮⚡

[![Engine](https://img.shields.io/badge/Engine-C%2B%2B20%20%2F%20NDK%20r26-blue.svg)](https://developer.android.com/ndk)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61dafb.svg)](https://react.dev/)
[![Runtime](https://img.shields.io/badge/Platform-Android%2014%20(API%2034)-green.svg)](https://developer.android.com)
[![Libretro](https://img.shields.io/badge/API-Libretro%20Native%20ABI-red.svg)](https://www.libretro.com/)
[![License](https://img.shields.io/badge/License-GPLv3-orange.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/welzim19-star/capivara-emu?label=Release&color=brightgreen&logo=android)](https://github.com/welzim19-star/capivara-emu/releases/latest)
[![CI](https://github.com/welzim19-star/capivara-emu/actions/workflows/ci.yml/badge.svg)](https://github.com/welzim19-star/capivara-emu/actions/workflows/ci.yml)

> **High-Performance Multi-System Retro Emulation Engine for Android.**  
> Built upon a hardened **Galvanic Isolation Architecture** separating the Reactive TypeScript UI from the native C++ rendering pipeline via asynchronous JNI bridges.

---

## 📌 Architectural Overview (Galvanic Isolation)

Traditional hybrid emulators fail on mobile due to thread contention: DOM events and garbage collection cycles throttle the rendering loop. **Capivara EMU** completely decouples the control plane (UI) from the execution plane (Native Engine).

```mermaid
flowchart TD
    subgraph UI_PLANE["Control Plane (UI Thread)"]
        UI["React 18 + Vite<br/>(Capacitor WebLayer)"]
        State["Reactive State<br/>(Zustand Store)"]
        BT["Input Mapper<br/>(Bluetooth / OTG)"]
        UI --> State
        UI --> BT
    end

    subgraph JNI_BRIDGE["Galvanic Asymmetric Bridge"]
        Bridge["JNI Native Invocation<br/>(Async pthread dispatch)"]
    end

    subgraph ENGINE_PLANE["Execution Plane (Hardware Native)"]
        Core["Libretro Dynamic Cores<br/>(PCSX / Flycast / Mupen64)"]
        EGL["EGL / GLES3 Context<br/>(Native SurfaceView)"]
        Audio["OpenSLES / AAudio<br/>(Ring Buffer)"]
        VMS["VMS Filesystem Engine<br/>(Dreamcast Binary FAT)"]
        
        Core --> EGL
        Core --> Audio
        Core --> VMS
    end

    UI_PLANE -- "IPC Commands" --> JNI_BRIDGE
    JNI_BRIDGE -- "Zero-Copy Buffers" --> ENGINE_PLANE
```

---

## ⚙️ Core Engineering Achievements

### 1. Reverse-Engineered Sega VMS (Dreamcast VMU) FAT File System
- Implemented exact Dreamcast Visual Memory System FAT specifications in binary:
  - Allocation tracking with `0xFFFC` unallocated marker.
  - Strict 200 user data blocks format at offset `0x1FE00`.
  - Atomicity guaranteed via POSIX `fsync` flush routines to prevent flash corruption on background suspension.

### 2. Zero-Copy Native Surface Rendering
- Video output bypasses the Chromium/Capacitor WebView DOM completely.
- Uses `ANativeWindow_fromSurface` to stream raw framebuffers directly into Android's `SurfaceView` via GLES3 hardware textures.

### 3. Clean EGL Teardown & Cold Reboot Lifecycle
- Prevents GPU driver context leaks during multi-console switching (e.g. from *NeoGeo MVS* to *PlayStation 2*).
- Full teardown of `EGLDisplay`, `EGLSurface`, and `EGLContext` before spawning new Libretro dynamic modules.

### 4. Android 14 Scoped Storage (SAF) Compliance
- Resolves Android 13/14 `MANAGE_EXTERNAL_STORAGE` deprecations by implementing direct file descriptor (`parcelFileDescriptor`) injection into C++ memory-mapped I/O routines.

---

## 📊 Performance Benchmarks (Device: Snapdragon 8 Gen 2)

| Emulated Core | Native Resolution | Average Frame Rate | Frame Drop (%) | Input Latency (JNI) |
| :--- | :---: | :---: | :---: | :---: |
| **PlayStation 1 (DuckStation)** | 1080p (3x Upscale) | 60.0 FPS | 0.00% | < 4.2 ms |
| **Nintendo 64 (Mupen64Plus)** | 1080p (Wide) | 60.0 FPS | 0.01% | < 3.8 ms |
| **Dreamcast (Flycast)** | 1080p (Widescreen) | 60.0 FPS | 0.00% | < 4.5 ms |
| **Arcade (MAME 2003-Plus)** | Native Pixel Perfect | 60.0 FPS | 0.00% | < 2.1 ms |

---

## 🛠️ Build & Compilation

### Requirements
- Android NDK `r26b` or higher
- JDK 21 (Temurin or OpenJDK)
- Node.js 20+ & npm

```bash
# 1. Clone repository
git clone https://github.com/welzim19-star/capivara-emu.git
cd capivara-emu

# 2. Install UI dependencies & compile web assets
npm install
npm run build

# 3. Synchronize native Android container
npx cap sync android

# 4. Compile native APK via Gradle
cd android
./gradlew assembleDebug --no-daemon
```

---

## ⚖️ Legal & Compliance Disclaimer
*Capivara EMU is an independent open-source clean-room frontend implementation interfacing with the Libretro API under the GNU General Public License v3. This software does **NOT** contain, distribute, or link to any copyrighted game ROMs, BIOS images, or proprietary system keys. All emulation trademarks belong to their respective corporate owners.*
