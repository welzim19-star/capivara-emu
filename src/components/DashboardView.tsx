import React from 'react';
import { TENANTS } from '../data/tenantsData';
import { TenantInfo } from '../types';

interface Props {
  onSelectConsole: (tenant: TenantInfo) => void;
}

export function DashboardView({ onSelectConsole }: Props) {
  // We use placeholder images or abstract gradients if no image is available.
  const consoleImages: Record<string, string> = {
    'MS3_TECTOY': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
    'SNES_SNES9X': 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=800&q=80',
    'GENESIS_GENPLUSGX': 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=800&q=80',
    'PS1_PCSX': 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80',
    'PS2_NETHERSX2': 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80',
    'GBA_MGBA': 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=800&q=80',
    'MAME_2003PLUS': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80'
  };

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar pb-20">
      <div className="p-4 space-y-6">
        <h2 className="text-xl font-black text-white/90 tracking-wide uppercase">Seus Consoles</h2>
        
        <div className="flex flex-col space-y-4">
          {TENANTS.map(tenant => (
            <div 
              key={tenant.id}
              onClick={() => onSelectConsole(tenant)}
              className="relative h-40 w-full rounded-2xl overflow-hidden shadow-xl cursor-pointer group transform transition-transform active:scale-95"
            >
              {/* Cover Image */}
              <img 
                src={consoleImages[tenant.id] || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'} 
                alt={tenant.name}
                className="absolute inset-0 w-full h-full object-cover brightness-50 group-hover:brightness-75 transition-all"
              />
              
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${tenant.gradient} opacity-40 mix-blend-multiply`} />
              
              {/* Content */}
              <div className="absolute inset-0 p-4 flex flex-col justify-end">
                <h3 className="text-2xl font-black text-white drop-shadow-lg">{tenant.name}</h3>
                <p className="text-xs text-white/80 font-mono drop-shadow-lg">{tenant.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
