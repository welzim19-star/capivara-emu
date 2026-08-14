import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TenantInfo, CoreConfigTemplate, GameItem } from '../types';
import { TenantSettingsView } from './TenantSettingsView';
import { InputMapper } from './InputMapper';
import { BiosManagerModal } from './BiosManagerModal';
import { MemoryCardManager } from './MemoryCardManager';
import { AutofireSettings } from './AutofireSettings';

interface Props {
  tenant: TenantInfo;
  game?: GameItem;
  onClose: () => void;
  onExit: () => void;
  onExitToDashboard: () => void;
  onOpenSaveManager: (mode: 'save' | 'load') => void;
  onEditLayout: () => void;
  onApplyConfig: (config: CoreConfigTemplate) => void;
  onStartCasting: () => void;
  showControls: boolean;
  onToggleControls: () => void;
  onTakeScreenshot: () => void;
  showDebugLog: boolean;
  onToggleDebugLog: () => void;
  onOpenNetplay: () => void;
  onSetVideoFilter: (filter: number) => void;
  onShowCheats?: () => void;
}

const CONSOLE_THEME: Record<string, { accent: string; accentDark: string; label: string; icon: string }> = {
  SNES_SNES9X:            { accent: '#8B5CF6', accentDark: '#6D28D9', label: 'Super Nintendo', icon: '🎮' },
  GENESIS_GENPLUSGX:      { accent: '#3B82F6', accentDark: '#1D4ED8', label: 'Mega Drive', icon: '⚡' },
  GBA_MGBA:               { accent: '#10B981', accentDark: '#065F46', label: 'Game Boy Advance', icon: '📱' },
  MS3_TECTOY:             { accent: '#EF4444', accentDark: '#B91C1C', label: 'Master System', icon: '📺' },
  PS1_PCSX:               { accent: '#0EA5E9', accentDark: '#0369A1', label: 'PlayStation', icon: '🔵' },
  PS2_NETHERSX2:          { accent: '#4F46E5', accentDark: '#3730A3', label: 'PlayStation 2', icon: '🔷' },
  N64_MUPEN64PLUS:        { accent: '#22C55E', accentDark: '#15803D', label: 'Nintendo 64', icon: '🟩' },
  MAME_2003PLUS:          { accent: '#DC2626', accentDark: '#991B1B', label: 'Arcade MAME', icon: '🕹️' },
  NEOGEO_FBNEO:           { accent: '#EA580C', accentDark: '#9A3412', label: 'FinalBurn Neo', icon: '🔥' },
};

export const SettingsMenu: React.FC<Props> = ({
  tenant, game, onClose, onExit, onExitToDashboard,
  onOpenSaveManager, onEditLayout, onApplyConfig,
  onStartCasting, showControls, onToggleControls, onTakeScreenshot,
  showDebugLog, onToggleDebugLog, onOpenNetplay, onSetVideoFilter,
  onShowCheats
}) => {
  const [activeTab, setActiveTab] = useState<'Sistema' | 'Controles' | 'Extras'>('Sistema');
  const [showConfig, setShowConfig] = useState(false);
  const [showInputMapper, setShowInputMapper] = useState(false);
  const [showBiosManager, setShowBiosManager] = useState(false);
  const [showMemCard, setShowMemCard] = useState(false);
  const [showAutofire, setShowAutofire] = useState(false);
  const [videoFilter, setVideoFilter] = useState<number>(() => {
    const saved = localStorage.getItem(`video_filter_${tenant.id}`);
    return saved ? parseInt(saved) : 0;
  });

  const handleVideoFilter = (filter: number) => {
    setVideoFilter(filter);
    localStorage.setItem(`video_filter_${tenant.id}`, String(filter));
    onSetVideoFilter(filter);
  };

  const theme = CONSOLE_THEME[tenant.id] ?? { accent: '#06B6D4', accentDark: '#0E7490', label: tenant.name, icon: '🎮' };

  const loadSavedConfig = (): CoreConfigTemplate | undefined => {
    if (game) {
      const override = localStorage.getItem(`override_${game.id}`);
      if (override) { try { return JSON.parse(override); } catch (e) {} }
    }
    const saved = localStorage.getItem(`core_config_${tenant.id}`);
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return undefined;
  };

  const handleSaveConfig = (config: CoreConfigTemplate, saveAsOverride: boolean = false) => {
    if (saveAsOverride && game) {
      localStorage.setItem(`override_${game.id}`, JSON.stringify(config));
    } else {
      localStorage.setItem(`core_config_${tenant.id}`, JSON.stringify(config));
      if (game) localStorage.removeItem(`override_${game.id}`);
    }
    onApplyConfig(config);
    setShowConfig(false);
  };

  if (showBiosManager) {
    return <BiosManagerModal onClose={() => setShowBiosManager(false)} />;
  }

  if (showMemCard) {
    return <MemoryCardManager tenant={tenant} onClose={() => setShowMemCard(false)} />;
  }

  if (showAutofire) {
    return (
      <AutofireSettings 
        tenant={tenant} 
        onClose={() => setShowAutofire(false)} 
        onSave={(cfg) => {
           // We dispatch an event so InteractiveEmulator can pick it up
           window.dispatchEvent(new CustomEvent('autofire_config_updated', { detail: cfg }));
        }} 
      />
    );
  }

  if (showConfig) {
    return (
      <TenantSettingsView
        tenant={tenant}
        game={game}
        initialConfig={loadSavedConfig()}
        onClose={() => setShowConfig(false)}
        onSave={handleSaveConfig}
      />
    );
  }

  if (showInputMapper) {
    return <InputMapper coreName={tenant.id} onClose={() => setShowInputMapper(false)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(5,5,10,0.95) 100%)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full h-full bg-zinc-900/90 border-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col">
        
        {/* Header (Top Bar) - Always Visible */}
        <div className="flex items-center justify-between px-6 py-4 bg-black/40 border-b border-white/5 relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accentDark})` }} />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ background: `${theme.accent}30` }}>{theme.icon}</div>
            <div>
              <p className="text-white/40 text-[9px] uppercase tracking-widest font-mono">Emulação Pausada</p>
              <h1 className="text-white font-black text-xl leading-none">{theme.label}</h1>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => onOpenSaveManager('save')} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white font-bold text-sm border border-white/10 flex items-center gap-2">
              <span>💾</span> Save
            </button>
            <button onClick={() => onOpenSaveManager('load')} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white font-bold text-sm border border-white/10 flex items-center gap-2">
              <span>📂</span> Load
            </button>
            <button onClick={onExitToDashboard} className="px-4 py-2 rounded-xl bg-red-900/30 hover:bg-red-900/50 active:scale-95 transition-all text-red-400 font-bold text-sm border border-red-900/50 flex items-center gap-2 ml-4">
              🚪 Sair do Jogo
            </button>
            <button onClick={onClose} className="px-6 py-2 rounded-xl text-white font-black tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg ml-2" style={{ background: theme.accent }}>
              ▶ RETOMAR
            </button>
          </div>
        </div>

        {/* Layout: Sidebar Tabs + Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-48 bg-black/30 border-r border-white/5 p-4 flex flex-col gap-2 shrink-0">
            {(['Sistema', 'Controles', 'Extras'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full py-3 px-4 rounded-xl text-left font-bold text-sm transition-all flex items-center justify-between ${activeTab === tab ? `border border-current` : 'text-white/40 hover:bg-white/5 border border-transparent'}`}
                style={activeTab === tab ? { color: theme.accent, backgroundColor: `${theme.accent}20`, borderColor: theme.accent } : {}}
              >
                {tab}
                {activeTab === tab && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />}
              </button>
            ))}
            
            <div className="mt-auto">
              <button onClick={onExit} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-bold text-xs uppercase tracking-widest transition-all">
                Trocar Jogo
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            {activeTab === 'Sistema' && (
              <div className="flex flex-col gap-6 max-w-2xl">
                <div>
                  <h2 className="text-white font-black text-lg mb-4">Video & Shaders</h2>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: 0, label: 'Nítido', icon: '🔲' }, { id: 1, label: 'Suave', icon: '🌫️' },
                      { id: 2, label: 'CRT', icon: '📺' }, { id: 3, label: 'LCD', icon: '📱' },
                    ].map(f => (
                      <button
                        key={f.id} onClick={() => handleVideoFilter(f.id)}
                        className={`py-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border ${videoFilter === f.id ? 'border-current text-white shadow-lg' : 'border-white/5 text-white/40 bg-white/5 hover:bg-white/10'}`}
                        style={videoFilter === f.id ? { background: `${theme.accent}20`, borderColor: theme.accent, color: theme.accent } : {}}
                      >
                        <span className="text-2xl">{f.icon}</span>
                        <span className="font-bold text-[10px] uppercase tracking-wider">{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full" />

                <div>
                  <h2 className="text-white font-black text-lg mb-4">Core Engine Options</h2>
                  <button onClick={() => setShowConfig(true)} className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between px-6 transition-all group">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">⚙️</span>
                      <div className="text-left">
                        <p className="text-white font-bold text-sm">Engine Tweaks</p>
                        <p className="text-white/40 text-xs">Ajustes avançados, resolução e áudio</p>
                      </div>
                    </div>
                    <span className="text-white/20 group-hover:text-white transition-all">➔</span>
                  </button>
                </div>

                <div className="h-px bg-white/5 w-full" />

                <div>
                  <h2 className="text-white font-black text-lg mb-4">Hardware</h2>
                  <button onClick={() => setShowBiosManager(true)} className="w-full py-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-between px-6 transition-all group">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">💽</span>
                      <div className="text-left">
                        <p className="text-emerald-400 font-bold text-sm">Gerenciar BIOS</p>
                        <p className="text-emerald-500/50 text-xs">Importe arquivos de firmware</p>
                      </div>
                    </div>
                    <span className="text-emerald-500/50 group-hover:text-emerald-400 transition-all">➔</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Controles' && (
              <div className="flex flex-col gap-6 max-w-2xl">
                <div>
                  <h2 className="text-white font-black text-lg mb-4">Bluetooth & Touchscreen</h2>
                  
                  <div className="flex flex-col gap-3">
                    <button onClick={() => setShowInputMapper(true)} className="w-full py-4 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 flex items-center justify-between px-6 transition-all group">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">🎮</span>
                        <div className="text-left">
                          <p className="text-purple-400 font-bold text-sm">Mapear Controle (Gamepad)</p>
                          <p className="text-purple-500/50 text-xs">Configure botões físicos bluetooth</p>
                        </div>
                      </div>
                      <span className="text-purple-500/50 group-hover:text-purple-400 transition-all">➔</span>
                    </button>

                    <button onClick={onEditLayout} className="w-full py-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 flex items-center justify-between px-6 transition-all group">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">✏️</span>
                        <div className="text-left">
                          <p className="text-blue-400 font-bold text-sm">Editar Touchscreen</p>
                          <p className="text-blue-500/50 text-xs">Mova e redimensione botões na tela</p>
                        </div>
                      </div>
                      <span className="text-blue-500/50 group-hover:text-blue-400 transition-all">➔</span>
                    </button>

                    <button onClick={onToggleControls} className={`w-full py-4 rounded-2xl flex items-center justify-between px-6 border transition-all ${showControls ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5'}`}>
                      <div className="text-left">
                        <p className="text-white font-bold text-sm">Controles na Tela (Virtual Pad)</p>
                        <p className="text-white/40 text-xs">Ativar/Desativar interface de toque</p>
                      </div>
                      <div className="w-12 h-6 rounded-full flex items-center px-1" style={{ background: showControls ? theme.accent : 'rgba(255,255,255,0.1)' }}>
                        <div className="w-4 h-4 rounded-full bg-white transition-all shadow-md" style={{ transform: showControls ? 'translateX(24px)' : 'translateX(0)' }} />
                      </div>
                    </button>
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full" />

                <div>
                  <h2 className="text-white font-black text-lg mb-4">Autofire Engine (Turbo)</h2>
                  <button onClick={() => setShowAutofire(true)} className="w-full py-4 rounded-2xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 flex items-center justify-between px-6 transition-all group">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">🔥</span>
                      <div className="text-left">
                        <p className="text-yellow-400 font-bold text-sm">Configurar Autofire</p>
                        <p className="text-yellow-500/50 text-xs">Atribuir botão para turbo automático</p>
                      </div>
                    </div>
                    <span className="text-yellow-500/50 group-hover:text-yellow-400 transition-all">➔</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Extras' && (
              <div className="flex flex-col gap-6 max-w-2xl">
                <div>
                  <h2 className="text-white font-black text-lg mb-4">Ferramentas</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => onShowCheats?.()} className="w-full py-4 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 flex flex-col items-center justify-center gap-2 transition-all">
                      <span className="text-3xl mb-1">👾</span>
                      <span className="text-indigo-400 font-bold text-sm">Game Genie (Cheats)</span>
                    </button>

                    <button onClick={onTakeScreenshot} className="w-full py-4 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 flex flex-col items-center justify-center gap-2 transition-all">
                      <span className="text-3xl mb-1">📸</span>
                      <span className="text-orange-400 font-bold text-sm">Tirar Screenshot</span>
                    </button>

                    <button onClick={onOpenNetplay} className="w-full py-4 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 flex flex-col items-center justify-center gap-2 transition-all">
                      <span className="text-3xl mb-1">🌐</span>
                      <span className="text-sky-400 font-bold text-sm">Netplay Multiplayer</span>
                    </button>

                    {tenant.id === 'PS2_NETHERSX2' && (
                      <button onClick={() => setShowMemCard(true)} className="w-full py-4 rounded-2xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 flex flex-col items-center justify-center gap-2 transition-all">
                        <span className="text-3xl mb-1">🎴</span>
                        <span className="text-pink-400 font-bold text-sm">Memory Cards</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
};
