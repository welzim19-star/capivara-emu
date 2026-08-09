import React, { useState, useEffect } from 'react';
import { TenantInfo, GameItem, CoreConfigTemplate } from '../types';
import { registerPlugin } from '@capacitor/core';
import { EmulatorConfigModal } from './EmulatorConfigModal';
import { GameScraperService } from '../services/GameScraperService';

const CapivaraEngine = registerPlugin<any>('CapivaraEngine');

interface Props {
  tenant: TenantInfo;
  onBack: () => void;
  onLaunchGame: (game: GameItem) => void;
}

export function ConsoleView({ tenant, onBack, onLaunchGame }: Props) {
  const [roms, setRoms] = useState<GameItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mappedDir, setMappedDir] = useState<string | null>(localStorage.getItem(`mapped_dir_${tenant.id}`));
  const [showConfigModal, setShowConfigModal] = useState(false);
  // Phase 1.1: Single BIOS File management
  const [biosFileUri, setBiosFileUri] = useState<string | null>(localStorage.getItem(`bios_file_uri_${tenant.id}`));
  const [biosFileName, setBiosFileName] = useState<string | null>(localStorage.getItem(`bios_file_name_${tenant.id}`));

  useEffect(() => {
    if (mappedDir) scanDirectory(mappedDir);
  }, [mappedDir]);

  // Removed refreshInstalledBios as we only care if a file was explicitly chosen

  const isBiosMissing = (): boolean => {
    if (!tenant.biosRequired) return false;
    return biosFileUri === null;
  };

  const mapGameItems = async (files: any[]): Promise<GameItem[]> => {
    const validFiles = files.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return tenant.extensions.includes(ext || '');
    });

    return Promise.all(
      validFiles.map(async (f) => {
        const metadata = await GameScraperService.scrapeBoxart(f.name, tenant.gradient);
        return {
          id: f.uri,
          title: metadata.title,
          tenantId: tenant.id,
          fileName: f.name,
          fileSize: 'N/A',
          crc32: 'N/A',
          boxArtUrl: metadata.coverUrl,
          rating: 0,
          releaseYear: '',
          genre: '',
          isFavorite: false,
          lastPlayed: 'Nunca',
          playTimeMinutes: 0,
          uri: f.uri
        };
      })
    );
  };

  const scanDirectory = async (uri: string) => {
    setIsLoading(true);
    try {
      if (CapivaraEngine) {
        const result = await CapivaraEngine.scanRomDirectory({ uri });
        const items = await mapGameItems(result.files || []);
        setRoms(items);
      }
    } catch (e) {
      console.error("Falha ao escanear diretório", e);
      localStorage.removeItem(`mapped_dir_${tenant.id}`);
      setMappedDir(null);
    }
    setIsLoading(false);
  };

  const handlePickDirectory = async () => {
    try {
      if (CapivaraEngine) {
        const result = await CapivaraEngine.pickRomDirectory();
        if (result && result.directoryUri) {
          localStorage.setItem(`mapped_dir_${tenant.id}`, result.directoryUri);
          setMappedDir(result.directoryUri);
          setIsLoading(true);
          const items = await mapGameItems(result.files || []);
          setRoms(items);
          setIsLoading(false);
        }
      }
    } catch (e) {
      console.log("Usuário cancelou ou ocorreu erro", e);
    }
  };

  // Phase 1.1: BIOS File Picker
  const handlePickBiosFile = async () => {
    try {
      const result = await CapivaraEngine.pickBiosFile();
      if (result?.uri) {
        localStorage.setItem(`bios_file_uri_${tenant.id}`, result.uri);
        localStorage.setItem(`bios_file_name_${tenant.id}`, result.name);
        setBiosFileUri(result.uri);
        setBiosFileName(result.name);
      }
    } catch (e) {
      console.log("Cancelado ou erro ao selecionar arquivo de BIOS", e);
    }
  };

  const handleLaunchGame = (game: GameItem) => {
    // Inject biosFileUri into the game object so InteractiveEmulator can pass it to startGame
    const enrichedGame: GameItem = {
      ...game,
      biosFileUri: biosFileUri ?? undefined,
      biosFileName: biosFileName ?? undefined,
    };
    onLaunchGame(enrichedGame);
  };

  const loadSavedConfig = (): CoreConfigTemplate | undefined => {
    const saved = localStorage.getItem(`core_config_${tenant.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return undefined;
  };

  const handleSaveConfig = (config: CoreConfigTemplate) => {
    localStorage.setItem(`core_config_${tenant.id}`, JSON.stringify(config));
    setShowConfigModal(false);
  };

  return (
    <div className="absolute inset-0 bg-[#050505] flex flex-col">
      <div className={`p-4 bg-gradient-to-r ${tenant.gradient} shadow-lg flex items-center justify-between h-14 relative shrink-0`}>
        <div className="flex items-center">
          <button onClick={onBack} className="p-1 bg-black/20 rounded-full text-white/80 hover:text-white mr-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h2 className="text-xl font-bold text-white drop-shadow-md">{tenant.name}</h2>
        </div>
        <button onClick={() => setShowConfigModal(true)} className="p-1.5 bg-black/20 rounded text-white/90 hover:bg-black/40 text-xs font-bold transition">
          ⚙️ ENGINE CONFIG
        </button>
      </div>

      {/* Phase 1.3: BIOS Warning Banner */}
      {tenant.biosRequired && (
        <div
          className={`mx-4 mt-3 px-4 py-3 rounded-xl border text-xs font-mono flex items-start gap-3 ${
            isBiosMissing()
              ? 'bg-yellow-950/60 border-yellow-500/40 text-yellow-300'
              : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
          }`}
        >
          <span className="text-lg">{isBiosMissing() ? '⚠️' : '✅'}</span>
          <div className="flex-1">
            {isBiosMissing() ? (
              <>
                <p className="font-bold">BIOS Ausente (Obrigatória)</p>
                <p className="text-yellow-400/60 mt-0.5">Selecione o arquivo da BIOS. ({tenant.biosFile?.split(' ')[0]})</p>
              </>
            ) : (
              <>
                <p className="font-bold">BIOS Instalada: <code className="bg-black/30 px-1 rounded text-emerald-300">{biosFileName}</code></p>
                <p className="text-emerald-400/60 mt-0.5">Pronto para jogar!</p>
              </>
            )}
          </div>
          <button
            onClick={handlePickBiosFile}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
              isBiosMissing()
                ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
          >
            {isBiosMissing() ? 'Instalar BIOS' : 'Atualizar'}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white/80">Biblioteca</h3>
          <div className="flex items-center gap-3">

            <button onClick={handlePickDirectory} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-lg transition">
              {mappedDir ? 'Alterar Pasta' : 'Mapear Pasta de ROMs'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/50 space-y-4">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="font-bold">Baixando Boxarts e Meta-dados...</p>
          </div>
        ) : roms.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/40 mb-4">Nenhum jogo encontrado para {tenant.name}.</p>
            {!mappedDir && (
              <p className="text-xs text-white/30">Mapeie a pasta onde suas roms ({tenant.extensions.join(', ')}) estão guardadas.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 pb-20">
            {roms.map((rom, idx) => (
              <div
                key={idx}
                onClick={() => handleLaunchGame(rom)}
                className="group flex flex-col items-center cursor-pointer"
              >
                <div className="w-full aspect-[3/4] rounded-xl overflow-hidden shadow-lg border border-white/10 group-hover:border-white/50 group-hover:scale-[1.05] transition-all duration-300 relative bg-zinc-900">
                  {rom.boxArtUrl ? (
                    <img src={rom.boxArtUrl} alt={rom.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">🕹️</div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center pl-1 shadow-2xl">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                </div>
                <span className="mt-2 text-center text-xs font-bold text-white/80 group-hover:text-white truncate w-full px-1">
                  {rom.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {showConfigModal && (
        <EmulatorConfigModal
          tenant={tenant}
          initialConfig={loadSavedConfig()}
          onClose={() => setShowConfigModal(false)}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  );
}

