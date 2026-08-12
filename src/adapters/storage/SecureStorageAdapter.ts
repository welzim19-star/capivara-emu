import { StoragePort } from '../../core/ports/StoragePort';

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
