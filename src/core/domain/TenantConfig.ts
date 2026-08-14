export interface PhysicalGamepadLayout {
  id: string;
  name: string;
  width: number;
  height: number;
  scale: number;
  elements: GamepadElement[];
}

export type GamepadElementType = 'dpad' | 'button' | 'analog' | 'trigger' | 'bumper';

export interface GamepadElement {
  id: number;
  type: GamepadElementType;
  label: string;
  cssClasses: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

// O Mapeamento Físico de cada Console (Isolamento de Domínio)
export const TENANT_GAMEPAD_LAYOUTS: Record<string, PhysicalGamepadLayout> = {
  'SNES_SNES9X': {
    id: 'SNES_SNES9X',
    name: 'Super Nintendo',
    width: 600,
    height: 280,
    scale: 0.8,
    elements: [
      { id: 10, type: 'bumper', label: 'L', cssClasses: 'rounded-tl-2xl rounded-tr-sm', x: 80, y: 10, width: 120, height: 40 },
      { id: 11, type: 'bumper', label: 'R', cssClasses: 'rounded-tr-2xl rounded-tl-sm', x: 400, y: 10, width: 120, height: 40 },
      { id: 4, type: 'button', label: 'Up', cssClasses: 'rounded-t-lg', x: 100, y: 100, width: 30, height: 35 },
      { id: 5, type: 'button', label: 'Down', cssClasses: 'rounded-b-lg', x: 100, y: 165, width: 30, height: 35 },
      { id: 6, type: 'button', label: 'Left', cssClasses: 'rounded-l-lg', x: 70, y: 135, width: 35, height: 30 },
      { id: 7, type: 'button', label: 'Right', cssClasses: 'rounded-r-lg', x: 130, y: 135, width: 35, height: 30 },
      { id: 2, type: 'button', label: 'Select', cssClasses: 'rounded-full rotate-45', x: 230, y: 150, width: 40, height: 16 },
      { id: 3, type: 'button', label: 'Start', cssClasses: 'rounded-full rotate-45', x: 300, y: 150, width: 40, height: 16 },
      { id: 9, type: 'button', label: 'X', cssClasses: 'rounded-full', x: 460, y: 90, width: 45, height: 45 },
      { id: 0, type: 'button', label: 'B', cssClasses: 'rounded-full', x: 460, y: 170, width: 45, height: 45 },
      { id: 1, type: 'button', label: 'Y', cssClasses: 'rounded-full', x: 420, y: 130, width: 45, height: 45 },
      { id: 8, type: 'button', label: 'A', cssClasses: 'rounded-full', x: 500, y: 130, width: 45, height: 45 },
    ]
  },
  'PS2_NETHERSX2': {
    id: 'PS2_NETHERSX2',
    name: 'DualShock 2',
    width: 650,
    height: 350,
    scale: 0.7,
    elements: [
      { id: 12, type: 'trigger', label: 'L2', cssClasses: 'rounded-t-xl', x: 100, y: 10, width: 90, height: 35 },
      { id: 13, type: 'trigger', label: 'R2', cssClasses: 'rounded-t-xl', x: 460, y: 10, width: 90, height: 35 },
      { id: 10, type: 'bumper', label: 'L1', cssClasses: 'rounded-b-md', x: 100, y: 50, width: 90, height: 25 },
      { id: 11, type: 'bumper', label: 'R1', cssClasses: 'rounded-b-md', x: 460, y: 50, width: 90, height: 25 },
      { id: 4, type: 'button', label: 'Up', cssClasses: 'rounded-t-md', x: 120, y: 120, width: 35, height: 40 },
      { id: 5, type: 'button', label: 'Down', cssClasses: 'rounded-b-md', x: 120, y: 190, width: 35, height: 40 },
      { id: 6, type: 'button', label: 'Left', cssClasses: 'rounded-l-md', x: 85, y: 155, width: 40, height: 35 },
      { id: 7, type: 'button', label: 'Right', cssClasses: 'rounded-r-md', x: 155, y: 155, width: 40, height: 35 },
      { id: 2, type: 'button', label: 'Select', cssClasses: 'rounded-full', x: 260, y: 170, width: 35, height: 20 },
      { id: 3, type: 'button', label: 'Start', cssClasses: 'rounded-full', x: 350, y: 170, width: 35, height: 20 },
      { id: 9, type: 'button', label: '△', cssClasses: 'rounded-full', x: 480, y: 110, width: 45, height: 45 },
      { id: 0, type: 'button', label: '✖', cssClasses: 'rounded-full', x: 480, y: 190, width: 45, height: 45 },
      { id: 1, type: 'button', label: '■', cssClasses: 'rounded-full', x: 440, y: 150, width: 45, height: 45 },
      { id: 8, type: 'button', label: '◯', cssClasses: 'rounded-full', x: 520, y: 150, width: 45, height: 45 },
      { id: 14, type: 'analog', label: 'L3', cssClasses: 'rounded-full border-4', x: 200, y: 240, width: 70, height: 70 },
      { id: 15, type: 'analog', label: 'R3', cssClasses: 'rounded-full border-4', x: 380, y: 240, width: 70, height: 70 },
    ]
  },
  'NEOGEO_FBNEO': {
    id: 'NEOGEO_FBNEO',
    name: 'Neo Geo AES/MVS',
    width: 600,
    height: 300,
    scale: 0.8,
    elements: [
      { id: 4, type: 'button', label: 'Up', cssClasses: 'rounded-t-lg bg-red-900', x: 80, y: 100, width: 35, height: 40 },
      { id: 5, type: 'button', label: 'Down', cssClasses: 'rounded-b-lg bg-red-900', x: 80, y: 170, width: 35, height: 40 },
      { id: 6, type: 'button', label: 'Left', cssClasses: 'rounded-l-lg bg-red-900', x: 45, y: 135, width: 40, height: 35 },
      { id: 7, type: 'button', label: 'Right', cssClasses: 'rounded-r-lg bg-red-900', x: 110, y: 135, width: 40, height: 35 },
      { id: 2, type: 'button', label: 'Coin', cssClasses: 'rounded-full rotate-0', x: 230, y: 80, width: 35, height: 20 },
      { id: 3, type: 'button', label: 'Start', cssClasses: 'rounded-full rotate-0', x: 300, y: 80, width: 35, height: 20 },
      { id: 8, type: 'button', label: 'A', cssClasses: 'rounded-full bg-red-600', x: 380, y: 180, width: 50, height: 50 },
      { id: 0, type: 'button', label: 'B', cssClasses: 'rounded-full bg-yellow-500', x: 440, y: 150, width: 50, height: 50 },
      { id: 9, type: 'button', label: 'C', cssClasses: 'rounded-full bg-green-500', x: 500, y: 120, width: 50, height: 50 },
      { id: 1, type: 'button', label: 'D', cssClasses: 'rounded-full bg-blue-500', x: 560, y: 90, width: 50, height: 50 },
    ]
  },
  'ARCADE_MAME': {
    id: 'ARCADE_MAME',
    name: 'Arcade (MAME)',
    width: 600,
    height: 300,
    scale: 0.8,
    elements: [
      { id: 14, type: 'analog', label: 'Stick', cssClasses: 'rounded-full border-4 bg-red-800', x: 80, y: 120, width: 80, height: 80 },
      { id: 2, type: 'button', label: 'Coin', cssClasses: 'rounded-sm', x: 230, y: 50, width: 40, height: 30 },
      { id: 3, type: 'button', label: 'Start', cssClasses: 'rounded-sm border-2 border-white/20', x: 300, y: 50, width: 40, height: 30 },
      { id: 8, type: 'button', label: '1', cssClasses: 'rounded-full bg-blue-600', x: 380, y: 160, width: 45, height: 45 },
      { id: 0, type: 'button', label: '2', cssClasses: 'rounded-full bg-blue-600', x: 440, y: 140, width: 45, height: 45 },
      { id: 1, type: 'button', label: '3', cssClasses: 'rounded-full bg-blue-600', x: 500, y: 120, width: 45, height: 45 },
      { id: 9, type: 'button', label: '4', cssClasses: 'rounded-full bg-white/20', x: 380, y: 100, width: 45, height: 45 },
      { id: 10, type: 'button', label: '5', cssClasses: 'rounded-full bg-white/20', x: 440, y: 80, width: 45, height: 45 },
      { id: 11, type: 'button', label: '6', cssClasses: 'rounded-full bg-white/20', x: 500, y: 60, width: 45, height: 45 },
    ]
  }
};

export interface ThemeConfig {
  bgColor: string;
  headerColor: string;
  accentColor: string;
  fontFamily: string;
  panelStyle: string;
  glowEffect: boolean;
  buttonClass: string;
}

export type OptionType = 'toggle' | 'slider' | 'select';

export interface EngineOption {
  id: string;
  label: string;
  description: string;
  type: OptionType;
  category: 'System' | 'Graphics' | 'Audio' | 'Advanced';
  default: any;
  options?: string[]; // For select
  min?: number; max?: number; step?: number; unit?: string; // For slider
}

export const TENANT_THEMES: Record<string, ThemeConfig> = {
  'SNES_SNES9X': {
    bgColor: 'bg-[#1a1721]',
    headerColor: 'bg-[#292236]',
    accentColor: 'text-[#9b84d4]',
    fontFamily: 'font-mono',
    panelStyle: 'rounded-xl border-2 border-[#5c4a83] shadow-[4px_4px_0_#3d2e5a]',
    glowEffect: false,
    buttonClass: 'bg-[#5c4a83] hover:bg-[#7a64a3] text-white border-b-4 border-[#3d2e5a]',
  },
  'PS1_DUCKSTATION': {
    bgColor: 'bg-[#0f1115]',
    headerColor: 'bg-[#181b22]',
    accentColor: 'text-[#00e5ff]',
    fontFamily: 'font-sans tracking-wide',
    panelStyle: 'rounded-lg border border-[#00e5ff]/30 shadow-[0_0_15px_rgba(0,229,255,0.15)]',
    glowEffect: true,
    buttonClass: 'bg-transparent border border-[#00e5ff]/50 text-[#00e5ff] hover:bg-[#00e5ff]/10',
  },
  'NEOGEO_FBNEO': {
    bgColor: 'bg-black',
    headerColor: 'bg-[#111]',
    accentColor: 'text-red-500',
    fontFamily: 'font-mono uppercase',
    panelStyle: 'rounded-none border-4 border-red-900 shadow-inner',
    glowEffect: false,
    buttonClass: 'bg-red-700 hover:bg-red-600 text-white font-black',
  },
  'ARCADE_MAME': {
    bgColor: 'bg-zinc-950',
    headerColor: 'bg-zinc-900',
    accentColor: 'text-yellow-400',
    fontFamily: 'font-mono uppercase',
    panelStyle: 'rounded-md border border-zinc-700',
    glowEffect: false,
    buttonClass: 'bg-zinc-800 hover:bg-zinc-700 border-2 border-yellow-500 text-yellow-400',
  },
  'PS2_NETHERSX2': {
    bgColor: 'bg-[#000510]',
    headerColor: 'bg-[#00102a]',
    accentColor: 'text-blue-500',
    fontFamily: 'font-sans',
    panelStyle: 'rounded-2xl border border-blue-900/50',
    glowEffect: true,
    buttonClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]',
  }
};

// Fallback Theme
export const DEFAULT_THEME: ThemeConfig = {
  bgColor: 'bg-zinc-950',
  headerColor: 'bg-zinc-900',
  accentColor: 'text-white',
  fontFamily: 'font-sans',
  panelStyle: 'rounded-lg border border-white/10',
  glowEffect: false,
  buttonClass: 'bg-white/10 hover:bg-white/20 text-white',
};

export const TENANT_ENGINE_OPTIONS: Record<string, EngineOption[]> = {
  'SNES_SNES9X': [
    { id: 'snes9x_filter', label: 'Video Filter', description: 'Smoothing algorithm for pixel art', type: 'select', category: 'Graphics', default: 'None', options: ['None', 'Super2xSaI', 'SuperEagle', 'EPX', 'HQ2x', 'NTSC Composite'] },
    { id: 'snes9x_superfx_overclock', label: 'SuperFX Overclock', description: 'Boosts FPS in Star Fox and Yoshi\'s Island', type: 'slider', category: 'Advanced', default: 100, min: 100, max: 500, step: 50, unit: '%' },
    { id: 'snes9x_audio_interpolation', label: 'Audio Interpolation', description: 'Smooths out low-quality audio samples', type: 'select', category: 'Audio', default: 'Gaussian', options: ['None', 'Linear', 'Gaussian', 'Sinc'] }
  ],
  'PS1_DUCKSTATION': [
    { id: 'duckstation_pgxp', label: 'PGXP Geometry Correction', description: 'Fixes polygon wobble and texture warping (Crucial)', type: 'toggle', category: 'Graphics', default: true },
    { id: 'duckstation_resolution', label: 'Internal Resolution', description: 'Multiplies base 240p resolution', type: 'select', category: 'Graphics', default: '2x (480p)', options: ['1x (Native)', '2x (480p)', '3x (720p)', '4x (1080p)', '5x (1440p)'] },
    { id: 'duckstation_widescreen', label: 'Widescreen Hack', description: 'Forces 16:9 aspect ratio via engine', type: 'toggle', category: 'Graphics', default: false },
    { id: 'duckstation_true_color', label: 'True Color (24-bit)', description: 'Eliminates color banding', type: 'toggle', category: 'Graphics', default: true },
  ],
  'NEOGEO_FBNEO': [
    { id: 'fbneo_unibios', label: 'Use Universe BIOS', description: 'Enables cheats, region changing, and dipswitches', type: 'toggle', category: 'System', default: true },
    { id: 'fbneo_neogeo_mode', label: 'NeoGeo Mode', description: 'Arcade (MVS) or Console (AES)', type: 'select', category: 'System', default: 'MVS (Arcade)', options: ['MVS (Arcade)', 'AES (Console)'] },
    { id: 'fbneo_cpu_overclock', label: 'M68K Overclock', description: 'Reduces slowdowns in Metal Slug', type: 'slider', category: 'Advanced', default: 100, min: 100, max: 200, step: 10, unit: '%' }
  ],
  'ARCADE_MAME': [
    { id: 'mame2003_vector_resolution', label: 'Vector Resolution', description: 'High-res rendering for vector games (Asteroids)', type: 'select', category: 'Graphics', default: '1024x768', options: ['Native', '1024x768', '1920x1080'] },
    { id: 'mame2003_skip_disclaimer', label: 'Skip Disclaimer', description: 'Skips the MAME warning screens', type: 'toggle', category: 'System', default: true },
    { id: 'mame2003_sample_rate', label: 'Audio Sample Rate', description: 'Output frequency', type: 'select', category: 'Audio', default: '48000', options: ['22050', '44100', '48000'] }
  ],
  'PS2_NETHERSX2': [
    { id: 'ee_cycle_rate', label: 'EE Cycle Rate (Underclock)', description: 'Skips MIPS instructions. Helps low-end devices.', type: 'slider', category: 'System', default: 100, min: 50, max: 300, step: 10, unit: '%' },
    { id: 'vu_cycle_stealing', label: 'VU Cycle Stealing', description: 'Massive FPS boost, causes visual lag.', type: 'slider', category: 'System', default: 0, min: 0, max: 3, step: 1, unit: '' },
    { id: 'vulkan_renderer', label: 'Vulkan Renderer', description: 'Use Vulkan instead of OpenGL.', type: 'toggle', category: 'Graphics', default: true },
    { id: 'resolution_multi', label: 'Resolution Multiplier', description: 'Upscaling factor', type: 'select', category: 'Graphics', default: '2x', options: ['1x', '2x', '3x', '4x'] },
    { id: 'texture_preload', label: 'Texture Preloading', description: 'Prevents stutters at cost of VRAM', type: 'select', category: 'Graphics', default: 'Full', options: ['None', 'Partial', 'Full'] },
    { id: 'affinity_control', label: 'Affinity Control', description: 'Force threads on Cortex-X cores', type: 'toggle', category: 'System', default: true },
  ],
  'N64_MUPEN64PLUS': [
    { id: 'rdpPlugin', label: 'RDP Plugin', description: 'Video renderer backend', type: 'select', category: 'Graphics', default: 'GlideN64', options: ['GlideN64', 'Angrylion', 'Parallel'] },
    { id: 'resolution', label: 'Internal Resolution', description: 'Upscaling factor', type: 'select', category: 'Graphics', default: '640x480', options: ['320x240 (Native)', '640x480', '960x720', '1440x1080'] },
    { id: 'framerate_hack', label: 'Full Framerate Hack', description: 'Forces 60fps in some games', type: 'toggle', category: 'System', default: false },
    { id: 'cpucore', label: 'CPU Core', description: 'Execution engine', type: 'select', category: 'System', default: 'dynamic_recompiler', options: ['pure_interpreter', 'cached_interpreter', 'dynamic_recompiler'] }
  ]
};
