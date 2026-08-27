import React, { useState } from 'react';
import { CoreConfigTemplate, TenantInfo } from '../types';

interface Props {
  tenant: TenantInfo;
  initialConfig?: CoreConfigTemplate;
  onSave: (config: CoreConfigTemplate) => void;
  onClose: () => void;
}

export const EmulatorConfigModal: React.FC<Props> = ({ tenant, initialConfig, onSave, onClose }) => {
  const [config, setConfig] = useState<CoreConfigTemplate>(initialConfig || {
    graphicsApi: 'Vulkan',
    aspectRatio: 'Core Provided',
    fastmem: true,
    vSync: true,
    videoFilter: 'Bilinear',
    showFPS: false
  });

  const handleChange = (field: keyof CoreConfigTemplate, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const isPS2 = tenant.id === 'PS2_NETHERSX2';
  const isPS1 = tenant.id === 'PS1_PCSX';
  const isPSP = tenant.id === 'PSP_PPSSPP';
  const isN64 = tenant.id === 'N64_MUPEN64PLUS';
  const isSNES = tenant.id === 'SNES_SNES9X';
  const isGBA = tenant.id === 'GBA_MGBA' || tenant.id === 'GBC_GAMBATTE';
  const isSega = tenant.id === 'GENESIS_GENPLUSGX' || tenant.id === 'MASTERSYSTEM_PICODRIVE';
  const isArcade = tenant.id === 'NEOGEO_FBNEO';

  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-[110] backdrop-blur-md">
      <div className="bg-zinc-950 border border-cyan-900/50 p-4 sm:p-6 rounded-2xl w-[98%] max-w-4xl shadow-2xl flex flex-col h-[96%]">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
          <div>
            <h2 className="text-white font-black text-xl tracking-wider">CORE MATRIX CONFIG</h2>
            <p className="text-cyan-400 text-xs font-mono uppercase">{tenant.name} - {tenant.coreName}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white font-black text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto pr-4 space-y-6 custom-scrollbar text-sm font-mono text-white/90">
          
          {/* Sessão Global */}
          <div className="space-y-4">
            <h3 className="text-cyan-500 font-bold border-l-2 border-cyan-500 pl-2">GLOBAL OPTIONS</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/50 text-xs mb-1">Graphics API</label>
                <select 
                  className="w-full bg-zinc-900 border border-white/10 rounded p-2 text-white outline-none focus:border-cyan-500"
                  value={config.graphicsApi}
                  onChange={(e) => handleChange('graphicsApi', e.target.value)}
                >
                  <option value="Vulkan">Vulkan (Fastest)</option>
                  <option value="OpenGL">OpenGL (Compatibility)</option>
                  <option value="Software">Software (Pixel Perfect)</option>
                </select>
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-1">Aspect Ratio</label>
                <select 
                  className="w-full bg-zinc-900 border border-white/10 rounded p-2 text-white outline-none focus:border-cyan-500"
                  value={config.aspectRatio}
                  onChange={(e) => handleChange('aspectRatio', e.target.value)}
                >
                  <option value="Core Provided">Core Provided (Native)</option>
                  <option value="4:3">4:3 Original</option>
                  <option value="16:9">16:9 Widescreen Hack</option>
                </select>
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-1">Shader / Pós-Processamento</label>
                <select 
                  className="w-full bg-zinc-900 border border-white/10 rounded p-2 text-white outline-none focus:border-cyan-500"
                  value={config.capivara_shader || 'Sharp'}
                  onChange={(e) => handleChange('capivara_shader', e.target.value)}
                >
                  <option value="Sharp">Nenhum (Pixel-Perfect)</option>
                  <option value="CRT">TV de Tubo (CRT Scanlines)</option>
                  <option value="LCD">GameBoy (Matrix LCD)</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-6 mt-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.vSync !== false} onChange={(e) => handleChange('vSync', e.target.checked)} className="accent-cyan-500 w-6 h-6 shrink-0" />
                <span>V-Sync (Anti-Tearing)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.showFPS} onChange={(e) => handleChange('showFPS', e.target.checked)} className="accent-cyan-500 w-6 h-6 shrink-0" />
                <span>Show FPS</span>
              </label>
            </div>
          </div>

          {/* PS2 Matrix */}
          {isPS2 && (
            <div className="space-y-4">
              <h3 className="text-indigo-500 font-bold border-l-2 border-indigo-500 pl-2">PS2 ENGINE (Play!)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/50 text-xs mb-1">Resolution Multiplier</label>
                  <select className="w-full bg-zinc-900 border border-white/10 rounded p-2 text-white" value={config.playResMulti || 1} onChange={(e) => handleChange('playResMulti', Number(e.target.value))}>
                    <option value={1}>1x (Native)</option>
                    <option value={2}>2x (HD)</option>
                    <option value={4}>4x (FHD)</option>
                    <option value={8}>8x (4K Ultra HD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1">Presentation Mode</label>
                  <select className="w-full bg-zinc-900 border border-white/10 rounded p-2 text-white" value={config.playPresentationMode || 'Fit Screen'} onChange={(e) => handleChange('playPresentationMode', e.target.value)}>
                    <option value="Fit Screen">Fit Screen (Keep AR)</option>
                    <option value="Fill Screen">Fill Screen (Stretch)</option>
                    <option value="Original Size">Original Size</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="flex items-center space-x-2 cursor-pointer mt-2">
                    <input type="checkbox" checked={config.playBilinearFiltering !== false} onChange={(e) => handleChange('playBilinearFiltering', e.target.checked)} className="accent-indigo-500 w-6 h-6 shrink-0" />
                    <span>Force Bilinear Filtering (Smooth textures)</span>
                  </label>
                </div>
              </div>
              
              <div className="space-y-2 mt-2 bg-zinc-900/50 p-3 rounded-lg border border-red-500/20">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={config.fastmem !== false} onChange={(e) => handleChange('fastmem', e.target.checked)} className="accent-red-500 w-6 h-6 shrink-0" />
                  <span className="text-red-400 font-bold">MMU Fastmem Bypass (DANGER: Kernel Mode)</span>
                </label>
                <p className="text-[10px] text-white/40 ml-6">Required to prevent Black Screens on PS2. Bypasses Android memory manager for direct DMA access.</p>
              </div>
            </div>
          )}

          {/* PS1 Matrix */}
          {isPS1 && (
            <div className="space-y-4">
              <h3 className="text-blue-500 font-bold border-l-2 border-blue-500 pl-2">PS1 ENHANCEMENTS</h3>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.pgxpPerspectiveCorrect || false} onChange={(e) => handleChange('pgxpPerspectiveCorrect', e.target.checked)} className="accent-blue-500 w-6 h-6 shrink-0" />
                <span>PGXP Perspective Correct (Fix polygon wobble)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.cdvdSpeedHack || false} onChange={(e) => handleChange('cdvdSpeedHack', e.target.checked)} className="accent-blue-500 w-4 h-4" />
                <span>CD-ROM Speed Hack (Fast Load Times)</span>
              </label>
            </div>
          )}

          {/* PSP Matrix */}
          {isPSP && (
            <div className="space-y-4">
              <h3 className="text-teal-500 font-bold border-l-2 border-teal-500 pl-2">PSP HARDWARE CONFIG</h3>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <label className="block text-white/50 text-xs mb-1">Internal Resolution</label>
                  <select className="w-full bg-zinc-900 border border-white/10 rounded p-2" value={config.internalResolution || 1} onChange={(e) => handleChange('internalResolution', Number(e.target.value))}>
                    <option value={1}>1x (PSP Native)</option>
                    <option value={2}>2x (720p HD)</option>
                    <option value={3}>3x (1080p FHD)</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.simulateBlockTransfer || false} onChange={(e) => handleChange('simulateBlockTransfer', e.target.checked)} className="accent-teal-500 w-6 h-6 shrink-0" />
                <span>Simulate Block Transfer (Fix graphic glitches)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.jitBlockTransfer !== false} onChange={(e) => handleChange('jitBlockTransfer', e.target.checked)} className="accent-teal-500 w-6 h-6 shrink-0" />
                <span>JIT Block Transfer (Performance Boost)</span>
              </label>
            </div>
          )}

          {/* N64 Matrix */}
          {isN64 && (
            <div className="space-y-4">
              <h3 className="text-green-500 font-bold border-l-2 border-green-500 pl-2">NINTENDO 64 PLUGINS</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/50 text-xs mb-1">RDP Plugin (Video)</label>
                  <select className="w-full bg-zinc-900 border border-white/10 rounded p-2" value={config.rdpPlugin || 'GlideN64'} onChange={(e) => handleChange('rdpPlugin', e.target.value)}>
                    <option value="GlideN64">GlideN64 (High-Res/Modern)</option>
                    <option value="Angrylion">Angrylion (Pixel-Accurate Software)</option>
                    <option value="Parallel">ParaLLEl (Vulkan Async)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1">RSP Plugin (Co-Processor)</label>
                  <select className="w-full bg-zinc-900 border border-white/10 rounded p-2" value={config.rspPlugin || 'HLE'} onChange={(e) => handleChange('rspPlugin', e.target.value)}>
                    <option value="HLE">High-Level Emulation (Fast)</option>
                    <option value="LLE">Low-Level Emulation (Accurate/Slow)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SNES Matrix */}
          {isSNES && (
            <div className="space-y-4">
              <h3 className="text-purple-500 font-bold border-l-2 border-purple-500 pl-2">SUPER SYSTEM ENHANCEMENTS</h3>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.mode7Filtering || false} onChange={(e) => handleChange('mode7Filtering', e.target.checked)} className="accent-purple-500 w-6 h-6 shrink-0" />
                <span>HD Mode-7 Filtering (Mario Kart / F-Zero)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.dspAudioEnhancement || false} onChange={(e) => handleChange('dspAudioEnhancement', e.target.checked)} className="accent-purple-500 w-6 h-6 shrink-0" />
                <span>DSP Audio Interpolation (No Crackling)</span>
              </label>
            </div>
          )}

          {/* GBA/GBC Matrix */}
          {isGBA && (
            <div className="space-y-4">
              <h3 className="text-emerald-500 font-bold border-l-2 border-emerald-500 pl-2">HANDHELD FILTERS</h3>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.colorCorrection || true} onChange={(e) => handleChange('colorCorrection', e.target.checked)} className="accent-emerald-500 w-6 h-6 shrink-0" />
                <span>LCD Color Correction (Fix washed out colors)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.lcdGhostingFilter || false} onChange={(e) => handleChange('lcdGhostingFilter', e.target.checked)} className="accent-emerald-500 w-6 h-6 shrink-0" />
                <span>Motion Ghosting Filter (Original Hardware Feel)</span>
              </label>
            </div>
          )}

          {/* SEGA Matrix */}
          {isSega && (
            <div className="space-y-4">
              <h3 className="text-blue-500 font-bold border-l-2 border-blue-500 pl-2">SEGA HARDWARE</h3>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.fmSoundChip || true} onChange={(e) => handleChange('fmSoundChip', e.target.checked)} className="accent-blue-500 w-4 h-4" />
                <span>Yamaha YM2612 FM Synthesis (Blast Processing Audio)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={config.overscan || false} onChange={(e) => handleChange('overscan', e.target.checked)} className="accent-blue-500 w-4 h-4" />
                <span>Show Full Overscan Area (Borders)</span>
              </label>
            </div>
          )}

          {/* ARCADE Matrix */}
          {isArcade && (
            <div className="space-y-4">
              <h3 className="text-red-500 font-bold border-l-2 border-red-500 pl-2">ARCADE / MVS OPTIONS</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/50 text-xs mb-1">Vector Beam Width (Asteroids etc)</label>
                  <select className="w-full bg-zinc-900 border border-white/10 rounded p-2" value={config.vectorBeamWidth || 1} onChange={(e) => handleChange('vectorBeamWidth', Number(e.target.value))}>
                    <option value={1}>1.0 (Native)</option>
                    <option value={1.5}>1.5 (Thick)</option>
                    <option value={2}>2.0 (Bold/Glow)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1">DIP Switches (Region/Blood)</label>
                  <select className="w-full bg-zinc-900 border border-white/10 rounded p-2" value={config.dipSwitches || 'default'} onChange={(e) => handleChange('dipSwitches', e.target.value)}>
                    <option value="default">Default / JVS</option>
                    <option value="japan">Japan (Uncensored)</option>
                    <option value="us">US Arcade</option>
                  </select>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex justify-end space-x-4 shrink-0">
          <button onClick={onClose} className="px-8 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition">Cancel</button>
          <button onClick={() => onSave(config)} className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black shadow-lg shadow-cyan-500/20 transition">Flash Config</button>
        </div>
      </div>
    </div>
  );
};
