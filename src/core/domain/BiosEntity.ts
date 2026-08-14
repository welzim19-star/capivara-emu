export interface BiosEntity {
  id: string; // Identifier for UI mapping
  tenantId: string; // e.g. 'PS2_NETHERSX2', 'NEOGEO_FBNEO'
  filename: string; // Expected filename (e.g., 'scph10000.bin')
  description: string;
  region: 'US' | 'EU' | 'JP' | 'Global';
  validHashes: string[]; // List of acceptable MD5 hashes
  isInstalled: boolean;
  installedHash?: string; // The hash of the currently installed file
}

// Registry of required BIOS files for the emulators
export const BIOS_REGISTRY: BiosEntity[] = [
  {
    id: 'ps2_bios_us',
    tenantId: 'PS2_NETHERSX2',
    filename: 'scph10000.bin',
    description: 'PlayStation 2 BIOS (NTSC-J / Global compatibility)',
    region: 'JP',
    validHashes: ['3dce0a170f14b62db492193b2165beaa', 'f4cce7ea356da7c74230198083a216db'],
    isInstalled: false
  },
  {
    id: 'ps1_bios_us',
    tenantId: 'PS1_DUCKSTATION',
    filename: 'scph5501.bin',
    description: 'PlayStation 1 BIOS (NTSC-U)',
    region: 'US',
    validHashes: ['490f666e1afb15b7362b406ed1cea246'],
    isInstalled: false
  },
  {
    id: 'neogeo_bios',
    tenantId: 'NEOGEO_FBNEO',
    filename: 'neogeo.zip',
    description: 'NeoGeo Arcade/AES Universal BIOS',
    region: 'Global',
    validHashes: ['*'], // ZIP archives have dynamic hashes, we bypass MD5 for zip bundles
    isInstalled: false
  }
];
