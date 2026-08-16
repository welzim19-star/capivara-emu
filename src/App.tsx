import React, { useState, useEffect, useCallback } from 'react';
import { TENANTS } from './data/tenantsData';
import { TenantInfo, GameItem } from './types';
import { App as CapacitorApp } from '@capacitor/app';
import { InteractiveEmulator } from './components/InteractiveEmulator';
import { SteamOSDeckLayout } from './components/layouts/SteamOSDeckLayout';
import { SwitchMinimalLayout } from './components/layouts/SwitchMinimalLayout';
import { ScraperModal } from './components/layouts/ScraperModal';
import { ScraperService } from './services/ScraperService';
import { SaveStateModal } from './components/SaveStateModal';
import { AutofireSettings } from './components/AutofireSettings';
import { registerPlugin } from '@capacitor/core';

const CapivaraEngine = registerPlugin<any>('CapivaraEngine');

export default function App() {
  const [activeLayout, setActiveLayout] = useState<'steamos' | 'switch'>(() => {
    return (localStorage.getItem('preferred_layout') as 'steamos' | 'switch') || 'switch';
  });

  const [tenantsState, setTenantsState] = useState<TenantInfo[]>(TENANTS);
  const [currentGame, setCurrentGame] = useState<GameItem | null>(null);
  const [currentTenant, setCurrentTenant] = useState<TenantInfo | null>(null);
  const [isScraperOpen, setIsScraperOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveModalMode, setSaveModalMode] = useState<'save' | 'load'>('save');
  const [isAutofireOpen, setIsAutofireOpen] = useState(false);
  const [selectedTenantForModal, setSelectedTenantForModal] = useState<TenantInfo | null>(null);
  const [selectedGameForModal, setSelectedGameForModal] = useState<GameItem | null>(null);

  // ── ROM Scan ── extracted to useCallback so layouts can trigger re-scan
  // WITHOUT window.location.reload() (which destroys the native EGL surface!)
  const loadAllRoms = useCallback(async () => {
    const updatedTenants = await Promise.all(
      TENANTS.map(async (tenant) => {
        const mappedDir = localStorage.getItem(`mapped_dir_${tenant.id}`);
        let games: GameItem[] = [];
        if (mappedDir && CapivaraEngine) {
          try {
            const result = await CapivaraEngine.scanRomDirectory({ uri: mappedDir });
            const validFiles = (result.files || []).filter((f: any) => {
              const ext = f.name.split('.').pop()?.toLowerCase();
              return tenant.extensions.includes(ext || '');
            });

            games = validFiles.map((f: any) => ({
              id: f.uri,
              title: f.name,
              name: f.name,
              tenantId: tenant.id,
              fileName: f.name,
              fileSize: 'N/A',
              crc32: 'N/A',
              boxArtUrl: '',
              rating: 0,
              releaseYear: '',
              genre: '',
              isFavorite: false,
              uri: f.uri
            }));

            games = await ScraperService.enrichGamesList(games, tenant.name, tenant.id, tenant.color);
            
            // SORT ALPHABETICALLY
            games.sort((a, b) => a.title.localeCompare(b.title));

          } catch (e) {
            console.error(`Falha ao carregar ROMs do ${tenant.name}`, e);
          }
        }
        return { ...tenant, games };
      })
    );
    setTenantsState(updatedTenants);
  }, []);

  // Load ROMs on startup
  useEffect(() => {
    loadAllRoms();
  }, [loadAllRoms]);

  // Back Button Logic
  useEffect(() => {
    let timeoutId: any;
    let backPressedTime = 0;

    const backListener = CapacitorApp.addListener('backButton', () => {
      if (currentGame) {
        // Let InteractiveEmulator handle the back button (pause & show menu)
        return;
      } else {
        const now = Date.now();
        if (now - backPressedTime < 2000) {
          CapacitorApp.exitApp();
        } else {
          backPressedTime = now;
          setToastMessage('Pressione voltar novamente para sair');
          timeoutId = setTimeout(() => setToastMessage(null), 2000);
        }
      }
    });

    return () => {
      backListener.then(l => l.remove());
      clearTimeout(timeoutId);
    };
  }, [currentGame]);

  // Gamepad Notifications
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

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
    };
  }, []);

  const handleLaunchGame = (game: GameItem, tenant: TenantInfo) => {
    // KILLCAM FIX: Inject BIOS file info from localStorage (same as ConsoleView.tsx does)
    // This ensures the new Switch/SteamOS layouts properly pass BIOS to startGame
    const biosFileUri = localStorage.getItem(`bios_file_uri_${tenant.id}`);
    const biosFileName = localStorage.getItem(`bios_file_name_${tenant.id}`);
    const enrichedGame: GameItem = {
      ...game,
      biosFileUri: biosFileUri ?? undefined,
      biosFileName: biosFileName ?? undefined,
    };
    setCurrentTenant(tenant);
    setCurrentGame(enrichedGame);
  };

  const handleRunScraper = () => {
    setIsScraperOpen(true);
  };

  const onScraperComplete = async () => {
    setToastMessage('✅ Scraping concluído! Artes aplicadas.');
    setTimeout(() => setToastMessage(null), 3000);
    
    // In a real app we'd fetch the real APIs here. The mock already enriched them on load.
    // So we just trigger a small re-render or state refresh.
    setTenantsState([...tenantsState]); 
  };

  const toggleLayout = () => {
    const newLayout = activeLayout === 'steamos' ? 'switch' : 'steamos';
    setActiveLayout(newLayout);
    localStorage.setItem('preferred_layout', newLayout);
    setToastMessage(`Layout alterado para: ${newLayout.toUpperCase()}`);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleOpenSaves = (mode: 'save' | 'load', tenant: TenantInfo, game: GameItem) => {
    setSaveModalMode(mode);
    setSelectedTenantForModal(tenant);
    setSelectedGameForModal(game);
    setIsSaveModalOpen(true);
  };

  const handleOpenAutofire = (tenant: TenantInfo) => {
    setSelectedTenantForModal(tenant);
    setIsAutofireOpen(true);
  };

  // If emulator is active, render the emulator view
  if (currentGame && currentTenant) {
    return (
      <InteractiveEmulator
        currentGame={currentGame}
        tenant={currentTenant}
        onExit={() => {
          setCurrentGame(null);
          setCurrentTenant(null);
        }}
        onExitToDashboard={() => {
          setCurrentGame(null);
          setCurrentTenant(null);
        }}
      />
    );
  }

  // Frontend Views
  return (
    <>


      {activeLayout === 'steamos' ? (
        <SteamOSDeckLayout 
          tenants={tenantsState} 
          onLaunch={handleLaunchGame} 
          onRunScraper={handleRunScraper}
          onOpenSaves={handleOpenSaves}
          onOpenAutofire={handleOpenAutofire}
          onToggleLayout={toggleLayout}
          onRomsMapped={loadAllRoms}
        />
      ) : (
        <SwitchMinimalLayout 
          tenants={tenantsState} 
          onLaunch={handleLaunchGame} 
          onRunScraper={handleRunScraper}
          onOpenSaves={handleOpenSaves}
          onOpenAutofire={handleOpenAutofire}
          onToggleLayout={toggleLayout}
          onRomsMapped={loadAllRoms}
        />
      )}

      <ScraperModal 
        isOpen={isScraperOpen}
        onClose={() => setIsScraperOpen(false)}
        onComplete={onScraperComplete}
      />

      {isSaveModalOpen && selectedTenantForModal && selectedGameForModal && (
        <SaveStateModal 
          tenant={selectedTenantForModal}
          game={selectedGameForModal}
          mode={saveModalMode}
          onSelectSlot={(slot, hash) => console.log(`Slot ${slot} selected: ${hash}`)}
          onClose={() => setIsSaveModalOpen(false)}
        />
      )}

      {isAutofireOpen && selectedTenantForModal && (
        <AutofireSettings 
          tenant={selectedTenantForModal}
          onClose={() => setIsAutofireOpen(false)}
          onSave={(cfg) => console.log('Autofire Config Saved:', cfg)}
        />
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600/95 text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl border border-emerald-400 z-[9999] animate-bounce">
          {toastMessage}
        </div>
      )}
    </>
  );
}
