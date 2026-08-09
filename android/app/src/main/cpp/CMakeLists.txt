cmake_minimum_required(VERSION 3.22.1)

project("capivara-engine")

# Encontra bibliotecas NDK nativas do Android
find_library(log-lib log)
find_library(android-lib android)
find_library(EGL-lib EGL)
find_library(GLESv3-lib GLESv3)
find_library(OpenSLES-lib OpenSLES)

# Adiciona a nossa biblioteca compartilhada C++
add_library(${CMAKE_PROJECT_NAME} SHARED
    native-engine.cpp
    engine_globals.cpp
    engine_telemetry.cpp
    engine_audio.cpp
    engine_video.cpp
    engine_core.cpp
    engine_gameloop.cpp
    engine_jni.cpp
)


# Linka com bibliotecas essenciais para JNI e OpenGL
target_link_libraries(${CMAKE_PROJECT_NAME}
    ${log-lib}
    ${android-lib}
    ${EGL-lib}
    ${GLESv3-lib}
    ${OpenSLES-lib}
)
