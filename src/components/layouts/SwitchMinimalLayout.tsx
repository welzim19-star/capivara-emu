import React, { useState, useEffect, useRef } from 'react';
import { GameItem, TenantInfo } from '../../types';
import { sfx } from '../../utils/sfx';

import { CapyLogo } from '../CapyLogo';
import { RomFolderPickerModal } from '../RomFolderPickerModal';
import { CastButton } from '../CastButton';
import { GameScraperService } from '../../services/GameScraperService';
import { useGamepadNavigation } from '../../hooks/useGamepadNavigation';

export interface SwitchMinimalLayoutProps {
  tenants: TenantInfo[];
  onLaunch: (game: GameItem, tenant: TenantInfo) => void;
  onRunScraper: () => void;
  onOpenSaves: (mode: 'save' | 'load', tenant: TenantInfo, game: GameItem) => void;
  onOpenAutofire: (tenant: TenantInfo) => void;
  onToggleLayout: () => void;
  onRomsMapped: () => void;
  initialTenantId?: string | null;
  lang?: 'pt' | 'en';
  onToggleLang?: () => void;
}

export const SwitchMinimalLayout: React.FC<SwitchMinimalLayoutProps> = ({ 
  tenants = [], 
  onLaunch, 
  onRunScraper, 
  onOpenSaves, 
  onOpenAutofire,
  onToggleLayout,
  onRomsMapped,
  initialTenantId,
  lang = 'pt',
  onToggleLang
}) => {
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(() => {
    if (initialTenantId) return tenants.find(t => t.id === initialTenantId) || null;
    return null;
  });
  
  const [activeTenantIdx, setActiveTenantIdx] = useState(() => {
    if (initialTenantId) {
      const idx = tenants.findIndex(t => t.id === initialTenantId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });
  const [activeGameIdx, setActiveGameIdx] = useState(0);
  const [romPickerTenant, setRomPickerTenant] = useState<TenantInfo | null>(null);
  const [currentTime, setCurrentTime] = useState('14:45 PM');
  const [searchQuery, setSearchQuery] = useState('');

  // Enable gamepad navigation globally for this layout
  useGamepadNavigation(!romPickerTenant);

  const activeCardRef = useRef<HTMLDivElement | null>(null);

  // Reset activeGameIdx when searchQuery changes
  useEffect(() => {
    setActiveGameIdx(0);
  }, [searchQuery]);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase());
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredGames = selectedTenant?.games?.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase())) || [];
  const activeGame = filteredGames[activeGameIdx] || filteredGames[0] || null;

  const hasMappedDir = (t: TenantInfo) => !!localStorage.getItem(`mapped_dir_${t.id}`);

  // Keyboard navigation for console experience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (romPickerTenant) return;

      if (!selectedTenant) {
        const count = tenants.length;
        if (count === 0) return;
        if (e.key === 'ArrowRight') {
          sfx.playSelect();
          setActiveTenantIdx((prev) => (prev + 1) % count);
        } else if (e.key === 'ArrowLeft') {
          sfx.playSelect();
          setActiveTenantIdx((prev) => (prev - 1 + count) % count);
        } else if (e.key === 'Enter' || e.key === 'a' || e.key === 'A') {
          if (tenants[activeTenantIdx]) {
            sfx.playSelect();
            setSelectedTenant(tenants[activeTenantIdx]);
            setActiveGameIdx(0);
          }
        }
      } else {
        const count = filteredGames.length;
        if (count === 0) return;

        if (e.key === 'ArrowRight') {
          sfx.playSelect();
          setActiveGameIdx((prev) => (prev + 1) % count);
        } else if (e.key === 'ArrowLeft') {
          sfx.playSelect();
          setActiveGameIdx((prev) => (prev - 1 + count) % count);
        } else if (e.key === 'ArrowDown') {
          sfx.playSelect();
          setActiveGameIdx((prev) => Math.min(count - 1, prev + 4));
        } else if (e.key === 'ArrowUp') {
          sfx.playSelect();
          setActiveGameIdx((prev) => Math.max(0, prev - 4));
        } else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'b' || e.key === 'B') {
          sfx.playBack();
          setSelectedTenant(null);
          setSearchQuery('');
        } else if (e.key === 'Enter' || e.key === 'a' || e.key === 'A') {
          if (filteredGames[activeGameIdx]) {
            sfx.playCoin();
            onLaunch(filteredGames[activeGameIdx], selectedTenant);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTenant, activeTenantIdx, activeGameIdx, tenants, romPickerTenant, onLaunch, filteredGames]);

  return (
    <>
      {romPickerTenant && (
        <RomFolderPickerModal
          tenant={romPickerTenant}
          onClose={() => setRomPickerTenant(null)}
          onMapped={() => {
            setRomPickerTenant(null);
            if (onRomsMapped) onRomsMapped();
          }}
        />
      )}
      
      <div 
        id="geometric-balance-container"
        className="w-full h-[100dvh] bg-[#0f111a] text-white flex flex-col justify-between overflow-hidden select-none font-sans pt-[max(env(safe-area-inset-top),1rem)]"
      >
        {/* Geometric Balance Header */}
        <header id="top-header" className="flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <CapyLogo size={38} />
            <div>
              <h1 className="text-sm font-black tracking-[0.2em] uppercase text-white">CapivaraOS</h1>
              <p className="text-[10px] font-mono text-cyan-400 truncate max-w-[200px] sm:max-w-md">
                {selectedTenant ? selectedTenant.originalConsole || selectedTenant.name : 'Console & Emulation Frontend'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Cast Button */}
            <CastButton />

            {/* FPS & Performance Badge */}
            <div className="hidden sm:flex px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <span className="text-[10px] font-bold text-cyan-400">1080P • 60 FPS</span>
            </div>

            {/* Language Toggle */}
            {onToggleLang && (
              <button
                id="btn-toggle-lang"
                onClick={() => {
                  sfx.playSelect();
                  onToggleLang();
                }}
                className="px-2.5 py-1 bg-zinc-800/90 hover:bg-amber-950 text-amber-400 border border-amber-500/30 hover:border-amber-400 rounded-lg text-[10px] font-bold shadow-xs active:scale-95 transition-all flex items-center space-x-1"
                title={lang === 'pt' ? 'Mudar para Inglês (Switch to English)' : 'Switch to Portuguese (Mudar para Português)'}
              >
                <span>{lang === 'pt' ? '🇧🇷 PT' : '🇺🇸 EN'}</span>
              </button>
            )}

            {/* Layout Toggle */}
            <button 
              id="btn-toggle-layout"
              onClick={() => {
                sfx.playSelect();
                if (onToggleLayout) onToggleLayout();
              }}
              className="px-2.5 py-1 bg-zinc-800/90 hover:bg-cyan-950 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 rounded-lg text-[10px] font-bold shadow-xs active:scale-95 transition-all flex items-center space-x-1"
              title="Alternar para layout Steam Deck"
            >
              <span>➔</span>
              <span>STEAM OS</span>
            </button>

            {/* System Info */}
            <div className="flex items-center space-x-2 text-zinc-400 text-xs font-mono">
              <span className="bg-zinc-800 px-2 py-1 rounded border border-white/10 text-[11px]">100% 🔋</span>
              <span className="opacity-50 uppercase tracking-tighter text-[10px] hidden md:inline">{currentTime}</span>
            </div>
          </div>
        </header>

        {/* STEP 1: EMULATOR CONSOLE SELECTION GRID */}
        {!selectedTenant ? (
          <main id="console-selection-section" className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 sm:px-8 py-4 sm:py-6">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div className="flex items-center space-x-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  {lang === 'en' ? 'Available Emulators' : 'Emuladores Disponíveis'} <span className="text-cyan-400 text-sm">({tenants.length || 0})</span>
                </h2>
                <div className="hidden sm:flex space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                  <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[10px] font-mono text-zinc-400">
                <button
                  id="btn-run-scraper-top"
                  onClick={() => {
                    sfx.playSelect();
                    if (onRunScraper) onRunScraper();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-white/10 hover:text-white transition-colors flex items-center space-x-1.5"
                >
                  <span>🔍</span>
                  <span>Scraper de Metadados</span>
                </button>
              </div>
            </div>

            {/* Consoles Grid with Geometric Balance style */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-6">
                {tenants.map((t, idx) => {
                  const isSelected = activeTenantIdx === idx;
                  const gamesCount = t.games?.length || 0;
                  const isMapped = hasMappedDir(t);

                  return (
                    <div
                      key={t.id}
                      id={`tenant-card-${t.id}`}
                      onClick={() => {
                        sfx.playSelect();
                        setActiveTenantIdx(idx);
                        setSelectedTenant(t);
                        setActiveGameIdx(0);
                      }}
                      onMouseEnter={() => setActiveTenantIdx(idx)}
                      className={`relative group rounded-2xl p-4 cursor-pointer transition-all duration-200 border flex flex-col justify-between min-h-[140px] overflow-hidden ${
                        isSelected 
                          ? 'border-cyan-500 ring-2 ring-cyan-500/40 shadow-xl shadow-cyan-500/20 bg-zinc-900' 
                          : 'border-white/5 hover:border-white/20 bg-zinc-900/50 hover:bg-zinc-900/80'
                      }`}
                    >
                      {/* Dynamic Color Gradient Background */}
                      <div 
                        className="absolute inset-0 opacity-40 group-hover:opacity-70 transition-opacity duration-500"
                        style={{ 
                          background: `radial-gradient(circle at 100% 0%, ${t.color}80 0%, transparent 70%), linear-gradient(135deg, ${t.color}20 0%, #000000 100%)` 
                        }}
                      />
                      
                      {/* Background Image (If available) */}
                      {t.heroImage && (
                        <>
                          <div 
                            className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-40 mix-blend-overlay transition-transform duration-700 group-hover:scale-110"
                            style={{ backgroundImage: `url(${t.heroImage})` }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
                        </>
                      )}
                      
                      {/* Geometric Tech Pattern Overlay */}
                      <div className="absolute inset-0 opacity-[0.03] mix-blend-screen pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '12px 12px' }} />

                      <div className="relative z-10 flex justify-between items-start">
                        <div className="w-10 h-10 rounded-xl bg-black/50 backdrop-blur-md flex items-center justify-center text-xl border border-white/10 shadow-md">
                          {t.emojiIcon || '🎮'}
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-mono text-zinc-300 border border-white/10 shadow-sm">
                          {t.year || '----'}
                        </span>
                      </div>

                      <div className="relative z-10 space-y-1 mt-3">
                        <h3 className="font-black text-xs sm:text-sm text-white truncate tracking-wide">{t.name}</h3>
                        <p className="text-[10px] font-mono text-zinc-400 truncate">{t.originalConsole}</p>
                        
                        <div className="flex items-center justify-between pt-1.5">
                          <span 
                            className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border"
                            style={{ 
                              color: gamesCount > 0 ? '#22d3ee' : '#f87171',
                              backgroundColor: gamesCount > 0 ? 'rgba(6, 182, 212, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              borderColor: gamesCount > 0 ? 'rgba(6, 182, 212, 0.25)' : 'rgba(239, 68, 68, 0.25)'
                            }}
                          >
                            {gamesCount} ROMS
                          </span>

                          <button
                            id={`btn-config-tenant-${t.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              sfx.playSelect();
                              setRomPickerTenant(t);
                            }}
                            className="text-[11px] text-zinc-500 hover:text-cyan-300 p-1 hover:bg-zinc-800 rounded transition-colors"
                            title="Configurar pasta de ROMs"
                          >
                            ⚙️
                          </button>
                        </div>

                        {!isMapped && (
                          <span className="text-[8px] font-mono text-amber-400/90 block truncate pt-0.5">
                            ⚠ Pasta não mapeada
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        ) : (
          /* STEP 2: GEOMETRIC BALANCE BENTO GRID (HERO SHOWCASE + LIBRARY GRID) */
          <main id="game-selection-section" className="flex-1 min-h-0 overflow-hidden flex flex-col px-4 sm:px-8 py-3 sm:py-4">
            
            {/* Navigation subheader */}
            <div className="flex justify-between items-center mb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  id="btn-back-to-consoles"
                  onClick={() => {
                    sfx.playBack();
                    setSelectedTenant(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-white/10 text-xs font-bold flex items-center space-x-1.5 active:scale-95 transition-all"
                >
                  <span>◀</span>
                  <span>Voltar [B]</span>
                </button>

                <button
                  id="btn-manage-rom-folder"
                  onClick={() => {
                    sfx.playSelect();
                    setRomPickerTenant(selectedTenant);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 text-xs font-mono border border-white/5 flex items-center space-x-1 transition-colors shrink-0"
                >
                  <span>📂</span>
                  <span className="hidden sm:inline">Pasta</span>
                </button>
                
                <div className="relative flex items-center ml-2 sm:ml-4">
                  <span className="absolute left-2.5 text-zinc-500 text-[10px]">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveGameIdx(0);
                    }}
                    className="bg-zinc-900/80 border border-white/5 rounded-xl py-1.5 pl-7 pr-3 text-[10px] font-mono text-cyan-300 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 w-24 sm:w-48 transition-all"
                  />
                </div>
              </div>

              <div className="text-right flex items-center space-x-2 font-mono">
                <span className="text-xs text-cyan-400 font-bold bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                  {selectedTenant.originalConsole}
                </span>
                <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-1 rounded-lg border border-white/5">
                  {selectedTenant.games?.length || 0} ROMS
                </span>
              </div>
            </div>

            {selectedTenant.games && selectedTenant.games.length > 0 ? (
              <div className="flex-1 grid grid-cols-12 gap-4 lg:gap-6 min-h-0 overflow-hidden">
                
                {/* LEFT SECTION (Col-span-4/5): HERO GAME SHOWCASE & METADATA BENTO BOX */}
                <section className="col-span-12 sm:col-span-5 md:col-span-4 lg:col-span-4 xl:col-span-4 flex flex-col space-y-3 lg:space-y-4 overflow-y-auto custom-scrollbar pr-1 shrink-0">
                  {activeGame ? (
                    <>
                      {/* Geometric Balance Hero Showcase Card */}
                      <div className="relative group w-full aspect-[21/9] sm:aspect-[4/5] rounded-3xl overflow-hidden border-4 border-cyan-500 shadow-2xl shadow-cyan-500/20 shrink-0 bg-zinc-900">
                        {activeGame.boxArtUrl ? (
                          <>
                              <img 
                                src={GameScraperService.getCachedUrl(activeGame.id) || activeGame.boxArtUrl} 
                                alt={activeGame.title} 
                                referrerPolicy="no-referrer"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                onLoad={(e) => GameScraperService.setCachedUrl(activeGame.id, e.currentTarget.src)}
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const retryCount = parseInt(target.dataset.retryCount || '0', 10);
                                  const nextUrl = GameScraperService.getNextBoxartFallback(selectedTenant.id, activeGame.title, activeGame.fileName, retryCount + 1);
                                  
                                  if (nextUrl) {
                                    target.dataset.retryCount = (retryCount + 1).toString();
                                    target.src = nextUrl;
                                    return;
                                  }
                                  target.src = GameScraperService.generateFallbackCover(activeGame.title, selectedTenant.color);
                                }}
                              />
                            <div className={`absolute inset-0 hidden bg-gradient-to-br ${activeGame.banner || 'from-indigo-900 to-purple-900'} flex items-center justify-center p-6 text-center`}>
                              <div>
                                <div className="text-5xl mb-3">⚔️</div>
                                <h2 className="text-2xl font-black leading-tight uppercase">{activeGame.title}</h2>
                                <p className="text-xs text-cyan-400 font-mono mt-2 tracking-widest uppercase">{activeGame.developer || 'Retro'} • {activeGame.releaseYear || '1995'}</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className={`absolute inset-0 bg-gradient-to-br ${activeGame.banner || 'from-indigo-900 to-purple-900'} flex items-center justify-center p-6 text-center`}>
                            <div>
                              <div className="text-5xl mb-3">⚔️</div>
                              <h2 className="text-2xl font-black leading-tight uppercase">{activeGame.title}</h2>
                              <p className="text-xs text-cyan-400 font-mono mt-2 tracking-widest uppercase">{activeGame.developer || 'Retro'} • {activeGame.releaseYear || '1995'}</p>
                            </div>
                          </div>
                        )}

                        {/* Bottom Gradient Overlay with Rating & Genre */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
                          <div className="mb-1">
                            <h2 className="text-lg sm:text-xl font-black text-white leading-tight uppercase truncate drop-shadow-md">
                              {activeGame.title}
                            </h2>
                            <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">
                              {activeGame.developer || selectedTenant.name} • {activeGame.releaseYear || '1995'}
                            </p>
                          </div>
                          <div className="flex justify-between items-end pt-1">
                            <span className="text-amber-400 text-xs sm:text-sm font-bold drop-shadow-sm">
                              ★★★★★ {activeGame.rating || '9.8'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-black/70 rounded text-zinc-300 font-mono border border-white/10">
                              {activeGame.genre || 'RPG'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Launch Button (Always Visible) */}
                      <button
                        id="btn-launch-active-game"
                        onClick={() => {
                          sfx.playCoin();
                          onLaunch(activeGame, selectedTenant);
                        }}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/30 active:scale-95 transition-transform flex items-center justify-center space-x-2 shrink-0"
                      >
                        <span className="text-lg drop-shadow-md">▶</span>
                        <span className="drop-shadow-sm">Iniciar Jogo [A]</span>
                      </button>
                    </>
                  ) : null}
                </section>

                {/* RIGHT SECTION (Col-span-8/7): LIBRARY GRID WITH STRICT NON-OVERLAPPING GEOMETRY */}
                <section className="col-span-12 sm:col-span-7 md:col-span-8 lg:col-span-8 xl:col-span-8 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                      Library <span className="text-cyan-400 text-sm">({filteredGames.length} Games)</span>
                    </h2>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1.5">
                        <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                        <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                        <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                      </div>
                    </div>
                  </div>

                  {/* Strictly non-overlapping geometric cards grid */}
                  <div 
                    id="games-scroll-viewport"
                    className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-1.5 pb-2"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 pb-4">
                      {filteredGames.map((game, idx) => {
                        const isActive = activeGameIdx === idx;

                        return (
                          <div
                            key={game.id}
                            id={`game-card-${game.id}`}
                            ref={isActive ? activeCardRef : null}
                            onClick={() => {
                              sfx.playSelect();
                              setActiveGameIdx(idx);
                            }}
                            onDoubleClick={() => {
                              sfx.playCoin();
                              onLaunch(game, selectedTenant);
                            }}
                            className={`group relative aspect-[3/4] bg-zinc-900 rounded-xl border-2 transition-all p-3 flex flex-col justify-between items-center text-center cursor-pointer select-none overflow-hidden ${
                              isActive 
                                ? 'border-cyan-500 ring-2 ring-cyan-500/30 shadow-xl shadow-cyan-500/20 opacity-100 bg-zinc-800/90' 
                                : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                            }`}
                          >
                            {/* Box Art / Icon Background */}
                            {game.boxArtUrl ? (
                              <img 
                                src={GameScraperService.getCachedUrl(game.id) || game.boxArtUrl} 
                                alt={game.title} 
                                referrerPolicy="no-referrer"
                                className="absolute inset-0 w-full h-full object-cover opacity-100 transition-opacity"
                                onLoad={(e) => GameScraperService.setCachedUrl(game.id, e.currentTarget.src)}
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const retryCount = parseInt(target.dataset.retryCount || '0', 10);
                                  const nextUrl = GameScraperService.getNextBoxartFallback(selectedTenant.id, game.title, game.fileName, retryCount + 1);
                                  
                                  if (nextUrl) {
                                    target.dataset.retryCount = (retryCount + 1).toString();
                                    target.src = nextUrl;
                                    return;
                                  }
                                  target.src = GameScraperService.generateFallbackCover(game.title, selectedTenant.color);
                                }}
                              />
                            ) : null}

                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

                            {/* Top Badge */}
                            <div className="relative z-10 w-full flex justify-between items-center text-[9px] font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-black/80 text-zinc-300 border border-white/10 truncate max-w-[60px]">
                                {game.size || 'ROM'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-black/80 text-amber-300 font-bold border border-amber-500/20">
                                ★ {game.rating || '5.0'}
                              </span>
                            </div>

                            {/* Center Icon */}
                            <div className="relative z-10 text-3xl mb-1 drop-shadow-md">
                              {game.genre?.includes('RPG') ? '⚔️' : game.genre?.includes('Platform') ? '🍄' : game.genre?.includes('Adventure') ? '🛡️' : '🎮'}
                            </div>

                            {/* Bottom Title & Genre */}
                            <div className="relative z-10 w-full space-y-0.5">
                              <span className="text-[8px] font-mono text-cyan-400 uppercase font-bold tracking-wider block truncate">
                                {game.genre || 'Classic'}
                              </span>
                              <h4 className="font-bold text-xs uppercase leading-tight text-white truncate drop-shadow-md">
                                {game.title}
                              </h4>
                            </div>

                            {/* Active Indicator Pulse */}
                            {isActive && (
                              <div className="absolute top-2 right-2 z-20 w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              /* EMPTY ROMS STATE */
              <div id="empty-roms-view" className="flex-1 flex flex-col items-center justify-center py-6 px-4 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-zinc-800/90 border border-white/10 flex items-center justify-center text-3xl shadow-inner">
                  {selectedTenant.emojiIcon || '🎮'}
                </div>
                <div className="text-center space-y-1 max-w-sm">
                  <h3 className="font-black text-white text-base">{selectedTenant.name}</h3>
                  <p className="text-zinc-400 text-xs font-mono leading-relaxed">
                    Nenhuma ROM encontrada para este emulador.<br/>
                    {hasMappedDir(selectedTenant)
                      ? 'Copie os arquivos .bin, .sfc ou .iso para a pasta mapeada e recarregue.'
                      : 'Mapeie o diretório onde suas ROMs estão armazenadas.'}
                  </p>
                  {selectedTenant.biosRequired && !localStorage.getItem(`bios_file_uri_${selectedTenant.id}`) && (
                    <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-2 text-amber-300 text-[10px] font-mono mt-2">
                      ⚠ BIOS necessária: <span className="font-bold">{selectedTenant.biosFile || 'bios.bin'}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    id="btn-map-folder-empty"
                    onClick={() => {
                      sfx.playSelect();
                      setRomPickerTenant(selectedTenant);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-transform"
                  >
                    {hasMappedDir(selectedTenant) ? '⚙️ Reconfigurar Pasta' : '📂 Mapear Pasta de ROMs'}
                  </button>

                  <button
                    id="btn-scan-scraper"
                    onClick={() => {
                      sfx.playSelect();
                      if (onRunScraper) onRunScraper();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider border border-white/10 active:scale-95 transition-transform"
                  >
                    🔍 Escanear
                  </button>
                </div>
              </div>
            )}
          </main>
        )}

        {/* Geometric Balance Footer with authentic game controller glyphs */}
        <footer id="bottom-footer" className="h-14 sm:h-16 border-t border-white/5 flex items-center justify-between px-4 sm:px-8 bg-black/20 shrink-0">
          <div className="flex items-center space-x-4 sm:space-x-6">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center text-[10px] font-bold text-black shadow-xs">
                A
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Select Game</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 border border-zinc-500 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-400">
                B
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Back</span>
            </div>

            <div className="flex items-center space-x-2 hidden sm:flex">
              <span className="w-5 h-5 border border-zinc-500 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-400">
                X
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Options</span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-zinc-600 tracking-tighter uppercase">
            Capivara Engine v2.4.0-stable
          </div>
        </footer>
      </div>
    </>
  );
};
