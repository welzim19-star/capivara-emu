import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TenantInfo } from '../types';
import { SecureStorageAdapter } from '../adapters/storage/SecureStorageAdapter';

interface Props {
  tenant: TenantInfo;
  onClose: () => void;
}

export const MemoryCardManager: React.FC<Props> = ({ tenant, onClose }) => {
  const [cards, setCards] = useState([
    { slot: 1 as 1 | 2, info: { exists: false, sizeMb: 0, path: '' } },
    { slot: 2 as 1 | 2, info: { exists: false, sizeMb: 0, path: '' } }
  ]);
  const [loading, setLoading] = useState(true);

  const storage = new SecureStorageAdapter();

  const loadCards = async () => {
    setLoading(true);
    const c1 = await storage.getMemoryCardInfo(tenant.id, 1);
    const c2 = await storage.getMemoryCardInfo(tenant.id, 2);
    setCards([
      { slot: 1, info: c1 },
      { slot: 2, info: c2 }
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadCards();
  }, [tenant.id]);

  const handleFormat = async (slot: 1 | 2) => {
    if (confirm(`Isso apagará todos os saves do Memory Card ${slot}. Continuar?`)) {
      setLoading(true);
      await storage.formatMemoryCard(tenant.id, slot);
      await loadCards();
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-[#00102a] border-2 border-blue-900/50 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(37,99,235,0.2)] flex flex-col">
        
        {/* Header (PS2 Browser Style) */}
        <div className="px-6 py-8 flex flex-col items-center justify-center bg-gradient-to-b from-blue-900/40 to-transparent relative overflow-hidden">
          {/* Faux PS2 Cubes BG */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
             <div className="absolute top-4 left-10 w-20 h-20 bg-blue-500/30 rotate-45 blur-xl"></div>
             <div className="absolute bottom-4 right-10 w-32 h-32 bg-indigo-500/30 rotate-12 blur-2xl"></div>
          </div>
          <h2 className="text-2xl font-black text-blue-400 font-sans tracking-widest z-10">BROWSER</h2>
          <p className="text-white/40 text-xs font-mono uppercase z-10">Memory Card Utility</p>
        </div>

        {/* Content */}
        <div className="p-8 flex gap-6 justify-center bg-black/40">
          {loading ? (
             <p className="text-blue-500 font-mono animate-pulse">Lendo Memory Cards...</p>
          ) : (
            cards.map((c) => (
              <div key={c.slot} className="w-64 bg-zinc-950 border border-blue-900/50 rounded-xl p-4 flex flex-col items-center shadow-lg relative overflow-hidden">
                <h3 className="text-white/70 font-bold text-sm mb-4">SLOT {c.slot}</h3>
                
                <div className={`w-24 h-32 rounded-lg border-2 flex flex-col items-center justify-center mb-4 transition-all ${c.info.exists ? 'border-blue-500 bg-blue-900/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-zinc-800 bg-zinc-900'}`}>
                  {c.info.exists ? (
                    <>
                      <div className="w-8 h-2 bg-blue-500/50 rounded-full mb-6"></div>
                      <span className="font-black text-2xl text-blue-400">8<span className="text-xs">MB</span></span>
                      <p className="text-[9px] text-white/50 mt-1 uppercase font-mono">Formatted</p>
                    </>
                  ) : (
                    <span className="text-white/20 text-xs font-bold uppercase text-center px-2">Unformatted</span>
                  )}
                </div>

                {c.info.exists ? (
                  <div className="w-full">
                    <p className="text-[10px] text-white/40 font-mono text-center mb-3 truncate px-2" title={c.info.path}>
                      {c.info.path.substring(c.info.path.lastIndexOf('/') + 1)}
                    </p>
                    <button onClick={() => handleFormat(c.slot)} className="w-full py-2 bg-red-900/20 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded-lg text-xs font-bold transition-all">
                      FORMAT
                    </button>
                  </div>
                ) : (
                  <button onClick={() => handleFormat(c.slot)} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                    CREATE & FORMAT
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 flex justify-between bg-black/60 border-t border-blue-900/30">
           <p className="text-blue-500/30 font-mono text-[10px] pt-1">Free Space: --</p>
           <button onClick={onClose} className="px-6 py-2 rounded-full text-white/70 font-bold hover:bg-white/10 transition-all text-sm">Voltar (O)</button>
        </div>
      </div>
    </motion.div>
  );
};
