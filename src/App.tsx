import React, { useState, useEffect } from 'react';
import { DashboardView } from './components/DashboardView';
import { ConsoleView } from './components/ConsoleView';
import { InteractiveEmulator } from './components/InteractiveEmulator';
import { TENANTS } from './data/tenantsData';
import { TenantInfo, GameItem } from './types';
import { App as CapacitorApp } from '@capacitor/app';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'console' | 'emulator'>('dashboard');
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo>(TENANTS[0]);
  const [currentGame, setCurrentGame] = useState<GameItem | null>(null);
  const [backPressedTime, setBackPressedTime] = useState(0);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
      setToastMessage(`🎮 Controle Conectado: ${e.gamepad.id.substring(0, 20)}...`);
      setTimeout(() => setToastMessage(null), 3000);
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      setToastMessage(`🔌 Controle Desconectado!`);
      setTimeout(() => setToastMessage(null), 3000);
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    let timeoutId: any;
    
    const backListener = CapacitorApp.addListener('backButton', (info) => {
      setActiveTab(currentTab => {
        if (currentTab === 'emulator') {
          // Deixa o InteractiveEmulator lidar com o backButton via menu In-Game
          return currentTab;
        } else if (currentTab === 'console') {
          return 'dashboard'; // Sai da lista de ROMs e volta pros consoles
        } else {
          // Estamos no Dashboard (tela inicial)
          const now = Date.now();
          if (now - backPressedTime < 2000) {
            CapacitorApp.exitApp();
          } else {
            setBackPressedTime(now);
            setShowExitWarning(true);
            timeoutId = setTimeout(() => setShowExitWarning(false), 2000);
          }
          return currentTab;
        }
      });
    });

    return () => {
      backListener.then(l => l.remove());
      clearTimeout(timeoutId);
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
    };
  }, [backPressedTime]);

  const handleSelectConsole = (tenant: TenantInfo) => {
    setSelectedTenant(tenant);
    setActiveTab('console');
  };

  const handleLaunchGame = (game: GameItem) => {
    setCurrentGame(game);
    setActiveTab('emulator');
  };

  return (
    <div className={`fixed inset-0 text-[#F0F0F0] font-sans selection:bg-cyan-400 selection:text-black overflow-hidden flex flex-col ${activeTab === 'emulator' ? 'bg-transparent' : 'bg-[#050505]'}`}>
      
      {/* Top Status Bar - Sleek */}
      <header className={`bg-zinc-950 px-4 pt-10 pb-3 flex items-center justify-between border-b border-white/5 z-50 shadow-md ${activeTab === 'emulator' ? 'hidden' : ''}`}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <span className="text-black font-black text-xs">CE</span>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest uppercase">Capivara<span className="text-cyan-400">Emu</span></h1>
            <p className="text-[9px] text-white/40 font-mono">1.0 PRO</p>
          </div>
        </div>
        
        {/* Fake Battery / Status */}
        <div className="flex items-center space-x-3 text-[10px] font-mono text-white/60">
          <span className="text-green-400">60 FPS</span>
          <span>100% 🔋</span>
          <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'dashboard' && (
          <DashboardView onSelectConsole={handleSelectConsole} />
        )}

        {activeTab === 'console' && (
          <ConsoleView 
            tenant={selectedTenant}
            onBack={() => setActiveTab('dashboard')}
            onLaunchGame={handleLaunchGame}
          />
        )}

        {activeTab === 'emulator' && currentGame && (
          <InteractiveEmulator
            currentGame={currentGame}
            tenant={selectedTenant}
            onExit={() => setActiveTab('console')}
            onExitToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {/* Warning de saída do App */}
        {showExitWarning && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/90 text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl border border-white/10 z-50 animate-bounce">
            Pressione voltar novamente para sair
          </div>
        )}

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600/90 text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl border border-emerald-400 z-50">
            {toastMessage}
          </div>
        )}
      </main>
    </div>
  );
}
