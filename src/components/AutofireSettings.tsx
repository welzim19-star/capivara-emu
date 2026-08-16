import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TenantInfo } from '../types';

interface Props {
  tenant: TenantInfo;
  onClose: () => void;
  onSave: (config: { buttonId: number; speed: number }) => void;
}

export const AutofireSettings: React.FC<Props> = ({ tenant, onClose, onSave }) => {
  const storageKey = `capy_autofire_${tenant.id}`;
  const [config, setConfig] = useState({ buttonId: -1, speed: 15 });

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setConfig(JSON.parse(saved)); } catch (e) {}
    }
  }, [storageKey]);

  const handleSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(config));
    onSave(config);
    onClose();
  };

  const buttons = [
    { id: -1, label: 'Desativado (Normal)' },
    { id: 0, label: 'Botão B / Cross (Ação)' },
    { id: 1, label: 'Botão Y / Square (Ataque)' },
    { id: 8, label: 'Botão A / Circle (Especial)' },
    { id: 9, label: 'Botão X / Triangle (Tiro)' },
    { id: 10, label: 'L1 (Gatilho Esquerdo)' },
    { id: 11, label: 'R1 (Gatilho Direito)' },
    { id: 12, label: 'L2 (Turbo Extra)' },
    { id: 13, label: 'R2 (Turbo Extra)' }
  ];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="w-full max-h-[95vh] overflow-y-auto max-w-md bg-zinc-950 border-2 border-amber-500/40 rounded-3xl shadow-2xl flex flex-col"
          style={{ boxShadow: '0 0 30px -5px rgba(245, 158, 11, 0.4)' }}
        >
          
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-amber-500/20 flex justify-between items-center bg-black/50 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 flex items-center justify-center text-black font-black text-lg">
                ⚡
              </div>
              <div>
                <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 uppercase tracking-wide">
                  Turbo Engine Gold
                </h2>
                <p className="text-amber-400/80 text-[10px] font-mono uppercase">Configuração de Autofire • {tenant.name}</p>
              </div>
            </div>

            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-lg bg-zinc-900 border border-amber-500/30 text-amber-400 font-black transition-all flex items-center justify-center hover:scale-105"
            >
              ✕
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 flex-1 space-y-5 overflow-y-auto custom-scrollbar">
            
            {/* Target Button Selector */}
            <div className="bg-zinc-900/80 p-4 rounded-2xl border border-white/10 space-y-2">
              <label className="block text-xs font-bold text-amber-400 uppercase font-mono">Botão de Disparo Turbo</label>
              <select 
                value={config.buttonId} 
                onChange={(e) => setConfig({ ...config, buttonId: Number(e.target.value) })}
                className="w-full bg-black border border-amber-500/40 rounded-xl p-3 text-white font-bold text-xs outline-none focus:border-amber-400 transition-colors"
              >
                {buttons.map(b => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-400 font-mono">
                Selecione qual botão responderá com repetição automática contínua.
              </p>
            </div>

            {/* Speed Slider */}
            <div 
              className="bg-zinc-900/80 p-4 rounded-2xl border border-white/10 space-y-3 transition-opacity"
              style={{ opacity: config.buttonId === -1 ? 0.4 : 1, pointerEvents: config.buttonId === -1 ? 'none' : 'auto' }}
            >
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-bold text-amber-400 uppercase">Velocidade de Disparo</span>
                <span className="font-black text-black bg-amber-400 px-2.5 py-0.5 rounded-full text-xs">{config.speed} Hz</span>
              </div>

              <input 
                type="range" 
                min={5} 
                max={30} 
                step={5} 
                value={config.speed} 
                onChange={(e) => setConfig({ ...config, speed: Number(e.target.value) })} 
                className="w-full h-2 accent-amber-400 rounded-lg cursor-pointer bg-zinc-800" 
              />

              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>5 Hz (Modarado)</span>
                <span>15 Hz (Padrão)</span>
                <span>30 Hz (Ultra Turbo)</span>
              </div>
            </div>

            {/* Dynamic Hz Speed Preview Visualizer */}
            {config.buttonId !== -1 && (
              <div className="bg-black/60 p-3 rounded-xl border border-amber-500/30 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Frequência em execução:</span>
                <div className="flex space-x-1 items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" style={{ animationDuration: `${1 / config.speed}s` }}></span>
                  <span className="text-amber-300 font-bold">{config.speed} Disparos / Seg</span>
                </div>
              </div>
            )}

            {/* Bottom Buttons */}
            <div className="flex gap-3 pt-2">
              <button 
                onClick={onClose} 
                className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase font-mono border border-white/10 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                className="flex-1 py-3 rounded-xl font-extrabold text-xs uppercase font-mono text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-xl shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all"
              >
                Ativar Turbo Gold
              </button>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
