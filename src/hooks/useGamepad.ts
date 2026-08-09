import { useEffect, useRef } from 'react';

export const useGamepad = (
  onButtonChange: (libretroId: number, isPressed: boolean) => void,
  onActivity: () => void
) => {
  const requestRef = useRef<number>();
  const previousState = useRef<Record<number, boolean>>({});
  
  const map = {
    0: 0, 1: 8, 2: 1, 3: 9, 4: 10, 5: 11, 8: 2, 9: 3, 12: 4, 13: 5, 14: 6, 15: 7
  };

  useEffect(() => {
    const loop = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let isActive = false;
      for (const gp of gamepads) {
        if (!gp) continue;
        
        gp.buttons.forEach((btn, idx) => {
          const libretroId = (map as any)[idx];
          if (libretroId !== undefined) {
            const pressed = btn.pressed || btn.value > 0.5;
            if (pressed) isActive = true;
            if (previousState.current[libretroId] !== pressed) {
              onButtonChange(libretroId, pressed);
              previousState.current[libretroId] = pressed;
            }
          }
        });
        
        const x = gp.axes[0] || 0;
        const y = gp.axes[1] || 0;
        const left = x < -0.5;
        const right = x > 0.5;
        const up = y < -0.5;
        const down = y > 0.5;
        
        if (left || right || up || down) isActive = true;
        
        const updateAxis = (id: number, pressed: boolean) => {
          if (previousState.current[id] !== pressed) {
            onButtonChange(id, pressed);
            previousState.current[id] = pressed;
          }
        };
        
        updateAxis(6, left);
        updateAxis(7, right);
        updateAxis(4, up);
        updateAxis(5, down);
      }
      
      if (isActive) onActivity();
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [onButtonChange, onActivity]);
};
