import os

replacements = [
    ("Capivara Emu Studio", "Capivara Emu Studio"),
    ("CapivaraEmuStudio", "CapivaraEmuStudio"),
    ("CAPIVARA EMU", "CAPIVARA EMU"),
    ("CapivaraEmu", "CapivaraEmu"),
    ("capivara-emu", "capivara-emu"),
    ("capivaraemu", "capivaraemu"),
    ("CAPIVARA", "CAPIVARA"),
    ("Capivara", "Capivara"),
    ("capivara_", "capivara_"),
    ("com.capivara.", "com.capivara.")
]

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements:
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

for root, dirs, files in os.walk('.'):
    if '.git' in root or 'node_modules' in root:
        continue
    for file in files:
        if file.endswith(('.ts', '.tsx', '.json', '.py', '.html', '.md', '.css', '.sh', '.example')):
            filepath = os.path.join(root, file)
            try:
                replace_in_file(filepath)
            except Exception as e:
                print(f"Failed {filepath}: {e}")
