export interface StoragePort {
  /**
   * Salva os dados de forma segura utilizando uma chave de idempotência para evitar race conditions.
   */
  saveEncrypted<T>(key: string, data: T, idempotencyKey: string): Promise<void>;
  
  /**
   * Carrega os dados de forma segura (fail-secure).
   */
  loadDecrypted<T>(key: string): Promise<T | null>;
  getGameState(tenantId: string, gameId: string): Promise<any | null>;

  // ── Memory Card System (PS1 / PS2) ──────────────────────────────────────
  formatMemoryCard(tenantId: string, slot: 1 | 2): Promise<boolean>;
  getMemoryCardInfo(tenantId: string, slot: 1 | 2): Promise<{ exists: boolean; sizeMb: number; path: string }>;
}
