import React, { useRef, useState } from 'react';

interface Props {
  onDirectionChange: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE') => void;
  onAxis?: (x: number, y: number) => void;
  className?: string;
  style?: React.CSSProperties;
  editMode?: boolean;
}

export const VirtualJoystick: React.FC<Props> = ({ onDirectionChange, onAxis, className, style, editMode }) => {
  const [puckPos, setPuckPos] = useState({ x: 0, y: 0 });
  const [activeDir, setActiveDir] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE'>('NONE');
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const calculateInput = (e: React.PointerEvent) => {
    if (!originRef.current) return;
    const dx = e.clientX - originRef.current.x;
    const dy = e.clientY - originRef.current.y;
    
    const maxRadius = 40; // max visual displacement for the puck
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

    // Emit analog
    if (onAxis) {
      onAxis(nx, ny);
    }

    // Deadzone for D-Pad
    if (distance < 15) {
      if (activeDir !== 'NONE') {
        setActiveDir('NONE');
        onDirectionChange('NONE');
      }
      return;
    }

    // Calculate D-Pad direction
    let newDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' = 'NONE' as any;
    if (Math.abs(dx) > Math.abs(dy)) {
      newDir = dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
      newDir = dy > 0 ? 'DOWN' : 'UP';
    }

    if (newDir !== activeDir) {
      setActiveDir(newDir);
      onDirectionChange(newDir);
    }
  };

  const reset = () => {
    originRef.current = null;
    setPuckPos({ x: 0, y: 0 });
    if (onAxis) onAxis(0, 0);
    if (activeDir !== 'NONE') {
      setActiveDir('NONE');
      onDirectionChange('NONE');
    }
  };

  return (
    <div
      className={`absolute w-36 h-36 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20 shadow-2xl backdrop-blur-md ${editMode ? 'ring-4 ring-cyan-500 cursor-move' : 'touch-none'} ${className || ''}`}
      style={{ pointerEvents: editMode ? 'auto' : 'auto', ...style }}
      onPointerDown={(e) => {
        if (editMode) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        originRef.current = { x: e.clientX, y: e.clientY };
        calculateInput(e);
      }}
      onPointerMove={(e) => {
        if (editMode) return;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          calculateInput(e);
        }
      }}
      onPointerUp={(e) => {
        if (editMode) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        reset();
      }}
      onPointerCancel={(e) => {
        if (editMode) return;
        reset();
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
