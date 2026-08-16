export interface CheatItem {
  id: string;
  name: string;
  code: string;
  description?: string;
}

export const CHEATS_DB: Record<string, CheatItem[]> = {
  // Super Mario World (SNES)
  'super mario world': [
    { id: 'smw_1', name: '99 Vidas', code: 'C222-D4DD', description: 'Comece com 99 vidas' },
    { id: 'smw_2', name: 'Pulo Infinito', code: 'C22A-04D0', description: 'Pule no ar repetidas vezes' },
    { id: 'smw_3', name: 'Sempre com Capa', code: 'C225-04D0', description: 'Comece e permaneça com a capa (Feather)' },
    { id: 'smw_4', name: 'Yoshi Sempre Cresce', code: 'C222-D4D0', description: 'Yoshi pequeno cresce com qualquer item' },
  ],
  
  // Super Mario World 2: Yoshi's Island (SNES)
  "yoshi's island": [
    { id: 'smw2_1', name: 'Vidas Infinitas', code: 'C23B-0F5D', description: 'O contador de vidas não diminui' },
    { id: 'smw2_2', name: 'Estrelas Infinitas (Timer)', code: 'C2E9-0F7D', description: 'O cronômetro do bebê Mario não diminui' },
  ],

  // Donkey Kong Country (SNES)
  'donkey kong country': [
    { id: 'dkc_1', name: 'Vidas Infinitas', code: 'C26A-47AF', description: 'O contador de vidas não diminui' },
    { id: 'dkc_2', name: 'Comece com 99 vidas', code: '17C0-C4AD', description: 'Inicia o jogo com o número máximo de vidas' },
  ],

  // Donkey Kong Country 2: Diddy's Kong Quest (SNES)
  'donkey kong country 2': [
    { id: 'dkc2_1', name: 'Vidas Infinitas', code: 'C262-17DF', description: 'O contador de vidas não diminui' },
    { id: 'dkc2_2', name: 'Moedas DK Infinitas', code: 'C2CC-3DA4', description: 'Moedas de ouro ilimitadas' },
  ],

  // Donkey Kong Country 3: Dixie Kong's Double Trouble (SNES)
  'donkey kong country 3': [
    { id: 'dkc3_1', name: 'Vidas Infinitas', code: 'C262-170F', description: 'O contador de vidas não diminui' },
    { id: 'dkc3_2', name: 'Pulo Duplo (Dixie/Kiddy)', code: 'C2B2-17DF', description: 'Pulo infinito no ar' },
  ],
  
  // Sonic The Hedgehog (Mega Drive)
  'sonic the hedgehog': [
    { id: 'sth_1', name: 'Invencibilidade', code: 'AT3T-CA4W', description: 'Sonic nunca perde os anéis (exceto em buracos)' },
    { id: 'sth_2', name: 'Modo Debug', code: 'AE2T-CABE', description: 'Ativa o modo de construção/debug' },
    { id: 'sth_3', name: 'Tempo Infinito', code: 'AT3T-CA4C', description: 'O cronômetro para aos 9:59' },
  ],

  // Sonic 3 (Mega Drive)
  'sonic 3': [
    { id: 'sth3_1', name: 'Vidas Infinitas', code: 'AW7T-CA4W', description: 'As vidas não diminuem' },
    { id: 'sth3_2', name: 'Pulo Duplo (Shields)', code: 'ACTT-CA4C', description: 'Mantém escudo permanente' },
  ],
  'sonic the hedgehog 3': [
    { id: 'sth3_1', name: 'Vidas Infinitas', code: 'AW7T-CA4W', description: 'As vidas não diminuem' },
    { id: 'sth3_2', name: 'Pulo Duplo (Shields)', code: 'ACTT-CA4C', description: 'Mantém escudo permanente' },
  ],

  // Sonic & Knuckles (Mega Drive)
  'sonic & knuckles': [
    { id: 'sthak_1', name: 'Invencibilidade', code: 'RHJA-A6T4', description: 'Nunca perde os anéis' },
    { id: 'sthak_2', name: 'Super Sonic (50 Anéis)', code: 'RGKA-A6TY', description: 'Transforma-se instantaneamente' },
  ],

  // Sonic 3 & Knuckles (Mega Drive)
  'sonic 3 & knuckles': [
    { id: 'sth3ak_1', name: 'Vidas Infinitas', code: 'JW7T-CA4W', description: 'As vidas não diminuem' },
    { id: 'sth3ak_2', name: 'Super/Hyper Form Fácil', code: 'RGKA-A6TY', description: 'Precisa apenas de 1 anel para se transformar' },
  ],
  'sonic the hedgehog 3 & knuckles': [
    { id: 'sth3ak_1', name: 'Vidas Infinitas', code: 'JW7T-CA4W', description: 'As vidas não diminuem' },
    { id: 'sth3ak_2', name: 'Super/Hyper Form Fácil', code: 'RGKA-A6TY', description: 'Precisa apenas de 1 anel para se transformar' },
  ],

  // Metal Slug (NeoGeo / Arcade)
  'metal slug': [
    { id: 'mslug_1', name: 'Vidas Infinitas', code: '000000:0009', description: 'Sempre 9 vidas (Action Replay / RAM)' },
    { id: 'mslug_2', name: 'Munição Infinita', code: '000001:03E7', description: 'Heavy Machine Gun infinita' },
  ],
  
  // Crash Bandicoot (PS1)
  'crash bandicoot': [
    { id: 'crash_1', name: 'Vidas Infinitas', code: '8001554A 0063', description: 'Fixa as vidas em 99' },
    { id: 'crash_2', name: 'Sempre com Aku Aku', code: '8001554C 0002', description: 'Aku Aku dourado permanente' },
  ],

  // The King of Fighters '98 (NeoGeo / Arcade)
  'the king of fighters 98': [
    { id: 'kof98_1', name: 'Tempo Infinito', code: '00000A:0099', description: 'O relógio não diminui' },
    { id: 'kof98_2', name: 'Barra de Especial Infinita P1', code: '00000B:0003', description: 'Especial sempre carregado' },
  ],

  // Super Mario 64 (N64)
  'super mario 64': [
    { id: 'sm64_1', name: 'Moedas Infinitas', code: '8133B218 03E7', description: 'Trava as moedas em 999' },
    { id: 'sm64_2', name: 'Vida/Energia Máxima', code: '8133B21E 08FF', description: 'Energia nunca acaba' },
  ],

  // Tekken 3 (PS1)
  'tekken 3': [
    { id: 'tk3_1', name: 'P1 Vida Infinita', code: '800A97E4 0082', description: 'Sua barra de energia não desce' },
    { id: 'tk3_2', name: 'Desbloquear Todos', code: '800A96EE FFFF', description: 'Libera todos os personagens' },
  ],

  // Pokémon Red/Blue (Game Boy)
  'pokemon red': [
    { id: 'pkmn_1', name: 'Dinheiro Infinito', code: '019946D3', description: 'Você fica bilionário' },
    { id: 'pkmn_2', name: 'Master Balls Infinitas no PC', code: '01017CCB', description: 'Item 1 no PC vira Master Ball' },
  ],

  // Street Fighter II (SNES)
  'street fighter ii': [
    { id: 'sf2_1', name: 'P1 Energia Infinita', code: '7E054760', description: 'Nunca perde vida' },
    { id: 'sf2_2', name: 'P1 No Delay (Magias)', code: '7E054C00', description: 'Lança magias sem parar' },
  ]
};

// Fuzzy matcher for game titles
export function getCheatsForGame(title: string): CheatItem[] {
  const cleanTitle = title.toLowerCase().trim();
  
  // Exact match
  if (CHEATS_DB[cleanTitle]) return CHEATS_DB[cleanTitle];
  
  // Partial match
  for (const [dbTitle, cheats] of Object.entries(CHEATS_DB)) {
    if (cleanTitle.includes(dbTitle) || dbTitle.includes(cleanTitle)) {
      return cheats;
    }
  }
  
  return [];
}
