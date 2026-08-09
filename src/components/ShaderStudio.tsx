import React, { useState } from 'react';
import { 
  Sparkles, 
  Tv, 
  Sliders, 
  Lock, 
  Check, 
  Flame, 
  Cpu, 
  Eye, 
  ShieldCheck, 
  Zap 
} from 'lucide-react';
import { ShaderPreset } from '../types';

interface ShaderStudioProps {
  isPro: boolean;
  onOpenBilling: () => void;
}

export const ShaderStudio: React.FC<ShaderStudioProps> = ({ isPro, onOpenBilling }) => {
  const [activeShader, setActiveShader] = useState<ShaderPreset>('CRT_ROYAL');
  const [scanlineStrength, setScanlineStrength] = useState(65);
  const [curvature, setCurvature] = useState(30);
  const [bloom, setBloom] = useState(40);

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-zinc-900/90 border border-white/10 p-6 rounded-2xl space-y-3 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-white">Vulkan Slang Shader Pipeline (SPIR-V)</h2>
                <span className="bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                  Adreno 650 Subpass Mode
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                Shaders pós-processados em Vulkan 1.2 sem gargalo no Snapdragon 865.
              </p>
            </div>
          </div>

          {!isPro && (
            <button
              onClick={onOpenBilling}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs shadow-lg shadow-cyan-400/20 transition"
            >
              <Lock className="w-4 h-4" />
              <span>DESBLOQUEAR SHADERS PRO</span>
            </button>
          )}
        </div>
      </div>

      {/* Preset Cards & Live Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Preset Selector */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white/80 uppercase tracking-widest px-2">
            Presets Vulkan .slangp
          </h3>

          <div className="space-y-3">
            {/* CRT Royal */}
            <div
              onClick={() => {
                if (!isPro) {
                  onOpenBilling();
                } else {
                  setActiveShader('CRT_ROYAL');
                }
              }}
              className={`p-4 rounded-xl border transition cursor-pointer relative overflow-hidden ${
                activeShader === 'CRT_ROYAL'
                  ? 'bg-cyan-400/10 border-cyan-400/50 shadow-lg shadow-cyan-400/10'
                  : 'bg-zinc-900/80 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-xs text-white flex items-center space-x-2">
                  <Tv className="w-4 h-4 text-cyan-400" />
                  <span>CRT-Royal (TV de Tubo High-End)</span>
                </span>
                {!isPro && <Lock className="w-4 h-4 text-amber-400" />}
              </div>
              <p className="text-xs text-white/50">
                Simula a máscara de sombra, linhas de varredura (scanlines) e curvatura fosfórica das lendárias TVs Sony Trinitron CRT.
              </p>
            </div>

            {/* LCD Grid */}
            <div
              onClick={() => setActiveShader('LCD_GRID')}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                activeShader === 'LCD_GRID'
                  ? 'bg-cyan-400/10 border-cyan-400/50 shadow-lg shadow-cyan-400/10'
                  : 'bg-zinc-900/80 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-xs text-white flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>LCD-Grid (Portáteis e Master System)</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-400 font-bold">Grátis</span>
              </div>
              <p className="text-xs text-white/50">
                Grade de matriz subpixel para Game Boy Advance, Game Boy Color e Master System 3 TecToy.
              </p>
            </div>

            {/* ScaleFX 4x */}
            <div
              onClick={() => {
                if (!isPro) {
                  onOpenBilling();
                } else {
                  setActiveShader('SCALEFX_4X');
                }
              }}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                activeShader === 'SCALEFX_4X'
                  ? 'bg-cyan-400/10 border-cyan-400/50 shadow-lg shadow-cyan-400/10'
                  : 'bg-zinc-900/80 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-xs text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>ScaleFX 4x (Upscaling Inteligente HD)</span>
                </span>
                {!isPro && <Lock className="w-4 h-4 text-amber-400" />}
              </div>
              <p className="text-xs text-white/50">
                Algoritmo de interpolação vetorial que suaviza bordas de pixelart mantendo detalhes de texturas em 4K.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Shader Preview & Parameter Controls */}
        <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold text-white flex items-center space-x-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Preview em Tempo Real</span>
            </h3>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              {activeShader}
            </span>
          </div>

          {/* Simulated Retro Screen Box */}
          <div className="relative aspect-[4/3] bg-black rounded-xl border border-white/10 overflow-hidden flex items-center justify-center shadow-inner">
            <img
              src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80"
              alt="Shader Test"
              className={`w-full h-full object-cover ${activeShader === 'SCALEFX_4X' ? 'contrast-110 saturate-110' : ''}`}
            />

            {/* CRT Shader Overlay Simulation */}
            {activeShader === 'CRT_ROYAL' && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, ${(scanlineStrength / 100) * 0.5}) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.04), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.04))`,
                  backgroundSize: '100% 3px, 6px 100%'
                }}
              />
            )}

            {/* LCD Grid Shader Overlay Simulation */}
            {activeShader === 'LCD_GRID' && (
              <div 
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  backgroundImage: 'radial-gradient(#000 1px, transparent 0)',
                  backgroundSize: '4px 4px'
                }}
              />
            )}

            <div className="absolute bottom-3 left-3 bg-black/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-cyan-400 border border-white/10">
              Vulkan Push Constants Active
            </div>
          </div>

          {/* Shader Parameter Controls */}
          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between text-white/80">
              <span className="font-bold">Scanlines (Intensidade de Linhas)</span>
              <span className="font-mono text-cyan-400 font-bold">{scanlineStrength}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              value={scanlineStrength}
              onChange={e => setScanlineStrength(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />

            <div className="flex items-center justify-between text-white/80 pt-2">
              <span className="font-bold">Curvatura de Tela (CRT Cathode)</span>
              <span className="font-mono text-cyan-400 font-bold">{curvature}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              value={curvature}
              onChange={e => setCurvature(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
