import re

with open("src/services/GameScraperService.ts", "r") as f:
    content = f.read()

import_statement = "import { Filesystem, Directory } from '@capacitor/filesystem';\nimport { Capacitor } from '@capacitor/core';\n"
if "Filesystem" not in content:
    content = import_statement + content

# Replace the scraping logic at the end
pattern = r"// Cache the result.*?return \{ title, coverUrl \};"
replacement = """
    // Cache the result offline
    if (coverUrl && coverUrl.startsWith('http')) {
      try {
        const filePath = `boxarts/${searchKey.replace(/[^a-z0-9]/g, '_')}.png`;
        const res = await Filesystem.downloadFile({
          url: coverUrl,
          path: filePath,
          directory: Directory.Cache
        });
        if (res.path) {
          coverUrl = Capacitor.convertFileSrc(res.path);
        }
      } catch (e) {
        console.error("Failed to download boxart", e);
      }
    }

    localStorage.setItem(cacheKey, coverUrl);
    return { title, coverUrl };
"""

# Wait, `// Cache the result` is at the very end
content = re.sub(pattern, replacement.strip(), content, flags=re.DOTALL)

with open("src/services/GameScraperService.ts", "w") as f:
    f.write(content)
