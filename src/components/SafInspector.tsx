import React, { useState, useMemo } from 'react';
import { 
  FolderTree, 
  Folder, 
  Shield, 
  RefreshCw, 
  Copy, 
  Check, 
  AlertTriangle,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { TENANTS } from '../data/tenantsData';
import { TenantInfo } from '../types';

export const SafInspector: React.FC = () => {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('MS3_TECTOY');
  const [copied, setCopied] = useState(false);
  const [rootUri, setRootUri] = useState<string>('content://com.android.externalstorage.documents/tree/primary%3ACapivaraEmuData');
  const [permissionGranted, setPermissionGranted] = useState(true);

  // Masked Error Telemetry State
  const [telemetryError, setTelemetryError] = useState<{ correlationId: string; message: string } | null>(null);

  // O(1) Tenant lookup map for galvanic isolation
  const tenantMap = useMemo(() => {
    const map = new Map<string, TenantInfo>();
    TENANTS.forEach(t => map.set(t.id, t));
    return map;
  }, []);

  const tenant = tenantMap.get(selectedTenantId) || TENANTS[0];

  const handleCopyPath = (path: string) => {
    try {
      navigator.clipboard.writeText(path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const correlationId = `CORR-SAF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setTelemetryError({
        correlationId,
        message: 'Acesso à área de transferência do sistema negado pelo sandbox do sistema operacional.'
      });
    }
  };

  const handleRevalidatePermission = () => {
    try {
      setPermissionGranted(true);
      setTelemetryError(null);
    } catch {
      const correlationId = `CORR-SAF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setTelemetryError({
        correlationId,
        message: 'Falha na renovação da chave de permissão persistente Scoped Storage (takePersistableUriPermission).'
      });
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* SAF Status Banner */}
      <div className="bg-zinc-900/90 border border-white/10 p-6 rounded-2xl space-y-4 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-white">Storage Access Framework (SAF) - Scoped Storage</h2>
                <span className="bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                  Play Store Compliant
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                Permissão persistida via <code className="text-cyan-400 font-mono">takePersistableUriPermission</code>. Estrutura atômica isolada por Tenant ID.
              </p>
            </div>
          </div>

          <button
            onClick={handleRevalidatePermission}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs shadow-lg shadow-cyan-400/20 transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>REVALIDAR PERMISSÃO SAF</span>
          </button>
        </div>

        {/* Masked Error Alert Banner */}
        {telemetryError && (
          <div className="p-3.5 bg-red-950/90 border border-red-500/40 rounded-xl text-xs font-mono text-red-200 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-red-400 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>[Erro de Armazenamento - Detalhes Mascarados]</span>
              </div>
              <p className="text-white/80">{telemetryError.message}</p>
              <div className="text-[10px] text-cyan-300 flex items-center space-x-2 pt-0.5">
                <Activity className="w-3 h-3 text-cyan-400" />
                <span>ID de Correlação de Rastreio: <strong className="font-bold">{telemetryError.correlationId}</strong></span>
              </div>
            </div>
            <button
              onClick={() => setTelemetryError(null)}
              className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white font-bold rounded-md text-[10px]"
            >
              Ok
            </button>
          </div>
        )}

        {/* Root URI Field */}
        <div className="p-3 bg-black rounded-xl border border-white/10 flex items-center justify-between text-xs font-mono">
          <span className="text-white/60 truncate mr-2">{rootUri}</span>
          <button
            onClick={() => handleCopyPath(rootUri)}
            className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-sans font-bold flex-shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar URI'}</span>
          </button>
        </div>
      </div>

      {/* Directory Browser Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Tenant Selection list */}
        <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-white/80 uppercase tracking-widest px-2 flex items-center space-x-2">
            <FolderTree className="w-4 h-4 text-cyan-400" />
            <span>Pastas de Tenants ({TENANTS.length})</span>
          </h3>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {TENANTS.map(t => {
              const isSelected = t.id === selectedTenantId;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTenantId(t.id)}
                  className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-400/10 border-cyan-400/50 text-cyan-400 font-bold shadow-md'
                      : 'bg-black/60 border-white/5 text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-extrabold text-xs text-white truncate">{t.name}</div>
                    <div className="text-[10px] font-mono text-white/40 truncate">/tenants/{t.id}/</div>
                  </div>
                  {t.tectoySpecial && (
                    <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black flex-shrink-0">
                      TecToy
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 2 Cols: Directory Structure Inspector */}
        <div className="md:col-span-2 bg-zinc-900/90 border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
                Estrutura Atômica
              </span>
              <h3 className="text-base font-black text-white">
                /CapivaraEmuData/tenants/{tenant.id}/
              </h3>
            </div>

            <span className="bg-black px-3 py-1 rounded-full text-xs font-mono text-cyan-400 border border-white/10 font-bold">
              {tenant.coreName}
            </span>
          </div>

          {/* Directory Tree */}
          <div className="space-y-3 text-xs font-mono">
            {/* /saves */}
            <div className="p-3.5 bg-black rounded-xl border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-cyan-400 font-bold">
                <span className="flex items-center space-x-2">
                  <Folder className="w-4 h-4 text-cyan-400" />
                  <span>/saves/</span>
                </span>
                <span className="text-[10px] text-white/40">.srm, .sav, .nvram</span>
              </div>
              <p className="text-[11px] text-white/60 pl-6 font-sans">
                Armazena a bateria e arquivos de salvamento permanente da SRAM do console.
              </p>
            </div>

            {/* /states */}
            <div className="p-3.5 bg-black rounded-xl border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span className="flex items-center space-x-2">
                  <Folder className="w-4 h-4 text-emerald-400" />
                  <span>/states/</span>
                </span>
                <span className="text-[10px] text-white/40">.state, .png miniatural</span>
              </div>
              <p className="text-[11px] text-white/60 pl-6 font-sans">
                Snapshots atômicos de memória RAM com captura de tela PNG em shadow-copy.
              </p>
            </div>

            {/* /config */}
            <div className="p-3.5 bg-black rounded-xl border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-amber-300 font-bold">
                <span className="flex items-center space-x-2">
                  <Folder className="w-4 h-4 text-amber-400" />
                  <span>/config/</span>
                </span>
                <span className="text-[10px] text-white/40">retroarch.cfg, shaders.slangp</span>
              </div>
              <p className="text-[11px] text-white/60 pl-6 font-sans">
                Configurações individuais de filtros Vulkan, remapeamento de botões e overlays.
              </p>
            </div>

            {/* /system */}
            <div className="p-3.5 bg-black rounded-xl border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-indigo-300 font-bold">
                <span className="flex items-center space-x-2">
                  <Folder className="w-4 h-4 text-indigo-400" />
                  <span>/system/ (BIOS)</span>
                </span>
                <span className="text-[10px] text-white/40">
                  {tenant.biosFile ? tenant.biosFile : 'HLE (Sem BIOS)'}
                </span>
              </div>
              <p className="text-[11px] text-white/60 pl-6 font-sans">
                {tenant.biosRequired 
                  ? 'Requer arquivo BIOS para inicializar o console no Vulkan JIT.' 
                  : 'Modo HLE (High-Level Emulation) ativo. Funciona sem BIOS.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
