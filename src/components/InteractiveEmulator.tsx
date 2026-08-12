import React, { useState, useEffect, useRef } from 'react';
import { GameItem, TenantInfo } from '../types';
import { registerPlugin } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';
import { SettingsMenu } from './SettingsMenu';
import { VirtualJoystick } from './VirtualJoystick';
import { netplay } from '../services/NetplayService';
import { SaveStateModal } from './SaveStateModal';
import { NetplayModal } from './NetplayModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useGamepad } from '../hooks/useGamepad';
import { SNESGamepad, MegaDriveGamepad, N64Gamepad, StartSelect } from './PolyGamepad';

const CapivaraEngine = registerPlugin<any>('CapivaraEngine');

interface Props {
  currentGame: GameItem;
  tenant: TenantInfo;
  onExit: () => void;
  onExitToDashboard: () => void;
}

export const InteractiveEmulator: React.FC<Props> = ({ currentGame, tenant, onExit, onExitToDashboard }) => {
  const [notification, setNotification] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNetplay, setShowNetplay] = useState(false);
  const [saveManagerMode, setSaveManagerMode] = useState<'save' | 'load' | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showDebugLog, setShowDebugLog] = useState(false);
  const [fastForward, setFastForward] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isGamepadActive, setIsGamepadActive] = useState(false);
  const gamepadTimeoutRef = useRef<any>(null);

  const lastGamepadActivity = useRef<number>(0);

  const handleWakeLock = () => {
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').catch(() => {});
    }
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  useGamepad(
    tenant.id,
    (port, buttonId, isPressed) => emitNativeButton(port, buttonId, isPressed),
    (port, stick, x, y) => emitAnalog(port, stick, x, y),
    () => { 
      lastGamepadActivity.current = Date.now(); 
      setIsGamepadActive(true);
      if (gamepadTimeoutRef.current) clearTimeout(gamepadTimeoutRef.current);
      gamepadTimeoutRef.current = setTimeout(() => {
        setIsGamepadActive(false);
      }, 5000);
      handleWakeLock();
    }
  );

  useEffect(() => {
    // Lock orientation to landscape and hide status bar
    const lockScreen = async () => {
      try {
        await ScreenOrientation.lock({ orientation: 'landscape' });
        await StatusBar.hide();
      } catch (e) {
        console.warn("Screen control not available");
      }
    };
    lockScreen();

    const launch = async () => {
      try {
        const savedConfigStr = localStorage.getItem(`core_config_${tenant.id}`);
        const configMatrix = savedConfigStr ? JSON.parse(savedConfigStr) : {};
        
        // Map to libretro core options string format
        const libretroConfig: Record<string, string> = {};
        if (configMatrix.playResMulti !== undefined) libretroConfig['play_res_multi'] = String(configMatrix.playResMulti);
        if (configMatrix.playBilinearFiltering !== undefined) libretroConfig['play_bilinear_filtering'] = configMatrix.playBilinearFiltering ? 'enabled' : 'disabled';
        if (configMatrix.playPresentationMode !== undefined) libretroConfig['play_presentation_mode'] = configMatrix.playPresentationMode;
        if (configMatrix.videoFilter !== undefined) libretroConfig['capivara_video_filter'] = configMatrix.videoFilter;
        // Merge remaining generic ones if they match exact libretro keys
        Object.entries(configMatrix).forEach(([k, v]) => {
           if (!libretroConfig[k] && typeof v === 'string') libretroConfig[k] = v;
        });

        if (tenant.coreFile.includes('play_libretro')) {
          try {
            await CapivaraEngine.requestAllFilesAccess();
          } catch (e) {
            console.warn("requestAllFilesAccess not supported or failed", e);
          }
        }

        showToast("Carregando Core Nativo C++...");
        await CapivaraEngine.startGame({ 
          core: tenant.coreFile,
          romUri: currentGame.id === 'bios_boot' ? '' : currentGame.uri,
          fileName: currentGame.fileName,
          configMatrix: libretroConfig,
          // Phase 1.1: Pass single BIOS file instead of system directory
          biosFileUri: currentGame.biosFileUri ?? null,
          biosFileName: currentGame.biosFileName ?? null,
          romPathUri: tenant.romPathUri ?? null,
        });
        // FIX 0.1: Engine inicia em paused por segurança de thread.
        // É obrigatório chamar resume() aqui para o GameLoop sair do estado
        // de espera e começar a renderizar o primeiro frame imediatamente.
        await CapivaraEngine.resume();
        showToast("Jogo Iniciado no Modo Nativo!");
        
        // Auto-Load Slot 0 if exists
        const storageKey = `saves_${tenant.id}_${currentGame.id}`;
        const savedData = localStorage.getItem(storageKey);
        const saves = savedData ? JSON.parse(savedData) : {};
        if (saves[0]) {
          setTimeout(async () => {
            try {
              await CapivaraEngine.loadState({ slot: 0, hash: currentGame.id });
              showToast("Auto-Load: Progresso Restaurado!");
            } catch (e) {
              console.warn("Auto-load failed", e);
            }
          }, 1000); // Give the core a second to initialize
        }

      } catch (err: any) {
        const msg = err?.message ?? String(err);
        if (msg.startsWith('BIOS_MISSING:')) {
          const biosFile = msg.split(':')[1];
          showToast(`⚠️ BIOS não encontrada: ${biosFile}. Instale em Configurações do Console.`);
        } else {
          showToast("Erro ao processar a ROM na Engine");
        }
      }
    };
    launch();

    // Intercept back button for in-game menu
    const backListener = CapacitorApp.addListener('backButton', () => {
      // If gamepad was active recently (e.g. they pressed B), ignore back button
      if (Date.now() - lastGamepadActivity.current < 500) {
        return;
      }
      setShowSettings(true);
      CapivaraEngine.pause();
    });

    const stateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        CapivaraEngine.resume();
      } else {
        CapivaraEngine.pause();
        // Auto-Save on background
        CapivaraEngine.saveState({ slot: 0, hash: currentGame.id }).then((result: any) => {
          const storageKey = `saves_${tenant.id}_${currentGame.id}`;
          const savedData = localStorage.getItem(storageKey);
          const saves = savedData ? JSON.parse(savedData) : {};
          saves[0] = {
            id: `${currentGame.id}_0`,
            gameId: currentGame.id,
            tenantId: tenant.id,
            slot: 0,
            timestamp: new Date().toLocaleString(),
            thumbnailBase64: result?.thumbnailBase64,
            dataSizeKb: result?.dataSizeKb || 4096,
            hash: currentGame.id
          };
          localStorage.setItem(storageKey, JSON.stringify(saves));
        }).catch(() => console.warn("Auto-save failed"));
      }
    });

    const logListener = CapivaraEngine.addListener('onLogLine', (data: any) => {
      if (data.log) {
        setLogs(prev => {
          const newLogs = [...prev, data.log];
          if (newLogs.length > 200) newLogs.shift();
          return newLogs;
        });
      }
    });

    return () => {
      backListener.then(l => l.remove());
      stateListener.then(l => l.remove());
      logListener.then(l => l.remove());
      CapivaraEngine.stopLogStream().catch(console.error);
      const unlockScreen = async () => {
        try {
          await ScreenOrientation.unlock();
          await StatusBar.show();
        } catch (e) {}
      };
      unlockScreen();
      // ALWAYS kill the native engine process on exit so audio stops
      CapivaraEngine.destroyEngine().catch(console.error);
    };
  }, [currentGame, tenant]);

  useEffect(() => {
    if (showDebugLog && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showDebugLog]);

  const emitNativeButton = async (port: number, buttonId: number, isPressed: boolean) => {
    try {
      await CapivaraEngine.sendInput({ port, button: buttonId, isPressed });
      if (port === 0) netplay.broadcastButton(buttonId, isPressed);
    } catch (e) {}
  };

  const emitAnalog = async (port: number, stick: number, x: number, y: number) => {
    try {
      await CapivaraEngine.sendAnalog({ port, stick, x, y });
      if (port === 0) netplay.broadcastAnalog(stick, x, y);
    } catch (e) {}
  };

  const handleCommitSaveState = async (slot: number, hash: string) => {
    try {
      showToast("Salvando State na Memória...");
      const result = await CapivaraEngine.saveState({ slot, hash });
      
      // Update local storage metadata
      const storageKey = `saves_${tenant.id}_${currentGame.id}`;
      const savedData = localStorage.getItem(storageKey);
      const saves = savedData ? JSON.parse(savedData) : {};
      
      saves[slot] = {
        id: `${currentGame.id}_${slot}`,
        gameId: currentGame.id,
        tenantId: tenant.id,
        slot,
        timestamp: new Date().toLocaleString(),
        thumbnailBase64: result?.thumbnailBase64,
        dataSizeKb: result?.dataSizeKb || 4096,
        hash
      };
      localStorage.setItem(storageKey, JSON.stringify(saves));
      
      showToast(`State Salvo no Slot ${slot}!`);
      setSaveManagerMode(null);
      setShowSettings(false);
      CapivaraEngine.resume();
    } catch (e) {
      showToast("Erro ao salvar state");
    }
  };

  const handleCommitLoadState = async (slot: number, hash: string) => {
    try {
      showToast("Carregando State...");
      await CapivaraEngine.loadState({ slot, hash });
      showToast(`Slot ${slot} Carregado com Sucesso!`);
      setSaveManagerMode(null);
      setShowSettings(false);
      CapivaraEngine.resume();
    } catch (e) {
      showToast("Erro ao carregar state (Hash Match Failed?)");
    }
  };

  const handleTakeScreenshot = async () => {
    try {
      showToast("Tirando screenshot...");
      const result = await CapivaraEngine.takeScreenshot();
      if (result && result.path) {
        showToast("Screenshot salvo em Pictures/CapivaraEmu");
      }
      setShowSettings(false);
      CapivaraEngine.resume();
    } catch (e: any) {
      showToast(e?.message?.includes("empty") ? "Erro: O core não suporta screenshots." : "Erro ao capturar tela");
    }
  };

  // Persist controls visibility per console
  useEffect(() => {
    const saved = localStorage.getItem(`show_controls_${tenant.id}`);
    if (saved !== null) setShowControls(saved === 'true');
  }, [tenant.id]);

  const handleToggleControls = () => {
    const next = !showControls;
    setShowControls(next);
    localStorage.setItem(`show_controls_${tenant.id}`, String(next));
  };

  const is3dConsole = ['PS1_PCSX', 'PS2_NETHERSX2', 'N64_MUPEN64PLUS', 'PSP_PPSSPP'].includes(tenant.id);
  const is6ButtonGenesis = tenant.id === 'GENESIS_GENPLUSGX';
  const isSnesGba = ['SNES_SNES9X', 'GBA_MGBA'].includes(tenant.id);
  const is8Bit2Button = ['MS3_TECTOY', 'MASTERSYSTEM_PICODRIVE', 'GBC_GAMBATTE'].includes(tenant.id);
  const isArcade = ['MAME_2003PLUS', 'NEOGEO_FBNEO'].includes(tenant.id);

  return (
    <div className="absolute inset-0 bg-transparent flex flex-col items-center justify-center overflow-hidden">
      
      {/* Tela do Jogo (Canvas transparente que deixa a SurfaceView nativa aparecer por baixo) */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-full bg-transparent object-contain"
        />
      </div>

      {/* Copyright Watermark */}
      <div className="absolute bottom-2 right-4 z-0 opacity-10 pointer-events-none">
        <span className="text-white text-[10px] font-black tracking-widest drop-shadow-md">
          © PW SYSTEM APPLICATIONS
        </span>
      </div>

      {notification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-cyan-500 text-black font-bold px-4 py-2 rounded-full shadow-lg text-sm animate-pulse pointer-events-none">
          {notification}
        </div>
      )}

      {/* Edit Mode Overlay Info */}
      {editMode && (
        <div className="absolute top-4 left-4 z-40 bg-red-600/80 text-white font-bold px-4 py-2 rounded-lg">
          MODO EDIÇÃO (Arraste os controles) - <button onClick={() => setEditMode(false)} className="underline">Concluir</button>
        </div>
      )}

        {/* Polymorphic Gamepad HUD — dispatched by console type */}
        <motion.div
          animate={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
        >
          {/* Left side: Joystick (all consoles) */}
          <VirtualJoystick
            editMode={editMode}
            className="left-8 bottom-8"
            onDirectionChange={(dir) => {
               emitNativeButton(0, 4, false);
               emitNativeButton(0, 5, false);
               emitNativeButton(0, 6, false);
               emitNativeButton(0, 7, false);
               if (dir === 'UP')    emitNativeButton(0, 4, true);
               if (dir === 'DOWN')  emitNativeButton(0, 5, true);
               if (dir === 'LEFT')  emitNativeButton(0, 6, true);
               if (dir === 'RIGHT') emitNativeButton(0, 7, true);
            }}
          />

          {/* Console-specific gamepad */}
          {tenant.id === 'SNES_SNES9X' || tenant.id === 'GBA_MGBA' ? (
            <SNESGamepad onEmit={emitNativeButton} />
          ) : tenant.id === 'GENESIS_GENPLUSGX' || tenant.id === 'MASTERSYSTEM_PICODRIVE' ? (
            <MegaDriveGamepad onEmit={emitNativeButton} />
          ) : tenant.id === 'N64_MUPEN64PLUS' ? (
            <N64Gamepad onEmit={emitNativeButton} onAxis={emitAnalog} />
          ) : tenant.gamepadStyle ? (
            // Legacy fallback: consoles that still use the old tenant.gamepadStyle object
            <motion.div
              drag={editMode}
              dragMomentum={false}
              className={`absolute flex items-center justify-center w-40 h-40 pointer-events-auto ${editMode ? 'ring-4 ring-cyan-500 rounded-full cursor-move bg-white/10' : ''}`}
              style={{ left: 'calc(100% - 12rem)', bottom: '2rem' }}
            >
              {tenant.gamepadStyle.type === '2-button' ? (
                <div className="flex space-x-6">
                  <button onPointerDown={() => emitNativeButton(0, 8, true)} onPointerUp={() => emitNativeButton(0, 8, false)} onPointerLeave={() => emitNativeButton(0, 8, false)} onPointerCancel={() => emitNativeButton(0, 8, false)} className={`w-16 h-16 rounded-full ${tenant.gamepadStyle.bottom?.colorClass} border-2 border-white/20 font-black text-xl shadow-lg backdrop-blur-md`}>{tenant.gamepadStyle.bottom?.label}</button>
                  <button onPointerDown={() => emitNativeButton(0, 0, true)} onPointerUp={() => emitNativeButton(0, 0, false)} onPointerLeave={() => emitNativeButton(0, 0, false)} onPointerCancel={() => emitNativeButton(0, 0, false)} className={`w-16 h-16 rounded-full ${tenant.gamepadStyle.right?.colorClass} border-2 border-white/20 font-black text-xl shadow-lg backdrop-blur-md`}>{tenant.gamepadStyle.right?.label}</button>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {tenant.gamepadStyle.right && <button onPointerDown={() => emitNativeButton(0, 8, true)} onPointerUp={() => emitNativeButton(0, 8, false)} onPointerLeave={() => emitNativeButton(0, 8, false)} onPointerCancel={() => emitNativeButton(0, 8, false)} className={`absolute right-2 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full ${tenant.gamepadStyle.right.colorClass} border border-white/20 font-bold backdrop-blur-md text-lg text-white`}>{tenant.gamepadStyle.right.label}</button>}
                  {tenant.gamepadStyle.bottom && <button onPointerDown={() => emitNativeButton(0, 0, true)} onPointerUp={() => emitNativeButton(0, 0, false)} onPointerLeave={() => emitNativeButton(0, 0, false)} onPointerCancel={() => emitNativeButton(0, 0, false)} className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full ${tenant.gamepadStyle.bottom.colorClass} border border-white/20 font-bold backdrop-blur-md text-lg text-white`}>{tenant.gamepadStyle.bottom.label}</button>}
                  {tenant.gamepadStyle.top && <button onPointerDown={() => emitNativeButton(0, 9, true)} onPointerUp={() => emitNativeButton(0, 9, false)} onPointerLeave={() => emitNativeButton(0, 9, false)} onPointerCancel={() => emitNativeButton(0, 9, false)} className={`absolute top-2 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full ${tenant.gamepadStyle.top.colorClass} border border-white/20 font-bold backdrop-blur-md text-lg text-white`}>{tenant.gamepadStyle.top.label}</button>}
                  {tenant.gamepadStyle.left && <button onPointerDown={() => emitNativeButton(0, 1, true)} onPointerUp={() => emitNativeButton(0, 1, false)} onPointerLeave={() => emitNativeButton(0, 1, false)} onPointerCancel={() => emitNativeButton(0, 1, false)} className={`absolute left-2 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full ${tenant.gamepadStyle.left.colorClass} border border-white/20 font-bold backdrop-blur-md text-lg text-white`}>{tenant.gamepadStyle.left.label}</button>}
                  {tenant.gamepadStyle.l1 && <button onPointerDown={() => emitNativeButton(0, 10, true)} onPointerUp={() => emitNativeButton(0, 10, false)} onPointerLeave={() => emitNativeButton(0, 10, false)} onPointerCancel={() => emitNativeButton(0, 10, false)} className={`absolute -top-12 left-2 w-12 h-12 rounded-full ${tenant.gamepadStyle.l1.colorClass} border border-white/20 font-bold backdrop-blur-md text-sm text-white`}>{tenant.gamepadStyle.l1.label}</button>}
                  {tenant.gamepadStyle.r1 && <button onPointerDown={() => emitNativeButton(0, 11, true)} onPointerUp={() => emitNativeButton(0, 11, false)} onPointerLeave={() => emitNativeButton(0, 11, false)} onPointerCancel={() => emitNativeButton(0, 11, false)} className={`absolute -top-12 right-2 w-12 h-12 rounded-full ${tenant.gamepadStyle.r1.colorClass} border border-white/20 font-bold backdrop-blur-md text-sm text-white`}>{tenant.gamepadStyle.r1.label}</button>}
                </div>
              )}
            </motion.div>
          ) : (
            // No-pad consoles (PS1, PS2, PSP, MAME, etc.) — use StartSelect only
            <StartSelect onEmit={emitNativeButton} />
          )}

          {/* Start/Select center — only for consoles NOT using PolyGamepad (PolyGamepad includes own Start) */}
          {!['SNES_SNES9X', 'GBA_MGBA', 'GENESIS_GENPLUSGX', 'MASTERSYSTEM_PICODRIVE', 'N64_MUPEN64PLUS'].includes(tenant.id) && tenant.gamepadStyle && (
            <motion.div
              drag={editMode}
              dragMomentum={false}
              className={`absolute left-1/2 bottom-4 -translate-x-1/2 flex space-x-6 pointer-events-auto ${editMode ? 'ring-4 ring-cyan-500 rounded-full cursor-move p-2 bg-white/10' : ''}`}
            >
              <button onPointerDown={() => emitNativeButton(0, 2, true)} onPointerUp={() => emitNativeButton(0, 2, false)} onPointerLeave={() => emitNativeButton(0, 2, false)} onPointerCancel={() => emitNativeButton(0, 2, false)} className="px-5 py-2 bg-white/10 active:bg-white/20 text-white/60 font-bold text-sm rounded-full tracking-widest backdrop-blur-md border border-white/10">
                SELECT
              </button>
              <button onPointerDown={() => emitNativeButton(0, 3, true)} onPointerUp={() => emitNativeButton(0, 3, false)} onPointerLeave={() => emitNativeButton(0, 3, false)} onPointerCancel={() => emitNativeButton(0, 3, false)} className="px-5 py-2 bg-white/10 active:bg-white/20 text-white/60 font-bold text-sm rounded-full tracking-widest backdrop-blur-md border border-white/10">
                START
              </button>
            </motion.div>
          )}

          {/* Visible Pause/FF button (top-center) */}
          {!editMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center space-x-2">
              <button
                className="pointer-events-auto px-5 py-1.5 rounded-full text-xs font-bold tracking-widest text-white/60 bg-black/40 border border-white/10 backdrop-blur-sm active:scale-95 transition-all"
                onClick={() => {
                  setShowSettings(true);
                  CapivaraEngine.pause();
                }}
              >
                ⏸ MENU
              </button>
              
              {!is3dConsole && (
                <button
                  className={`pointer-events-auto px-4 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all backdrop-blur-sm border ${fastForward ? 'bg-cyan-500/80 text-white border-cyan-400 shadow-lg shadow-cyan-500/30' : 'bg-black/40 text-white/60 border-white/10 active:scale-95'}`}
                  onClick={() => {
                    const newState = !fastForward;
                    setFastForward(newState);
                    emitNativeButton(0, 13, newState);
                  }}
                >
                  {fastForward ? '▶▶ FF ON' : '⏩ FF'}
                </button>
              )}
            </div>
          )}
        </motion.div>

      {/* Floating Logcat Panel */}
      <AnimatePresence>
        {showDebugLog && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-4 left-4 w-1/3 max-w-sm h-3/4 bg-black/80 backdrop-blur-md border border-amber-500/30 rounded-xl flex flex-col z-40 overflow-hidden shadow-2xl"
          >
            <div className="bg-amber-500/20 px-3 py-2 flex items-center justify-between border-b border-amber-500/30">
              <span className="text-amber-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Terminal Logcat
              </span>
              <button onClick={() => {
                setShowDebugLog(false);
                CapivaraEngine.stopLogStream().catch(console.error);
              }} className="text-white/60 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              <div className="font-mono text-[9px] leading-tight break-words">
                {logs.map((log, i) => (
                  <div key={i} className={`${log.includes(' E ') ? 'text-red-400' : log.includes(' W ') ? 'text-yellow-400' : 'text-emerald-400/80'} mb-1 border-b border-white/5 pb-1`}>
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showSettings && (
        <SettingsMenu 
          tenant={tenant}
          onClose={() => {
            setShowSettings(false);
            CapivaraEngine.resume();
          }}
          onExit={onExit}
          onExitToDashboard={onExitToDashboard}
          onOpenSaveManager={(mode) => setSaveManagerMode(mode)}
          showControls={showControls}
          onToggleControls={handleToggleControls}
          onTakeScreenshot={handleTakeScreenshot}
          onEditLayout={() => {
            setShowSettings(false);
            setEditMode(true);
            CapivaraEngine.resume();
          }}
          onStartCasting={async () => {
            try {
              await CapivaraEngine.startCasting();
              alert("Casting Server Started on port 8080. Acesse no navegador da TV: http://[SEU-IP]:8080");
            } catch (e) {
              console.error(e);
            }
          }}
          onApplyConfig={async (config) => {
            try {
              await CapivaraEngine.updateConfig({ configMatrix: config });
              showToast("Live Config Injetada!");
            } catch (e) {
              console.warn("Core não suporta Live Tweak", e);
            }
          }}
          showDebugLog={showDebugLog}
          onToggleDebugLog={async () => {
            const next = !showDebugLog;
            setShowDebugLog(next);
            if (next) {
              await CapivaraEngine.startLogStream();
            } else {
              await CapivaraEngine.stopLogStream();
            }
          }}
          onOpenNetplay={() => {
            setShowSettings(false);
            setShowNetplay(true);
            CapivaraEngine.resume(); // keep running while connecting
          }}
          onSetVideoFilter={async (filter: number) => {
            try {
              await CapivaraEngine.setVideoFilter({ filter });
              showToast(['Filtro: Nítido', 'Filtro: Suave', 'Filtro: CRT', 'Filtro: LCD'][filter] ?? 'Filtro aplicado!');
            } catch (e) {
              console.warn('setVideoFilter not available', e);
            }
          }}
        />
      )}

      {showNetplay && (
        <NetplayModal onClose={() => setShowNetplay(false)} />
      )}

      {saveManagerMode && (
        <SaveStateModal
          tenant={tenant}
          game={currentGame}
          mode={saveManagerMode}
          onClose={() => setSaveManagerMode(null)}
          onSelectSlot={(slot, hash) => {
            if (saveManagerMode === 'save') {
              handleCommitSaveState(slot, hash);
            } else {
              handleCommitLoadState(slot, hash);
            }
          }}
        />
      )}
    </div>
  );
}
