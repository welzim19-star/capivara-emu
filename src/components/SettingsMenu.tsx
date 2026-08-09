import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TenantInfo, CoreConfigTemplate } from '../types';
import { EmulatorConfigModal } from './EmulatorConfigModal';

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
  showDebugLog, onToggleDebugLog
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('main');
  const [showConfig, setShowConfig] = useState(false);

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
    return (
      <EmulatorConfigModal
        tenant={tenant}
        initialConfig={loadSavedConfig()}
        onClose={() => setShowConfig(false)}
        onSave={handleSaveConfig}
      />
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'main', label: 'Menu', icon: '⏸' },
    { id: 'saves', label: 'States', icon: '💾' },
    { id: 'settings', label: 'Config', icon: '⚙️' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-[100] flex flex-col"
      style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.97) 0%, rgba(10,10,20,0.98) 100%)' }}
    >
      {/* Accent glow top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)` }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg"
            style={{ background: `${theme.accent}30`, border: `1px solid ${theme.accent}60` }}
          >
            {theme.icon}
          </div>
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono">Em Pausa</p>
            <h1 className="text-white font-black text-lg leading-none">{theme.label}</h1>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/60 text-lg transition-all"
        >
          ✕
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex mx-6 mb-4 bg-white/5 rounded-xl p-1 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            style={activeTab === tab.id ? {
              background: theme.accent,
              color: '#fff',
              boxShadow: `0 0 16px ${theme.accent}60`,
            } : { color: 'rgba(255,255,255,0.4)' }}
          >
            <span className="mr-1">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }} className="flex flex-col gap-3"
            >
              <button
                onClick={onClose}
                className="w-full py-5 rounded-2xl font-black text-lg text-white tracking-wide transition-all active:scale-95 shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentDark})`, boxShadow: `0 8px 32px ${theme.accent}50` }}
              >
                ▶ CONTINUAR JOGO
              </button>

              <button
                onClick={onToggleControls}
                className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-95 flex items-center justify-between px-5 border ${showControls ? 'bg-white/10 border-white/10 text-white' : 'bg-white/5 border-white/5 text-white/50'}`}
              >
                <span className="flex items-center gap-2"><span className="text-base">🎮</span>Controles Virtuais na Tela</span>
                <div className="w-12 h-6 rounded-full transition-all flex items-center px-1" style={{ background: showControls ? theme.accent : 'rgba(255,255,255,0.1)' }}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transition-all" style={{ transform: showControls ? 'translateX(24px)' : 'translateX(0)' }} />
                </div>
              </button>

              <button onClick={onEditLayout} className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-white/70 font-semibold text-sm border border-white/5 transition-all flex items-center gap-3 px-5">
                <span className="text-base">✏️</span>Editar Layout dos Controles
              </button>

              <button onClick={onTakeScreenshot} className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-white/70 font-semibold text-sm border border-white/5 transition-all flex items-center gap-3 px-5">
                <span className="text-base">📸</span>Tirar Screenshot
              </button>

              <button onClick={onStartCasting} className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 font-semibold text-sm border transition-all flex items-center gap-3 px-5" style={{ color: '#C084FC', borderColor: '#7C3AED40' }}>
                <span className="text-base">📺</span>Transmitir para TV (WebRTC)
              </button>

              <button onClick={onToggleDebugLog} className={`w-full py-4 rounded-2xl active:scale-95 font-semibold text-sm border transition-all flex items-center gap-3 px-5 ${showDebugLog ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/5'}`}>
                <span className="text-base">📝</span>{showDebugLog ? 'Ocultar Terminal (Logcat)' : 'Mostrar Terminal (Logcat)'}
              </button>

              <div className="border-t border-white/5 my-1" />

              <div className="grid grid-cols-2 gap-3">
                <button onClick={onExit} className="py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold text-xs uppercase tracking-widest transition-all">
                  Trocar Jogo
                </button>
                <button onClick={onExitToDashboard} className="py-4 rounded-2xl active:scale-95 font-bold text-xs uppercase tracking-widest transition-all border" style={{ color: '#F87171', borderColor: '#7F1D1D60', background: '#7F1D1D20' }}>
                  Sair Pro Menu
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'saves' && (
            <motion.div
              key="saves"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }} className="flex flex-col gap-3"
            >
              <p className="text-white/30 text-xs uppercase tracking-widest font-mono mb-1">Gerenciar Saves</p>

              <button onClick={() => onOpenSaveManager('save')} className="w-full py-5 rounded-2xl font-bold text-base text-white transition-all active:scale-95 flex items-center gap-4 px-6 border border-white/10 bg-white/5 hover:bg-white/10">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/40 border border-indigo-400/40 flex items-center justify-center text-2xl">💾</div>
                <div className="text-left">
                  <p className="font-black text-white">Salvar Estado</p>
                  <p className="text-white/40 text-xs font-normal">Gravar snapshot do jogo atual</p>
                </div>
              </button>

              <button onClick={() => onOpenSaveManager('load')} className="w-full py-5 rounded-2xl font-bold text-base text-white transition-all active:scale-95 flex items-center gap-4 px-6 border border-white/10 bg-white/5 hover:bg-white/10">
                <div className="w-12 h-12 rounded-xl bg-emerald-600/40 border border-emerald-400/40 flex items-center justify-center text-2xl">📂</div>
                <div className="text-left">
                  <p className="font-black text-white">Carregar Estado</p>
                  <p className="text-white/40 text-xs font-normal">Restaurar um save anterior</p>
                </div>
              </button>

              <div className="mt-2 p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-white/30 text-xs font-mono">💡 Saves são armazenados localmente e sobrevivem a atualizações do app.</p>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }} className="flex flex-col gap-3"
            >
              <p className="text-white/30 text-xs uppercase tracking-widest font-mono mb-1">Motor do Emulador</p>

              <button onClick={() => setShowConfig(true)} className="w-full py-5 rounded-2xl font-bold text-base text-white transition-all active:scale-95 flex items-center gap-4 px-6 border bg-white/5 hover:bg-white/10" style={{ borderColor: `${theme.accent}40` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${theme.accent}30`, border: `1px solid ${theme.accent}40` }}>⚙️</div>
                <div className="text-left">
                  <p className="font-black" style={{ color: theme.accent }}>Configurar Motor (Live)</p>
                  <p className="text-white/40 text-xs font-normal">Tweaks específicos do {theme.label}</p>
                </div>
              </button>

              <div className="rounded-2xl p-5 border border-white/5" style={{ background: `${theme.accent}08` }}>
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-mono mb-3">Info do Core</p>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <span className="text-white/30">Core</span>
                  <span className="text-white/70 font-mono">{tenant.coreFile.replace('_libretro_android.so', '')}</span>
                  <span className="text-white/30">Extensões</span>
                  <span className="text-white/70 font-mono">{tenant.extensions?.join(', ')}</span>
                  <span className="text-white/30">BIOS</span>
                  <span className="font-mono" style={{ color: tenant.biosRequired ? '#FBBF24' : '#4ADE80' }}>
                    {tenant.biosRequired ? '⚠️ Necessária' : '✅ Não necessária'}
                  </span>
                  {tenant.biosFile && (
                    <>
                      <span className="text-white/30">Arquivo</span>
                      <span className="text-white/50 font-mono text-[10px]">{tenant.biosFile}</span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }} />
    </motion.div>
  );
};


