import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BiosEntity } from '../core/domain/BiosEntity';
import { BiosManagerService } from '../services/BiosManagerService';
import { Cpu, CheckCircle2, AlertTriangle, UploadCloud, Trash2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const BiosManagerModal: React.FC<Props> = ({ onClose }) => {
  const [registry, setRegistry] = useState<BiosEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeBiosTarget, setActiveBiosTarget] = useState<BiosEntity | null>(null);

  const loadBiosStatus = async () => {
    setLoading(true);
    const updated = await BiosManagerService.checkInstalledBios();
    setRegistry(updated);
    setLoading(false);
  };

  useEffect(() => {
    loadBiosStatus();
  }, []);

  const handleImportClick = (bios: BiosEntity) => {
    setActiveBiosTarget(bios);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeBiosTarget) {
      // Validação superficial por nome (Aviso, não é block)
      if (file.name.toLowerCase() !== activeBiosTarget.filename.toLowerCase()) {
        alert(`Atenção: O arquivo esperado é ${activeBiosTarget.filename}. Você selecionou ${file.name}. Verifique se é a BIOS correta.`);
      }

      setLoading(true);
      await BiosManagerService.importBios(file, activeBiosTarget);
      await loadBiosStatus();
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // reset
    }
  };

  const handleDelete = async (bios: BiosEntity) => {
    if (confirm(`Deletar a BIOS ${bios.filename}? O emulador pode parar de funcionar.`)) {
      setLoading(true);
      await BiosManagerService.deleteBios(bios);
      await loadBiosStatus();
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".bin,.zip,.rom" />

      <div className="w-full max-w-3xl bg-zinc-950 border-2 border-emerald-900/50 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.1)] flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-emerald-900/30 flex justify-between items-center bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <Cpu className="text-emerald-500 w-6 h-6" />
            <div>
              <h2 className="text-xl font-black text-emerald-400 font-mono tracking-widest">FIRMWARE / BIOS MANAGER</h2>
              <p className="text-white/40 text-[10px] font-mono uppercase">Secure Data Vault Integration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white font-black text-xl">✕</button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {loading && <p className="text-emerald-500 font-mono text-center animate-pulse py-10">ANALYZING SECURE VAULT...</p>}
          
          {!loading && registry.map((bios) => (
            <div key={bios.id} className={`flex flex-col md:flex-row items-center justify-between p-4 rounded-xl border ${bios.isInstalled ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-red-950/10 border-red-900/30'} transition-all`}>
              
              {/* Info */}
              <div className="flex items-start gap-4 mb-4 md:mb-0">
                <div className={`mt-1 p-2 rounded-lg ${bios.isInstalled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {bios.isInstalled ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">{bios.tenantId.replace('_', ' ')}</h3>
                  <p className="text-white/50 text-xs mt-0.5">{bios.description}</p>
                  <p className="text-white/30 font-mono text-[10px] mt-1">Expected: {bios.filename} ({bios.region})</p>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full md:w-auto flex gap-2">
                {bios.isInstalled ? (
                  <>
                    <span className="px-4 py-2 bg-emerald-900/50 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 flex-1 md:flex-none text-center">
                      INSTALLED
                    </span>
                    <button onClick={() => handleDelete(bios)} className="p-2 bg-red-900/30 hover:bg-red-900 text-red-500 hover:text-white rounded-lg border border-red-500/20 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => handleImportClick(bios)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg border border-white/10 transition-all">
                    <UploadCloud size={16} />
                    IMPORT BIOS
                  </button>
                )}
              </div>

            </div>
          ))}

          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/20 rounded-xl">
            <p className="text-blue-400 text-xs font-mono">
              [LENS 1 - ISOLATION]: BIOS files are stored securely in App Data (Directory.Data). They are not visible to other Android applications or the user's gallery. Missing BIOS will result in critical core failures for PS1, PS2, and FBNeo.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
