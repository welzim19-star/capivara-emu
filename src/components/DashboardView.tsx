import React from 'react';
import { TENANTS } from '../data/tenantsData';
import { TenantInfo } from '../types';

interface Props {
  onSelectConsole: (tenant: TenantInfo) => void;
}

export function DashboardView({ onSelectConsole }: Props) {
  // We use placeholder images or abstract gradients if no image is available.
  const consoleImages: Record<string, string> = {
    'MS3_TECTOY': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23111'/%3E%3Cpath d='M0 300 L800 300 L800 400 L0 400 Z' fill='%23800'/%3E%3Ccircle cx='700' cy='350' r='20' fill='%23111'/%3E%3Ccircle cx='750' cy='350' r='20' fill='%23111'/%3E%3C/svg%3E",
    'SNES_SNES9X': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23ccc'/%3E%3Crect x='0' y='300' width='800' height='40' fill='%23555'/%3E%3Ccircle cx='650' cy='320' r='15' fill='%2300f'/%3E%3Ccircle cx='680' cy='290' r='15' fill='%230b0'/%3E%3Ccircle cx='710' cy='320' r='15' fill='%23f00'/%3E%3Ccircle cx='680' cy='350' r='15' fill='%23ff0'/%3E%3C/svg%3E",
    'GENESIS_GENPLUSGX': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23111'/%3E%3Ccircle cx='400' cy='200' r='150' fill='none' stroke='%23333' stroke-width='30'/%3E%3Crect x='0' y='350' width='800' height='10' fill='%23c00'/%3E%3C/svg%3E",
    'PS1_PCSX': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23b5b5b5'/%3E%3Ccircle cx='400' cy='200' r='150' fill='%23222'/%3E%3Cpath d='M300 150 L500 150 L500 250 L300 250 Z' fill='%23111'/%3E%3C/svg%3E",
    'PS2_NETHERSX2': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23000'/%3E%3Crect x='0' y='0' width='800' height='400' fill='url(%23g)'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23000'/%3E%3Cstop offset='100%25' stop-color='%23001a33'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='100' y='50' width='50' height='300' fill='%23003366' opacity='0.5'/%3E%3Crect x='300' y='100' width='80' height='200' fill='%23004488' opacity='0.3'/%3E%3Crect x='600' y='20' width='40' height='350' fill='%230055aa' opacity='0.2'/%3E%3C/svg%3E",
    'N64_MUPEN64PLUS': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%231a1a1a'/%3E%3Cpolygon points='300,300 400,100 500,300' fill='%23000' stroke='%23333' stroke-width='10'/%3E%3Cpolygon points='400,150 450,250 350,250' fill='%23f00'/%3E%3Cpolygon points='300,300 350,200 250,200' fill='%230f0'/%3E%3Cpolygon points='500,300 550,200 450,200' fill='%2300f'/%3E%3C/svg%3E",
    'GBA_MGBA': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%234a0080'/%3E%3Crect x='200' y='50' width='400' height='300' rx='20' fill='%23111'/%3E%3Crect x='220' y='70' width='360' height='260' fill='%235c6b51'/%3E%3C/svg%3E",
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
