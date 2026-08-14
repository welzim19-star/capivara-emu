// GameScraperService v4.0 — Banco Central (Local DB & SVG Fallback Only)
// Removida raspagem web para maximizar velocidade. Apenas SVG gerado localmente ou imagem fornecida pelo usuário.

export class GameScraperService {
  // ── ROM Name Cleaner ──────────────────────────────────────────────────────
  public static cleanRomName(fileName: string): string {
    let clean = fileName.replace(/\.[^/.]+$/, '');    // Remove extension
    clean = clean.replace(/_/g, ' ');                  // Underscores to spaces
    clean = clean.replace(/\([^)]*\)/g, '');           // Remove (USA) (E) (En,Fr) etc
    clean = clean.replace(/\[[^\]]*\]/g, '');          // Remove [!] [h] etc.
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

    // 2. SVG final fallback
    const cover = this.generateFallbackCover(title, cleanColor);
    return { title, coverUrl: cover };
  }
}
