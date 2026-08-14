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
            currentFrameState[libretroId] = currentFrameState[libretroId] || pressed;
          }
        });
        
        const lx = gp.axes[0] || 0;
        const ly = gp.axes[1] || 0;
        const rx = gp.axes[2] || 0;
        const ry = gp.axes[3] || 0;

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

        const threshold = 0.4;
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

        
        // Only send native analog to core if changed by more than 0.05
        const checkAnalog = (port: number, stick: number, x: number, y: number) => {
          const keyX = `${port}_${stick}_x`;
          const keyY = `${port}_${stick}_y`;
          const prevX = prevAnalog.current[keyX] || 0;
          const prevY = prevAnalog.current[keyY] || 0;
          
          if (Math.abs(x - prevX) > 0.05 || Math.abs(y - prevY) > 0.05 || (x === 0 && prevX !== 0) || (y === 0 && prevY !== 0)) {
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
