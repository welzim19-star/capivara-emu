export interface TenantInfo {
  id: string;
  name: string;
  subtitle: string;
  coreName: string;
  coreFile: string;
  extensions: string[];
  color: string;
  gradient: string;
  iconName: string;
  biosRequired: boolean;
  biosFile?: string;
  tectoySpecial?: boolean;
  gamepadStyle?: GamepadStyle;
}

export interface GamepadButtonTheme {
  colorClass: string;
  label: string;
  shapeClass?: string;
}

export interface GamepadStyle {
  type: '2-button' | '4-button' | '6-button';
  top?: GamepadButtonTheme;
  left?: GamepadButtonTheme;
  right?: GamepadButtonTheme;
  bottom?: GamepadButtonTheme;
  l1?: GamepadButtonTheme;
  r1?: GamepadButtonTheme;
}

export interface GameItem {
  id: string;
  title: string;
  tenantId: string;
  fileName: string;
  fileSize: string;
  crc32: string;
  boxArtUrl: string;
  rating: number;
  releaseYear: string;
  genre: string;
  isFavorite: boolean;
  lastPlayed?: string;
  playTimeMinutes?: number;
  uri?: string;
  // Phase 1.1: Single BIOS File Support
  biosFileUri?: string;
  biosFileName?: string;
}

export interface SaveStateItem {
  id: string;
  gameId: string;
  tenantId: string;
  slot: number; // 0 for Auto-Save, 1..5 for Manual
  timestamp: string;
  thumbnailBase64?: string;
  dataSizeKb: number;
  hash: string; // Idempotency key (SHA-256)
}

export type ShaderPreset = 'RAW' | 'CRT_ROYAL' | 'LCD_GRID' | 'SCALEFX_4X';

export interface SystemMetrics {
  fps: number;
  gpuTemp: number;
  vulkanMode: string;
  audioLatencyMs: number;
  ramUsageMb: number;
  snapdragonDriver: string;
}

// --- Emulator Configurations Matrix ---

export type GraphicsAPI = 'Vulkan' | 'OpenGL' | 'D3D12' | 'Software';
export type DeinterlaceMode = 'None' | 'Bob' | 'Weave' | 'Blend';
export type AspectRatio = '4:3' | '16:9' | 'Core Provided';

export interface CoreConfigTemplate {
  // Configurações Comuns
  aspectRatio?: AspectRatio;
  graphicsApi?: GraphicsAPI;
  vSync?: boolean;
  videoFilter?: 'Bilinear' | 'Pixel Perfect';
  capivara_shader?: string;
  showFPS?: boolean;
  
  // PS2 (AetherSX2 / Play!) Específicos
  internalResolution?: number; // 1, 2, 3, 4, 8
  texturePreloading?: 'None' | 'Partial' | 'Full';
  deinterlacing?: DeinterlaceMode;
  eeCycleRate?: number; // 0 (100%), -1 (75%), 1 (130%)
  fastmem?: boolean;
  biosPath?: string;
  playResMulti?: number; // 1, 2, 4, 8
  playBilinearFiltering?: boolean;
  playPresentationMode?: 'Fit Screen' | 'Fill Screen' | 'Original Size';

  // SNES Específicos
  mode7Filtering?: boolean;
  dspAudioEnhancement?: boolean;

  // N64 Específicos
  rdpPlugin?: 'GlideN64' | 'Angrylion' | 'Parallel';
  rspPlugin?: 'HLE' | 'LLE';
  
  // GBA Específicos
  colorCorrection?: boolean;
  lcdGhostingFilter?: boolean;
  
  // Genesis / Master System Específicos
  fmSoundChip?: boolean;
  overscan?: boolean;
  
  // PS1 Específicos
  cdvdSpeedHack?: boolean;
  pgxpPerspectiveCorrect?: boolean;
  
  // PSP Específicos
  jitBlockTransfer?: boolean;
  simulateBlockTransfer?: boolean;
  
  // Arcade (MAME/FBN) Específicos
  dipSwitches?: string;
  vectorBeamWidth?: number;
}
