import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface PS2SettingsViewProps {
  onClose: () => void;
  onSave: (config: any) => void;
}

export const PS2SettingsView: React.FC<PS2SettingsViewProps> = ({ onClose, onSave }) => {
  const [eeCycleRate, setEeCycleRate] = useState(100);
  const [vuCycleStealing, setVuCycleStealing] = useState(0);
  const [vulkanEnabled, setVulkanEnabled] = useState(true);
  const [resMultiplier, setResMultiplier] = useState(2);
  const [texturePreload, setTexturePreload] = useState('Full');
  const [affinityControl, setAffinityControl] = useState(true);

  const handleSave = () => {
    const configMatrix = {
      play_res_multi: resMultiplier,
      capivara_ee_cycle_rate: eeCycleRate,
      capivara_vu_stealing: vuCycleStealing,
      capivara_vulkan_active: vulkanEnabled,
      capivara_texture_preload: texturePreload,
      capivara_affinity_control: affinityControl
    };
    onSave(configMatrix);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-zinc-950 border border-blue-900/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-blue-900/20">
          <div>
            <h2 className="text-xl font-black text-blue-400">PlayStation 2 Engine</h2>
            <p className="text-white/40 text-[10px] font-mono">Advanced JIT & Rendering Settings</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white font-black text-xl">✕</button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          
          {/* SYSTEM SETTINGS */}
          <div className="space-y-5">
            <h3 className="text-white font-bold text-sm uppercase tracking-widest border-b border-white/10 pb-2">Sistema (Underclock)</h3>
            
            <div>
              <label className="flex justify-between text-xs text-white/70 mb-2">
                <span>EE Cycle Rate (Underclock)</span>
                <span className="font-mono text-blue-400">{eeCycleRate}%</span>
              </label>
              <input type="range" min="50" max="300" step="10" value={eeCycleRate} onChange={(e) => setEeCycleRate(Number(e.target.value))} className="w-full accent-blue-500" />
              <p className="text-[9px] text-white/30 mt-1">Valores baixos (50-75%) pulam instruções MIPS. Ajuda muito em jogos pesados no mobile.</p>
            </div>

            <div>
              <label className="flex justify-between text-xs text-white/70 mb-2">
                <span>VU Cycle Stealing</span>
                <span className="font-mono text-blue-400">{vuCycleStealing} (Max 3)</span>
              </label>
              <input type="range" min="0" max="3" step="1" value={vuCycleStealing} onChange={(e) => setVuCycleStealing(Number(e.target.value))} className="w-full accent-blue-500" />
              <p className="text-[9px] text-white/30 mt-1">Rouba ciclos da Vector Unit. Pode causar lag visual, mas aumenta muito o FPS real.</p>
            </div>

            <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
              <div>
                <p className="text-xs text-white/70 font-bold">Affinity Control (ARM64)</p>
                <p className="text-[9px] text-white/30">Força as threads pesadas nos núcleos Cortex-X.</p>
              </div>
              <button onClick={() => setAffinityControl(!affinityControl)} className={`w-12 h-6 rounded-full flex items-center px-1 transition-all ${affinityControl ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-all ${affinityControl ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* GRAPHICS SETTINGS */}
          <div className="space-y-5">
            <h3 className="text-white font-bold text-sm uppercase tracking-widest border-b border-white/10 pb-2">Gráficos (Hardware)</h3>

            <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
              <div>
                <p className="text-xs text-white/70 font-bold">Vulkan Renderer</p>
                <p className="text-[9px] text-white/30">Usa a GPU nativamente. Desative caso ocorram glitches.</p>
              </div>
              <button onClick={() => setVulkanEnabled(!vulkanEnabled)} className={`w-12 h-6 rounded-full flex items-center px-1 transition-all ${vulkanEnabled ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-all ${vulkanEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div>
              <label className="flex justify-between text-xs text-white/70 mb-2">
                <span>Multiplicador de Resolução</span>
                <span className="font-mono text-blue-400">{resMultiplier}x</span>
              </label>
              <input type="range" min="1" max="4" step="1" value={resMultiplier} onChange={(e) => setResMultiplier(Number(e.target.value))} className="w-full accent-blue-500" />
              <p className="text-[9px] text-white/30 mt-1">1x = Nativo (Rápido). 2x = 720p HD. 3x = 1080p FHD.</p>
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-2">Texture Preloading</label>
              <div className="flex bg-white/5 rounded-lg border border-white/5 p-1">
                {['None', 'Partial', 'Full'].map((mode) => (
                  <button key={mode} onClick={() => setTexturePreload(mode)} className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${texturePreload === mode ? 'bg-blue-600 text-white shadow-md' : 'text-white/40 hover:bg-white/10'}`}>
                    {mode}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-white/30 mt-1">Evita travamentos ("stutters") ao carregar novas texturas, mas consome mais VRAM.</p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-black/40">
          <button onClick={onClose} className="px-6 py-2 rounded-xl text-white/70 font-bold hover:bg-white/10 transition-all text-sm">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all text-sm shadow-[0_0_15px_rgba(37,99,235,0.5)]">Salvar Engine</button>
        </div>
      </div>
    </motion.div>
  );
};
