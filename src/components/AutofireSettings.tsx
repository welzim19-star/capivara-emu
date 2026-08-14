import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TenantInfo } from '../types';
import { TENANT_THEMES, DEFAULT_THEME } from '../core/domain/TenantConfig';

interface Props {
  tenant: TenantInfo;
  onClose: () => void;
  onSave: (config: { buttonId: number; speed: number }) => void;
}

export const AutofireSettings: React.FC<Props> = ({ tenant, onClose, onSave }) => {
  const theme = TENANT_THEMES[tenant.id] || DEFAULT_THEME;
  const storageKey = `autofire_${tenant.id}`;
  
  const [config, setConfig] = useState({ buttonId: -1, speed: 15 });

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setConfig(JSON.parse(saved)); } catch(e) {}
    }
  }, [storageKey]);

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(config));
    onSave(config);
    onClose();
  };

  const buttons = [
    { id: -1, label: 'Desativado' },
    { id: 0, label: 'Botão B (Retro)' },
    { id: 1, label: 'Botão Y (Retro)' },
    { id: 8, label: 'Botão A (Retro)' },
    { id: 9, label: 'Botão X (Retro)' },
    { id: 10, label: 'L1' },
    { id: 11, label: 'R1' },
    { id: 12, label: 'L2' },
    { id: 13, label: 'R2' }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className={`w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col`}>
        
        <div className={`px-4 py-3 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0`}>
          <div>
            <h2 className={`text-lg font-black ${theme.accentColor}`}>Turbo Engine</h2>
            <p className="text-white/40 text-[9px] font-mono uppercase">Configuração de Autofire</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white font-black text-xl">✕</button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
            <label className={`block text-xs font-bold ${theme.accentColor} mb-2`}>Botão Alvo</label>
            <select 
              value={config.buttonId} 
              onChange={(e) => setConfig({ ...config, buttonId: Number(e.target.value) })}
              className="w-full bg-black/60 border border-white/10 rounded-lg p-2.5 text-white font-bold text-sm outline-none focus:border-current transition-colors"
              style={{ borderColor: config.buttonId !== -1 ? theme.accentColor : undefined }}
            >
              {buttons.map(b => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-white/40 mt-2 font-mono uppercase">Qual botão será metralhado automaticamente ao ser pressionado.</p>
          </div>

          <div className="bg-black/20 p-4 rounded-xl border border-white/5" style={{ opacity: config.buttonId === -1 ? 0.3 : 1, pointerEvents: config.buttonId === -1 ? 'none' : 'auto' }}>
            <label className="flex justify-between text-xs mb-2">
              <span className={`font-bold ${theme.accentColor}`}>Velocidade (Tiros por seg)</span>
              <span className="font-mono text-white/80 font-bold">{config.speed} Hz</span>
            </label>
            <input 
              type="range" 
              min={5} max={30} step={5} 
              value={config.speed} 
              onChange={(e) => setConfig({ ...config, speed: Number(e.target.value) })} 
              className="w-full h-1.5 accent-current" 
              style={{ color: theme.accentColor.replace('text-', '') }}
            />
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[9px] text-white/30">Lento (5)</span>
              <span className="text-[9px] text-white/30">Rápido (30)</span>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all">Cancelar</button>
            <button onClick={handleSave} className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-white transition-all shadow-lg hover:scale-105 active:scale-95" style={{ background: theme.accentColor }}>Ativar Turbo</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
