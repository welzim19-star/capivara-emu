import { useEffect, useRef, useState } from 'react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null;

export function useGamepadNav() {
  const [direction, setDirection] = useState<Direction>(null);
  const [buttonA, setButtonA] = useState(false);
  const [buttonB, setButtonB] = useState(false);
  const [buttonL1, setButtonL1] = useState(false);
  const [buttonR1, setButtonR1] = useState(false);

  const reqRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const cooldownMs = 150; // Delay between D-Pad movements

  useEffect(() => {
    const loop = (time: number) => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let activePad = null;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          activePad = gamepads[i];
          break;
        }
      }

      if (activePad) {
        if (time - lastTimeRef.current > cooldownMs) {
          // D-Pad or Left Stick
          let dir: Direction = null;
          if (activePad.axes[1] < -0.5 || activePad.buttons[12]?.pressed) dir = 'UP';
          else if (activePad.axes[1] > 0.5 || activePad.buttons[13]?.pressed) dir = 'DOWN';
          else if (activePad.axes[0] < -0.5 || activePad.buttons[14]?.pressed) dir = 'LEFT';
          else if (activePad.axes[0] > 0.5 || activePad.buttons[15]?.pressed) dir = 'RIGHT';

          if (dir !== null) {
            setDirection(dir);
            lastTimeRef.current = time;
            // Clear direction on next frame so we can detect hold-repeats
            setTimeout(() => setDirection(null), 50);
          }
        }

        // Action Buttons (A/B depends on Nintendo/Xbox layout, usually 0 or 1)
        // Here we just use standard mapping: 0=A(bottom), 1=B(right)
        setButtonA(activePad.buttons[0]?.pressed || false);
        setButtonB(activePad.buttons[1]?.pressed || false);
        setButtonL1(activePad.buttons[4]?.pressed || false);
        setButtonR1(activePad.buttons[5]?.pressed || false);
      }

      reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, []);

  return { direction, buttonA, buttonB, buttonL1, buttonR1 };
}
