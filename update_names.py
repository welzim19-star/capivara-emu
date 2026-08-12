import re

with open("src/data/tenantsData.ts", "r") as f:
    content = f.read()

# Update names
replacements = {
    "'Master System 3 (TecToy)'": "'PicoMaster'",
    "'Super System'": "'Super9x'",
    "'Mega Drive / Genesis'": "'GenPlus-X'",
    "'Advanced Handheld'": "'mGBA-X'",
    "'Color Handheld'": "'Gambatte-C'",
    "'Station One'": "'PCSX-Re'",
    "'Station Two'": "'AetherPlay2'",
    "'Ultra 64'": "'Mupen64-NX'",
    "'Arcade Classic'": "'MAME-X'",
    "'Neo Arcade'": "'FBNeo-X'",
    "'Portable Station'": "'PPSSPP-X'",
    "'8-Bit Classic'": "'PicoSystem'"
}

for old, new in replacements.items():
    content = content.replace(f"name: {old}", f"name: {new}")

# Update PS1/PS2 buttons to stylized unicode
# Original PS1: N W E S
content = content.replace("label: 'N'", "label: '▲'")
content = content.replace("label: 'W'", "label: '■'")
content = content.replace("label: 'E'", "label: '●'")
content = content.replace("label: 'S'", "label: '✖'")

with open("src/data/tenantsData.ts", "w") as f:
    f.write(content)
