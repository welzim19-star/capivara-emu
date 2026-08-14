import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { BiosEntity, BIOS_REGISTRY } from '../core/domain/BiosEntity';

// Serviço de Isolamento Galvânico para Firmware/BIOS
export class BiosManagerService {
  private static BIOS_DIR = 'system/bios';

  // Inicializa o diretório de BIOS seguro do aplicativo (evita acesso externo)
  static async initializeSecureVault(): Promise<void> {
    try {
      await Filesystem.mkdir({
        path: this.BIOS_DIR,
        directory: Directory.Data,
        recursive: true
      });
    } catch (e) {
      // Falha silenciosa se a pasta já existir (comportamento esperado)
    }
  }

  // Verifica o status de todas as BIOS cadastradas no Registry
  static async checkInstalledBios(): Promise<BiosEntity[]> {
    await this.initializeSecureVault();
    const updatedRegistry = [...BIOS_REGISTRY];

    for (let bios of updatedRegistry) {
      try {
        const stat = await Filesystem.stat({
          path: `${this.BIOS_DIR}/${bios.filename}`,
          directory: Directory.Data
        });
        
        bios.isInstalled = !!stat; // Se não lançar erro, o arquivo existe.
        // TODO (LENS-1): Implementar cálculo nativo de MD5 em Background Worker se necessário.
      } catch (e) {
        bios.isInstalled = false;
      }
    }
    return updatedRegistry;
  }

  // Importa um arquivo via Blob (selecionado no input de arquivos) para o cofre seguro
  static async importBios(file: File, targetBios: BiosEntity): Promise<boolean> {
    try {
      // No navegador/Capacitor web, precisamos ler como Base64 para gravar no Filesystem nativo
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          // Remover o prefixo data:mime/type;base64,
          const pureBase64 = base64Data.split(',')[1];

          await Filesystem.writeFile({
            path: `${this.BIOS_DIR}/${targetBios.filename}`,
            data: pureBase64,
            directory: Directory.Data
          });
          
          console.log(`[BiosManager] ${targetBios.filename} injetada no cofre seguro.`);
          resolve(true);
        };
        reader.onerror = () => resolve(false);
        reader.readAsDataURL(file);
      });
    } catch (e) {
      console.error('[BiosManager] Falha crítica de importação', e);
      return false;
    }
  }

  // Remove a BIOS do sistema
  static async deleteBios(bios: BiosEntity): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: `${this.BIOS_DIR}/${bios.filename}`,
        directory: Directory.Data
      });
    } catch (e) {
      console.warn('[BiosManager] BIOS não encontrada para exclusão');
    }
  }
}
