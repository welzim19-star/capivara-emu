// native-engine.cpp
// ─────────────────────────────────────────────────────────────────────────────
// This file is intentionally empty — it is kept only for CMake compatibility.
// All engine logic has been split into focused modules:
//
//   engine_globals.h/cpp    — Global state definitions & extern declarations
//   engine_telemetry.cpp    — UDP log broadcaster & crash signal handlers
//   engine_audio.cpp        — OpenSL ES audio subsystem & Libretro audio CBs
//   engine_video.cpp        — EGL/GLES3 rendering, pixel format conversion
//   engine_core.cpp         — Libretro environment & input callbacks
//   engine_gameloop.cpp     — Main emulator run-loop (single thread lifecycle)
//   engine_jni.cpp          — All JNI entry points (Kotlin ↔ C++ bridge)
// ─────────────────────────────────────────────────────────────────────────────
