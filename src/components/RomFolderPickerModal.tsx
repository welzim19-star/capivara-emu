import React, { useState, useEffect } from 'react';
import { TenantInfo } from '../types';
import { registerPlugin } from '@capacitor/core';

const CapivaraEngine = registerPlugin<any>('CapivaraEngine');

interface Props {
  tenant: TenantInfo;
  onClose: () => void;
  onMapped: () => void;
}

/**
 * RomFolderPickerModal (v2 – Backend Fixed)
 * 
 * KILLCAM: O bug era que `result.uri` não existe no retorno do plugin.
 * O campo correto retornado por pickRomDirectory() é `directoryUri`.
 * O BIOS agora usa o método nativo correto: `pickBiosFile()`.
 */
export const RomFolderPickerModal: React.FC<Props> = ({ tenant, onClose, onMapped }) => {
  const [mappedUri, setMappedUri] = useState<string | null>(null);
  const [biosInstalled, setBiosInstalled] = useState(false);
  const [biosName, setBiosName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  // Load persisted state on mount
  // KILLCAM FIX: Use the EXACT same localStorage keys as ConsoleView.tsx + useEngineLifecycle.ts
  // ConsoleView uses: mapped_dir_${id}, bios_file_uri_${id}, bios_file_name_${id}
  useEffect(() => {
    const savedUri = localStorage.getItem(`mapped_dir_${tenant.id}`);
    if (savedUri) setMappedUri(savedUri);

    const savedBiosUri = localStorage.getItem(`bios_file_uri_${tenant.id}`);
    const savedBiosName = localStorage.getItem(`bios_file_name_${tenant.id}`);
    if (savedBiosUri && savedBiosName) {
      setBiosInstalled(true);
      setBiosName(savedBiosName);
    }
  }, [tenant.id]);

  const displayUri = (uri: string | null): string => {
    if (!uri) return '';
    try {
      return decodeURIComponent(uri)
        .replace('content://com.android.externalstorage.documents/tree/primary:', '/sdcard/')
        .replace('%3A', '/')
        .replace(/%3A/g, '/')
        .replace(/%2F/g, '/');
    } catch {
      return uri;
    }
  };

  const handlePickFolder = async () => {
    setLoading(true);
    setError('');
    setStatusMsg('Abrindo seletor de pasta...');
    try {
      // KILLCAM FIX: O retorno correto é result.directoryUri (não result.uri)
      const result = await CapivaraEngine.pickRomDirectory();

      if (result && result.directoryUri) {
        const uri = result.directoryUri as string;
        localStorage.setItem(`mapped_dir_${tenant.id}`, uri);
        setMappedUri(uri);
        setStatusMsg(`✅ Pasta mapeada! ${result.files?.length ?? 0} arquivo(s) encontrado(s).`);
      } else if (result) {
        // Plugin resolved but without URI (should not happen, but handle gracefully)
        setError('Pasta selecionada mas URI não foi retornada. Tente novamente.');
        setStatusMsg('');
      } else {
        setError('Nenhuma pasta selecionada. Tente novamente.');
        setStatusMsg('');
      }
    } catch (e: any) {
      const msg: string = e?.message || '';
      // "User canceled" is expected when user presses Back — not an error
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('canceled')) {
        setStatusMsg('');
        setError('');
      } else if (msg.toLowerCase().includes('invalid directory')) {
        // Directory was picked but listing failed (common on large folders)
        // Try to extract URI from the intent anyway
        setError('Pasta selecionada, mas falha ao listar arquivos. Clique "Pronto" e abra o app novamente para escanear.');
        setStatusMsg('');
      } else {
        setError(`Erro: ${msg || 'Falha ao abrir seletor de pasta.'}`);
        setStatusMsg('');
        console.error('[RomFolderPicker] pickRomDirectory error:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearFolder = () => {
    localStorage.removeItem(`mapped_dir_${tenant.id}`);
    setMappedUri(null);
    setStatusMsg('🗑️ Mapeamento removido.');
    setError('');
  };

  const handleBiosPick = async () => {
    setLoading(true);
    setError('');
    setStatusMsg('Abrindo seletor de BIOS...');
    try {
      // For PS2/PSP request All Files Access first (same as ConsoleView.tsx)
      if (tenant.id === 'PS2_NETHERSX2' || tenant.id === 'PSP_PPSSPP') {
        try { await CapivaraEngine.requestAllFilesAccess(); } catch (_) {}
      }
      // KILLCAM FIX: Use pickBiosFile() — matches ConsoleView.tsx handlePickBiosFile exactly
      const result = await CapivaraEngine.pickBiosFile();

      if (result && result.uri) {
        // KILLCAM FIX: Use same keys as ConsoleView.tsx: bios_file_uri_ and bios_file_name_
        localStorage.setItem(`bios_file_uri_${tenant.id}`, result.uri);
        localStorage.setItem(`bios_file_name_${tenant.id}`, result.name || 'bios.bin');
        setBiosInstalled(true);
        setBiosName(result.name || 'bios.bin');
        setStatusMsg(`✅ BIOS "${result.name}" selecionada com sucesso!`);
      } else {
        setError('Nenhum arquivo selecionado.');
        setStatusMsg('');
      }
    } catch (e: any) {
      if (e?.message?.toLowerCase().includes('cancel')) {
        setStatusMsg('');
        setError('Operação cancelada.');
      } else {
        setError(`Erro ao selecionar BIOS: ${e?.message || 'Falha desconhecida.'}`);
        setStatusMsg('');
        console.error('[RomFolderPicker] pickBiosFile error:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBios = () => {
    localStorage.removeItem(`bios_file_uri_${tenant.id}`);
    localStorage.removeItem(`bios_file_name_${tenant.id}`);
    setBiosInstalled(false);
    setBiosName(null);
    setStatusMsg('🗑️ BIOS removida.');
  };

  const handleDone = () => {
    onMapped();
    onClose();
  };

  const canProceed = mappedUri && (!tenant.biosRequired || biosInstalled);

  return (
    <div className="fixed inset-0 bg-black/90 z-[130] backdrop-blur-xl flex items-end sm:items-center justify-center p-3 sm:p-6">
      <div className="bg-zinc-950 border border-cyan-500/30 rounded-3xl w-full max-w-sm shadow-2xl glow-cyan flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xl shadow-lg">
              {tenant.emojiIcon || '🎮'}
            </div>
            <div>
              <h2 className="text-white font-black text-sm tracking-wide">{tenant.name}</h2>
              <p className="text-cyan-400 font-mono text-[10px]">
                Configurar ROMs{tenant.biosRequired ? ' + BIOS' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xl font-bold active:scale-90 transition-transform w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1">

          {/* Status / Error alerts */}
          {statusMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
              {statusMsg}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-[11px] font-mono">
              ⚠ {error}
            </div>
          )}

          {/* ===== ROM FOLDER ===== */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-zinc-400 uppercase font-bold tracking-wide">📁 Pasta de ROMs</span>
            </div>

            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-3 space-y-3">
              {mappedUri ? (
                <>
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-400 text-sm mt-0.5 shrink-0">✓</span>
                    <p className="text-emerald-300 font-mono text-[10px] break-all leading-relaxed">
                      {displayUri(mappedUri)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePickFolder}
                      disabled={loading}
                      className="flex-1 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/30 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      🔄 Trocar Pasta
                    </button>
                    <button
                      onClick={handleClearFolder}
                      className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-[11px] border border-red-500/20 active:scale-95 transition-transform"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-zinc-400 text-[11px] font-mono text-center leading-relaxed">
                    Selecione a pasta com suas ROMs
                    <br />
                    <span className="text-zinc-500 text-[10px]">
                      Formatos: .{tenant.extensions.join(' · .')}
                    </span>
                  </p>
                  <button
                    onClick={handlePickFolder}
                    disabled={loading}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold text-xs uppercase shadow-lg active:scale-95 transition-transform disabled:opacity-60"
                  >
                    {loading ? '⏳ Aguarde...' : '📂 Selecionar Pasta'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ===== BIOS (only for tenants that require it) ===== */}
          {tenant.biosRequired && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 uppercase font-bold tracking-wide">💾 BIOS / Firmware</span>
                {biosInstalled && (
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    ✓ INSTALADA
                  </span>
                )}
              </div>

              <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-3 space-y-2.5">
                <p className="text-zinc-500 text-[10px] font-mono leading-relaxed">
                  Arquivo esperado: <span className="text-amber-300 font-bold">{tenant.biosFile || 'bios.bin'}</span>
                </p>

                {biosInstalled ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-950/30 rounded-xl border border-emerald-500/20">
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-400">✅</span>
                      <span className="text-emerald-300 text-[11px] font-mono truncate max-w-[160px]">
                        {biosName}
                      </span>
                    </div>
                    <button
                      onClick={handleRemoveBios}
                      className="text-red-400 text-[10px] font-bold ml-2 shrink-0 active:scale-90 transition-transform"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleBiosPick}
                      disabled={loading}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-extrabold text-xs uppercase shadow-lg active:scale-95 transition-transform disabled:opacity-60"
                    >
                      {loading ? '⏳ Importando...' : '⬆️ Selecionar Arquivo de BIOS'}
                    </button>
                    <p className="text-red-400/70 text-[9px] font-mono text-center">
                      ⚠ Sem a BIOS, o emulador não iniciará jogos.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Progress hint */}
          {tenant.biosRequired && (
            <div className="flex items-center space-x-2 text-[10px] font-mono text-zinc-600">
              <span className={mappedUri ? 'text-emerald-400' : 'text-zinc-600'}>
                {mappedUri ? '✓' : '○'} ROMs mapeadas
              </span>
              <span>·</span>
              <span className={biosInstalled ? 'text-emerald-400' : 'text-zinc-600'}>
                {biosInstalled ? '✓' : '○'} BIOS instalada
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 flex space-x-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-zinc-900 text-zinc-300 font-bold text-xs border border-white/10 active:scale-95 transition-transform"
          >
            Cancelar
          </button>
          <button
            onClick={handleDone}
            disabled={!mappedUri}
            className={`flex-1 py-3 rounded-2xl font-extrabold text-xs shadow-lg active:scale-95 transition-transform ${
              canProceed
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black'
                : mappedUri
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black' // has ROMs but needs BIOS
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {canProceed ? 'Pronto ✓' : tenant.biosRequired && mappedUri ? 'Falta BIOS ⚠' : 'Selecione a Pasta'}
          </button>
        </div>
      </div>
    </div>
  );
};
