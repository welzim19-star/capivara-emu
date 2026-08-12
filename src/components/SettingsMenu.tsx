import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TenantInfo, CoreConfigTemplate } from '../types';
import { EmulatorConfigModal } from './EmulatorConfigModal';
import { PS2SettingsView } from './PS2SettingsView';
import { InputMapper } from './InputMapper';

interface Props {
  tenant: TenantInfo;
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
}

type Tab = 'main' | 'saves' | 'settings';

const CONSOLE_THEME: Record<string, { accent: string; accentDark: string; label: string; icon: string }> = {
  SNES_SNES9X:            { accent: '#8B5CF6', accentDark: '#6D28D9', label: 'Super Nintendo', icon: '🎮' },
  GENESIS_GENPLUSGX:      { accent: '#3B82F6', accentDark: '#1D4ED8', label: 'Mega Drive', icon: '⚡' },
  GBA_MGBA:               { accent: '#10B981', accentDark: '#065F46', label: 'Game Boy Advance', icon: '📱' },
  GBC_GAMBATTE:           { accent: '#F59E0B', accentDark: '#B45309', label: 'Game Boy Color', icon: '🟡' },
  MS3_TECTOY:             { accent: '#EF4444', accentDark: '#B91C1C', label: 'Master System', icon: '📺' },
  PS1_PCSX:               { accent: '#0EA5E9', accentDark: '#0369A1', label: 'PlayStation', icon: '🔵' },
  PS2_NETHERSX2:          { accent: '#4F46E5', accentDark: '#3730A3', label: 'PlayStation 2', icon: '🔷' },
  N64_MUPEN64PLUS:        { accent: '#22C55E', accentDark: '#15803D', label: 'Nintendo 64', icon: '🟩' },
  MAME_2003PLUS:          { accent: '#DC2626', accentDark: '#991B1B', label: 'Arcade MAME', icon: '🕹️' },
  NEOGEO_FBNEO:           { accent: '#EA580C', accentDark: '#C2410C', label: 'Neo-Geo', icon: '🔴' },
  PSP_PPSSPP:             { accent: '#0D9488', accentDark: '#0F766E', label: 'PSP', icon: '🎯' },
  MASTERSYSTEM_PICODRIVE: { accent: '#65A30D', accentDark: '#3F6212', label: '8-Bit Classic', icon: '🟢' },
};

export const SettingsMenu: React.FC<Props> = ({
  tenant, onClose, onExit, onExitToDashboard,
  onOpenSaveManager, onEditLayout, onApplyConfig,
  onStartCasting, showControls, onToggleControls, onTakeScreenshot,
  showDebugLog, onToggleDebugLog, onOpenNetplay, onSetVideoFilter
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('main');
  const [showConfig, setShowConfig] = useState(false);
  const [showInputMapper, setShowInputMapper] = useState(false);
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
    const saved = localStorage.getItem(`core_config_${tenant.id}`);
    if (saved) { try { return JSON.parse(saved); } catch (e) {} }
    return undefined;
  };

  const handleSaveConfig = (config: CoreConfigTemplate) => {
    localStorage.setItem(`core_config_${tenant.id}`, JSON.stringify(config));
    onApplyConfig(config);
    setShowConfig(false);
  };

  if (showConfig) {
    if (tenant.id === 'PS2_NETHERSX2') {
      return <PS2SettingsView onClose={() => setShowConfig(false)} onSave={handleSaveConfig} />;
    }
    return (
      <EmulatorConfigModal
        tenant={tenant}
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
      className="absolute inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(5,5,10,0.95) 100%)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full max-w-4xl bg-zinc-900/90 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[95vh]">
        
        {/* Header HUD - Compact */}
        <div className="flex items-center justify-between px-6 py-4 bg-black/40 border-b border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accentDark})` }} />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: `${theme.accent}30` }}>{theme.icon}</div>
            <div>
              <p className="text-white/40 text-[9px] uppercase tracking-widest font-mono">Emulação Pausada</p>
              <h1 className="text-white font-black text-xl leading-none">{theme.label}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-6 py-2 rounded-xl text-white font-black tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg" style={{ background: theme.accent }}>
              ▶ RETOMAR
            </button>
          </div>
        </div>

        {/* Dashboard Grid - No Scrolling needed */}
        <div className="p-6 grid grid-cols-12 gap-6 flex-1">
          
          {/* Col 1: Saves (Quick Access) */}
          <div className="col-span-4 flex flex-col gap-3">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono">State Manager</p>
            
            <button onClick={() => onOpenSaveManager('save')} className="w-full h-24 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 flex flex-col items-center justify-center gap-1 transition-all group">
              <span className="text-3xl group-hover:scale-110 transition-transform">💾</span>
              <span className="font-bold text-white text-sm">Quick Save</span>
            </button>

            <button onClick={() => onOpenSaveManager('load')} className="w-full h-24 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 flex flex-col items-center justify-center gap-1 transition-all group">
              <span className="text-3xl group-hover:scale-110 transition-transform">📂</span>
              <span className="font-bold text-white text-sm">Quick Load</span>
            </button>

            <button onClick={onTakeScreenshot} className="w-full h-12 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 flex items-center justify-center gap-2 transition-all text-white/70 text-sm font-bold mt-auto">
              📸 Screenshot
            </button>
          </div>

          {/* Col 2: Engine & Video Filters */}
          <div className="col-span-4 flex flex-col gap-3 border-l border-r border-white/5 px-6">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono">Video & Shaders</p>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 0, label: 'Nítido', icon: '🔲' }, { id: 1, label: 'Suave', icon: '🌫️' },
                { id: 2, label: 'CRT', icon: '📺' }, { id: 3, label: 'LCD', icon: '📱' },
              ].map(f => (
                <button
                  key={f.id} onClick={() => handleVideoFilter(f.id)}
                  className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border ${videoFilter === f.id ? 'border-current text-white' : 'border-white/5 text-white/40 bg-white/5 hover:bg-white/10'}`}
                  style={videoFilter === f.id ? { background: `${theme.accent}20`, borderColor: theme.accent, color: theme.accent } : {}}
                >
                  <span className="text-xl">{f.icon}</span>
                  <span className="font-bold text-[10px]">{f.label}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setShowConfig(true)} className="w-full mt-2 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center gap-2 text-white font-bold text-sm">
              ⚙️ Engine Tweaks
            </button>
            <button onClick={() => setShowInputMapper(true)} className="w-full py-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 flex items-center justify-center gap-2 text-purple-400 font-bold text-sm">
              🎮 Mapear Controle
            </button>
          </div>

          {/* Col 3: Extras & System */}
          <div className="col-span-4 flex flex-col gap-3">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono">Opções de Sistema</p>

            <button onClick={onToggleControls} className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-between px-4 border transition-all ${showControls ? 'bg-white/10 border-white/10 text-white' : 'bg-white/5 border-white/5 text-white/50'}`}>
              Virtual Pad <div className="w-10 h-5 rounded-full flex items-center px-1" style={{ background: showControls ? theme.accent : 'rgba(255,255,255,0.1)' }}><div className="w-3 h-3 rounded-full bg-white transition-all" style={{ transform: showControls ? 'translateX(20px)' : 'translateX(0)' }} /></div>
            </button>
            <button onClick={onEditLayout} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 text-xs font-bold text-left px-4">✏️ Editar Touchscreen</button>
            <button onClick={onOpenNetplay} className="w-full py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-bold text-left px-4">🌐 Netplay Multiplayer</button>
            
            <div className="mt-auto grid grid-cols-2 gap-2">
              <button onClick={onExit} className="py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[10px] uppercase tracking-widest">Trocar Jogo</button>
              <button onClick={onExitToDashboard} className="py-3 rounded-xl bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 font-bold text-[10px] uppercase tracking-widest">Sair Pro Menu</button>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};


