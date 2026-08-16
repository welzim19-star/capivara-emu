import React, { useState } from 'react';
import { TenantInfo, GameItem } from '../../types';
import { CapyLogo } from '../CapyLogo';
import { sfx } from '../../utils/sfx';
import { RomFolderPickerModal } from '../RomFolderPickerModal';

interface Props {
  tenants: TenantInfo[];
  onLaunch: (game: GameItem, tenant: TenantInfo) => void;
  onRunScraper: () => void;
  onOpenSaves: (mode: 'save' | 'load', tenant: TenantInfo, game: GameItem) => void;
  onOpenAutofire: (tenant: TenantInfo) => void;
  onToggleLayout: () => void;
  onRomsMapped: () => void;
}

export const SteamOSDeckLayout: React.FC<Props> = ({ 
  tenants, 
  onLaunch, 
  onRunScraper, 
  onOpenSaves, 
  onOpenAutofire,
  onToggleLayout,
  onRomsMapped
}) => {
  const [selectedTenantIdx, setSelectedTenantIdx] = useState(0);
  const [selectedGameIdx, setSelectedGameIdx] = useState(0);
  const [romPickerTenant, setRomPickerTenant] = useState<TenantInfo | null>(null);

  const activeTenant = tenants[selectedTenantIdx] || tenants[0];
  const activeGame = activeTenant?.games?.[selectedGameIdx] || activeTenant?.games?.[0] || null;
  const hasMappedDir = (t: TenantInfo) => !!localStorage.getItem(`mapped_dir_${t.id}`);

  if (!activeTenant) return <div className="p-8 text-white">Carregando Emuladores...</div>;

  return (
    <>
      {romPickerTenant && (
        <RomFolderPickerModal
          tenant={romPickerTenant}
          onClose={() => setRomPickerTenant(null)}
          onMapped={() => {
            setRomPickerTenant(null);
            onRomsMapped();
          }}
        />
      )}

      <div className="relative w-full h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#07090e] flex flex-col pt-[max(env(safe-area-inset-top),2rem)] px-3 pb-4 select-none custom-scrollbar">
        {/* Dynamic Background Blur Hero */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-2xl scale-110 pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${activeTenant.heroImage || ''})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/70 to-[#07090e]/40 pointer-events-none z-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e]/80 via-transparent to-transparent pointer-events-none z-0" />

        {/* ===== TOP BAR ===== */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-white/10 shrink-0">
          {/* Logo + Label */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <CapyLogo size={34} />
            <div>
              <span className="text-[11px] font-black tracking-widest uppercase text-cyan-400 block">CapivaraEmu</span>
              <span className="text-[8px] font-mono text-zinc-500 block">STEAM OS MODE</span>
            </div>
          </div>

          {/* Console tabs scroll + Toggle */}
          <div className="w-full md:w-auto flex items-center space-x-1 min-w-0 bg-black/50 px-1 py-1 rounded-2xl border border-white/10 backdrop-blur-md overflow-hidden shrink-0">
            <div className="flex space-x-1 overflow-x-auto custom-scrollbar flex-1">
              {tenants.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => {
                    sfx.playSelect();
                    setSelectedTenantIdx(idx);
                    setSelectedGameIdx(0);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono shrink-0 transition-all ${
                    selectedTenantIdx === idx 
                      ? 'bg-cyan-500 text-black shadow-md' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="mr-0.5">{t.emojiIcon || '🎮'}</span>{t.originalConsole || t.name}
                </button>
              ))}
            </div>
            <button 
              onClick={onToggleLayout}
              className="ml-1 bg-zinc-800 text-cyan-400 border border-cyan-500/30 px-2.5 py-1 rounded-xl text-[9px] font-mono whitespace-nowrap shrink-0 active:scale-95 transition-transform"
            >
              ⇄ Switch
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col landscape:flex-row gap-4 min-h-0 shrink-0 mt-2">
          {/* ===== HERO AREA ===== */}
          <div className="relative z-10 flex-1 flex flex-col justify-center py-4 landscape:py-0 space-y-3 landscape:space-y-2 min-h-0 shrink-0">
          {activeGame ? (
            <>
              {/* Genre badge */}
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold self-start">
                <span>{activeTenant.originalConsole || activeTenant.name}</span>
                <span>•</span>
                <span>{activeGame.genre || 'Game'}</span>
              </div>

              {/* Title */}
              <h1 className="text-[1.75rem] sm:text-4xl landscape:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-lg max-w-[85%] landscape:max-w-full">
                {activeGame.title}
              </h1>

              {/* Subtitle */}
              <p className="text-[10px] sm:text-xs text-zinc-400 font-mono max-w-xs landscape:hidden">
                {activeTenant.subtitle || activeTenant.name}
                {activeGame.plays && <> · <span className="text-amber-400 font-bold">{activeGame.plays} jogadas</span></>}
              </p>

              {/* Action buttons */}
              <div className="flex items-center flex-wrap gap-2 pt-1 landscape:pt-0">
                <button
                  onClick={() => {
                    sfx.playCoin();
                    onLaunch(activeGame, activeTenant);
                  }}
                  className="px-5 py-2.5 landscape:py-1.5 bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-extrabold rounded-xl shadow-lg shadow-cyan-500/25 hover:scale-105 active:scale-95 transition-all flex items-center space-x-1.5 text-xs landscape:text-[10px]"
                >
                  <span>▶</span>
                  <span className="uppercase">Jogar</span>
                </button>

                <button
                  onClick={onRunScraper}
                  className="px-3 py-2.5 landscape:py-1.5 rounded-xl bg-zinc-900/90 border border-cyan-500/30 text-cyan-300 text-[11px] landscape:text-[9px] font-mono shadow-lg active:scale-95 transition-transform"
                >
                  🔍 Capas
                </button>

                <button
                  onClick={() => setRomPickerTenant(activeTenant)}
                  className="px-3 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-500/30 text-zinc-400 text-[11px] font-mono shadow-lg active:scale-95 transition-transform"
                >
                  📂 ROMs
                </button>
              </div>
            </>
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-zinc-800/80 border border-white/10 flex items-center justify-center text-3xl">
                {activeTenant.emojiIcon || '🎮'}
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-white text-sm">{activeTenant.name}</h3>
                <p className="text-zinc-400 text-[11px] font-mono leading-relaxed">
                  {hasMappedDir(activeTenant)
                    ? 'Nenhuma ROM encontrada na pasta mapeada.\nCopie os arquivos e reinicie o app.'
                    : 'Pasta de ROMs não configurada ainda.'}
                </p>
                {activeTenant.biosRequired && !localStorage.getItem(`bios_file_uri_${activeTenant.id}`) && (
                  <p className="text-amber-400 text-[10px] font-mono">⚠ BIOS necessária: {activeTenant.biosFile}</p>
                )}
              </div>
              <button
                onClick={() => setRomPickerTenant(activeTenant)}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold text-xs uppercase shadow-lg active:scale-95 transition-transform"
              >
                {hasMappedDir(activeTenant) ? '⚙️ Reconfigurar' : '📂 Mapear Pasta de ROMs'}
              </button>
            </div>
          )}
        </div>

        {/* ===== GAME CAROUSEL ===== */}
        {activeTenant.games && activeTenant.games.length > 0 && (
          <div className="relative z-10 space-y-2 shrink-0 landscape:w-7/12 landscape:flex landscape:flex-col landscape:justify-center">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 px-0.5">
              <span className="font-bold text-white text-[11px] uppercase tracking-wide">
                {activeTenant.name} · {activeTenant.games.length} ROMs
              </span>
              <span className="text-zinc-500">Deslize ➔</span>
            </div>

            <div className="flex space-x-2.5 overflow-x-auto pb-1.5 custom-scrollbar">
              {activeTenant.games.map((game, idx) => (
                <div
                  key={game.id}
                  onClick={() => {
                    sfx.playSelect();
                    setSelectedGameIdx(idx);
                  }}
                  onDoubleClick={() => onLaunch(game, activeTenant)}
                  className={`relative shrink-0 w-24 h-36 landscape:w-20 landscape:h-28 rounded-xl cursor-pointer transition-all border-2 overflow-hidden flex flex-col justify-end bg-zinc-900 ${
                    selectedGameIdx === idx 
                      ? 'border-cyan-400 scale-105 glow-cyan shadow-lg z-10' 
                      : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                  }`}
                >
                  {game.boxArtUrl ? (
                    <>
                      <img 
                        src={game.boxArtUrl} 
                        alt={game.title} 
                        className="absolute inset-0 w-full h-full object-cover" 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                      <div className={`absolute inset-0 hidden bg-gradient-to-br ${game.banner || 'from-zinc-800 to-zinc-900'}`} />
                    </>
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${game.banner || 'from-zinc-800 to-zinc-900'}`} />
                  )}
                  
                  {/* Dark gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none" />

                  <div className="relative p-2 landscape:p-1.5 z-10">
                    <div className="flex justify-between items-start text-[8px] font-mono mb-0.5">
                      <span className="px-1 py-0.5 rounded bg-black/60 text-cyan-300 font-bold max-w-[40px] truncate">{game.size || 'N/A'}</span>
                      <span className="text-amber-300 font-bold drop-shadow-md">★{game.rating || 5}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-[9px] text-white truncate drop-shadow-lg leading-tight">{game.title}</h4>
                      <span className="text-[7px] font-mono text-cyan-300 truncate block drop-shadow-md">{game.genre || 'Game'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>

        {/* Footer signature */}
        <div className="relative z-10 pt-2 text-center shrink-0 landscape:hidden">
          <span className="text-[8px] font-mono text-zinc-600 tracking-widest uppercase">PW SYSTEM APPLICATIONS</span>
        </div>
      </div>
    </>
  );
};
