// GameScraperService v4.0 — Banco Central (Local DB & SVG Fallback Only)
// Removida raspagem web para maximizar velocidade. Apenas SVG gerado localmente ou imagem fornecida pelo usuário.

import { GAME_NAMES } from '../data/gameNames';

export class GameScraperService {
  // ── ROM Name Cleaner ──────────────────────────────────────────────────────
  public static cleanRomName(fileName: string): string {
    let clean = fileName.replace(/\.[^/.]+$/, '');    // Remove extension
    
    // OFFLINE TRANSLATION DICTIONARY: Verifica se a ROM (qualquer console) possui um nome real mapeado
    // 1. Direct O(1) Dictionary Lookup (Fastest)
    if (GAME_NAMES[clean]) {
      return GAME_NAMES[clean];
    }

    // 2. "God-Tier" Fuzzy Match Fallback
    // If the user's rom is "AAAHH!!! Real Monsters (U).smc", the dictionary lookup misses
    // because the LibRetro key expects the No-Intro format or the exact short zip name.
    // We strip all tags to get a pure base name and search all 16k values.
    const pureBaseName = fileName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/_/g, ' ')       // Remove underscores
      .replace(/\([^)]*\)/g, '') // Strip (U), (USA), etc.
      .replace(/\[[^\]]*\]/g, '') // Strip [!], [h], etc.
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (pureBaseName.length > 3) {
      const allValues = Object.values(GAME_NAMES);
      for (let i = 0; i < allValues.length; i++) {
        const valLower = allValues[i].toLowerCase();
        // Exact prefix match is safest. E.g. "aaahh!!! real monsters" matches "Aaahh!!! Real Monsters (USA)"
        if (valLower.startsWith(pureBaseName) || valLower.includes(`${pureBaseName} (`)) {
          return allValues[i];
        }
      }
    }

    // 3. Absolute Fallback: Return standard cleaned name
    clean = clean.replace(/_/g, ' ');                  // Underscores to spaces
    clean = clean.replace(/\s+/g, ' ');                // Collapse spaces
    return clean.trim();
  }

  // ── Custom Cover API (user override) ─────────────────────────────────────
  public static getCustomCover(gameId: string): string | null {
    return localStorage.getItem(`custom_boxart_${gameId}`) ?? null;
  }

  public static setCustomCover(gameId: string, base64: string): void {
    try {
      localStorage.setItem(`custom_boxart_${gameId}`, base64);
    } catch (e) {
      console.warn('[GameScraper] LocalStorage full, could not save custom cover');
    }
  }

  public static clearCustomCover(gameId: string): void {
    localStorage.removeItem(`custom_boxart_${gameId}`);
  }

  // ── SVG Fallback Generator ────────────────────────────────────────────────
  private static generateFallbackCover(title: string, color: string): string {
    const shortTitle = title.substring(0, 18) + (title.length > 18 ? '...' : '');
    const svg = `<svg width="300" height="420" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0a0f" />
          <stop offset="100%" stop-color="${color}44" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <rect width="100%" height="4" fill="${color}" y="0" />
      <text x="50%" y="42%" font-family="system-ui,sans-serif" font-size="60" fill="#ffffff10" text-anchor="middle" dominant-baseline="middle">🎮</text>
      <text x="50%" y="62%" font-family="system-ui,sans-serif" font-weight="700" font-size="18" fill="#ffffffcc" text-anchor="middle" dominant-baseline="middle">${shortTitle}</text>
      <text x="50%" y="76%" font-family="monospace" font-size="10" fill="${color}99" text-anchor="middle">CAPIVARA EMU</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }

  // ── Libretro System Mapping ────────────────────────────────────────────────
  private static getLibretroSystemName(tenantId?: string): string | null {
    switch (tenantId) {
      case 'SNES_SNES9X': return 'Nintendo - Super Nintendo Entertainment System';
      case 'GENESIS_GENPLUSGX': return 'Sega - Mega Drive - Genesis';
      case 'PS1_PCSX': return 'Sony - PlayStation';
      case 'N64_MUPEN64PLUS': return 'Nintendo - Nintendo 64';
      case 'GBA_MGBA': return 'Nintendo - Game Boy Advance';
      case 'MS3_TECTOY': return 'Sega - Master System - Mark III';
      case 'MAME_2010':
      case 'MAME_2003PLUS': return 'MAME';
      case 'NEOGEO_FBNEO': return 'FBNeo - Arcade Games';
      case 'DREAMCAST_FLYCAST': return 'Sega - Dreamcast';
      case 'PSP_PPSSPP': return 'Sony - PlayStation Portable';
      case 'NDS_MELONDS': return 'Nintendo - Nintendo DS';
      case 'GBC_GEARBOY': return 'Nintendo - Game Boy Color';
      default: return null;
    }
  }

  // ── Main Public Method ─────────────────────────────────────────────────────
  public static async scrapeBoxart(
    fileName: string,
    tenantColor: string,
    tenantId?: string,
    gameId?: string
  ): Promise<{ title: string; coverUrl: string }> {
    const title = this.cleanRomName(fileName);
    const resolvedGameId = gameId ?? fileName;

    // Resolve accent color
    let cleanColor = tenantColor;
    if (!cleanColor.startsWith('#')) {
      if (cleanColor.includes('red'))     cleanColor = '#ef4444';
      else if (cleanColor.includes('blue'))    cleanColor = '#3b82f6';
      else if (cleanColor.includes('indigo'))  cleanColor = '#6366f1';
      else if (cleanColor.includes('emerald')) cleanColor = '#10b981';
      else if (cleanColor.includes('amber'))   cleanColor = '#f59e0b';
      else if (cleanColor.includes('purple'))  cleanColor = '#a855f7';
      else cleanColor = '#3b82f6';
    }

    // 1. Custom user override wins always
    const custom = this.getCustomCover(resolvedGameId);
    if (custom) return { title, coverUrl: custom };

    // 2. Libretro Thumbnails (Automatic)
    const systemName = this.getLibretroSystemName(tenantId);
    if (systemName) {
      // Libretro requires the exact cleaned name without extensions, but allows regions sometimes
      // We will try the clean name. URL Encoding is required.
      // Example: https://thumbnails.libretro.com/Nintendo%20-%20Super%20Nintendo%20Entertainment%20System/Named_Boxarts/Super%20Mario%20World.png
      // Since we don't know the exact goodset name, we try the clean title.
      // A better approach is to try with original base name first (without extension), then clean name.
      const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      const encodedSystem = encodeURIComponent(systemName);
      
      // We return the raw Libretro URL. If it fails to load, the frontend should fallback to SVG (or we handle it via onError in the img tag).
      // Since we want this fast, we don't verify the URL via fetch here. We just return it.
      const libretroUrl = `https://thumbnails.libretro.com/${encodedSystem}/Named_Boxarts/${encodeURIComponent(baseName)}.png`;
      
      return { title, coverUrl: libretroUrl };
    }

    // 3. SVG final fallback
    const cover = this.generateFallbackCover(title, cleanColor);
    return { title, coverUrl: cover };
  }
}
