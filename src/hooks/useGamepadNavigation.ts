import { useEffect } from 'react';
import { GamepadMenuService } from '../services/GamepadMenuService';
import { sfx } from '../utils/sfx';

export function useGamepadNavigation(isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleGamepadAction = (action: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CONFIRM' | 'BACK') => {
      const focusables = Array.from(document.querySelectorAll<HTMLElement>('[tabindex="0"], button:not([disabled]), a[href], input:not([disabled])'))
                              .filter(el => {
                                const rect = el.getBoundingClientRect();
                                return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
                              });
      
      if (focusables.length === 0) return;

      const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);

      if (action === 'CONFIRM') {
        if (currentIndex >= 0) {
          sfx.playSelect();
          focusables[currentIndex].click();
        }
        return;
      }

      if (action === 'BACK') {
        sfx.playBack();
        // Here we could simulate an Escape key or find a generic back button
        return;
      }

      let nextIndex = currentIndex;

      if (action === 'RIGHT') {
        nextIndex = currentIndex < focusables.length - 1 ? currentIndex + 1 : 0;
      } else if (action === 'LEFT') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : focusables.length - 1;
      } else if (action === 'DOWN') {
        // Simple heuristic: jump a few elements ahead, assuming a grid layout
        nextIndex = currentIndex < focusables.length - 4 ? currentIndex + 4 : focusables.length - 1;
      } else if (action === 'UP') {
        nextIndex = currentIndex >= 4 ? currentIndex - 4 : 0;
      }

      if (nextIndex !== currentIndex && focusables[nextIndex]) {
        focusables[nextIndex].focus();
        // Ensure the element is scrolled into view smoothly
        focusables[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const service = GamepadMenuService.getInstance();
    service.subscribe(handleGamepadAction);

    // Initial focus if nothing is focused
    if (document.activeElement === document.body) {
      const firstFocusable = document.querySelector<HTMLElement>('[tabindex="0"]');
      if (firstFocusable) firstFocusable.focus();
    }

    return () => {
      service.unsubscribe(handleGamepadAction);
    };
  }, [isActive]);
}
