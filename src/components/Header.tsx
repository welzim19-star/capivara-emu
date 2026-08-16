import React from 'react';
import { 
  Sparkles, 
  FolderTree, 
  Gamepad2, 
  Code2, 
  Layers, 
  Lock,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'emulator' | 'saf' | 'shaders' | 'billing' | 'exporter' | 'roadmap' | 'playstore';
  setActiveTab: (tab: 'dashboard' | 'emulator' | 'saf' | 'shaders' | 'billing' | 'exporter' | 'roadmap' | 'playstore') => void;
  isPro: boolean;
  onOpenBilling: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isPro,
  onOpenBilling
}) => {
  return (
    <header className="bg-[#050505]/95 backdrop-blur-xl border-b border-white/10 text-[#F0F0F0] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex flex-col items-center justify-center gap-4">
        
        {/* Banner Centralizado */}
        <div className="flex flex-col items-center text-center cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30 transition-transform group-hover:scale-105">
              <span className="text-xl">🦫</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-amber-400">
              CAPIVARA EMU
            </h1>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Studio</span>
            </span>
          </div>
          <p className="text-[11px] uppercase tracking-widest text-white/50 font-semibold">
            Multi-Console Engine • Isolamento Galvânico • Libretro Native
          </p>
        </div>

        {/* Navigation & Pro Upgrade */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-full">
          <nav className="flex items-center space-x-1.5 bg-black/60 p-1.5 rounded-full border border-white/10 overflow-x-auto max-w-full shadow-inner">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500/20 border border-amber-500/60 text-amber-400 shadow-lg shadow-amber-500/10'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('emulator')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'emulator'
                  ? 'bg-amber-500/20 border border-amber-500/60 text-amber-400 shadow-lg shadow-amber-500/10'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Emulador</span>
            </button>

            <button
              onClick={() => setActiveTab('saf')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'saf'
                  ? 'bg-amber-500/20 border border-amber-500/60 text-amber-400 shadow-lg shadow-amber-500/10'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Storage SAF</span>
            </button>

            <button
              onClick={() => setActiveTab('shaders')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'shaders'
                  ? 'bg-amber-500/20 border border-amber-500/60 text-amber-400 shadow-lg shadow-amber-500/10'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Shaders</span>
              {!isPro && <Lock className="w-3 h-3 text-amber-400/80" />}
            </button>

            <button
              onClick={() => setActiveTab('exporter')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'exporter'
                  ? 'bg-indigo-500/20 border border-indigo-400/60 text-indigo-300 shadow-lg shadow-indigo-500/10'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Export Code</span>
            </button>

            <button
              onClick={() => setActiveTab('roadmap')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'roadmap'
                  ? 'bg-amber-500/20 border border-amber-500/60 text-amber-300 shadow-lg shadow-amber-500/10'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Roadmap & BIOS</span>
            </button>
          </nav>

          {/* Upgrade Pro */}
          <button
            onClick={onOpenBilling}
            className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-black tracking-wider transition-all shadow-md ${
              isPro 
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-amber-500/20' 
                : 'bg-amber-500/20 hover:bg-amber-400 hover:text-black text-amber-400 border border-amber-400/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>{isPro ? 'PRO ATIVO' : 'UPGRADE PRO'}</span>
          </button>
        </div>

      </div>
    </header>
  );
};
