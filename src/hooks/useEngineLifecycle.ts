import React, { useEffect, useRef } from 'react';
import { registerPlugin } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';
import { GameItem, TenantInfo } from '../types';
import { CapacitorEngineAdapter } from '../adapters/native/CapacitorEngineAdapter';

const CapivaraEngine = registerPlugin<any>('CapivaraEngine');

interface UseEngineLifecycleOptions {
  tenant: TenantInfo;
  currentGame: GameItem;
  relaunchTrigger: number;
  lastGamepadActivity: React.MutableRefObject<number>;
  onOpenSettings: () => void;
  onShowToast: (msg: string) => void;
}

export function useEngineLifecycle({
  tenant,
  currentGame,
  relaunchTrigger,
  lastGamepadActivity,
  onOpenSettings,
  onShowToast,
}: UseEngineLifecycleOptions) {
  
  useEffect(() => {
    const lockScreen = async () => {
      try {
        await ScreenOrientation.lock({ orientation: 'landscape' });
        await StatusBar.hide();
      } catch (e) {
        console.warn("Screen control not available");
      }
    };
    lockScreen();

    const launch = async () => {
      try {
        const overrideStr = localStorage.getItem(`override_${currentGame.id}`);
        const globalStr = localStorage.getItem(`core_config_${tenant.id}`);
        const configMatrix = overrideStr ? JSON.parse(overrideStr) : (globalStr ? JSON.parse(globalStr) : {});
        
        const libretroConfig: Record<string, string> = {};
        if (configMatrix.playResMulti !== undefined) libretroConfig['play_res_multi'] = String(configMatrix.playResMulti);
        if (configMatrix.playBilinearFiltering !== undefined) libretroConfig['play_bilinear_filtering'] = configMatrix.playBilinearFiltering ? 'enabled' : 'disabled';
        if (configMatrix.playPresentationMode !== undefined) libretroConfig['play_presentation_mode'] = configMatrix.playPresentationMode;
        
        // CORREÇÃO DOS SHADERS AQUI (A tradução entre Frontend -> Backend C++)
        if (configMatrix.videoFilter !== undefined) {
          // 0 = Nítido, 1 = Suave, 2 = CRT, 3 = LCD
          if (configMatrix.videoFilter === 0) {
            libretroConfig['capivara_video_filter'] = 'Nearest';
            libretroConfig['capivara_shader'] = 'None';
          } else if (configMatrix.videoFilter === 1) {
            libretroConfig['capivara_video_filter'] = 'Bilinear';
            libretroConfig['capivara_shader'] = 'None';
          } else if (configMatrix.videoFilter === 2) {
            libretroConfig['capivara_shader'] = 'CRT';
          } else if (configMatrix.videoFilter === 3) {
            libretroConfig['capivara_shader'] = 'LCD';
          }
        }

        // Traduz as configurações da UI usando o Adapter (incluindo AES mode, shaders, etc)
        const translatedConfig = CapacitorEngineAdapter.translateConfig(configMatrix);

        Object.entries(translatedConfig).forEach(([k, v]) => {
           if (!libretroConfig[k] && typeof v === 'string') libretroConfig[k] = v;
        });

        Object.entries(configMatrix).forEach(([k, v]) => {
           if (!libretroConfig[k] && typeof v === 'string') libretroConfig[k] = v;
        });

        onShowToast("Carregando Core Nativo C++...");
        await CapivaraEngine.startGame({ 
          core: tenant.coreFile,
          romUri: currentGame.id === 'bios_boot' ? '' : currentGame.uri,
          fileName: currentGame.fileName,
          configMatrix: libretroConfig,
          biosFileUri: currentGame.biosFileUri ?? null,
          biosFileName: currentGame.biosFileName ?? null,
          romPathUri: (tenant as any).romPathUri ?? null,
        });

        await CapivaraEngine.resume();
        onShowToast("Jogo Iniciado no Modo Nativo!");
        
        const storageKey = `saves_${tenant.id}_${currentGame.id}`;
        const savedData = localStorage.getItem(storageKey);
        const saves = savedData ? JSON.parse(savedData) : {};
        if (saves[0]) {
          setTimeout(async () => {
            try {
              await CapivaraEngine.loadState({ slot: 0, hash: currentGame.id });
              onShowToast("Auto-Load: Progresso Restaurado!");
            } catch (e) {
              console.warn("Auto-load failed", e);
            }
          }, 1000); 
        }

      } catch (err: any) {
        const msg = err?.message ?? String(err);
        if (msg.startsWith('BIOS_MISSING:')) {
          const biosFile = msg.split(':')[1];
          onShowToast(`⚠️ BIOS não encontrada: ${biosFile}`);
        } else {
          onShowToast("Erro ao processar a ROM na Engine");
        }
      }
    };
    launch();

    const backListener = CapacitorApp.addListener('backButton', () => {
      if (Date.now() - lastGamepadActivity.current < 500) return;
      onOpenSettings();
      CapivaraEngine.pause();
    });

    const stateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        CapivaraEngine.resume();
      } else {
        CapivaraEngine.pause();
        CapivaraEngine.saveState({ slot: 0, hash: currentGame.id }).then((result: any) => {
          const storageKey = `saves_${tenant.id}_${currentGame.id}`;
          const savedData = localStorage.getItem(storageKey);
          const saves = savedData ? JSON.parse(savedData) : {};
          saves[0] = {
            id: `${currentGame.id}_0`,
            gameId: currentGame.id,
            tenantId: tenant.id,
            slot: 0,
            timestamp: new Date().toLocaleString(),
            thumbnailBase64: result?.thumbnailBase64,
            dataSizeKb: result?.dataSizeKb || 4096,
            hash: currentGame.id
          };
          localStorage.setItem(storageKey, JSON.stringify(saves));
        }).catch(() => console.warn("Auto-save failed"));
      }
    });

    return () => {
      backListener.then(l => l.remove());
      stateListener.then(l => l.remove());
      const unlockScreen = async () => {
        try {
          await ScreenOrientation.unlock();
          await StatusBar.show();
        } catch (e) {}
      };
      unlockScreen();
      CapivaraEngine.destroyEngine().catch(console.error);
    };
  }, [currentGame, tenant, relaunchTrigger]);
}
