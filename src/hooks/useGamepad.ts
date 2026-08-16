import { useEffect, useRef, useState } from 'react';

export const useGamepad = (
  tenantId: string,
  onButtonChange: (port: number, libretroId: number, isPressed: boolean) => void,
  onAnalogChange: (port: number, stick: number, x: number, y: number) => void,
  onActivity: () => void
) => {
  const requestRef = useRef<number>();
  const previousState = useRef<Record<number, boolean>>({});
  
  const defaultMap = {
    0: 0, 1: 8, 2: 1, 3: 9, 4: 10, 5: 11, 6: 12, 7: 13, 8: 2, 9: 3, 12: 4, 13: 5, 14: 6, 15: 7,
    'axis_0_-1': 6, 'axis_0_1': 7, 'axis_1_-1': 4, 'axis_1_1': 5
  };

  const prevAnalog = useRef<Record<string, number>>({});
  const mapRef = useRef<Record<number, number>>(defaultMap);

  useEffect(() => {
    const storageKey = `gamepad_map_${tenantId}`;

    const loadMap = () => {
      const savedMapStr = localStorage.getItem(storageKey);
      if (savedMapStr) {
        try {
          mapRef.current = JSON.parse(savedMapStr);
        } catch (e) {}
      } else {
        mapRef.current = defaultMap;
      }
    };
    
    // Load initially
    loadMap();

    // Listen for updates from InputMapper
    const handleMapUpdate = (e: any) => {
      if (e.detail?.coreName === tenantId) {
        loadMap();
      }
    };
    window.addEventListener('gamepad_map_updated', handleMapUpdate);

    const loop = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let isActive = false;
      
      const map = mapRef.current;

      for (const gp of gamepads) {
        if (!gp) continue;
        
        const map = mapRef.current;
        const currentFrameState: Record<number, boolean> = {};

        gp.buttons.forEach((btn, idx) => {
          const pressed = btn.pressed || btn.value > 0.5;
          if (pressed) {
            isActive = true;
            window.dispatchEvent(new CustomEvent('gamepad_button_raw', { detail: { buttonIndex: idx } }));
          }

          const libretroId = (map as any)[idx];
          if (libretroId !== undefined) {
            let finalPressed = pressed;
            if (pressed && (window as any)._autofireActive) {
              // Face buttons: 0, 1, 8, 9, 10, 11 (B, Y, A, X, L, R usually)
              if ([0, 1, 8, 9].includes(libretroId)) {
                // Pulse every 3 frames (~50ms at 60fps)
                finalPressed = (Date.now() % 100) > 50;
              }
            }
            currentFrameState[libretroId] = currentFrameState[libretroId] || finalPressed;
          }
        });
        
        const rawLx = gp.axes[0] || 0;
        const rawLy = gp.axes[1] || 0;
        const rawRx = gp.axes[2] || 0;
        const rawRy = gp.axes[3] || 0;

        // [ISOLAMENTO GALVÂNICO] Radial Deadzone (15%) with smooth normalized rescaling
        const applyRadialDeadzone = (x: number, y: number, deadzone = 0.15) => {
          const mag = Math.sqrt(x * x + y * y);
          if (mag < deadzone) return { x: 0, y: 0 };
          const normalized = Math.min(1.0, (mag - deadzone) / (1.0 - deadzone));
          const scale = normalized / mag;
          return { x: x * scale, y: y * scale };
        };

        const { x: lx, y: ly } = applyRadialDeadzone(rawLx, rawLy, 0.15);
        const { x: rx, y: ry } = applyRadialDeadzone(rawRx, rawRy, 0.15);

        const handleAxisAsButton = (axisKey: string, isPressed: boolean) => {
          if (isPressed) {
            isActive = true;
            window.dispatchEvent(new CustomEvent('gamepad_axis_raw', { detail: { axisId: axisKey } }));
          }
          const libretroId = (map as any)[axisKey];
          if (libretroId !== undefined) {
            currentFrameState[libretroId] = currentFrameState[libretroId] || isPressed;
          }
        };

        const threshold = 0.45;
        const leftStickLeft = lx < -threshold;
        const leftStickRight = lx > threshold;
        const leftStickUp = ly < -threshold;
        const leftStickDown = ly > threshold;
        
        handleAxisAsButton('axis_0_-1', leftStickLeft);
        handleAxisAsButton('axis_0_1',  leftStickRight);
        handleAxisAsButton('axis_1_-1', leftStickUp);
        handleAxisAsButton('axis_1_1',  leftStickDown);
        
        handleAxisAsButton('axis_2_-1', rx < -threshold);
        handleAxisAsButton('axis_2_1',  rx > threshold);
        handleAxisAsButton('axis_3_-1', ry < -threshold);
        handleAxisAsButton('axis_3_1',  ry > threshold);

        // [ISOLAMENTO GALVÂNICO] Auto-Mirror Analog -> D-PAD para jogos Retro
        if ((map as any)['axis_0_-1'] === undefined) {
          currentFrameState[6] = currentFrameState[6] || leftStickLeft;
          currentFrameState[7] = currentFrameState[7] || leftStickRight;
          currentFrameState[4] = currentFrameState[4] || leftStickUp;
          currentFrameState[5] = currentFrameState[5] || leftStickDown;
        }

        // Emit state changes
        for (let i = 0; i <= 15; i++) {
          const isPressed = !!currentFrameState[i];
          const stateKey = `${gp.index}_${i}`;
          if (previousState.current[stateKey] !== isPressed) {
            onButtonChange(gp.index, i, isPressed);
            previousState.current[stateKey] = isPressed;
          }
        }

        // Send native analog to core with change threshold
        const checkAnalog = (port: number, stick: number, x: number, y: number) => {
          const keyX = `${port}_${stick}_x`;
          const keyY = `${port}_${stick}_y`;
          const prevX = prevAnalog.current[keyX] || 0;
          const prevY = prevAnalog.current[keyY] || 0;
          
          if (Math.abs(x - prevX) > 0.03 || Math.abs(y - prevY) > 0.03 || (x === 0 && prevX !== 0) || (y === 0 && prevY !== 0)) {
            onAnalogChange(port, stick, x, y);
            prevAnalog.current[keyX] = x;
            prevAnalog.current[keyY] = y;
          }
        };

        checkAnalog(gp.index, 0, lx, ly); // Left stick
        checkAnalog(gp.index, 1, rx, ry); // Right stick
      }
      
      if (isActive) onActivity();
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('gamepad_map_updated', handleMapUpdate);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [tenantId, onButtonChange, onAnalogChange, onActivity]);
};
