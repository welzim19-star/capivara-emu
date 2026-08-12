import { registerPlugin } from '@capacitor/core';
import { EnginePort, StartGameParams, StateSaveResult } from '../../core/ports/EnginePort';

// Plugin real injetado pelo Capacitor
const CapivaraEngine = registerPlugin<any>('CapivaraEngine');

export class CapacitorEngineAdapter implements EnginePort {
  
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
}

export const capacitorEngine = new CapacitorEngineAdapter();
