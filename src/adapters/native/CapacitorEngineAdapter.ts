import { registerPlugin } from '@capacitor/core';
import { EnginePort, StartGameParams, StateSaveResult } from '../../core/ports/EnginePort';

// Plugin real injetado pelo Capacitor
const CapivaraEngine = registerPlugin<any>('CapivaraEngine');

export class CapacitorEngineAdapter implements EnginePort {
  // ── CONFIGURATION MATRIX ────────────────────────────────────────────────
  async setConfig(configMatrix: any): Promise<void> {
    const coreSettings: Record<string, string> = {};
    
    // Global Settings
    if (configMatrix.global_frame_skip !== undefined) {
      await CapivaraEngine.setFrameSkip({ skip: Number(configMatrix.global_frame_skip) });
    }
    
    // SNES
    if (configMatrix.snes9x_superfx_overclock) coreSettings['snes9x_overclock_superfx'] = String(configMatrix.snes9x_superfx_overclock);
    if (configMatrix.snes9x_audio_interpolation) coreSettings['snes9x_echo_interpolation'] = String(configMatrix.snes9x_audio_interpolation).toLowerCase();
    
    // SNES Video Filter
    if (configMatrix.snes9x_filter && configMatrix.snes9x_filter !== 'none') {
      if (configMatrix.snes9x_filter.startsWith('blargg')) {
        coreSettings['snes9x_blargg'] = configMatrix.snes9x_filter.replace('blargg_ntsc_', '');
        coreSettings['snes9x_filter'] = 'none'; // Desativa filtros digitais se usar Blargg
      } else {
        coreSettings['snes9x_filter'] = configMatrix.snes9x_filter;
        coreSettings['snes9x_blargg'] = 'none';
      }
    } else {
      coreSettings['snes9x_filter'] = 'none';
      coreSettings['snes9x_blargg'] = 'none';
    }
    
    // PS1 (PGXP & True Color)
    if (configMatrix.duckstation_pgxp) coreSettings['duckstation_pgxp_vertex'] = 'true';
    if (configMatrix.duckstation_resolution) coreSettings['duckstation_InternalResolution'] = String(configMatrix.duckstation_resolution.charAt(0)); // Gets "2" from "2x"
    if (configMatrix.duckstation_widescreen) coreSettings['duckstation_WidescreenHack'] = 'true';
    if (configMatrix.duckstation_true_color) coreSettings['duckstation_TrueColor'] = 'true';
    
    // NeoGeo (FBNeo)
    if (configMatrix.fbneo_unibios) coreSettings['fbneo-allow-patched-romsets'] = 'enabled';
    if (configMatrix.fbneo_neogeo_mode) {
      const modeStr = String(configMatrix.fbneo_neogeo_mode);
      if (modeStr.includes("AES")) {
        coreSettings['fbneo-neogeo-mode'] = "AES";
        coreSettings['fbneo-bios'] = "13"; // Force AES Asia
      } else if (modeStr.includes("UNIBIOS")) {
        coreSettings['fbneo-neogeo-mode'] = "UNIBIOS";
        coreSettings['fbneo-bios'] = "15"; // Force Unibios 3.3
      } else {
        coreSettings['fbneo-neogeo-mode'] = "DIPSWITCH"; // Default to DIPSWITCH which handles MVS
        coreSettings['fbneo-bios'] = "0"; // Default MVS Asia
      }
    }
    if (configMatrix.fbneo_cpu_overclock) coreSettings['fbneo-cpu-speed-adjust'] = String(configMatrix.fbneo_cpu_overclock);
    
    // Arcade (MAME)
    if (configMatrix.mame2003_skip_disclaimer) coreSettings['mame2003-skip_disclaimer'] = 'enabled';
    if (configMatrix.mame2003_sample_rate) coreSettings['mame2003-sample_rate'] = String(configMatrix.mame2003_sample_rate);
    
    // PS2
    if (configMatrix.ee_cycle_rate) coreSettings['pcsx2_ee_cycle_rate'] = String(configMatrix.ee_cycle_rate);
    if (configMatrix.vu_cycle_stealing) coreSettings['pcsx2_vu_cycle_stealing'] = String(configMatrix.vu_cycle_stealing);

    // N64 (Mupen64Plus-Next)
    if (configMatrix.rdpPlugin) coreSettings['mupen64plus-next-rdp-plugin'] = String(configMatrix.rdpPlugin).toLowerCase();
    if (configMatrix.resolution) coreSettings['mupen64plus-next-43res'] = String(configMatrix.resolution);
    if (configMatrix.framerate_hack !== undefined) coreSettings['mupen64plus-next-virefresh'] = configMatrix.framerate_hack ? 'True' : 'False';
    if (configMatrix.cpucore) coreSettings['mupen64plus-next-cpucore'] = String(configMatrix.cpucore);

    // Dreamcast (Flycast)
    if (configMatrix.flycast_internal_resolution) coreSettings['flycast_internal_resolution'] = String(configMatrix.flycast_internal_resolution).split(' ')[0];
    if (configMatrix.flycast_widescreen_hack !== undefined) coreSettings['flycast_widescreen_hack'] = configMatrix.flycast_widescreen_hack ? 'enabled' : 'disabled';
    if (configMatrix.flycast_cable_type) coreSettings['flycast_cable_type'] = configMatrix.flycast_cable_type.includes('VGA') ? '0' : '1';
    if (configMatrix.flycast_dsp !== undefined) coreSettings['flycast_dsp'] = configMatrix.flycast_dsp ? 'enabled' : 'disabled';

    try {
      await CapivaraEngine.updateCoreOptions(coreSettings);
      console.log('[KILLCAM - Adapter] Configuração injetada no JNI:', coreSettings);
    } catch (e) {
      console.error('[KILLCAM - ERROR] Falha ao injetar configurações', e);
      throw new Error('ERR_INTERNAL');
    }
  }
  
  async startGame(params: StartGameParams): Promise<void> {
    try {
      await CapivaraEngine.startGame(params);
    } catch (e: any) {
      // Observabilidade agressiva no console log, mas fail-secure na propagaçāo
      console.error(`[KILLCAM] JNI Crash Trace: ${e?.message || 'Unknown'}`);
      console.error(`{"error": "ERR_INTERNAL", "correlation_id": "engine_start_fail"}`);
      throw new Error("ERR_INTERNAL");
    }
  }

  async pause(): Promise<void> {
    await CapivaraEngine.pause();
  }

  async resume(): Promise<void> {
    await CapivaraEngine.resume();
  }

  async saveState(slot: number, hash: string): Promise<StateSaveResult> {
    try {
      return await CapivaraEngine.saveState({ slot, hash });
    } catch (e: any) {
      console.error(`{"error": "ERR_INTERNAL", "correlation_id": "engine_save_fail"}`);
      throw new Error("ERR_INTERNAL");
    }
  }

  async loadState(slot: number, hash: string): Promise<void> {
    try {
      await CapivaraEngine.loadState({ slot, hash });
    } catch (e: any) {
      console.error(`{"error": "ERR_INTERNAL", "correlation_id": "engine_load_fail"}`);
      throw new Error("ERR_INTERNAL");
    }
  }

  onLogStream(callback: (log: string) => void): void {
    CapivaraEngine.addListener('onLogLine', (data: any) => {
      if (data && data.log) {
        callback(data.log);
      }
    });
  }

  async stopLogStream(): Promise<void> {
    await CapivaraEngine.stopLogStream();
  }

  async resetCheats(): Promise<void> {
    await CapivaraEngine.resetCheats();
  }

  async applyCheat(index: number, enabled: boolean, code: string): Promise<void> {
    await CapivaraEngine.applyCheat({ index, enabled, code });
  }

  async sendAnalog(port: number, stick: number, x: number, y: number): Promise<void> {
    await CapivaraEngine.sendAnalog({ port, stick, x, y });
  }
}

export const capacitorEngine = new CapacitorEngineAdapter();
