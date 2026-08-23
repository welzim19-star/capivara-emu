// PolyGamepad.tsx
// Polymorphic Touch Gamepads — each console gets its original layout.
// Emits events via emitBtn(port, buttonId, isPressed) and emitAxis(port, stick, x, y).

import React from 'react';

type EmitBtn  = (port: number, id: number, pressed: boolean) => void;
type EmitAxis = (port: number, stick: number, x: number, y: number) => void;

const haptic = (ms = 30) => { if ('vibrate' in navigator) navigator.vibrate(ms); };

// ── D-Pad (shared) ────────────────────────────────────────────────────────────
export const DPad: React.FC<{ onEmit: EmitBtn; style?: React.CSSProperties }> = ({ onEmit, style }) => {
  const dBtn = (id: number, label: string, s: React.CSSProperties) => (
    <button key={id}
      data-btn-id={id}
      className="absolute flex items-center justify-center font-black text-white/80 select-none touch-none active:scale-90 transition-transform"
      style={{ width: 42, height: 42, borderRadius: 8, background: 'rgba(255,255,255,0.12)', userSelect: 'none', ...s }}>
      {label}
    </button>
  );
  return (
    <div className="absolute" style={{ width: 128, height: 128, ...style }}>
      {dBtn(4, '▲', { top: 0, left: '50%', transform: 'translateX(-50%)' })}
      {dBtn(5, '▼', { bottom: 0, left: '50%', transform: 'translateX(-50%)' })}
      {dBtn(6, '◀', { top: '50%', left: 0, transform: 'translateY(-50%)' })}
      {dBtn(7, '▶', { top: '50%', right: 0, transform: 'translateY(-50%)' })}
      <div className="absolute rounded-full" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 42, height: 42, background: 'rgba(255,255,255,0.05)' }} />
    </div>
  );
};

// ── Start/Select (shared) ─────────────────────────────────────────────────────
export const StartSelect: React.FC<{ onEmit: EmitBtn; accent?: string }> = ({ onEmit, accent = '#ffffff' }) => (
  <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex gap-5" style={{ pointerEvents: 'auto' }}>
    {([{ id: 2, label: 'SELECT' }, { id: 3, label: 'START' }]).map(b => (
      <button key={b.id}
        data-btn-id={b.id}
        className="px-5 py-2 rounded-full font-bold text-xs tracking-widest select-none touch-none active:scale-90"
        style={{ background: 'rgba(255,255,255,0.09)', border: `1px solid ${accent}40`, color: 'rgba(255,255,255,0.65)', userSelect: 'none' }}>
        {b.label}
      </button>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// SNES / GBA — Y/B/A/X diamond + L/R bumpers
// ═══════════════════════════════════════════════════════════════════════════
export const SNESGamepad: React.FC<{ onEmit: EmitBtn }> = ({ onEmit }) => {
  const face = (id: number, label: string, bg: string, border: string, pos: React.CSSProperties) => (
    <button key={id}
      data-btn-id={id}
      className="absolute flex items-center justify-center rounded-full font-black text-white select-none touch-none active:scale-90 transition-transform"
      style={{ width: 46, height: 46, background: bg, border: `2px solid ${border}`, userSelect: 'none', ...pos }}>
      {label}
    </button>
  );
  const bump = (id: number, label: string, pos: React.CSSProperties) => (
    <button
      data-btn-id={id}
      className="font-black text-sm text-white/80 select-none touch-none active:scale-90 flex items-center justify-center"
      style={{ position: 'absolute', width: 64, height: 30, borderRadius: 12, background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.25)', userSelect: 'none', ...pos }}>
      {label}
    </button>
  );
  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>

      <div style={{ position: 'absolute', bottom: 52, right: 32, width: 150, height: 150, pointerEvents: 'auto' }}>
        {face(1, 'Y', 'rgba(124,58,237,0.75)', '#A78BFA', { top: '50%', left: 0, transform: 'translateY(-50%)' })}
        {face(8, 'A', 'rgba(220,38,38,0.75)',  '#FCA5A5', { top: '50%', right: 0, transform: 'translateY(-50%)' })}
        {face(9, 'X', 'rgba(37,99,235,0.75)',  '#93C5FD', { top: 0, left: '50%', transform: 'translateX(-50%)' })}
        {face(0, 'B', 'rgba(22,163,74,0.75)',  '#86EFAC', { bottom: 0, left: '50%', transform: 'translateX(-50%)' })}
      </div>
      {bump(10, 'L1', { bottom: 220, left: 32, pointerEvents: 'auto' })}
      {bump(11, 'R1', { bottom: 220, right: 32, pointerEvents: 'auto' })}
      <StartSelect onEmit={onEmit} accent="#8B5CF6" />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MEGA DRIVE / GENESIS — 6-button arc  (X Y Z top / A B C bottom)
// genesis_plus_gx: B=0,A=1,C=8,X=9,Y=10,Z=11
// ═══════════════════════════════════════════════════════════════════════════
export const MegaDriveGamepad: React.FC<{ onEmit: EmitBtn }> = ({ onEmit }) => {
  const rows = [
    [{ id: 9, l: 'X', bg: 'rgba(37,99,235,0.8)',  bo: '#93C5FD' },
     { id: 10,l: 'Y', bg: 'rgba(124,58,237,0.8)', bo: '#A78BFA' },
     { id: 11,l: 'Z', bg: 'rgba(234,88,12,0.8)',  bo: '#FDBA74' }],
    [{ id: 1, l: 'A', bg: 'rgba(22,163,74,0.8)',  bo: '#86EFAC' },
     { id: 0, l: 'B', bg: 'rgba(220,38,38,0.8)',  bo: '#FCA5A5' },
     { id: 8, l: 'C', bg: 'rgba(234,179,8,0.8)',  bo: '#FDE047' }],
  ];
  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>

      <div style={{ position: 'absolute', bottom: 36, right: 12, pointerEvents: 'auto' }}>
        {rows.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 8, marginBottom: ri === 0 ? 8 : 0, marginLeft: ri === 0 ? 10 : 0 }}>
            {row.map(b => (
              <button key={b.id}
                data-btn-id={b.id}
                className="font-black text-white text-sm select-none touch-none active:scale-90 flex items-center justify-center rounded-full"
                style={{ width: 48, height: 48, background: b.bg, border: `2px solid ${b.bo}`, userSelect: 'none' }}>
                {b.l}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
        <button
          data-btn-id={3}
          className="px-6 py-2 rounded-full font-black text-xs tracking-widest select-none touch-none active:scale-90"
          style={{ background: 'rgba(37,99,235,0.3)', border: '1px solid #3B82F6', color: '#93C5FD', userSelect: 'none' }}>
          START
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// N64 TRIDENTE — Z trigger + C-Buttons (right analog) + A/B + R
// mupen64plus-next: A=0, B=1, Z=12(L2), Start=3, R=11(R1)
// C-Buttons → Right Analog Stick (stick=1)
// ═══════════════════════════════════════════════════════════════════════════
export const N64Gamepad: React.FC<{ onEmit: EmitBtn; onAxis: EmitAxis }> = ({ onEmit, onAxis }) => {
  const cPush = (dir: 'up' | 'down' | 'left' | 'right', pressed: boolean) => {
    const x = dir === 'right' ? (pressed ? 1 : 0) : dir === 'left' ? (pressed ? -1 : 0) : 0;
    const y = dir === 'down'  ? (pressed ? 1 : 0) : dir === 'up'   ? (pressed ? -1 : 0) : 0;
    onAxis(0, 1, x, y);
  };
  const cDirs = [
    { dir: 'up'    as const, label: 'C▲', s: { top: 0, left: '50%', transform: 'translateX(-50%)' } },
    { dir: 'down'  as const, label: 'C▼', s: { bottom: 0, left: '50%', transform: 'translateX(-50%)' } },
    { dir: 'left'  as const, label: '◀C', s: { top: '50%', left: 0, transform: 'translateY(-50%)' } },
    { dir: 'right' as const, label: 'C▶', s: { top: '50%', right: 0, transform: 'translateY(-50%)' } },
  ];
  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>


      {/* Z Trigger */}
      <button
        data-btn-id={12}
        className="font-black text-sm select-none touch-none active:scale-90 flex items-center justify-center"
        style={{ position: 'absolute', bottom: 204, left: 20, width: 88, height: 38, borderRadius: 19, background: 'rgba(37,99,235,0.85)', border: '3px solid #3B82F6', color: '#DBEAFE', userSelect: 'none', pointerEvents: 'auto' }}>
        Z
      </button>

      {/* A button */}
      <button
        data-btn-id={0}
        className="font-black text-white select-none touch-none active:scale-90 flex items-center justify-center rounded-full"
        style={{ position: 'absolute', bottom: 40, right: 104, width: 60, height: 60, background: 'rgba(22,163,74,0.85)', border: '3px solid #86EFAC', userSelect: 'none', pointerEvents: 'auto' }}>
        A
      </button>

      {/* B button */}
      <button
        data-btn-id={1}
        className="font-black text-white select-none touch-none active:scale-90 flex items-center justify-center rounded-full"
        style={{ position: 'absolute', bottom: 112, right: 116, width: 44, height: 44, background: 'rgba(234,179,8,0.85)', border: '2px solid #FDE047', userSelect: 'none', pointerEvents: 'auto' }}>
        B
      </button>

      {/* C-Buttons diamond */}
      <div style={{ position: 'absolute', bottom: 56, right: 16, width: 90, height: 90, pointerEvents: 'auto' }}>
        {cDirs.map(c => (
          <button key={c.dir}
            onTouchStart={e => { e.preventDefault(); haptic(18); cPush(c.dir, true); }}
            onTouchEnd={() => cPush(c.dir, false)}
            onTouchCancel={() => cPush(c.dir, false)}
            className="absolute font-black text-black text-[10px] select-none touch-none active:scale-90 flex items-center justify-center rounded"
            style={{ width: 32, height: 32, background: 'rgba(234,179,8,0.9)', border: '1px solid #FDE047', userSelect: 'none', ...c.s }}>
            {c.label}
          </button>
        ))}
        <div className="absolute rounded-full" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 24, height: 24, background: 'rgba(234,179,8,0.25)' }} />
      </div>

      {/* R trigger */}
      <button
        data-btn-id={11}
        className="font-black text-sm select-none touch-none active:scale-90 flex items-center justify-center"
        style={{ position: 'absolute', bottom: 204, right: 20, width: 64, height: 32, borderRadius: 12, background: 'rgba(255,255,255,0.13)', border: '2px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.8)', userSelect: 'none', pointerEvents: 'auto' }}>
        R
      </button>

      {/* Start */}
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>
        <button
          data-btn-id={3}
          className="px-6 py-2 rounded-full font-black text-xs tracking-widest select-none touch-none active:scale-90"
          style={{ background: 'rgba(22,163,74,0.3)', border: '1px solid rgba(22,163,74,0.7)', color: '#86EFAC', userSelect: 'none' }}>
          START
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ARCADE (MAME / NEOGEO) — Classic Curved Layout
// ═══════════════════════════════════════════════════════════════════════════
export const ArcadeGamepad: React.FC<{ onEmit: EmitBtn; sixButton?: boolean }> = ({ onEmit, sixButton = false }) => {
  const btn = (id: number, label: string, color: string, pos: React.CSSProperties) => (
    <button key={id}
      data-btn-id={id}
      className="absolute flex items-center justify-center rounded-full font-black text-white select-none touch-none active:scale-95 transition-transform shadow-[0_0_15px_rgba(0,0,0,0.5)]"
      style={{ width: 56, height: 56, background: color, border: '3px solid rgba(255,255,255,0.2)', userSelect: 'none', ...pos }}>
      {label}
    </button>
  );

  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', bottom: 60, right: 30, width: 220, height: 160, pointerEvents: 'auto' }}>
        {/* Row 1 */}
        {btn(9, sixButton ? 'X' : 'C', 'rgba(37,99,235,0.9)', { bottom: 80, right: 150 })}
        {btn(1, sixButton ? 'Y' : 'D', 'rgba(124,58,237,0.9)', { bottom: 100, right: 80 })}
        {sixButton && btn(11, 'R1', 'rgba(234,88,12,0.9)', { bottom: 100, right: 10 })}

        {/* Row 2 */}
        {btn(8, sixButton ? 'A' : 'A', 'rgba(220,38,38,0.9)', { bottom: 10, right: 160 })}
        {btn(0, sixButton ? 'B' : 'B', 'rgba(234,179,8,0.9)', { bottom: 30, right: 90 })}
        {sixButton && btn(10, 'L1', 'rgba(22,163,74,0.9)', { bottom: 30, right: 20 })}
      </div>
      
      {/* Coin / Start in Arcade are aligned bottom-center like Select / Start */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex gap-6" style={{ pointerEvents: 'auto' }}>
        <button data-btn-id={2} className="px-4 py-2 bg-red-600/30 border border-red-500/50 text-red-300 font-bold text-xs tracking-widest rounded-full select-none touch-none active:scale-90">COIN</button>
        <button data-btn-id={3} className="px-4 py-2 bg-green-600/30 border border-green-500/50 text-green-300 font-bold text-xs tracking-widest rounded-full select-none touch-none active:scale-90">START</button>
      </div>
    </div>
  );
};
