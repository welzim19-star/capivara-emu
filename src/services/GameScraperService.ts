// GameScraperService v3.1 — Nível Banco Central
// Pipeline: local DB → TheGamesDB → Wikipedia → SVG Fallback
// Utiliza CapacitorHttp nativo para furar bloqueio CORS Tainted Canvas
// Supports custom override via localStorage.

import { CapacitorHttp } from '@capacitor/core';

export class GameScraperService {

  // ── Hardcoded top-tier covers (Wikipedia CDN — always works) ──────────────
  private static knownCovers: Record<string, string> = {
    'super mario world':                    'https://upload.wikimedia.org/wikipedia/en/3/32/Super_Mario_World_Coverart.png',
    'super mario 64':                       'https://upload.wikimedia.org/wikipedia/en/6/6a/Super_Mario_64_box_cover.jpg',
    'super mario bros':                     'https://upload.wikimedia.org/wikipedia/en/0/03/Super_Mario_Bros._box.png',
    'super mario bros 3':                   'https://upload.wikimedia.org/wikipedia/en/a/a5/Super_Mario_Bros._3_coverart.png',
    'sonic the hedgehog':                   'https://upload.wikimedia.org/wikipedia/en/b/ba/Sonic_the_Hedgehog_1_Genesis_box_art.jpg',
    'sonic the hedgehog 2':                 'https://upload.wikimedia.org/wikipedia/en/a/a3/Sonic_the_Hedgehog_2.jpg',
    'sonic the hedgehog 3':                 'https://upload.wikimedia.org/wikipedia/en/a/a1/Sonic3_box_us.jpg',
    'god of war':                           'https://upload.wikimedia.org/wikipedia/en/9/91/God_of_War_2005_cover.jpg',
    'crash bandicoot':                      'https://upload.wikimedia.org/wikipedia/en/4/44/Crash_Bandicoot_Cover.png',
    'crash bandicoot 2':                    'https://upload.wikimedia.org/wikipedia/en/d/d8/Crash_Bandicoot_2_Cortex_Strikes_Back.jpg',
    'crash bandicoot 3':                    'https://upload.wikimedia.org/wikipedia/en/5/5d/Crash_Bandicoot_3_Warped.jpg',
    'super smash bros':                     'https://upload.wikimedia.org/wikipedia/en/4/42/Super_Smash_Bros._box_art.png',
    'the legend of zelda ocarina of time':  'https://upload.wikimedia.org/wikipedia/en/8/8e/The_Legend_of_Zelda_Ocarina_of_Time_box_art.png',
    'the legend of zelda a link to the past': 'https://upload.wikimedia.org/wikipedia/en/e/e2/SNES_The_Legend_of_Zelda_-_A_Link_to_the_Past.jpg',
    'the legend of zelda majoras mask':     'https://upload.wikimedia.org/wikipedia/en/6/60/The_Legend_of_Zelda_-_Majora%27s_Mask_Box_Art.jpg',
    'metal gear solid':                     'https://upload.wikimedia.org/wikipedia/en/3/33/Metal_Gear_Solid_cover_art.png',
    'resident evil 2':                      'https://upload.wikimedia.org/wikipedia/en/0/07/Resident_Evil_2_Cover.jpg',
    'resident evil 4':                      'https://upload.wikimedia.org/wikipedia/en/8/82/Resident_Evil_4_GC_cover_art.jpg',
    'dragon ball z budokai tenkaichi 3':    'https://upload.wikimedia.org/wikipedia/en/4/43/DBZ_Budokai_Tenkaichi_3.jpg',
    'street fighter ii':                    'https://upload.wikimedia.org/wikipedia/en/3/35/SFIICE_Box.jpg',
    'street fighter 2':                     'https://upload.wikimedia.org/wikipedia/en/3/35/SFIICE_Box.jpg',
    'mortal kombat':                        'https://upload.wikimedia.org/wikipedia/en/9/93/Mk1arcadeflyer.png',
    'final fantasy vi':                     'https://upload.wikimedia.org/wikipedia/en/0/0d/Final_Fantasy_VI_SNES_cover.jpg',
    'final fantasy vii':                    'https://upload.wikimedia.org/wikipedia/en/c/ce/Final_Fantasy_VII_Box_Art.jpg',
    'donkey kong country':                  'https://upload.wikimedia.org/wikipedia/en/a/a4/Donkey_Kong_Country_SNES.png',
    'super metroid':                        'https://upload.wikimedia.org/wikipedia/en/e/e6/Supermetroid_boxart.jpg',
    'chrono trigger':                       'https://upload.wikimedia.org/wikipedia/en/9/95/SNES_Chrono_Trigger_Box_Art.jpg',
    'star fox':                             'https://upload.wikimedia.org/wikipedia/en/3/32/Star_Fox_Box_Art.jpg',
    'pokemon red':                          'https://upload.wikimedia.org/wikipedia/en/a/af/Pokemon_Red_Version_box_art.jpg',
    'pokemon blue':                         'https://upload.wikimedia.org/wikipedia/en/f/f4/Pokemon_blue.jpg',
    'pokemon gold':                         'https://upload.wikimedia.org/wikipedia/en/0/07/Pokemon_Gold_Version_box_art.jpg',
    'grand theft auto san andreas':         'https://upload.wikimedia.org/wikipedia/en/1/16/GTA_San_Andreas_for_PC.jpg',
    'grand theft auto vice city':           'https://upload.wikimedia.org/wikipedia/en/8/85/Grand_Theft_Auto_Vice_City_cover.jpg',
    'kingdom hearts':                       'https://upload.wikimedia.org/wikipedia/en/2/22/Kingdom_Hearts.jpg',
    'shadow of the colossus':               'https://upload.wikimedia.org/wikipedia/en/e/e1/Shadow_of_the_Colossus.jpg',
    'devil may cry 3':                      'https://upload.wikimedia.org/wikipedia/en/6/60/Devil_May_Cry_3_cover.jpg',
    'tekken 3':                             'https://upload.wikimedia.org/wikipedia/en/8/8a/Tekken3_ps1.jpg',
  };

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

  // ── Canvas Resizer — Cover-fit to 300×420 (3:4) ──────────────────────────
  private static async toBase64Resized(url: string, w = 300, h = 420): Promise<string | null> {
    return new Promise(async (resolve) => {
      try {
        // [ISOLAMENTO GALVÂNICO] Capacitor HTTP (Bypass Tainted Canvas CORS)
        const response = await CapacitorHttp.request({
          url: url,
          method: 'GET',
          responseType: 'blob'
        });
        
        const base64Data = response.data; // Blob is returned as base64 in CapacitorHttp
        
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(null); return; }
            const imgRatio = img.naturalWidth / img.naturalHeight;
            const canvasRatio = w / h;
            let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
            if (imgRatio > canvasRatio) {
              sw = Math.round(sh * canvasRatio);
              sx = Math.round((img.naturalWidth - sw) / 2);
            } else {
              sh = Math.round(sw / canvasRatio);
              sy = Math.round((img.naturalHeight - sh) / 2);
            }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } catch (e) {
            console.error("Canvas draw failed", e);
            resolve(`data:image/jpeg;base64,${base64Data}`); // Fallback unresized
          }
        };
        img.onerror = () => resolve(null);
        img.src = `data:image/jpeg;base64,${base64Data}`;
      } catch (e) {
        console.warn("CapacitorHttp fallback required", e);
        // Standard web fetch fallback
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } catch(e) { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      }
    });
  }

  // ── Source 1: Wikipedia Page Image ────────────────────────────────────────
  private static async scrapeWikipedia(title: string): Promise<string | null> {
    try {
      const q = encodeURIComponent(title + ' video game');
      const searchRes = await CapacitorHttp.get({
        url: `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&utf8=&format=json&origin=*&srlimit=3`
      });
      const searchData = searchRes.data;
      if (!searchData.query?.search?.length) return null;

      for (const result of searchData.query.search) {
        const pageTitle = result.title;
        const imgRes = await CapacitorHttp.get({
          url: `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles=${encodeURIComponent(pageTitle)}&format=json&pithumbsize=600&origin=*`
        });
        const imgData = imgRes.data;
        const pages = imgData.query?.pages;
        if (!pages) continue;
        const pageId = Object.keys(pages)[0];
        const thumb = pages[pageId]?.thumbnail?.source;
        if (thumb) {
          const resized = await GameScraperService.toBase64Resized(thumb);
          if (resized) return resized;
        }
      }
    } catch (e) {
      // silently fail
    }
    return null;
  }

  // ── Source 2: TheGamesDB (free public, no auth needed for search) ─────────
  private static async scrapeTheGamesDB(title: string): Promise<string | null> {
    try {
      const q = encodeURIComponent(title);
      const res = await CapacitorHttp.get({
        url: `https://api.thegamesdb.net/v1.1/Games/ByGameName?apikey=legacy&name=${q}&fields=boxart&include=boxart`
      });
      
      const data = res.data;
      const games = data.data?.games;
      if (!games?.length) return null;
      const gameId = games[0].id;
      const boxartBase = data.include?.boxart?.base_url?.thumb;
      const boxarts = data.include?.boxart?.data?.[gameId];
      if (!boxartBase || !boxarts?.length) return null;
      const frontBox = boxarts.find((b: any) => b.side === 'front') ?? boxarts[0];
      const url = `${boxartBase}${frontBox.filename}`;
      return await GameScraperService.toBase64Resized(url);
    } catch (e) {
      return null;
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
    const searchKey = title.toLowerCase().trim();
    const cacheKey = `boxart_v3_${searchKey}`;
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

    // 0. Custom user override wins always
    const custom = this.getCustomCover(resolvedGameId);
    if (custom) return { title, coverUrl: custom };

    // 1. localStorage cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) return { title, coverUrl: cached };

    // 2. Local known DB (exact)
    let cover: string | null = null;
    if (this.knownCovers[searchKey]) {
      cover = await this.toBase64Resized(this.knownCovers[searchKey]);
    }

    // 3. Local known DB (partial)
    if (!cover) {
      const partial = Object.keys(this.knownCovers).find(k =>
        searchKey.startsWith(k) || k.startsWith(searchKey)
      );
      if (partial) cover = await this.toBase64Resized(this.knownCovers[partial]);
    }

    // 4. TheGamesDB (professional game database)
    if (!cover) {
      cover = await this.scrapeTheGamesDB(title);
    }

    // 5. Wikipedia fallback
    if (!cover) {
      cover = await this.scrapeWikipedia(title);
    }

    // 6. SVG final fallback
    if (!cover) {
      cover = this.generateFallbackCover(title, cleanColor);
    }

    // Cache result (skip if base64 too big)
    if (cover && cover.length < 5 * 1024 * 1024) {
      try {
        localStorage.setItem(cacheKey, cover);
      } catch (e) {
        console.warn('[GameScraper] localStorage full — skipped cache for:', title);
      }
    }

    return { title, coverUrl: cover };
  }
}
