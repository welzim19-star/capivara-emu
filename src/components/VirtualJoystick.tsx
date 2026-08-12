import React, { useRef, useState } from 'react';

interface Props {
  onDirectionChange: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE') => void;
  className?: string;
  style?: React.CSSProperties;
  editMode?: boolean;
}

export const VirtualJoystick: React.FC<Props> = ({ onDirectionChange, className, style, editMode }) => {
  const [activeDir, setActiveDir] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE'>('NONE');
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const calculateDirection = (e: React.PointerEvent) => {
    if (!originRef.current) return;
    const dx = e.clientX - originRef.current.x;
    const dy = e.clientY - originRef.current.y;
    
    // Deadzone
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      if (activeDir !== 'NONE') {
        setActiveDir('NONE');
        onDirectionChange('NONE');
      }
      return;
    }

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

  return (
    <div
      className={`absolute w-40 h-40 bg-white/10 rounded-full flex items-center justify-center border border-white/20 shadow-2xl backdrop-blur-md ${editMode ? 'ring-4 ring-cyan-500 cursor-move' : 'touch-none'} ${className || ''}`}
      style={style}
      onPointerDown={(e) => {
        if (editMode) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        originRef.current = { x: e.clientX, y: e.clientY };
        calculateDirection(e);
      }}
      onPointerMove={(e) => {
        if (editMode) return;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          calculateDirection(e);
        }
      }}
      onPointerUp={(e) => {
        if (editMode) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        originRef.current = null;
        if (activeDir !== 'NONE') {
          setActiveDir('NONE');
          onDirectionChange('NONE');
        }
      }}
      onPointerCancel={(e) => {
        if (editMode) return;
        originRef.current = null;
        if (activeDir !== 'NONE') {
          setActiveDir('NONE');
          onDirectionChange('NONE');
        }
      }}
    >
      <div className={`w-12 h-12 bg-black/40 rounded-full transition-all duration-100 pointer-events-none ${activeDir === 'UP' ? '-translate-y-8' : activeDir === 'DOWN' ? 'translate-y-8' : activeDir === 'LEFT' ? '-translate-x-8' : activeDir === 'RIGHT' ? 'translate-x-8' : ''}`} />
    </div>
  );
};
