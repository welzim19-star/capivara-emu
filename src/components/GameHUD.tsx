import React from 'react';

interface Props {
  fpsRef: React.RefObject<HTMLSpanElement>;
  batteryRef: React.RefObject<HTMLSpanElement>;
  timeRef: React.RefObject<HTMLSpanElement>;
  visible: boolean;
}

export const GameHUD: React.FC<Props> = ({ fpsRef, batteryRef, timeRef, visible }) => {
  if (!visible) return null;

  return (
    <div className="absolute top-2 right-2 pointer-events-none z-[100] flex items-center gap-2">
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-3 shadow-lg">
        <span ref={batteryRef} className="text-[10px] font-mono text-green-400 font-bold tracking-widest">
          🔋 --%
        </span>
        <div className="h-3 w-px bg-white/20" />
        <span ref={timeRef} className="text-[10px] font-mono text-cyan-400 font-bold tracking-widest">
          ⏱️ --:--
        </span>
        <div className="h-3 w-px bg-white/20" />
        <span ref={fpsRef} className="text-[10px] font-mono text-purple-400 font-bold tracking-widest">
          FPS: 0.0
        </span>
      </div>
    </div>
  );
};
