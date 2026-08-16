import React, { useRef, useState } from 'react';

interface Props {
  onDirectionChange: (dirs: { up: boolean, down: boolean, left: boolean, right: boolean }) => void;
  onAxis?: (x: number, y: number) => void;
  className?: string;
  style?: React.CSSProperties;
  editMode?: boolean;
}

export const VirtualJoystick: React.FC<Props> = ({ onDirectionChange, onAxis, className, style, editMode }) => {
  const [puckPos, setPuckPos] = useState({ x: 0, y: 0 });
  const [activeDirs, setActiveDirs] = useState({ up: false, down: false, left: false, right: false });
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const calculateInput = (clientX: number, clientY: number) => {
    if (!originRef.current) return;
    const dx = clientX - originRef.current.x;
    const dy = clientY - originRef.current.y;
    
    const maxRadius = 40; // High sensitivity for fighting games
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate normalized axis (-1.0 to 1.0)
    let nx = dx / maxRadius;
    let ny = dy / maxRadius;
    
    if (distance > maxRadius) {
      nx = dx / distance;
      ny = dy / distance;
    }
    
    // Visual puck pos
    setPuckPos({ x: nx * maxRadius, y: ny * maxRadius });

    // Emit analog with radial deadzone
    if (onAxis) {
      if (distance < 6) {
        onAxis(0, 0);
      } else {
        const deadzoneRatio = 6 / maxRadius;
        const mag = Math.sqrt(nx * nx + ny * ny);
        const normalizedMag = Math.min(1.0, (mag - deadzoneRatio) / (1.0 - deadzoneRatio));
        const scale = normalizedMag / mag;
        onAxis(nx * scale, ny * scale);
      }
    }

    // Deadzone for D-Pad
    if (distance < 12) {
      if (activeDirs.up || activeDirs.down || activeDirs.left || activeDirs.right) {
        const none = { up: false, down: false, left: false, right: false };
        setActiveDirs(none);
        onDirectionChange(none);
      }
      return;
    }

    // Calculate 8-way D-Pad direction
    // A standard threshold for diagonal is if the minor axis is at least ~40% of the major axis
    // But simply checking independently is better:
    const newDirs = { up: false, down: false, left: false, right: false };
    
    // We use an angle or simple ratio to determine 8-way sectors.
    // 8 sectors of 45 degrees each.
    const angle = Math.atan2(dy, dx); // -PI to PI
    // Convert to degrees for easier logic
    let deg = angle * (180 / Math.PI);
    if (deg < 0) deg += 360;

    // Right: 337.5 - 22.5
    // Down-Right: 22.5 - 67.5
    // Down: 67.5 - 112.5
    // Down-Left: 112.5 - 157.5
    // Left: 157.5 - 202.5
    // Up-Left: 202.5 - 247.5
    // Up: 247.5 - 292.5
    // Up-Right: 292.5 - 337.5

    if (deg >= 337.5 || deg < 22.5) { newDirs.right = true; }
    else if (deg >= 22.5 && deg < 67.5) { newDirs.right = true; newDirs.down = true; }
    else if (deg >= 67.5 && deg < 112.5) { newDirs.down = true; }
    else if (deg >= 112.5 && deg < 157.5) { newDirs.down = true; newDirs.left = true; }
    else if (deg >= 157.5 && deg < 202.5) { newDirs.left = true; }
    else if (deg >= 202.5 && deg < 247.5) { newDirs.left = true; newDirs.up = true; }
    else if (deg >= 247.5 && deg < 292.5) { newDirs.up = true; }
    else if (deg >= 292.5 && deg < 337.5) { newDirs.up = true; newDirs.right = true; }

    if (
      newDirs.up !== activeDirs.up ||
      newDirs.down !== activeDirs.down ||
      newDirs.left !== activeDirs.left ||
      newDirs.right !== activeDirs.right
    ) {
      setActiveDirs(newDirs);
      onDirectionChange(newDirs);
    }
  };

  const handleStart = (clientX: number, clientY: number, target: EventTarget & HTMLDivElement) => {
    if (editMode) return;
    const rect = target.getBoundingClientRect();
    originRef.current = { 
      x: rect.left + rect.width / 2, 
      y: rect.top + rect.height / 2 
    };
    calculateInput(clientX, clientY);
  };

  const reset = () => {
    originRef.current = null;
    setPuckPos({ x: 0, y: 0 });
    if (onAxis) onAxis(0, 0);
    if (activeDirs.up || activeDirs.down || activeDirs.left || activeDirs.right) {
      const none = { up: false, down: false, left: false, right: false };
      setActiveDirs(none);
      onDirectionChange(none);
    }
  };

  return (
    <div
      className={`absolute w-36 h-36 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20 shadow-2xl backdrop-blur-md ${editMode ? 'ring-4 ring-cyan-500 cursor-move' : 'touch-none'} ${className || ''}`}
      style={{ pointerEvents: editMode ? 'auto' : 'auto', ...style }}
      
      // Touch Support
      onTouchStart={(e) => {
        const touch = e.targetTouches[0];
        if (touch) handleStart(touch.clientX, touch.clientY, e.currentTarget);
      }}
      onTouchMove={(e) => {
        if (editMode || !originRef.current) return;
        const touch = e.targetTouches[0];
        if (touch) calculateInput(touch.clientX, touch.clientY);
      }}
      onTouchEnd={(e) => {
        if (!editMode) reset();
      }}
      onTouchCancel={(e) => {
        if (!editMode) reset();
      }}

      // Mouse Fallback
      onMouseDown={(e) => handleStart(e.clientX, e.clientY, e.currentTarget)}
      onMouseMove={(e) => {
        if (editMode || !originRef.current) return;
        calculateInput(e.clientX, e.clientY);
      }}
      onMouseUp={(e) => {
        if (!editMode) reset();
      }}
      onMouseLeave={(e) => {
        if (!editMode) reset();
      }}
    >
      <div className="absolute w-2 h-2 bg-white/30 rounded-full pointer-events-none" />
      <div 
        className="w-14 h-14 bg-black/50 border border-white/30 rounded-full transition-none pointer-events-none shadow-lg backdrop-blur-md flex items-center justify-center"
        style={{ transform: `translate(${puckPos.x}px, ${puckPos.y}px)` }}
      >
        <div className="w-6 h-6 bg-white/10 rounded-full" />
      </div>
    </div>
  );
};
