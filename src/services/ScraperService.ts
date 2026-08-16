import { MOCK_SCRAPER_DATA } from '../data/mockScraperData';
import { GameItem } from '../types';
import { GameScraperService } from './GameScraperService';

export class ScraperService {
  /**
   * Cleans a ROM filename to extract the base game title.
   * Example: "Super Mario World (USA) [!].zip" -> "Super Mario World"
   */
  static cleanRomName(filename: string): string {
    return filename
      .replace(/\.(zip|iso|chd|rar|7z|bin|cue|sfc|smc|z64|n64|md|bin|gba|gbc|gb)$/i, '')
      .replace(/\(.*\)/g, '') // Remove (USA), (Europe), etc.
      .replace(/\[.*\]/g, '') // Remove [!], [b], etc.
      .replace(/v1\.\d/g, '') // Remove v1.0, v1.1, etc.
      .replace(/Rev \d/gi, '') // Remove Rev 1, Rev A, etc.
      .trim();
  }

  /**
   * Attempts to find a mock match for high-quality banners and metadata
   */
  static getMockMetadata(cleanTitle: string) {
    const titleLower = cleanTitle.toLowerCase();
    const matchKey = Object.keys(MOCK_SCRAPER_DATA).find(key => 
      key !== 'default' && titleLower.includes(key)
    );
    return MOCK_SCRAPER_DATA[matchKey || 'default'];
  }

  /**
   * Generates a Libretro Thumbnail URL based on the system and game name.
   * Note: Libretro requires EXACT No-Intro naming for the image to resolve.
   * This is a best-effort fallback if local images fail.
   */
  static getLibretroCoverUrl(systemName: string, gameName: string): string {
    const baseUrl = 'https://thumbnails.libretro.com';
    const encodedSystem = encodeURIComponent(systemName);
    const encodedGame = encodeURIComponent(gameName);
    return `${baseUrl}/${encodedSystem}/Named_Boxarts/${encodedGame}.png`;
  }

  static async enrichGamesList(games: GameItem[], tenantName: string, tenantId?: string, tenantColor?: string): Promise<GameItem[]> {
    return Promise.all(games.map(async (game) => {
      // Automatic real-time scrape using the God-Tier scraper!
      const scrapeData = await GameScraperService.scrapeBoxart(
        game.fileName,
        tenantColor || '#3b82f6',
        tenantId || game.tenantId,
        game.id
      );
      
      const cleanTitle = scrapeData.title;
      const titleLower = cleanTitle.toLowerCase();
      
      // Still fetch mock stats (plays, rating, generic genre) for the UI flair
      const matchKey = Object.keys(MOCK_SCRAPER_DATA).find(key => 
        key !== 'default' && titleLower.includes(key)
      );
      const metadata = MOCK_SCRAPER_DATA[matchKey || 'default'];

      return {
        ...game,
        title: cleanTitle,
        genre: metadata.genre,
        year: metadata.year,
        rating: metadata.rating,
        size: game.size || 'N/A',
        plays: metadata.plays,
        banner: metadata.banner,
        heroImage: metadata.heroImage,
        boxArtUrl: scrapeData.coverUrl,
        coverUrl: scrapeData.coverUrl // Uses the Libretro URL or SVG fallback!
      };
    }));
  }
}
