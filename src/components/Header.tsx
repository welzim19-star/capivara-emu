import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Flame, 
  Sparkles, 
  FolderTree, 
  Gamepad2, 
  Code2, 
  Layers, 
  Zap,
  CheckCircle2,
  Lock,
  Clock
} from 'lucide-react';
import { SystemMetrics } from '../types';

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
  const [metrics, setMetrics] = useState<SystemMetrics>({
    fps: 120,
    gpuTemp: 37.8,
    vulkanMode: 'VK_PRESENT_MODE_MAILBOX_KHR',
    audioLatencyMs: 11.2,
    ramUsageMb: 248,
    snapdragonDriver: 'Adreno 650 (SD865 Vulkan 1.2)'
  });

  const [currentTime, setCurrentTime] = useState('12:42 PM');

  const [batteryLevel, setBatteryLevel] = useState(100);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timeInterval = setInterval(updateTime, 30000);

    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        fps: Math.floor(118 + Math.random() * 3),
        gpuTemp: parseFloat((37.5 + Math.random() * 1.2).toFixed(1)),
        audioLatencyMs: parseFloat((10.8 + Math.random() * 0.8).toFixed(1)),
        ramUsageMb: Math.floor(240 + Math.random() * 15)
      }));
    }, 2000);

    let batteryManager: any = null;
    const updateBattery = () => {
      if (batteryManager) setBatteryLevel(Math.round(batteryManager.level * 100));
    };
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((b: any) => {
        batteryManager = b;
        updateBattery();
        batteryManager.addEventListener('levelchange', updateBattery);
      });
    }

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
      if (batteryManager) batteryManager.removeEventListener('levelchange', updateBattery);
    };
  }, []);

  return (
    <header className="bg-[#050505]/95 backdrop-blur-md border-b border-white/5 text-[#F0F0F0] sticky top-0 z-40">
      {/* Sleek Top Telemetry Status Bar */}
      <div className="h-10 px-4 sm:px-8 flex items-center justify-between bg-black/40 border-b border-white/5 text-[11px] font-mono tracking-wider">
        <div className="flex items-center space-x-4 text-white/40 font-bold">
          <span className="flex items-center space-x-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>SD865 ACTIVE</span>
          </span>
          <span className="hidden sm:inline text-white/10">•</span>
          <span className="text-cyan-400 font-extrabold flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5" />
            <span>VULKAN 1.2</span>
          </span>
          <span className="hidden sm:inline text-white/10">•</span>
          <span className="text-emerald-400 font-extrabold">{metrics.fps}.0 FPS</span>
          <span className="hidden md:inline text-white/10">•</span>
          <span className="hidden md:flex items-center space-x-1 text-amber-400">
            <Flame className="w-3.5 h-3.5" />
            <span>{metrics.gpuTemp}°C</span>
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="hidden md:inline-flex items-center space-x-1 bg-cyan-950/40 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight">
            <CheckCircle2 className="w-3 h-3" />
            <span>SAF ISOLATED</span>
          </span>

          <div className="flex items-center space-x-2">
            <span className="text-white/60 font-bold text-xs">{currentTime}</span>
            <div className="w-5 h-3 border border-white/40 rounded-sm relative p-0.5" title={`Bateria: ${batteryLevel}%`}>
              <div className="h-full bg-cyan-400 rounded-xs" style={{ width: `${batteryLevel}%` }}></div>
            </div>
          </div>

          <button
            onClick={onOpenBilling}
            className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-black tracking-wider transition-all ${
              isPro 
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md shadow-amber-500/20' 
                : 'bg-white/10 hover:bg-cyan-400 hover:text-black text-cyan-400 border border-cyan-400/40'
            }`}
          >
            <Sparkles className="w-3 h-3 fill-current" />
            <span>{isPro ? 'PRO ATIVO' : 'UPGRADE PRO'}</span>
          </button>
        </div>
      </div>

      {/* Main Branding & Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Branding */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-transform hover:scale-105">
            <span className="font-black text-white italic text-xl">N</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black tracking-tighter leading-none text-white">
                CAPIVARA EMU <span className="text-cyan-400">STUDIO</span>
              </h1>
              <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                Cúpula Edition
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-1">
              All-in-One Android Emulator • SAF Tenant Storage • Vulkan 1.2
            </p>
          </div>
        </div>

        {/* Sleek Pill Tab Navigation */}
        <nav className="flex items-center space-x-2 bg-black/60 p-1.5 rounded-full border border-white/10 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-cyan-400/10 border border-cyan-400/50 text-cyan-400 shadow-lg shadow-cyan-400/10'
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
                ? 'bg-cyan-400/10 border border-cyan-400/50 text-cyan-400 shadow-lg shadow-cyan-400/10'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Emulador (Test Bench)</span>
          </button>

          <button
            onClick={() => setActiveTab('saf')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'saf'
                ? 'bg-cyan-400/10 border border-cyan-400/50 text-cyan-400 shadow-lg shadow-cyan-400/10'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>SAF Storage</span>
          </button>

          <button
            onClick={() => setActiveTab('shaders')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'shaders'
                ? 'bg-cyan-400/10 border border-cyan-400/50 text-cyan-400 shadow-lg shadow-cyan-400/10'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Shaders Slang</span>
            {!isPro && <Lock className="w-3 h-3 text-amber-400" />}
          </button>

          <button
            onClick={() => setActiveTab('exporter')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'exporter'
                ? 'bg-indigo-500/20 border border-indigo-400/50 text-indigo-300 shadow-lg shadow-indigo-500/10'
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
                ? 'bg-cyan-400/20 border border-cyan-400/50 text-cyan-300 shadow-lg shadow-cyan-400/10'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Roadmap & BIOS</span>
          </button>

          <button
            onClick={() => setActiveTab('playstore')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'playstore'
                ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 shadow-lg shadow-emerald-500/10'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>APK & PlayStore</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

