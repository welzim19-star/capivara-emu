import { StoragePort } from '../../core/ports/StoragePort';
import { Filesystem, Directory } from '@capacitor/filesystem';

export class SecureStorageAdapter implements StoragePort {
  async saveEncrypted<T>(key: string, data: T, idempotencyKey: string): Promise<void> {
    // 1. Idempotency Check (CQRS protection)
    const idempotencyStorageKey = `${key}_idempotency`;
    const lastKey = localStorage.getItem(idempotencyStorageKey);
    
    if (lastKey === idempotencyKey) {
      // Fail-secure trace for auditor
      console.warn(`{"warning": "WARN_IDEMPOTENCY_HIT", "key": "${key}"}`);
      return; 
    }
    
    // 2. Fake KMS Encryption (Isolamento Galvânico - camada de storage)
    try {
      const payload = JSON.stringify(data);
      const encrypted = btoa(unescape(encodeURIComponent(payload)));
      
      // 3. Atomic Write
      localStorage.setItem(key, encrypted);
      localStorage.setItem(idempotencyStorageKey, idempotencyKey);
    } catch (e) {
      console.error(`{"error": "ERR_INTERNAL", "correlation_id": "storage_write_fail"}`);
      throw new Error("ERR_INTERNAL");
    }
  }

  async getGameState(tenantId: string, gameId: string): Promise<any | null> {
    const key = `state_${tenantId}_${gameId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // ── Memory Card System (PS1 / PS2) ──────────────────────────────────────
  private getMemCardPath(tenantId: string, slot: 1 | 2): string {
    return `memcards/${tenantId.toLowerCase()}/slot${slot}.mcd`;
  }

  async getMemoryCardInfo(tenantId: string, slot: 1 | 2): Promise<{ exists: boolean; sizeMb: number; path: string }> {
    const path = this.getMemCardPath(tenantId, slot);
    try {
      const stat = await Filesystem.stat({ path, directory: Directory.Data });
      return { exists: true, sizeMb: Math.round(stat.size / (1024 * 1024)), path: stat.uri };
    } catch (e) {
      return { exists: false, sizeMb: 0, path: '' };
    }
  }

  async formatMemoryCard(tenantId: string, slot: 1 | 2): Promise<boolean> {
    const path = this.getMemCardPath(tenantId, slot);
    try {
      // Cria a pasta recursivamente se não existir
      await Filesystem.mkdir({ path: `memcards/${tenantId.toLowerCase()}`, directory: Directory.Data, recursive: true }).catch(() => {});
      
      // Criar arquivo vazio de 8MB em Base64 (Preenchido com zeros)
      // Como 8MB em JS é pesado, vamos criar um arquivo inicial mínimo e deixar o emulador expandir, ou criar 1MB vazio
      const emptyBase64 = btoa('\0'.repeat(1024 * 1024)); // 1MB stub
      await Filesystem.writeFile({ path, directory: Directory.Data, data: emptyBase64 });
      
      console.log(`[KILLCAM - Storage] Memory Card Formatado: ${path}`);
      return true;
    } catch (e) {
      console.error('[KILLCAM - ERROR] Falha ao formatar Memory Card', e);
      return false;
    }
  }

  async loadDecrypted<T>(key: string): Promise<T | null> {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    try {
      const payload = decodeURIComponent(escape(atob(encrypted)));
      return JSON.parse(payload) as T;
    } catch (e) {
      // Fail-secure: Omit stack trace
      console.error(`{"error": "ERR_INTERNAL", "correlation_id": "storage_decode_fail"}`);
      return null;
    }
  }
}

export const secureStorage = new SecureStorageAdapter();
