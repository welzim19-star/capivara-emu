export class GameScraperService {
  // A mock database of popular games and their actual cover arts
  private static knownCovers: Record<string, string> = {
    'super mario world': 'https://upload.wikimedia.org/wikipedia/en/3/32/Super_Mario_World_Coverart.png',
    'sonic the hedgehog': 'https://upload.wikimedia.org/wikipedia/en/b/ba/Sonic_the_Hedgehog_1_Genesis_box_art.jpg',
    'god of war': 'https://upload.wikimedia.org/wikipedia/en/9/91/God_of_War_2005_cover.jpg',
    'crash bandicoot': 'https://upload.wikimedia.org/wikipedia/en/4/44/Crash_Bandicoot_Cover.png',
    'super smash bros': 'https://upload.wikimedia.org/wikipedia/en/4/42/Super_Smash_Bros._box_art.png',
    'the legend of zelda ocarina of time': 'https://upload.wikimedia.org/wikipedia/en/8/8e/The_Legend_of_Zelda_Ocarina_of_Time_box_art.png',
    'metal gear solid': 'https://upload.wikimedia.org/wikipedia/en/3/33/Metal_Gear_Solid_cover_art.png',
    'resident evil 2': 'https://upload.wikimedia.org/wikipedia/en/0/07/Resident_Evil_2_Cover.jpg'
  };

  /**
   * Cleans the ROM file name to extract a searchable game title.
   * e.g. "Super_Mario_World_(U)_[!].smc" -> "Super Mario World"
   */
  public static cleanRomName(fileName: string): string {
    let clean = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
    clean = clean.replace(/_/g, " "); // Replace underscores with spaces
    clean = clean.replace(/\(.*\)/g, ""); // Remove region tags like (U), (E)
    clean = clean.replace(/\[.*\]/g, ""); // Remove dump tags like [!], [h]
    return clean.trim();
  }

  /**
   * Generates an SVG Data URI for an unknown game.
   */
  private static generateFallbackCover(title: string, color: string): string {
    const shortTitle = title.substring(0, 20) + (title.length > 20 ? '...' : '');
    const svg = `
      <svg width="300" height="420" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#111" />
            <stop offset="100%" stop-color="${color}" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)" />
        <text x="50%" y="40%" font-family="sans-serif" font-weight="900" font-size="28" fill="#fff" text-anchor="middle" dominant-baseline="middle" opacity="0.1">CAPIVARA</text>
        <text x="50%" y="60%" font-family="sans-serif" font-weight="bold" font-size="22" fill="#fff" text-anchor="middle" dominant-baseline="middle">
          ${shortTitle}
        </text>
      </svg>
    `.trim();
    
    // Encode to Base64
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Auto-Loot: Attempts to find the cover art or creates a fallback.
   * Uses localStorage for heavy caching.
   */
  public static async scrapeBoxart(fileName: string, tenantColor: string): Promise<{ title: string; coverUrl: string }> {
    const title = this.cleanRomName(fileName);
    const searchKey = title.toLowerCase();
    
    // Check Cache
    const cacheKey = `boxart_${searchKey}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return { title, coverUrl: cached };
    }

    // Simulate network delay for API lookup
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

    // Try finding in known DB
    let coverUrl = this.knownCovers[searchKey];

    // Fallback if not found (partial match search)
    if (!coverUrl) {
      const match = Object.keys(this.knownCovers).find(k => k.includes(searchKey) || searchKey.includes(k));
      if (match) {
        coverUrl = this.knownCovers[match];
      }
    }

    // Final Fallback: Generate SVG
    if (!coverUrl) {
      // Use hex color or default to something dark red if invalid
      let cleanColor = tenantColor;
      if (!cleanColor.startsWith('#')) {
        // If tenantColor is a tailwind class like from-red-500 to-indigo-500, we pick a solid color
        if (cleanColor.includes('red')) cleanColor = '#ef4444';
        else if (cleanColor.includes('blue')) cleanColor = '#3b82f6';
        else if (cleanColor.includes('indigo')) cleanColor = '#6366f1';
        else cleanColor = '#3b82f6';
      }
      coverUrl = this.generateFallbackCover(title, cleanColor);
    }

    // Cache the result
    localStorage.setItem(cacheKey, coverUrl);
    return { title, coverUrl };
  }
}
