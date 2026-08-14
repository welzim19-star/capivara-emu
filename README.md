# Capivara EMU 🎮🔥

![Capivara Icon](public/favicon.ico)

**Capivara EMU** é um emulador Multi-Console *Endgame* construído com uma arquitetura híbrida revolucionária: **React + Vite (Frontend)** guiando o poder bruto e massivo da API **Libretro C++ (Backend nativo via JNI e NDK)** dentro de um shell **Capacitor**.

## 🚀 Filosofia do Projeto: "Isolamento Galvânico"
Nascido sob a premissa de que a UI nunca deve travar a Placa-mãe. 
Nós criamos uma barreira intransponível (Isolamento Galvânico) entre o React e a Engine C++. O React dita os comandos (Matrix Configs, Shaders, Pause, Save States, Mapeamento de Controle Bluetooth), e o Android/JNI injeta as configurações via ponte assimétrica.

A renderização do jogo roda puramente no escopo da `SurfaceView` e do NDK do Android, ignorando o DOM.

## 🕹️ Consoles Nativamente Integrados
A base suporta qualquer Core Libretro que possa ser compilado para Android `.so`. Atualmente configurado e testado com:
- **PlayStation 2** (`PS2_NETHERSX2` / `Play!`)
- **Arcade MAME** (`MAME_2003PLUS` / `MAME_2010`)
- **NeoGeo AES/MVS** (`NEOGEO_FBNEO`)
- **Super Nintendo** (`SNES_SNES9X`)
- **PlayStation 1** (`PS1_DUCKSTATION`)
- E dezenas de outros pré-mapeados...

## ⚡ Recursos Híbridos ("Wallhacks")
*   **Mapeamento Bluetooth Assíncrono:** Mapeie controles físicos para eventos JNI diretamente na tela. O controle redimensiona dinamicamente respeitando a largura do seu celular!
*   **HUD Tático Real-Time:** Uma sobreposição in-game não obstrusiva que puxa FPS da engine C++, Temperatura de Bateria Nativa do Device e Relógio, flutuando acima da `SurfaceView`.
*   **Cold Reboot Inteligente:** Gerenciamento de ciclo de vida atômico. Ao trocar de *NeoGeo MVS (Fliperama)* para *AES (Console UNIBIOS)*, a Engine recebe um reload forçado e instantâneo, exatamente como desligar e ligar o videogame.
*   **Persistência de Memória SAF:** Permissão nativa "Scoped Storage" no Android 14 resolvida! A Engine é capaz de usar arquivos de Memory Card diretamente da raiz do SD sem Crash de permissão.
*   **Auto-Save & Auto-Load (Slot 0):** O jogo grava silenciosamente todo o estado na RAM ao minimizar o aplicativo, e auto-carrega ao você voltar pro app 1 segundo após o boot do core.

## 🛠️ Tecnologias
- **Frontend:** React, Vite, Framer Motion, Tailwind CSS, Lucide Icons.
- **Camada de Ponte:** Capacitor JS, Capacitor Plugins Customizados (`@capacitor/core`).
- **Engine C++:** JNI, RetroArch API (Libretro Headers), EGL/GLES, OpenSLES.
- **Compilação:** Gradle, CMake.

## ⚙️ Buildando (Drop of Loot)
```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```
O `.apk` será cuspido brilhante e funcional em `android/app/build/outputs/apk/debug/app-debug.apk`.

> Desenvolvido com muita cafeína, foco em performance absurda e, claro, gírias de gamer no console de debug. **GG.**
