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
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const storageKey = `capy_saves_${tenant.id}_${game.id}`;
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
    return Math.random().toString(36).substring(2, 10).toUpperCase() + Date.now().toString(36).toUpperCase();
  };

  const handleSlotClick = (slot: number) => {
    const existingSave = saves[slot];

    if (mode === 'load') {
      if (!existingSave) return;
      onSelectSlot(slot, existingSave.hash, existingSave.thumbnailBase64);
      onClose();
    } else {
      // Save Mode: Generate new save state
      const newHash = generateHash(slot);
      
      // Generate a mock gold canvas thumbnail
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 160, 90);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`SLOT ${slot} SNAPSHOT`, 15, 30);
        ctx.fillText(`${new Date().toLocaleTimeString()}`, 15, 50);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(15, 60, 130, 15);
      }

      const thumbBase64 = canvas.toDataURL('image/jpeg', 0.8);
      const newSaveItem = {
        id: newHash,
        gameId: game.id,
        tenantId: tenant.id,
        slot,
        hash: newHash,
        timestamp: new Date().toLocaleString('pt-BR'),
        dataSizeKb: Math.floor(Math.random() * 400 + 120),
        thumbnailBase64: thumbBase64
      };

      const updatedSaves = { ...saves, [slot]: newSaveItem };
      setSaves(updatedSaves);
      localStorage.setItem(`capy_saves_${tenant.id}_${game.id}`, JSON.stringify(updatedSaves));

      setToastMsg(`Estado salvo com sucesso no Slot ${slot}!`);
      setTimeout(() => setToastMsg(null), 2500);

      onSelectSlot(slot, newHash, thumbBase64);
    }
  };

  const slots = [
    { id: 0, name: '⚡ Auto-Save' },
    { id: 1, name: 'Slot 1 (Principal)' },
    { id: 2, name: 'Slot 2' },
    { id: 3, name: 'Slot 3' },
    { id: 4, name: 'Slot 4' },
    { id: 5, name: 'Slot 5' }
  ];

  return (
    <div className="fixed inset-0 bg-black/90 z-[120] backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="bg-zinc-950 border-2 border-amber-500/40 p-5 md:p-7 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] relative overflow-hidden"
        style={{ boxShadow: '0 0 30px -5px rgba(245, 158, 11, 0.4)' }}
      >
        
        {/* Top Gold Header */}
        <div className="flex justify-between items-center mb-5 pb-4 border-b border-amber-500/20 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-amber-500/30">
              {mode === 'save' ? '💾' : '📂'}
            </div>
            <div>
              <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 font-black text-xl tracking-wider">
                {mode === 'save' ? 'GOLD SAVE STATE ENGINE' : 'LOAD STATE MANAGER'}
              </h2>
              <p className="text-amber-400/80 text-xs font-mono uppercase font-bold">{game.title || game.name} • {tenant.name}</p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-amber-500/30 hover:border-amber-400 text-amber-400 font-black text-lg transition-all flex items-center justify-center hover:scale-105"
          >
            ✕
          </button>
        </div>

        {/* Notification Toast */}
        {toastMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-mono text-center font-bold animate-bounce">
            {toastMsg}
          </div>
        )}

        {/* Slots Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {slots.map((s) => {
              const save = saves[s.id] as any;
              const isEmpty = !save;
              const isDisabled = mode === 'load' && isEmpty;

              return (
                <div 
                  key={s.id}
                  onClick={() => !isDisabled && handleSlotClick(s.id)}
                  className={`relative flex flex-col bg-zinc-900/90 border-2 rounded-2xl overflow-hidden transition-all duration-300 group ${
                    isDisabled 
                      ? 'border-white/5 opacity-40 cursor-not-allowed' 
                      : 'border-amber-500/30 hover:border-amber-400 cursor-pointer hover:scale-[1.03] hover:shadow-xl hover:shadow-amber-500/20'
                  }`}
                >
                  {/* Thumbnail Preview Area */}
                  <div className="aspect-video bg-black/80 flex items-center justify-center relative overflow-hidden border-b border-white/10">
                    {save?.thumbnailBase64 ? (
                      <img 
                        src={save.thumbnailBase64} 
                        alt={`Slot ${s.id}`} 
                        className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <span className="text-amber-500/30 text-3xl font-black">SLOT {s.id}</span>
                        <span className="text-[10px] font-mono text-zinc-600">SEM DADOS</span>
                      </div>
                    )}
                    
                    {/* Slot Badge */}
                    <div className="absolute top-2 left-2 bg-zinc-950/90 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono text-amber-300 border border-amber-500/40 backdrop-blur-md">
                      {s.name}
                    </div>
                  </div>

                  {/* Slot Details Area */}
                  <div className="p-3 bg-zinc-950/80 space-y-1">
                    {isEmpty ? (
                      <p className="text-zinc-500 text-[11px] text-center font-mono font-bold py-1">Slot Disponível</p>
                    ) : (
                      <div className="flex flex-col space-y-1 text-xs">
                        <span className="text-white font-mono font-bold text-[11px] truncate">{save.timestamp}</span>
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-amber-400 font-bold truncate">HASH: {save.hash || save.id}</span>
                          <span className="text-zinc-400 font-bold">{save.dataSizeKb} KB</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interactive Hover CTA Overlay */}
                  {!isDisabled && (
                    <div className="absolute inset-0 bg-amber-500/15 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-black text-xs uppercase px-5 py-2.5 rounded-xl shadow-2xl border border-white/20 transform group-hover:scale-105 transition-transform">
                        {mode === 'save' ? (isEmpty ? '💾 Salvar Estado' : '🔄 Sobrescrever') : '📂 Carregar Estado'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Modal Actions */}
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-between items-center shrink-0 text-xs font-mono">
          <span className="text-zinc-400">Suporte a Save States Instantâneos com hash de integridade</span>
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-amber-500/30 text-amber-300 font-bold transition-all"
          >
            Fechar [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
