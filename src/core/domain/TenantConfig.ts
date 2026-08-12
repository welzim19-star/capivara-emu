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
  }
};
