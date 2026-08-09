import React, { useState, useEffect } from 'react';
import { SaveStateItem, GameItem, TenantInfo } from '../types';

interface Props {
  tenant: TenantInfo;
  game: GameItem;
  mode: 'save' | 'load';
  onSelectSlot: (slot: number, hash: string, thumbnail?: string) => void;
  onClose: () => void;
}

export const SaveStateModal: React.FC<Props> = ({ tenant, game, mode, onSelectSlot, onClose }) => {
  const [saves, setSaves] = useState<Record<number, SaveStateItem>>({});
  
  useEffect(() => {
    // Load save metadata from localStorage for this specific game
    const storageKey = `saves_${tenant.id}_${game.id}`;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        setSaves(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to parse save metadata", e);
      }
    }
  }, [tenant.id, game.id]);

  const generateHash = (slot: number) => {
    // Basic idempotency hash simulation (In production, use WebCrypto API)
    return btoa(`${game.id}_${slot}_${Date.now()}`).substring(0, 16);
  };

  const handleSlotClick = (slot: number) => {
    const existingSave = saves[slot];
    
    if (mode === 'load') {
      if (!existingSave) return; // Can't load empty slot
      onSelectSlot(slot, existingSave.hash, existingSave.thumbnailBase64);
    } else {
      // Save Mode: Generate new hash and overwrite/create
      const newHash = generateHash(slot);
      onSelectSlot(slot, newHash);
    }
  };

  const slots = [
    { id: 0, name: 'Auto-Save' },
    { id: 1, name: 'Slot 1' },
    { id: 2, name: 'Slot 2' },
    { id: 3, name: 'Slot 3' },
    { id: 4, name: 'Slot 4' },
    { id: 5, name: 'Slot 5' }
  ];

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[120] backdrop-blur-md">
      <div className="bg-zinc-950 border border-indigo-900/50 p-6 rounded-2xl w-[90%] max-w-4xl shadow-2xl flex flex-col h-[85%] max-h-[700px]">
        
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-white font-black text-2xl tracking-wider">
              {mode === 'save' ? '💾 SAVE STATE' : '📂 LOAD STATE'}
            </h2>
            <p className="text-indigo-400 text-xs font-mono uppercase">{game.title}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white font-black text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {slots.map((s) => {
              const save = saves[s.id];
              const isEmpty = !save;
              
              // If loading and empty, disable button
              const isDisabled = mode === 'load' && isEmpty;

              return (
                <div 
                  key={s.id}
                  onClick={() => !isDisabled && handleSlotClick(s.id)}
                  className={`relative flex flex-col bg-zinc-900 border rounded-xl overflow-hidden transition-all duration-200
                    ${isDisabled 
                      ? 'border-white/5 opacity-50 cursor-not-allowed' 
                      : 'border-white/20 hover:border-indigo-500 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/20'
                    }
                  `}
                >
                  {/* Thumbnail Area */}
                  <div className="aspect-video bg-black flex items-center justify-center relative">
                    {save?.thumbnailBase64 ? (
                      <img src={save.thumbnailBase64} alt={`Slot ${s.id}`} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white/20 text-4xl font-black">NO DATA</span>
                    )}
                    
                    {/* Badge */}
                    <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10 backdrop-blur-sm">
                      {s.name}
                    </div>
                  </div>

                  {/* Info Area */}
                  <div className="p-3 bg-zinc-900 border-t border-white/5">
                    {isEmpty ? (
                      <p className="text-white/40 text-xs text-center font-bold py-2">Vazio</p>
                    ) : (
                      <div className="flex flex-col space-y-1">
                        <span className="text-white/90 text-sm font-bold truncate">{save.timestamp}</span>
                        <div className="flex justify-between items-center">
                          <span className="text-indigo-400 text-[10px] font-mono">HASH: {save.hash}</span>
                          <span className="text-white/40 text-[10px] font-mono">{save.dataSizeKb}KB</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Hover Overlay */}
                  {!isDisabled && (
                    <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="bg-indigo-600 text-white font-black px-4 py-2 rounded-lg shadow-xl border border-indigo-400">
                        {mode === 'save' ? (isEmpty ? 'CRIAR SAVE' : 'OVERWRITE') : 'CARREGAR'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end shrink-0">
          <button onClick={onClose} className="px-6 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition">Voltar</button>
        </div>
      </div>
    </div>
  );
};
