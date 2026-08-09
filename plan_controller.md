1. Add `useGamepad` hook to poll `navigator.getGamepads()` and call `emitNativeButton` on state changes.
2. Update D-PAD logic to use `onTouchStart` and `onTouchEnd` instead of Pointer events to be more reliable on mobile, or just rely on the Gamepad API.
3. Ignore `backButton` if gamepad "B" was pressed within the last 100ms?
