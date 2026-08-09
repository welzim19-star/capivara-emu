import React from 'react';
import { Sparkles, Check, ShieldCheck, Zap, Lock, CreditCard } from 'lucide-react';

interface BillingModalProps {
  isPro: boolean;
  onClose: () => void;
  onConfirmPurchase: () => void;
}

export const BillingModal: React.FC<BillingModalProps> = ({
  isPro,
  onClose,
  onConfirmPurchase
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden space-y-5">
        {/* Top Glow Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-cyan-400 text-black rounded-xl">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">CAPIVARA PRO UNLOCK</h3>
              <p className="text-[10px] font-mono text-cyan-400">Google Play Billing 6.0 SKU: capivara_pro_unlock</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white font-bold">
            ✕
          </button>
        </div>

        {isPro ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 bg-cyan-950 border border-cyan-500/40 rounded-2xl flex items-center justify-center mx-auto text-cyan-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h4 className="text-base font-black text-white">Sua Conta já é Capivara Pro!</h4>
            <p className="text-xs text-white/60">
              Todos os Shaders Vulkan, salvamentos ilimitados e remoção de anúncios estão ativos no seu dispositivo.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-black rounded-xl border border-cyan-400/30 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-black text-white">Versão Pro - Compra Única</span>
                <span className="text-lg font-black text-cyan-400 font-mono">R$ 14,90</span>
              </div>
              <p className="text-[11px] text-white/50">
                Sem assinaturas mensais. Pague uma vez na Play Store e use para sempre.
              </p>
            </div>

            <div className="space-y-2 text-xs text-white/80 font-bold">
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>Remoção total de anúncios em todos os 12 consoles</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>Acesso a Shaders Vulkan CRT-Royal e ScaleFX 4x</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>Save States ilimitados por Tenant</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>Sincronização em Nuvem com o Anti-Gravity</span>
              </div>
            </div>

            <button
              onClick={() => {
                onConfirmPurchase();
              }}
              className="w-full py-3 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs shadow-lg shadow-cyan-400/20 transition flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>SIMULAR COMPRA NA GOOGLE PLAY</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
