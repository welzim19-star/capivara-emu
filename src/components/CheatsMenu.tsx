import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { capacitorEngine } from '../adapters/native/CapacitorEngineAdapter';
import { getCheatsForGame, CheatItem } from '../data/cheatsDb';

interface Props {
  tenantId: string;
  gameId: string;
  gameTitle?: string;
  onClose: () => void;
}

export const CheatsMenu: React.FC<Props> = ({ tenantId, gameTitle, onClose }) => {
  const [activeCheats, setActiveCheats] = useState<Set<number>>(new Set());
  const [customCheatCode, setCustomCheatCode] = useState('');

  const standardCheats: CheatItem[] = gameTitle ? getCheatsForGame(gameTitle) : [];

  const toggleCheat = (index: number, code: string) => {
    const next = new Set(activeCheats);
    const enabled = !next.has(index);
    if (enabled) next.add(index);
    else next.delete(index);
    
    setActiveCheats(next);
    capacitorEngine.applyCheat(index, enabled, code).catch(console.error);
  };

  const resetAll = () => {
    setActiveCheats(new Set());
    capacitorEngine.resetCheats().catch(console.error);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[130] backdrop-blur-md p-4">
      <div className="bg-zinc-950 border border-purple-900/50 p-6 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-purple-500 font-black text-xl tracking-wider uppercase">Game Genie</h2>
            <p className="text-white/40 text-[10px] font-mono uppercase">Memory Patching Engine</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white font-black text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
          {standardCheats.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white/50 mb-3">POPULAR CHEATS</h3>
              {standardCheats.map((c, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <div>
                    <p className="text-white text-sm font-bold">{c.name}</p>
                    {c.description && <p className="text-white/40 text-[10px] leading-tight mt-0.5">{c.description}</p>}
                    <p className="text-purple-400 font-mono text-[10px] mt-1">{c.code}</p>
                  </div>
                  <button 
                    onClick={() => toggleCheat(idx, c.code)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeCheats.has(idx) ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/50'}`}
                  >
                    {activeCheats.has(idx) ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-white/30 text-xs font-mono py-8">
              No popular cheats database for this core yet.
            </div>
          )}
          
          <div className="mt-6 space-y-2">
             <h3 className="text-xs font-bold text-white/50 mb-3">CUSTOM CODE</h3>
             <input 
                type="text" 
                placeholder="Ex: 7E0019 02" 
                value={customCheatCode}
                onChange={e => setCustomCheatCode(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white font-mono text-sm uppercase outline-none focus:border-purple-500 transition-colors"
             />
             <button 
                onClick={() => {
                  if (customCheatCode) {
                    toggleCheat(999, customCheatCode);
                  }
                }}
                className="w-full bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-400 font-bold text-xs py-3 rounded-lg transition-all"
             >
               INJECT CUSTOM CODE
             </button>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-between shrink-0">
          <button onClick={resetAll} className="px-5 py-2 rounded-lg bg-red-900/20 text-red-400 font-bold text-xs hover:bg-red-900/40 transition">RESET ALL</button>
          <button onClick={onClose} className="px-6 py-2 rounded-lg bg-zinc-800 text-white font-bold text-sm hover:bg-zinc-700 transition">Close</button>
        </div>
      </div>
    </motion.div>
  );
};
