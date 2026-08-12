export interface StartGameParams {
  core: string;
  romUri: string;
  fileName: string;
  configMatrix: Record<string, string>;
  biosFileUri: string | null;
  biosFileName: string | null;
  romPathUri: string | null;
}

export interface StateSaveResult {
  thumbnailBase64?: string;
  dataSizeKb: number;
}

export interface EnginePort {
  startGame(params: StartGameParams): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  saveState(slot: number, hash: string): Promise<StateSaveResult>;
  loadState(slot: number, hash: string): Promise<void>;
  onLogStream(callback: (log: string) => void): void;
  stopLogStream(): Promise<void>;
}
