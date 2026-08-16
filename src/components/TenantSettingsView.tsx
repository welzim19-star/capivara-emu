import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TenantInfo, GameItem } from '../types';
import { TENANT_THEMES, DEFAULT_THEME, TENANT_ENGINE_OPTIONS, EngineOption, GLOBAL_OPTIONS } from '../core/domain/TenantConfig';

interface Props {
  tenant: TenantInfo;
  game?: GameItem;
  onClose: () => void;
  onSave: (config: any, isOverride: boolean) => void;
  initialConfig?: any;
}

export const TenantSettingsView: React.FC<Props> = ({ tenant, game, onClose, onSave, initialConfig = {} }) => {
  const theme = TENANT_THEMES[tenant.id] || DEFAULT_THEME;
  const options = [...(TENANT_ENGINE_OPTIONS[tenant.id] || []), ...GLOBAL_OPTIONS];
  const [isOverride, setIsOverride] = useState<boolean>(() => {
    if (game) {
      return localStorage.getItem(`override_${game.id}`) !== null;
    }
    return false;
  });
  
  const [config, setConfig] = useState<Record<string, any>>(() => {
    const defaultState: any = {};
    options.forEach(opt => defaultState[opt.id] = initialConfig[opt.id] ?? opt.default);
    return defaultState;
  });

  const categories = Array.from(new Set(options.map(o => o.category)));

  const [activeCategory, setActiveCategory] = useState<string>(categories[0] || 'System');

  const updateConfig = (id: string, value: any) => {
    setConfig(prev => ({ ...prev, [id]: value }));
  };

  const renderOption = (opt: EngineOption) => {
    return (
      <div key={opt.id} className="mb-4">
        {opt.type === 'toggle' && (
          <div className="flex items-center justify-between bg-black/20 p-3.5 rounded-lg border border-white/5">
            <div>
              <p className={`text-xs font-bold ${theme.accentColor}`}>{opt.label}</p>
              <p className="text-[9px] text-white/50">{opt.description}</p>
            </div>
            <button 
              onClick={() => updateConfig(opt.id, !config[opt.id])} 
              className={`w-10 h-5 rounded-full flex items-center px-1 transition-all ${config[opt.id] ? theme.accentColor.replace('text-', 'bg-') : 'bg-white/10'}`}
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-all ${config[opt.id] ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        )}

        {opt.type === 'slider' && (
          <div className="bg-black/20 p-3.5 rounded-lg border border-white/5">
            <label className="flex justify-between text-xs mb-1.5">
              <span className={`font-bold ${theme.accentColor}`}>{opt.label}</span>
              <span className="font-mono text-white/80">{config[opt.id]}{opt.unit}</span>
            </label>
            <input 
              type="range" 
              min={opt.min} max={opt.max} step={opt.step} 
              value={config[opt.id]} 
              onChange={(e) => updateConfig(opt.id, Number(e.target.value))} 
              className="w-full h-1 accent-current" 
              style={{ color: theme.accentColor.replace('text-', '') }}
            />
            <p className="text-[9px] text-white/50 mt-1">{opt.description}</p>
          </div>
        )}

        {opt.type === 'select' && (
          <div className="bg-black/20 p-3.5 rounded-lg border border-white/5">
            <label className={`block text-xs font-bold ${theme.accentColor} mb-1.5`}>{opt.label}</label>
            <select 
              value={config[opt.id]} 
              onChange={(e) => updateConfig(opt.id, e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-md p-1.5 text-white text-xs outline-none"
            >
              {opt.options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <p className="text-[9px] text-white/50 mt-1">{opt.description}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className={`w-full max-w-2xl ${theme.bgColor} ${theme.panelStyle} flex flex-col h-[90vh] overflow-hidden shadow-2xl`}>
        
        {/* Header */}
        <div className={`px-4 py-3 border-b border-white/10 flex justify-between items-center ${theme.headerColor} shrink-0`}>
          <div>
            <h2 className={`text-lg font-black ${theme.accentColor} ${theme.fontFamily}`}>{tenant.name} ENGINE</h2>
            <p className="text-white/40 text-[9px] font-mono uppercase">
              {game ? (isOverride ? `OVERRIDING: ${game.fileName}` : `GLOBAL CONFIG (${game.fileName})`) : 'System Configuration Matrix'}
            </p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white font-black text-xl">✕</button>
        </div>

        {/* Override Toggle (Only if game context exists) */}
        {game && (
          <div className="px-4 py-2 bg-black/40 border-b border-white/10 flex items-center justify-between shrink-0">
            <div>
              <p className="text-white font-bold text-xs">Save Config to this Game Only</p>
              <p className="text-white/40 text-[9px] font-mono uppercase">Prevent global settings from being altered</p>
            </div>
            <button 
              onClick={() => setIsOverride(!isOverride)} 
              className={`w-10 h-5 rounded-full flex items-center px-1 transition-all ${isOverride ? theme.accentColor.replace('text-', 'bg-') : 'bg-white/10'}`}
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-all ${isOverride ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        )}

        {/* Categories Tabs */}
        {categories.length > 0 && (
          <div className="flex border-b border-white/10 overflow-x-auto custom-scrollbar shrink-0 bg-black/20">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-3 text-xs font-bold tracking-widest uppercase transition-all border-b-2 whitespace-nowrap
                  ${activeCategory === cat ? `${theme.accentColor} border-current` : 'text-white/40 border-transparent hover:text-white/70 hover:bg-white/5'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
          {options.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/30 text-xs font-mono">
              [NO ADVANCED OPTIONS FOR THIS ENGINE YET]
            </div>
          ) : (
            <div className={`space-y-1 ${theme.fontFamily}`}>
              {options.filter(o => o.category === activeCategory).map(renderOption)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t border-white/10 flex justify-end gap-2 ${theme.headerColor} shrink-0`}>
          <button onClick={onClose} className="px-5 py-1.5 rounded-lg text-white/70 font-bold hover:bg-white/10 transition-all text-xs">Cancel</button>
          <button onClick={() => onSave(config, isOverride)} className={`px-5 py-1.5 rounded-lg transition-all text-xs font-bold ${theme.buttonClass}`}>Apply Config</button>
        </div>
      </div>
    </motion.div>
  );
};
