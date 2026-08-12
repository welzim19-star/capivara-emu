import re

with open("src/components/InputMapper.tsx", "r") as f:
    content = f.read()

replacement = """import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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

export const InputMapper: React.FC<{ coreName: string, onClose: () => void }> = ({ coreName, onClose }) => {
  const [map, setMap] = useState<Record<number, number>>(defaultMap);
  const [listeningFor, setListeningFor] = useState<number | null>(null);

  const storageKey = `gamepad_map_${coreName}`;

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
      window.dispatchEvent(new CustomEvent('gamepad_map_updated', { detail: { coreName } }));
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
  }, [listeningFor, map, storageKey, coreName]);

  const resetMap = () => {
    setMap(defaultMap);
    localStorage.setItem(storageKey, JSON.stringify(defaultMap));
    window.dispatchEvent(new CustomEvent('gamepad_map_updated', { detail: { coreName } }));
  };

  const getBtn = (id: number) => {
    const entry = Object.entries(map).find(([_, rId]) => rId === id);
    return entry ? entry[0].replace('axis_', 'Ax') : '?';
  };

  const renderButton = (id: number, customClass: string, label: string) => {
    const isListening = listeningFor === id;
    const isMapped = Object.values(map).includes(id);
    return (
      <button 
        onClick={() => setListeningFor(listeningFor === id ? null : id)}
        className={`absolute flex flex-col items-center justify-center transition-all ${customClass} ${isListening ? 'ring-4 ring-cyan-500 bg-cyan-600 shadow-[0_0_20px_#06b6d4] animate-pulse z-10 scale-110' : isMapped ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-red-900 hover:bg-red-800'}`}
      >
        <span className="text-[10px] font-bold text-white/50 mb-0.5 pointer-events-none">{label}</span>
        <span className="text-sm font-black text-white pointer-events-none">{isListening ? '...' : getBtn(id)}</span>
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-md"
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-3xl shadow-2xl flex flex-col items-center relative h-full max-h-[90vh]">
        <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Gamepad Visual Mapper</h2>
        <p className="text-cyan-400 mb-8 font-mono text-sm text-center">
          {listeningFor !== null 
            ? 'Pressione uma tecla/botão no seu CONTROLE FÍSICO agora...' 
            : 'Clique no botão virtual abaixo para remapear'}
        </p>

        {/* Visual Gamepad Container */}
        <div className="relative w-[600px] h-[300px] bg-zinc-800/50 rounded-[100px] border-4 border-zinc-700/50 shadow-inner overflow-hidden shrink-0 scale-75 sm:scale-100">
          {/* L2 / R2 Triggers */}
          {renderButton(12, 'top-2 left-24 w-20 h-10 rounded-xl', 'L2')}
          {renderButton(13, 'top-2 right-24 w-20 h-10 rounded-xl', 'R2')}
          
          {/* L1 / R1 Bumpers */}
          {renderButton(10, 'top-14 left-24 w-20 h-8 rounded-b-xl', 'L1')}
          {renderButton(11, 'top-14 right-24 w-20 h-8 rounded-b-xl', 'R1')}

          {/* D-PAD (Cross) */}
          <div className="absolute top-[120px] left-[80px] w-32 h-32">
            {renderButton(4, 'top-0 left-1/2 -translate-x-1/2 w-10 h-12 rounded-t-lg', 'Up')}
            {renderButton(5, 'bottom-0 left-1/2 -translate-x-1/2 w-10 h-12 rounded-b-lg', 'Down')}
            {renderButton(6, 'left-0 top-1/2 -translate-y-1/2 w-12 h-10 rounded-l-lg', 'Left')}
            {renderButton(7, 'right-0 top-1/2 -translate-y-1/2 w-12 h-10 rounded-r-lg', 'Right')}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-zinc-700 pointer-events-none" />
          </div>

          {/* Action Buttons (Diamond) */}
          <div className="absolute top-[120px] right-[80px] w-32 h-32">
            {renderButton(9, 'top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full', 'Y/△')}
            {renderButton(0, 'bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full', 'A/✖')}
            {renderButton(1, 'left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full', 'X/■')}
            {renderButton(8, 'right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full', 'B/◯')}
          </div>

          {/* Start / Select */}
          {renderButton(2, 'top-[160px] left-[240px] w-14 h-8 rounded-full', 'Select')}
          {renderButton(3, 'top-[160px] right-[240px] w-14 h-8 rounded-full', 'Start')}

          {/* L3 / R3 Analogs */}
          {renderButton(14, 'bottom-10 left-[220px] w-16 h-16 rounded-full border-2 border-zinc-600', 'L3')}
          {renderButton(15, 'bottom-10 right-[220px] w-16 h-16 rounded-full border-2 border-zinc-600', 'R3')}
        </div>

        <div className="flex-1" />

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
"""

with open("src/components/InputMapper.tsx", "w") as f:
    f.write(replacement)
