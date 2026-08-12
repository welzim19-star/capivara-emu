import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TENANT_GAMEPAD_LAYOUTS, PhysicalGamepadLayout } from '../core/domain/TenantConfig';

const defaultMap = {
  0: 0, 1: 8, 2: 1, 3: 9, 4: 10, 5: 11, 6: 12, 7: 13, 8: 2, 9: 3, 12: 4, 13: 5, 14: 6, 15: 7,
  'axis_0_-1': 6, 'axis_0_1': 7, 'axis_1_-1': 4, 'axis_1_1': 5
};

const RETRO_BUTTONS = [
  { id: 12, label: 'L2 (Gatilho)' }, { id: 13, label: 'R2 (Fast-FWD)' },
  { id: 10, label: 'L1' }, { id: 11, label: 'R1' },
  { id: 4, label: 'Up' }, { id: 5, label: 'Down' }, { id: 6, label: 'Left' }, { id: 7, label: 'Right' },
  { id: 2, label: 'Select' }, { id: 3, label: 'Start' },
  { id: 9, label: 'Top (Y/△)' }, { id: 8, label: 'Right (B/◯)' }, { id: 0, label: 'Bottom (A/✖)' }, { id: 1, label: 'Left (X/■)' },
  { id: 14, label: 'L3 (Click Esq)' }, { id: 15, label: 'R3 (Click Dir)' }
];

export const InputMapper: React.FC<{ coreName: string, onClose: () => void }> = ({ coreName: tenantId, onClose }) => {
  const [map, setMap] = useState<Record<number, number>>(defaultMap);
  const [listeningFor, setListeningFor] = useState<number | null>(null);

  const storageKey = `gamepad_map_${tenantId}`;

  useEffect(() => {
    const savedMapStr = localStorage.getItem(storageKey);
    if (savedMapStr) {
      setMap(JSON.parse(savedMapStr));
    } else {
      setMap(defaultMap);
    }
  }, [storageKey]);

  useEffect(() => {
    if (listeningFor === null) return;
    let rafId: number;

    const updateMapping = (physicalKey: any) => {
      const newMap = { ...map } as any;
      Object.keys(newMap).forEach(key => {
        if (newMap[key] === listeningFor) delete newMap[key];
      });
      newMap[physicalKey] = listeningFor;
      setMap(newMap);
      localStorage.setItem(storageKey, JSON.stringify(newMap));
      window.dispatchEvent(new CustomEvent('gamepad_map_updated', { detail: { coreName: tenantId } }));
      setListeningFor(null);
    };

    const handleRawButton = (e: any) => {
      const idx = e.detail?.buttonIndex;
      if (idx !== undefined && idx !== -1) updateMapping(idx);
    };
    const handleRawAxis = (e: any) => {
      const axisId = e.detail?.axisId;
      if (axisId) updateMapping(axisId);
    };

    window.addEventListener('gamepad_button_raw', handleRawButton);
    window.addEventListener('gamepad_axis_raw', handleRawAxis);

    const loop = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of gamepads) {
        if (!gp) continue;
        gp.buttons.forEach((btn, idx) => {
          if (btn.pressed || btn.value > 0.5) window.dispatchEvent(new CustomEvent('gamepad_button_raw', { detail: { buttonIndex: idx } }));
        });
        const lx = gp.axes[0] || 0; const ly = gp.axes[1] || 0;
        const rx = gp.axes[2] || 0; const ry = gp.axes[3] || 0;
        const checkAxis = (key: string, cond: boolean) => { if(cond) window.dispatchEvent(new CustomEvent('gamepad_axis_raw', { detail: { axisId: key } })); };
        const threshold = 0.5;
        checkAxis('axis_0_-1', lx < -threshold); checkAxis('axis_0_1',  lx > threshold);
        checkAxis('axis_1_-1', ly < -threshold); checkAxis('axis_1_1',  ly > threshold);
        checkAxis('axis_2_-1', rx < -threshold); checkAxis('axis_2_1',  rx > threshold);
        checkAxis('axis_3_-1', ry < -threshold); checkAxis('axis_3_1',  ry > threshold);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('gamepad_button_raw', handleRawButton);
      window.removeEventListener('gamepad_axis_raw', handleRawAxis);
      cancelAnimationFrame(rafId);
    };
  }, [listeningFor, map, storageKey, tenantId]);

  const resetMap = () => {
    setMap(defaultMap);
    localStorage.setItem(storageKey, JSON.stringify(defaultMap));
    window.dispatchEvent(new CustomEvent('gamepad_map_updated', { detail: { coreName: tenantId } }));
  };

  const getBtn = (id: number) => {
    const entry = Object.entries(map).find(([_, rId]) => rId === id);
    return entry ? entry[0].replace('axis_', 'Ax') : '?';
  };

  const layout: PhysicalGamepadLayout = TENANT_GAMEPAD_LAYOUTS[tenantId] || TENANT_GAMEPAD_LAYOUTS['PS2_NETHERSX2'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-md"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-3xl shadow-2xl flex flex-col items-center relative h-full max-h-[90vh]">
        
        {/* Header Controls */}
        <div className="w-full flex items-center justify-between mb-4">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-all shadow-md flex items-center gap-2 border border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Voltar
          </button>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-wider text-center flex-1 ml-[-80px]">Mapear Controle</h2>
        </div>
        <p className="text-cyan-400 mb-8 font-mono text-sm text-center">
          {listeningFor !== null 
            ? 'Pressione uma tecla/botão no seu CONTROLE FÍSICO agora...' 
            : 'Clique no botão virtual abaixo para remapear'}
        </p>

        {/* Visual Gamepad Container - Dynamic Tenant Config */}
        <div className="w-full flex-1 flex items-start justify-center overflow-y-auto overflow-x-hidden min-h-[180px] pt-4">
          <div 
            className="relative bg-zinc-800/50 rounded-[100px] border-4 border-zinc-700/50 shadow-inner shrink-0 transform origin-top"
            style={{ 
              width: layout.width, 
              height: layout.height, 
              transform: `scale(${layout.scale})`,
              marginBottom: `-${layout.height * (1 - layout.scale)}px` 
            }}
          >
            {layout.elements.map(el => {
              const isListening = listeningFor === el.id;
              const isMapped = Object.values(map).includes(el.id);
              return (
                <button 
                  key={el.id}
                  onClick={() => setListeningFor(listeningFor === el.id ? null : el.id)}
                  className={`absolute flex flex-col items-center justify-center transition-all ${el.cssClasses} ${isListening ? 'ring-4 ring-cyan-500 bg-cyan-600 shadow-[0_0_20px_#06b6d4] animate-pulse z-10 scale-110' : isMapped ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-red-900 hover:bg-red-800'}`}
                  style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
                >
                  <span className="text-[10px] font-bold text-white/50 mb-0.5 pointer-events-none">{el.label}</span>
                  <span className="text-sm font-black text-white pointer-events-none">{isListening ? '...' : getBtn(el.id)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-center w-full mt-6 pt-4 border-t border-zinc-800">
          <button onClick={resetMap} className="text-red-400 hover:text-red-300 font-bold text-sm transition-colors">
            Restaurar Original
          </button>
          <button onClick={onClose} className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-black hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all">
            Salvar e Sair
          </button>
        </div>
      </div>
    </motion.div>
  );
};
