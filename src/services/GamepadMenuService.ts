// Standard mapping for common gamepads (Xbox, PS, Generic USB)
export const GamepadStandardMapping = {
  buttonUp: 12,
  buttonDown: 13,
  buttonLeft: 14,
  buttonRight: 15,
  axisY: 1, // Left Stick Y
  axisX: 0, // Left Stick X
  buttonA: 0, // usually cross or A (bottom button)
  buttonB: 1, // usually circle or B (right button)
  buttonSelect: 8,
  buttonStart: 9,
  axisThreshold: 0.5,
};

type GamepadCallback = (action: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CONFIRM' | 'BACK') => void;

export class GamepadMenuService {
  private static instance: GamepadMenuService;
  private listening = false;
  private lastActionTime = 0;
  private animationFrameId: number | null = null;
  private callbacks: Set<GamepadCallback> = new Set();
  
  // Debounce duration for menu navigation
  private readonly COOLDOWN_MS = 200;

  private constructor() {
    this.loop = this.loop.bind(this);
  }

  public static getInstance(): GamepadMenuService {
    if (!GamepadMenuService.instance) {
      GamepadMenuService.instance = new GamepadMenuService();
    }
    return GamepadMenuService.instance;
  }

  public subscribe(cb: GamepadCallback) {
    this.callbacks.add(cb);
    if (!this.listening) this.startListening();
  }

  public unsubscribe(cb: GamepadCallback) {
    this.callbacks.delete(cb);
    if (this.callbacks.size === 0) this.stopListening();
  }

  private startListening() {
    this.listening = true;
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  private stopListening() {
    this.listening = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private triggerAction(action: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CONFIRM' | 'BACK') {
    const now = performance.now();
    if (now - this.lastActionTime > this.COOLDOWN_MS) {
      this.lastActionTime = now;
      this.callbacks.forEach(cb => cb(action));
    }
  }

  private loop() {
    if (!this.listening) return;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp) continue;

      const m = GamepadStandardMapping;
      let x = 0;
      let y = 0;

      // Check D-PAD
      if (gp.buttons[m.buttonUp]?.pressed) y = -1;
      if (gp.buttons[m.buttonDown]?.pressed) y = 1;
      if (gp.buttons[m.buttonLeft]?.pressed) x = -1;
      if (gp.buttons[m.buttonRight]?.pressed) x = 1;

      // Check Analog Sticks if D-PAD is not pressed
      if (y === 0) {
        if (gp.axes[m.axisY] < -m.axisThreshold) y = -1;
        if (gp.axes[m.axisY] > m.axisThreshold) y = 1;
      }
      if (x === 0) {
        if (gp.axes[m.axisX] < -m.axisThreshold) x = -1;
        if (gp.axes[m.axisX] > m.axisThreshold) x = 1;
      }

      if (y === -1) this.triggerAction('UP');
      if (y === 1) this.triggerAction('DOWN');
      if (x === -1) this.triggerAction('LEFT');
      if (x === 1) this.triggerAction('RIGHT');

      if (gp.buttons[m.buttonA]?.pressed) this.triggerAction('CONFIRM');
      if (gp.buttons[m.buttonB]?.pressed) this.triggerAction('BACK');
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  }
}
