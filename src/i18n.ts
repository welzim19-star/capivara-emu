/**
 * Capivara-Emu — Internationalization (i18n) Engine
 * Supported: 'pt' (Português - Brasil) | 'en' (English - US)
 */

export type Lang = 'pt' | 'en';

export const I18N_DICT = {
  pt: {
    available_emulators: 'Emuladores Disponíveis',
    press_back_exit: 'Pressione voltar novamente para sair',
    gamepad_connected: 'Controle Conectado',
    gamepad_disconnected: 'Controle Desconectado!',
    scraping_done: '✅ Scraping concluído! Artes aplicadas.',
    layout_changed: 'Layout alterado para',
    play_now: 'JOGAR AGORA',
    no_roms: 'Nenhuma ROM encontrada nesta pasta',
    map_roms: 'MAPEAR PASTA DE JOGOS',
    fetch_boxart: 'BUSCAR CAPAS (SCRAPER)',
    back_to_consoles: 'Voltar aos Consoles',
    select_console: 'Selecione um Console',
    quick_saves: 'Saves Rápidos',
    save_state: 'Salvar Estado',
    load_state: 'Carregar Estado',
    autofire_settings: 'Configurar Autofire (Turbo)',
    all_games: 'Todos os Jogos',
    favorites: 'Favoritos',
    search_games: 'Buscar jogos...',
    switch_layout: 'STEAM OS',
    steamos_switch: '⇄ Switch',
    lang_btn: '🇧🇷 PT',
    lang_tooltip: 'Mudar para Inglês (Switch to English)',
    lang_switched: 'Idioma alterado para Português (Brasil)'
  },
  en: {
    available_emulators: 'Available Emulators',
    press_back_exit: 'Press back again to exit',
    gamepad_connected: 'Gamepad Connected',
    gamepad_disconnected: 'Gamepad Disconnected!',
    scraping_done: '✅ Scraping completed! Box arts applied.',
    layout_changed: 'Layout switched to',
    play_now: 'PLAY NOW',
    no_roms: 'No ROMs found in this folder',
    map_roms: 'MAP ROM FOLDER',
    fetch_boxart: 'FETCH BOX ART (SCRAPER)',
    back_to_consoles: 'Back to Consoles',
    select_console: 'Select a Console',
    quick_saves: 'Quick Saves',
    save_state: 'Save State',
    load_state: 'Load State',
    autofire_settings: 'Configure Autofire (Turbo)',
    all_games: 'All Games',
    favorites: 'Favorites',
    search_games: 'Search games...',
    switch_layout: 'STEAM OS',
    steamos_switch: '⇄ Switch',
    lang_btn: '🇺🇸 EN',
    lang_tooltip: 'Switch to Portuguese (Mudar para Português)',
    lang_switched: 'Language switched to English (US)'
  }
};

export function getStoredLang(): Lang {
  const saved = localStorage.getItem('app_lang');
  if (saved === 'en' || saved === 'pt') return saved;
  return 'pt';
}

export function setStoredLang(lang: Lang) {
  localStorage.setItem('app_lang', lang);
}

export function t(key: keyof typeof I18N_DICT['pt'], lang: Lang = getStoredLang()): string {
  const dict = I18N_DICT[lang] || I18N_DICT.pt;
  return dict[key] || key;
}
