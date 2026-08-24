import React, { useState, useEffect, useRef } from 'react';
import { GameItem, TenantInfo } from '../types';
import { registerPlugin } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';
import { SettingsMenu } from './SettingsMenu';
import { VirtualJoystick } from './VirtualJoystick';
import { netplay } from '../services/NetplayService';
import { CheatsMenu } from './CheatsMenu';
import { SaveStateModal } from './SaveStateModal';
import { NetplayModal } from './NetplayModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useGamepad } from '../hooks/useGamepad';
import { useEngineLifecycle } from '../hooks/useEngineLifecycle';
import { useTelemetry } from '../hooks/useTelemetry';
import { GameHUD } from './GameHUD';
import { SNESGamepad, MegaDriveGamepad, N64Gamepad, ArcadeGamepad, StartSelect } from './PolyGamepad';

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
  const [relaunchTrigger, setRelaunchTrigger] = useState(0);
  const [showCheats, setShowCheats] = useState(false);
  const [saveManagerMode, setSaveManagerMode] = useState<'save' | 'load' | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showDebugLog, setShowDebugLog] = useState(false);
  const [fastForward, setFastForward] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { fpsRef, batteryRef, timeRef, logs, logsEndRef, showHUD } = useTelemetry();

  const [hudConfig, setHudConfig] = useState(() => {
    const saved = localStorage.getItem(`hud_config_${tenant.id}`);
    return saved ? JSON.parse(saved) : { opacity: 1, scale: 1 };
  });

  const saveHudConfig = (newConfig: any) => {
    setHudConfig(newConfig);
    localStorage.setItem(`hud_config_${tenant.id}`, JSON.stringify(newConfig));
  };

  const [isGamepadActive, setIsGamepadActive] = useState(false);
  const gamepadTimeoutRef = useRef<any>(null);

  const lastGamepadActivity = useRef<number>(0);

  // CRITICAL FIX: Make the HTML body transparent so the native Android SurfaceView (rendered behind Capacitor) is visible.
  useEffect(() => {
    const originalBodyBg = document.body.style.backgroundColor;
    const rootDiv = document.getElementById('root');
    const originalRootBg = rootDiv ? rootDiv.style.backgroundColor : '';

    document.body.style.backgroundColor = 'transparent';
    if (rootDiv) rootDiv.style.backgroundColor = 'transparent';

    return () => {
      document.body.style.backgroundColor = originalBodyBg || '#050508';
      if (rootDiv) rootDiv.style.backgroundColor = originalRootBg;
    };
  }, []);

  const handleWakeLock = () => {
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').catch(() => {});
    }
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  const autofireConfig = useRef({ buttonId: -1, speed: 15 });
  const autofireState = useRef({ isHeld: false, intervalId: null as any });

  useEffect(() => {
    const saved = localStorage.getItem(`capy_autofire_${tenant.id}`);
    if (saved) {
      try { autofireConfig.current = JSON.parse(saved); } catch(e) {}
    }
    const handleAutofireUpdate = (e: any) => {
      autofireConfig.current = e.detail;
      if (autofireConfig.current.buttonId === -1 && autofireState.current.intervalId) {
        clearInterval(autofireState.current.intervalId);
        autofireState.current.intervalId = null;
      }
    };
    window.addEventListener('autofire_config_updated', handleAutofireUpdate);
    return () => window.removeEventListener('autofire_config_updated', handleAutofireUpdate);
  }, [tenant.id]);

  const is3dConsole = ['PS1_PCSX', 'PS2_NETHERSX2', 'PS2_PLAY', 'N64_MUPEN64PLUS', 'DREAMCAST_FLYCAST', 'PSP_PPSSPP'].includes(tenant.id);

  const emitNativeButton = async (port: number, buttonId: number, isPressed: boolean) => {
    // R2 (13) Fast Forward on 2D Consoles
    if (port === 0 && buttonId === 13 && !is3dConsole) {
      setFastForward(isPressed);
      CapivaraEngine.setFastForward({ enabled: isPressed });
      return;
    }
    if (port === 0 && buttonId === autofireConfig.current.buttonId && autofireConfig.current.speed > 0) {
      if (isPressed) {
        if (!autofireState.current.isHeld) {
          autofireState.current.isHeld = true;
          CapivaraEngine.sendInput({ port, button: buttonId, isPressed: true });
          netplay.broadcastButton(buttonId, true);
          
          let toggle = true;
          const delay = 1000 / autofireConfig.current.speed;
          autofireState.current.intervalId = setInterval(() => {
            toggle = !toggle;
            CapivaraEngine.sendInput({ port, button: buttonId, isPressed: toggle });
            netplay.broadcastButton(buttonId, toggle);
          }, delay);
        }
      } else {
        autofireState.current.isHeld = false;
        if (autofireState.current.intervalId) {
          clearInterval(autofireState.current.intervalId);
          autofireState.current.intervalId = null;
        }
        CapivaraEngine.sendInput({ port, button: buttonId, isPressed: false });
        netplay.broadcastButton(buttonId, false);
      }
    } else {
      try {
        await CapivaraEngine.sendInput({ port, button: buttonId, isPressed });
        if (port === 0) netplay.broadcastButton(buttonId, isPressed);
      } catch (e) {}
    }
  };

  const haptic = (ms = 30) => { if ('vibrate' in navigator) navigator.vibrate(ms); };

  // God-tier Multi-Touch Global Action Button Handler
  // This allows sliding your thumb from 'Y' to 'B' smoothly, and pressing multiple buttons with a single fat thumb.
  const activeButtonsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const handleGlobalTouch = (e: TouchEvent) => {
      if (editMode) return;
      
      const newActive = new Set<number>();
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el) {
          const btnId = el.getAttribute('data-btn-id') || el.closest('[data-btn-id]')?.getAttribute('data-btn-id');
          if (btnId !== null && btnId !== undefined) {
            newActive.add(Number(btnId));
          }
        }
      }

      const current = activeButtonsRef.current;
      current.forEach(id => {
        if (!newActive.has(id)) {
          emitNativeButton(0, id, false);
        }
      });
      newActive.forEach(id => {
        if (!current.has(id)) {
          haptic(25);
          emitNativeButton(0, id, true);
        }
      });
      activeButtonsRef.current = newActive;
    };

    // We attach it to the window to ensure no touches are lost
    window.addEventListener('touchstart', handleGlobalTouch, { passive: true });
    window.addEventListener('touchmove', handleGlobalTouch, { passive: true });
    window.addEventListener('touchend', handleGlobalTouch, { passive: true });
    window.addEventListener('touchcancel', handleGlobalTouch, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleGlobalTouch);
      window.removeEventListener('touchmove', handleGlobalTouch);
      window.removeEventListener('touchend', handleGlobalTouch);
      window.removeEventListener('touchcancel', handleGlobalTouch);
    };
  }, [editMode]);

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

  useEngineLifecycle({
    tenant,
    currentGame,
    relaunchTrigger,
    lastGamepadActivity,
    onOpenSettings: () => setShowSettings(true),
    onShowToast: showToast,
  });

  useEffect(() => {
    if (showDebugLog && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showDebugLog]);



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
      const storageKey = `capy_saves_${tenant.id}_${currentGame.id}`;
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

  // is3dConsole moved up to handle native buttons
  const is6ButtonGenesis = tenant.id === 'GENESIS_GENPLUSGX';
  const isSnesGba = ['SNES_SNES9X', 'GBA_MGBA'].includes(tenant.id);
  const is8Bit2Button = ['MS3_TECTOY'].includes(tenant.id);
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
      <div className="absolute bottom-2 right-4 z-0 opacity-10 pointer-events-none flex flex-col items-end">
        <span className="text-white text-[10px] font-black tracking-widest drop-shadow-md">
          © PW SYSTEM APPLICATIONS
        </span>
      </div>

      {/* OSD Real-time Telemetry / HUD */}
      <GameHUD fpsRef={fpsRef} batteryRef={batteryRef} timeRef={timeRef} visible={showHUD} />

      {notification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-cyan-500 text-black font-bold px-4 py-2 rounded-full shadow-lg text-sm animate-pulse pointer-events-none">
          {notification}
        </div>
      )}

      {/* Edit Mode Overlay Info */}
      {editMode && (
        <div className="absolute top-4 left-4 z-40 bg-zinc-900/90 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-white font-bold px-6 py-4 rounded-xl flex flex-col gap-4 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-cyan-400 font-black tracking-widest text-sm">HUD EDITOR</span>
            <button onClick={() => setEditMode(false)} className="px-4 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-xs text-white">SAVE & EXIT</button>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/70">HUD Opacity: {Math.round(hudConfig.opacity * 100)}%</label>
            <input 
              type="range" min="0.1" max="1" step="0.1" 
              value={hudConfig.opacity} 
              onChange={(e) => saveHudConfig({ ...hudConfig, opacity: parseFloat(e.target.value) })}
              className="accent-cyan-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-white/70">HUD Scale: {Math.round(hudConfig.scale * 100)}%</label>
            <input 
              type="range" min="0.5" max="1.5" step="0.1" 
              value={hudConfig.scale} 
              onChange={(e) => saveHudConfig({ ...hudConfig, scale: parseFloat(e.target.value) })}
              className="accent-cyan-500"
            />
          </div>
          
          <p className="text-[10px] text-white/40 mt-2">Arraste os clusters para reposicionar (em breve)</p>
        </div>
      )}

        {/* Polymorphic Gamepad HUD — dispatched by console type */}
        <motion.div
          animate={{ opacity: showControls ? hudConfig.opacity : 0, pointerEvents: showControls ? 'auto' : 'none', scale: hudConfig.scale }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
          style={{ transformOrigin: 'center bottom' }}
        >
          {/* Left side: Joystick (all consoles) */}
          <VirtualJoystick
            editMode={editMode}
            className="left-8 bottom-12"
            onAxis={is3dConsole ? (x, y) => emitAnalog(0, 0, x, y) : undefined}
            onDirectionChange={(dirs) => {
               if (!is3dConsole) {
                 emitNativeButton(0, 4, dirs.up);
                 emitNativeButton(0, 5, dirs.down);
                 emitNativeButton(0, 6, dirs.left);
                 emitNativeButton(0, 7, dirs.right);
               } else {
                 emitNativeButton(0, 4, false);
                 emitNativeButton(0, 5, false);
                 emitNativeButton(0, 6, false);
                 emitNativeButton(0, 7, false);
               }
            }}
          />

          {/* Console-specific gamepad */}
          {tenant.id === 'SNES_SNES9X' || tenant.id === 'GBA_MGBA' ? (
            <SNESGamepad onEmit={emitNativeButton} />
          ) : tenant.id === 'GENESIS_GENPLUSGX' ? (
            <MegaDriveGamepad onEmit={emitNativeButton} />
          ) : tenant.id === 'N64_MUPEN64PLUS' ? (
            <N64Gamepad onEmit={emitNativeButton} onAxis={emitAnalog} />
          ) : tenant.id === 'MAME_2003PLUS' || tenant.id === 'NEOGEO_FBNEO' ? (
            <ArcadeGamepad onEmit={emitNativeButton} sixButton={tenant.id === 'MAME_2003PLUS'} />
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
                  <button data-btn-id={8} className={`w-16 h-16 rounded-full ${tenant.gamepadStyle.bottom?.colorClass} border-2 border-white/20 font-black text-xl shadow-lg backdrop-blur-md`}>{tenant.gamepadStyle.bottom?.label}</button>
                  <button data-btn-id={0} className={`w-16 h-16 rounded-full ${tenant.gamepadStyle.right?.colorClass} border-2 border-white/20 font-black text-xl shadow-lg backdrop-blur-md`}>{tenant.gamepadStyle.right?.label}</button>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {tenant.gamepadStyle.right && <button data-btn-id={8} className={`absolute right-2 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full ${tenant.gamepadStyle.right.colorClass} border border-white/20 font-bold backdrop-blur-md text-lg text-white`}>{tenant.gamepadStyle.right.label}</button>}
                  {tenant.gamepadStyle.bottom && <button data-btn-id={0} className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full ${tenant.gamepadStyle.bottom.colorClass} border border-white/20 font-bold backdrop-blur-md text-lg text-white`}>{tenant.gamepadStyle.bottom.label}</button>}
                  {tenant.gamepadStyle.top && <button data-btn-id={9} className={`absolute top-2 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full ${tenant.gamepadStyle.top.colorClass} border border-white/20 font-bold backdrop-blur-md text-lg text-white`}>{tenant.gamepadStyle.top.label}</button>}
                  {tenant.gamepadStyle.left && <button data-btn-id={1} className={`absolute left-2 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full ${tenant.gamepadStyle.left.colorClass} border border-white/20 font-bold backdrop-blur-md text-lg text-white`}>{tenant.gamepadStyle.left.label}</button>}
                  {tenant.gamepadStyle.l1 && <button data-btn-id={10} className={`absolute -top-12 left-2 w-12 h-12 rounded-full ${tenant.gamepadStyle.l1.colorClass} border border-white/20 font-bold backdrop-blur-md text-sm text-white`}>{tenant.gamepadStyle.l1.label}</button>}
                  {tenant.gamepadStyle.r1 && <button data-btn-id={11} className={`absolute -top-12 right-2 w-12 h-12 rounded-full ${tenant.gamepadStyle.r1.colorClass} border border-white/20 font-bold backdrop-blur-md text-sm text-white`}>{tenant.gamepadStyle.r1.label}</button>}
                </div>
              )}
            </motion.div>
          ) : (
            // No-pad consoles (PS1, PS2, PSP, MAME, etc.) — use StartSelect only
            <StartSelect onEmit={emitNativeButton} />
          )}

          {/* Start/Select center — only for consoles NOT using PolyGamepad (PolyGamepad includes own Start) */}
          {!['SNES_SNES9X', 'GBA_MGBA', 'GENESIS_GENPLUSGX', 'N64_MUPEN64PLUS', 'MAME_2003PLUS', 'NEOGEO_FBNEO'].includes(tenant.id) && tenant.gamepadStyle && (
            <motion.div
              drag={editMode}
              dragMomentum={false}
              className={`absolute left-1/2 bottom-4 -translate-x-1/2 flex space-x-6 pointer-events-auto ${editMode ? 'ring-4 ring-cyan-500 rounded-full cursor-move p-2 bg-white/10' : ''}`}
            >
              <button onTouchStart={e => { e.preventDefault(); emitNativeButton(0, 2, true); }} onTouchEnd={() => emitNativeButton(0, 2, false)} onTouchCancel={() => emitNativeButton(0, 2, false)} className="px-5 py-2 bg-white/10 active:bg-white/20 text-white/60 font-bold text-sm rounded-full tracking-widest backdrop-blur-md border border-white/10">
                SELECT
              </button>
              <button onTouchStart={e => { e.preventDefault(); emitNativeButton(0, 3, true); }} onTouchEnd={() => emitNativeButton(0, 3, false)} onTouchCancel={() => emitNativeButton(0, 3, false)} className="px-5 py-2 bg-white/10 active:bg-white/20 text-white/60 font-bold text-sm rounded-full tracking-widest backdrop-blur-md border border-white/10">
                START
              </button>
            </motion.div>
          )}

          {/* Visible Pause/FF/Turbo button (top-center) */}
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
                <>
                  <button
                    className={`pointer-events-auto px-4 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all backdrop-blur-sm border ${fastForward ? 'bg-cyan-500/80 text-white border-cyan-400 shadow-lg shadow-cyan-500/30' : 'bg-black/40 text-white/60 border-white/10 active:scale-95'}`}
                    onClick={() => {
                      const newState = !fastForward;
                      setFastForward(newState);
                      CapivaraEngine.setFastForward({ enabled: newState });
                    }}
                  >
                    {fastForward ? '▶▶ FF ON' : '⏩ FF'}
                  </button>

                  <button
                    className={`pointer-events-auto px-4 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all backdrop-blur-sm border ${(window as any)._autofireActive ? 'bg-orange-500/80 text-white border-orange-400 shadow-lg shadow-orange-500/30' : 'bg-black/40 text-white/60 border-white/10 active:scale-95'}`}
                    onClick={(e) => {
                      const newState = !(window as any)._autofireActive;
                      (window as any)._autofireActive = newState;
                      // Force re-render just for this component visually
                      e.currentTarget.className = `pointer-events-auto px-4 py-1.5 rounded-full text-xs font-bold tracking-widest transition-all backdrop-blur-sm border ${newState ? 'bg-orange-500/80 text-white border-orange-400 shadow-lg shadow-orange-500/30' : 'bg-black/40 text-white/60 border-white/10 active:scale-95'}`;
                      e.currentTarget.innerText = newState ? '🔥 TURBO ON' : '⚡ TURBO';
                    }}
                  >
                    {(window as any)._autofireActive ? '🔥 TURBO ON' : '⚡ TURBO'}
                  </button>
                </>
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
          game={currentGame}
          onClose={() => {
            setShowSettings(false);
            CapivaraEngine.resume();
          }}
          onExit={onExit}
          onExitToDashboard={onExitToDashboard}
          onOpenSaveManager={(mode) => setSaveManagerMode(mode)}
          showControls={showControls}
          onToggleControls={handleToggleControls}
          onShowCheats={() => setShowCheats(true)}
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
              const { CapacitorEngineAdapter } = await import('../adapters/native/CapacitorEngineAdapter');
              const adapter = new CapacitorEngineAdapter();
              await adapter.setConfig(config);
              
              if (['MAME_2003PLUS', 'NEOGEO_FBNEO', 'MAME_2010'].includes(tenant.id)) {
                showToast("Configuração Injetada! Reiniciando Placa Arcade (Cold Reboot)...");
                setShowSettings(false);
                setTimeout(() => setRelaunchTrigger(prev => prev + 1), 500);
              } else {
                showToast("Configuração Injetada a Quente (On The Fly)!");
                setShowSettings(false);
              }
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

      {showCheats && tenant && currentGame && (
        <CheatsMenu 
          tenantId={tenant.id}
          gameId={currentGame.id}
          gameTitle={currentGame.title}
          onClose={() => setShowCheats(false)}
        />
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
