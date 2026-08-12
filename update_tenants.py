import json
import re

with open("src/data/tenantsData.ts", "r") as f:
    content = f.read()

# We will just replace each tenant block with the added gamepadStyle
styles = {
    'MS3_TECTOY': "gamepadStyle: { type: '2-button', bottom: { colorClass: 'bg-red-700/80', label: '1' }, right: { colorClass: 'bg-red-700/80', label: '2' } }",
    'MASTERSYSTEM_PICODRIVE': "gamepadStyle: { type: '2-button', bottom: { colorClass: 'bg-red-700/80', label: '1' }, right: { colorClass: 'bg-red-700/80', label: '2' } }",
    'SNES_SNES9X': "gamepadStyle: { type: '4-button', top: { colorClass: 'bg-blue-600/80', label: 'X' }, left: { colorClass: 'bg-green-600/80', label: 'Y' }, right: { colorClass: 'bg-red-600/80', label: 'A' }, bottom: { colorClass: 'bg-yellow-500/80 text-black', label: 'B' } }",
    'GBA_MGBA': "gamepadStyle: { type: '4-button', bottom: { colorClass: 'bg-gray-400/80 text-black', label: 'B' }, right: { colorClass: 'bg-gray-400/80 text-black', label: 'A' }, l1: { colorClass: 'bg-zinc-600/80', label: 'L' }, r1: { colorClass: 'bg-zinc-600/80', label: 'R' } }",
    'GBC_GAMBATTE': "gamepadStyle: { type: '2-button', bottom: { colorClass: 'bg-rose-700/80', label: 'B' }, right: { colorClass: 'bg-rose-700/80', label: 'A' } }",
    'GENESIS_GENPLUSGX': "gamepadStyle: { type: '4-button', left: { colorClass: 'bg-zinc-800/80', label: 'A' }, bottom: { colorClass: 'bg-zinc-800/80', label: 'B' }, right: { colorClass: 'bg-zinc-800/80', label: 'C' } }",
    'PS1_PCSX': "gamepadStyle: { type: '4-button', top: { colorClass: 'bg-emerald-500/80', label: 'N' }, left: { colorClass: 'bg-pink-500/80', label: 'W' }, right: { colorClass: 'bg-red-500/80', label: 'E' }, bottom: { colorClass: 'bg-cyan-500/80', label: 'S' }, l1: { colorClass: 'bg-zinc-600/80', label: 'L1' }, r1: { colorClass: 'bg-zinc-600/80', label: 'R1' } }",
    'PS2_NETHERSX2': "gamepadStyle: { type: '4-button', top: { colorClass: 'bg-emerald-500/80', label: 'N' }, left: { colorClass: 'bg-pink-500/80', label: 'W' }, right: { colorClass: 'bg-red-500/80', label: 'E' }, bottom: { colorClass: 'bg-cyan-500/80', label: 'S' }, l1: { colorClass: 'bg-zinc-600/80', label: 'L1' }, r1: { colorClass: 'bg-zinc-600/80', label: 'R1' } }",
    'N64_MUPEN64PLUS': "gamepadStyle: { type: '4-button', bottom: { colorClass: 'bg-blue-600/80', label: 'A' }, right: { colorClass: 'bg-green-600/80', label: 'B' }, top: { colorClass: 'bg-yellow-400/80 text-black', label: 'C-U' }, left: { colorClass: 'bg-yellow-400/80 text-black', label: 'C-L' }, l1: { colorClass: 'bg-zinc-700/80', label: 'Z' }, r1: { colorClass: 'bg-zinc-700/80', label: 'R' } }",
    'MAME_2010': "gamepadStyle: { type: '6-button', top: { colorClass: 'bg-red-600/80', label: 'X' }, left: { colorClass: 'bg-blue-600/80', label: 'Y' }, right: { colorClass: 'bg-green-600/80', label: 'A' }, bottom: { colorClass: 'bg-yellow-500/80 text-black', label: 'B' }, l1: { colorClass: 'bg-purple-600/80', label: 'L' }, r1: { colorClass: 'bg-orange-600/80', label: 'R' } }",
    'NEOGEO_FBNEO': "gamepadStyle: { type: '4-button', bottom: { colorClass: 'bg-red-600/80', label: 'A' }, right: { colorClass: 'bg-yellow-500/80 text-black', label: 'B' }, top: { colorClass: 'bg-blue-600/80', label: 'D' }, left: { colorClass: 'bg-green-600/80', label: 'C' } }",
    'PSP_PPSSPP': "gamepadStyle: { type: '4-button', top: { colorClass: 'bg-zinc-800/80', label: 'N' }, left: { colorClass: 'bg-zinc-800/80', label: 'W' }, right: { colorClass: 'bg-zinc-800/80', label: 'E' }, bottom: { colorClass: 'bg-zinc-800/80', label: 'S' }, l1: { colorClass: 'bg-zinc-800/80 border-t-2 border-white/40', label: 'L' }, r1: { colorClass: 'bg-zinc-800/80 border-t-2 border-white/40', label: 'R' } }"
}

for tenant_id, style_str in styles.items():
    # find the block for the tenant
    pattern = r"(id:\s*'" + tenant_id + r"',.*?biosRequired:[^,]+(?:,\s*biosFile:[^,]+)?(?:,\s*tectoySpecial:[^,]+)?)"
    
    def replacer(match):
        return match.group(1) + ",\n    " + style_str
        
    content = re.sub(pattern, replacer, content, flags=re.DOTALL)

with open("src/data/tenantsData.ts", "w") as f:
    f.write(content)
