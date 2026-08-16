import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { capacitorEngine } from '../adapters/native/CapacitorEngineAdapter';

export const CastButton: React.FC = () => {
  const [isCasting, setIsCasting] = useState(false);
  const [ipAddress, setIpAddress] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const toggleCast = async () => {
    if (!isCasting) {
      const ip = await capacitorEngine.getLocalIP();
      setIpAddress(ip);
      await capacitorEngine.startCasting();
      setIsCasting(true);
      setShowModal(true);
    } else {
      await capacitorEngine.stopCasting();
      setIsCasting(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <button 
        onClick={toggleCast}
        tabIndex={0}
        className={`fixed top-4 right-20 z-[60] w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all border-2 ${isCasting ? 'bg-cyan-500 text-black border-cyan-300 animate-pulse' : 'bg-black/50 text-white border-white/10 hover:bg-black hover:border-cyan-500'}`}
        title="Cast para TV"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
          <polyline points="17 2 12 7 7 2"></polyline>
        </svg>
      </button>

      <AnimatePresence>
        {showModal && isCasting && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }} 
            className="fixed top-20 right-4 z-[100] bg-zinc-900 border border-cyan-500/50 p-6 rounded-2xl shadow-2xl max-w-sm w-full"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-cyan-400 font-bold text-lg">📡 Transmissão Ativa</h3>
              <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white focus:text-white" tabIndex={0}>✕</button>
            </div>
            <p className="text-white/70 text-sm mb-4">
              Acesse o seguinte endereço no navegador da sua TV ou computador:
            </p>
            <div className="bg-black/50 rounded-lg p-4 mb-4 text-center border border-white/5">
              <p className="text-cyan-300 font-mono text-xl font-bold tracking-wider select-all">
                http://{ipAddress}:8080
              </p>
            </div>
            <p className="text-white/40 text-[10px] uppercase font-mono text-center">
              A tela de espera continuará ativa até que você abra um jogo.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
