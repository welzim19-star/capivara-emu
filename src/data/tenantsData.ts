import { TenantInfo, GameItem } from '../types';

export const TENANTS: TenantInfo[] = [
  {
    id: 'MS3_TECTOY',
    name: 'PicoMaster',
    subtitle: 'TecToy Brazilian Edition & Mappers',
    coreName: 'SMS Plus GX / PicoDrive',
    coreFile: 'picodrive_libretro_android.so',
    extensions: ['sms', 'bin'],
    color: '#E53E3E',
    gradient: 'from-red-600 to-amber-600',
    iconName: 'Tv',
    emojiIcon: '📺',
    biosRequired: false,
    tectoySpecial: true,
    gamepadStyle: { type: '2-button', bottom: { colorClass: 'bg-red-700/80', label: '1' }, right: { colorClass: 'bg-red-700/80', label: '2' } },
    heroImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    games: [
      { id: 'ms3-1', title: 'Alex Kidd in Miracle World', tenantId: 'MS3_TECTOY', fileName: '', fileSize: '128 KB', crc32: '', boxArtUrl: '', rating: 4.8, releaseYear: '1986', genre: 'Platformer', isFavorite: false, banner: 'from-cyan-600 to-blue-900' },
      { id: 'ms3-2', title: 'Sonic the Hedgehog', tenantId: 'MS3_TECTOY', fileName: '', fileSize: '256 KB', crc32: '', boxArtUrl: '', rating: 4.9, releaseYear: '1991', genre: 'Platformer', isFavorite: true, banner: 'from-blue-600 to-indigo-900' }
    ]
  },
  {
    id: 'SNES_SNES9X',
    name: 'Super9x',
    subtitle: 'SNES High Fidelity Engine',
    coreName: 'Snes9x',
    coreFile: 'snes9x_libretro_android.so',
    extensions: ['smc', 'sfc', 'zip'],
    color: '#8B5CF6',
    gradient: 'from-purple-600 to-indigo-600',
    iconName: 'Gamepad2',
    emojiIcon: '👾',
    biosRequired: false,
    gamepadStyle: { type: '4-button', top: { colorClass: 'bg-blue-600/80', label: 'X' }, left: { colorClass: 'bg-green-600/80', label: 'Y' }, right: { colorClass: 'bg-red-600/80', label: 'A' }, bottom: { colorClass: 'bg-yellow-500/80 text-black', label: 'B' } },
    heroImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    games: [
      { id: 'snes-1', title: 'Super Mario World', tenantId: 'SNES_SNES9X', fileName: '', fileSize: '512 KB', crc32: '', boxArtUrl: '', rating: 4.9, releaseYear: '1990', genre: 'Platformer', isFavorite: true, plays: '48.5k', banner: 'from-emerald-600 to-teal-900' },
      { id: 'snes-2', title: 'Chrono Trigger', tenantId: 'SNES_SNES9X', fileName: '', fileSize: '4.0 MB', crc32: '', boxArtUrl: '', rating: 5.0, releaseYear: '1995', genre: 'JRPG', isFavorite: true, plays: '32.1k', banner: 'from-amber-600 to-purple-900' },
      { id: 'snes-3', title: 'Donkey Kong Country', tenantId: 'SNES_SNES9X', fileName: '', fileSize: '4.0 MB', crc32: '', boxArtUrl: '', rating: 4.8, releaseYear: '1994', genre: 'Platformer', isFavorite: false, plays: '29.4k', banner: 'from-yellow-700 to-emerald-950' }
    ]
  },
  {
    id: 'GENESIS_GENPLUSGX',
    name: 'GenPlus-X',
    subtitle: 'Blast Processing 16-Bit',
    coreName: 'Genesis Plus GX',
    coreFile: 'genesis_plus_gx_libretro_android.so',
    extensions: ['md', 'gen', 'bin'],
    color: '#2563EB',
    gradient: 'from-blue-600 to-cyan-600',
    iconName: 'Zap',
    emojiIcon: '⚡',
    biosRequired: false,
    gamepadStyle: { type: '4-button', left: { colorClass: 'bg-zinc-800/80', label: 'A' }, bottom: { colorClass: 'bg-zinc-800/80', label: 'B' }, right: { colorClass: 'bg-zinc-800/80', label: 'C' } },
    heroImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80',
    games: [
      { id: 'gen-1', title: 'Sonic the Hedgehog 2', tenantId: 'GENESIS_GENPLUSGX', fileName: '', fileSize: '1.0 MB', crc32: '', boxArtUrl: '', rating: 4.9, releaseYear: '1992', genre: 'Platformer', isFavorite: true, plays: '41.2k', banner: 'from-blue-600 to-indigo-950' },
      { id: 'gen-2', title: 'Streets of Rage 2', tenantId: 'GENESIS_GENPLUSGX', fileName: '', fileSize: '2.0 MB', crc32: '', boxArtUrl: '', rating: 4.8, releaseYear: '1992', genre: 'Beat em Up', isFavorite: true, plays: '27.9k', banner: 'from-purple-800 to-zinc-950' }
    ]
  },
  {
    id: 'GBA_MGBA',
    name: 'mGBA-X',
    subtitle: 'Game Boy Advance 32-Bit',
    coreName: 'mGBA',
    coreFile: 'mgba_libretro_android.so',
    extensions: ['gba', 'zip'],
    color: '#059669',
    gradient: 'from-emerald-600 to-teal-600',
    iconName: 'Smartphone',
    emojiIcon: '📱',
    biosRequired: false,
    biosFile: 'gba_bios.bin (optional)',
    gamepadStyle: { type: '4-button', bottom: { colorClass: 'bg-gray-400/80 text-black', label: 'B' }, right: { colorClass: 'bg-gray-400/80 text-black', label: 'A' }, l1: { colorClass: 'bg-zinc-600/80', label: 'L' }, r1: { colorClass: 'bg-zinc-600/80', label: 'R' } },
  },

  {
    id: 'PS1_PCSX',
    name: 'DuckStation / PCSX',
    subtitle: 'PlayStation 32-Bit 3D Hardware Accelerated',
    coreName: 'PCSX ReARMed / DuckStation',
    coreFile: 'pcsx_rearmed_libretro_android.so',
    extensions: ['cue', 'bin', 'chd', 'pbp', 'iso'],
    color: '#0284C7',
    gradient: 'from-sky-600 to-blue-700',
    iconName: 'Disc',
    biosRequired: true,
    biosFile: 'scph5501.bin / scph1001.bin / scph7001.bin',
    gamepadStyle: { type: '4-button', top: { colorClass: 'bg-emerald-500/80', label: '▲' }, left: { colorClass: 'bg-pink-500/80', label: '■' }, right: { colorClass: 'bg-red-500/80', label: '●' }, bottom: { colorClass: 'bg-cyan-500/80', label: '✖' }, l1: { colorClass: 'bg-zinc-600/80', label: 'L1' }, r1: { colorClass: 'bg-zinc-600/80', label: 'R1' } },
    heroImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    games: [
      { id: 'psx-1', title: 'Metal Gear Solid', tenantId: 'PS1_PCSX', fileName: '', fileSize: '700 MB', crc32: '', boxArtUrl: '', rating: 5.0, releaseYear: '1998', genre: 'Stealth Action', isFavorite: true, plays: '55.1k', banner: 'from-slate-800 to-zinc-950' }
    ]
  },

  {
    id: 'N64_MUPEN64PLUS',
    name: 'Mupen64-NX',
    subtitle: 'Nintendo 64 Dynarec',
    coreName: 'Mupen64Plus-Next (GLES3)',
    coreFile: 'mupen64plus_next_gles3_libretro_android.so',
    extensions: ['n64', 'z64', 'v64', 'zip'],
    color: '#16A34A',
    gradient: 'from-green-600 to-emerald-700',
    iconName: 'Box',
    biosRequired: false,
    heroImage: 'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?auto=format&fit=crop&w=1200&q=80',
    gamepadStyle: { type: '4-button', bottom: { colorClass: 'bg-blue-600/80', label: 'A' }, right: { colorClass: 'bg-green-600/80', label: 'B' }, top: { colorClass: 'bg-yellow-400/80 text-black', label: 'C-U' }, left: { colorClass: 'bg-yellow-400/80 text-black', label: 'C-L' }, l1: { colorClass: 'bg-zinc-700/80', label: 'Z' }, r1: { colorClass: 'bg-zinc-700/80', label: 'R' } },
  },
  {
    id: 'MAME_2010',
    name: 'MAME-X',
    subtitle: 'MAME 0.139u1 Coin-Op',
    coreName: 'MAME 2010',
    coreFile: 'mame2010_libretro_android.so',
    extensions: ['zip', 'chd'],
    color: '#DC2626',
    gradient: 'from-red-600 to-rose-700',
    iconName: 'Joystick',
    biosRequired: true,
    biosFile: 'neogeo.zip / arcade samples',
    heroImage: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=1200&q=80',
    gamepadStyle: { type: '6-button', top: { colorClass: 'bg-red-600/80', label: 'X' }, left: { colorClass: 'bg-blue-600/80', label: 'Y' }, right: { colorClass: 'bg-green-600/80', label: 'B' }, bottom: { colorClass: 'bg-yellow-500/80 text-black', label: 'A' }, l1: { colorClass: 'bg-purple-600/80', label: 'L' }, r1: { colorClass: 'bg-orange-600/80', label: 'R' } },
  },
  {
    id: 'NEOGEO_FBNEO',
    name: 'FBNeo (MVS/AES)',
    subtitle: 'SNK NeoGeo Arcade & Home Console 24-Meg',
    coreName: 'FinalBurn Neo',
    coreFile: 'fbneo_libretro_android.so',
    extensions: ['zip', '7z', 'neo'],
    color: '#EA580C',
    gradient: 'from-orange-600 to-red-600',
    iconName: 'Flame',
    biosRequired: true,
    biosFile: 'neogeo.zip (Arcade / Console)',
    heroImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    gamepadStyle: { type: '4-button', bottom: { colorClass: 'bg-red-600/80', label: 'B' }, right: { colorClass: 'bg-yellow-500/80 text-black', label: 'A' }, top: { colorClass: 'bg-blue-600/80', label: 'C' }, left: { colorClass: 'bg-green-600/80', label: 'D' } },
  },
  {
    id: 'DREAMCAST_FLYCAST',
    name: 'Dreamcast (Flycast)',
    subtitle: 'Sega 128-Bit 3D Arcade NAOMI Engine',
    coreName: 'Flycast (GLES3)',
    coreFile: 'flycast_libretro_android.so',
    extensions: ['chd', 'cdi', 'gdi', 'cue', 'zip'],
    color: '#F97316',
    gradient: 'from-orange-500 to-amber-600',
    iconName: 'Disc',
    biosRequired: true,
    biosFile: 'dc_boot.bin / dc_flash.bin (system/dc/)',
    heroImage: 'https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&w=1200&q=80',
    gamepadStyle: { 
      type: '4-button', 
      top: { colorClass: 'bg-yellow-400/90 text-black font-bold', label: 'Y' }, 
      left: { colorClass: 'bg-blue-600/90 text-white font-bold', label: 'X' }, 
      right: { colorClass: 'bg-red-600/90 text-white font-bold', label: 'B' }, 
      bottom: { colorClass: 'bg-emerald-500/90 text-black font-bold', label: 'A' }, 
      l1: { colorClass: 'bg-zinc-700/80', label: 'L' }, 
      r1: { colorClass: 'bg-zinc-700/80', label: 'R' } 
    },
  }
];

export const INITIAL_GAMES: GameItem[] = [
  // Master System 3 TecToy
  {
    id: 'ms3_1',
    title: 'Mônica no Castelo do Dragão (TecToy)',
    tenantId: 'MS3_TECTOY',
    fileName: 'Monica_no_Castelo_do_Dragao_TecToy.sms',
    fileSize: '256 KB',
    crc32: 'A4F29B81',
    boxArtUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80',
    rating: 4.9,
    releaseYear: '1991',
    genre: 'Platformer / TecToy',
    isFavorite: true,
    lastPlayed: '2 horas atrás',
    playTimeMinutes: 142
  },
  {
    id: 'ms3_2',
    title: 'Sapo Xulé: O Padeiro Maluco (TecToy)',
    tenantId: 'MS3_TECTOY',
    fileName: 'Sapo_Xule_Padeiro_Maluco_TecToy.sms',
    fileSize: '512 KB',
    crc32: '3821C90D',
    boxArtUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80',
    rating: 4.8,
    releaseYear: '1995',
    genre: 'Action / TecToy Exclusive',
    isFavorite: true,
    lastPlayed: 'Ontem',
    playTimeMinutes: 89
  },
  {
    id: 'ms3_3',
    title: 'Turma da Mônica em O Resgate',
    tenantId: 'MS3_TECTOY',
    fileName: 'Turma_da_Monica_Resgate.sms',
    fileSize: '512 KB',
    crc32: 'F921021C',
    boxArtUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80',
    rating: 4.9,
    releaseYear: '1993',
    genre: 'Adventure / TecToy',
    isFavorite: false,
    lastPlayed: '3 dias atrás',
    playTimeMinutes: 210
  },
  {
    id: 'ms3_4',
    title: 'Alex Kidd in Miracle World',
    tenantId: 'MS3_TECTOY',
    fileName: 'Alex_Kidd_Miracle_World.sms',
    fileSize: '128 KB',
    crc32: '9C842B10',
    boxArtUrl: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&w=400&q=80',
    rating: 4.7,
    releaseYear: '1986',
    genre: 'Platformer',
    isFavorite: true,
    lastPlayed: '5 dias atrás',
    playTimeMinutes: 340
  },

  // SNES
  {
    id: 'snes_1',
    title: 'Super Mario World (USA)',
    tenantId: 'SNES_SNES9X',
    fileName: 'Super_Mario_World.smc',
    fileSize: '512 KB',
    crc32: 'B19CC4A3',
    boxArtUrl: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=400&q=80',
    rating: 5.0,
    releaseYear: '1990',
    genre: 'Platformer',
    isFavorite: true,
    lastPlayed: 'Hoje',
    playTimeMinutes: 520
  },
  {
    id: 'snes_2',
    title: 'Donkey Kong Country 2: Diddy\'s Kong Quest',
    tenantId: 'SNES_SNES9X',
    fileName: 'Donkey_Kong_Country_2.smc',
    fileSize: '4 MB',
    crc32: '72F9921D',
    boxArtUrl: 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?auto=format&fit=crop&w=400&q=80',
    rating: 4.9,
    releaseYear: '1995',
    genre: 'Platformer',
    isFavorite: true,
    lastPlayed: 'Ontem',
    playTimeMinutes: 310
  },

  // Mega Drive / Genesis
  {
    id: 'gen_1',
    title: 'Sonic The Hedgehog 2',
    tenantId: 'GENESIS_GENPLUSGX',
    fileName: 'Sonic_The_Hedgehog_2.md',
    fileSize: '1 MB',
    crc32: '61A28400',
    boxArtUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=400&q=80',
    rating: 4.9,
    releaseYear: '1992',
    genre: 'High Speed Platformer',
    isFavorite: true,
    lastPlayed: 'Há 4 horas',
    playTimeMinutes: 180
  },

  // PS1
  {
    id: 'ps1_1',
    title: 'Castlevania: Symphony of the Night',
    tenantId: 'PS1_PCSX',
    fileName: 'Castlevania_SOTN.chd',
    fileSize: '380 MB',
    crc32: '49B310A0',
    boxArtUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=400&q=80',
    rating: 5.0,
    releaseYear: '1997',
    genre: 'Action RPG / Metroidvania',
    isFavorite: true,
    lastPlayed: 'Há 1 dia',
    playTimeMinutes: 640
  },

  // PS2 NetherSX2
  {
    id: 'ps2_1',
    title: 'God of War II (Vulkan 60FPS HD)',
    tenantId: 'PS2_NETHERSX2',
    fileName: 'God_of_War_2.chd',
    fileSize: '3.8 GB',
    crc32: 'D832E1A9',
    boxArtUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    rating: 4.9,
    releaseYear: '2007',
    genre: 'Hack & Slash / Vulkan',
    isFavorite: true,
    lastPlayed: 'Hoje',
    playTimeMinutes: 980
  },

  // GBA
  {
    id: 'gba_1',
    title: 'Pokémon Emerald Version',
    tenantId: 'GBA_MGBA',
    fileName: 'Pokemon_Emerald.gba',
    fileSize: '16 MB',
    crc32: 'E032912D',
    boxArtUrl: 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=400&q=80',
    rating: 4.9,
    releaseYear: '2004',
    genre: 'RPG',
    isFavorite: true,
    lastPlayed: 'Há 2 dias',
    playTimeMinutes: 1200
  }
];
