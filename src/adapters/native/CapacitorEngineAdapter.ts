import { registerPlugin } from '@capacitor/core';
import { EnginePort, StartGameParams, StateSaveResult } from '../../core/ports/EnginePort';

// Plugin real injetado pelo Capacitor
const CapivaraEngine = registerPlugin<any>('CapivaraEngine');

export class CapacitorEngineAdapter implements EnginePort {
  // ── CONFIGURATION MATRIX ────────────────────────────────────────────────
  static translateConfig(configMatrix: any): Record<string, string> {
    const coreSettings: Record<string, string> = {};
    
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
        // We use DIPSWITCH because it forces the emulator to look at 'fbneo-bios'
        // fbneo-bios = 13 usually maps to AES Asia. If they only have aes.zip, UNIBIOS will fail.
        coreSettings['fbneo-neogeo-mode'] = "DIPSWITCH";
        coreSettings['fbneo-bios'] = "13"; // AES Asia

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
    if (configMatrix.playResMulti !== undefined) {
      const mult = Math.max(1, Math.min(4, Number(configMatrix.playResMulti) || 2));
      coreSettings['mupen64plus-EnableNativeResFactor'] = String(mult);
      if (mult === 1) coreSettings['mupen64plus-43screensize'] = '640x480';
      else if (mult === 2) coreSettings['mupen64plus-43screensize'] = '1280x960';
      else if (mult === 3) coreSettings['mupen64plus-43screensize'] = '1920x1440';
      else if (mult >= 4) coreSettings['mupen64plus-43screensize'] = '2560x1920';
    }
    if (configMatrix.rdpPlugin) coreSettings['mupen64plus-rdp-plugin'] = String(configMatrix.rdpPlugin).toLowerCase();
    if (configMatrix.framerate_hack !== undefined) coreSettings['mupen64plus-virefresh'] = configMatrix.framerate_hack ? 'True' : 'False';
    if (configMatrix.cpucore) coreSettings['mupen64plus-cpucore'] = String(configMatrix.cpucore);

    // Dreamcast (Flycast)
    if (configMatrix.playResMulti !== undefined) {
      const mult = Number(configMatrix.playResMulti);
      if (mult === 1) coreSettings['reicast_internal_resolution'] = '640x480';
      else if (mult === 2) coreSettings['reicast_internal_resolution'] = '1280x960';
      else if (mult >= 3) coreSettings['reicast_internal_resolution'] = '1920x1440';
    }
    if (configMatrix.flycast_internal_resolution) coreSettings['reicast_internal_resolution'] = String(configMatrix.flycast_internal_resolution).split(' ')[0];
    if (configMatrix.flycast_widescreen_hack !== undefined) coreSettings['reicast_widescreen_hack'] = configMatrix.flycast_widescreen_hack ? 'enabled' : 'disabled';
    if (configMatrix.flycast_cable_type) coreSettings['reicast_cable_type'] = configMatrix.flycast_cable_type.includes('VGA') ? '0' : '1';
    if (configMatrix.flycast_dsp !== undefined) coreSettings['reicast_enable_dsp'] = configMatrix.flycast_dsp ? 'enabled' : 'disabled';

    return coreSettings;
  }

  async setConfig(configMatrix: any): Promise<void> {
    const coreSettings = CapacitorEngineAdapter.translateConfig(configMatrix);
    
    // Global Settings
    if (configMatrix.global_frame_skip !== undefined) {
      await CapivaraEngine.setFrameSkip({ skip: Number(configMatrix.global_frame_skip) });
    }
    


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

  async startCasting(): Promise<void> {
    await CapivaraEngine.startCasting();
  }

  async stopCasting(): Promise<void> {
    await CapivaraEngine.stopCasting();
  }

  async getLocalIP(): Promise<string> {
    const res = await CapivaraEngine.getLocalIP();
    return res.ip || "127.0.0.1";
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
