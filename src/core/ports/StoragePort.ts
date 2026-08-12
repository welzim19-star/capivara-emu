export interface StoragePort {
  /**
   * Salva os dados de forma segura utilizando uma chave de idempotência para evitar race conditions.
   */
  saveEncrypted<T>(key: string, data: T, idempotencyKey: string): Promise<void>;
  
  /**
   * Carrega os dados de forma segura (fail-secure).
   */
  loadDecrypted<T>(key: string): Promise<T | null>;
}
