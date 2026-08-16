import React, { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const ScraperModal: React.FC<Props> = ({ isOpen, onClose, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Conectando ao banco ScreenScraper.fr API...');
  const [scrapedCount, setScrapedCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setProgress(0);
    setScrapedCount(0);

    const steps = [
      { p: 20, msg: 'Escaneando checksums (CRC32/MD5) das ROMs...', count: 4 },
      { p: 50, msg: 'Baixando capas 3D e fanarts em HD do GitHub Libretro...', count: 12 },
      { p: 80, msg: 'Otimizando cache local de imagens WebP...', count: 22 },
      { p: 100, msg: 'Download de capas concluído com sucesso!', count: 26 }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].p);
        setStatusText(steps[currentStep].msg);
        setScrapedCount(steps[currentStep].count);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
          onClose();
        }, 800);
      }
    }, 900);

    return () => clearInterval(interval);
  }, [isOpen, onComplete, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-cyan-500/40 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xl border border-cyan-500/40">
            🌐
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">Auto Cover Scraper Engine</h3>
            <p className="text-xs font-mono text-cyan-400">API ScreenScraper & Libretro Thumbnails</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-zinc-300">{statusText}</span>
            <span className="text-cyan-400 font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden border border-white/10 p-0.5">
            <div 
              className="bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-black/50 rounded-2xl p-4 border border-white/5 space-y-1 text-xs font-mono text-zinc-400">
          <div className="flex justify-between">
            <span>Capas Encontradas:</span>
            <span className="text-emerald-400 font-bold">{scrapedCount} arquivos</span>
          </div>
          <div className="flex justify-between">
            <span>Algoritmo de Busca:</span>
            <span className="text-zinc-300">CRC32 Hash + Game Title</span>
          </div>
        </div>

        <p className="text-[11px] font-mono text-zinc-500 text-center">
          Aguarde o término para atualizar as artes da sua biblioteca automaticamente.
        </p>
      </div>
    </div>
  );
};
