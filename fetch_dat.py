import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import json

base_url = "https://raw.githubusercontent.com/libretro/FBNeo/master/dats/"
files = [
    "FinalBurn Neo (ClrMame Pro XML, Arcade only).dat",
    "FinalBurn Neo (ClrMame Pro XML, Neogeo only).dat",
    "FinalBurn Neo (ClrMame Pro XML, SNES Games only).dat",
    "FinalBurn Neo (ClrMame Pro XML, Megadrive only).dat",
    "FinalBurn Neo (ClrMame Pro XML, GBA Games only).dat"
]

games = {}

for f in files:
    encoded_f = urllib.parse.quote(f)
    url = base_url + encoded_f
    print(f"Downloading {f}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
        print("Parsing XML...")
        root = ET.fromstring(xml_data)
        for game in root.findall('game'):
            name = game.get('name')
            desc = game.find('description')
            if name and desc is not None:
                # FBNeo dat descriptions have text
                desc_text = desc.text
                games[name] = desc_text
    except Exception as e:
        print(f"Error fetching {f}: {e}")

print(f"Found {len(games)} games from LibRetro Dats.")

manual_games = {
    'smw': 'Super Mario World',
    'dkc': 'Donkey Kong Country',
    'zelda_lttp': 'The Legend of Zelda: A Link to the Past',
    'pokemon_red': 'Pokemon - Red Version',
    're1': 'Resident Evil',
    're2': 'Resident Evil 2',
    're3': 'Resident Evil 3: Nemesis',
    'mgs': 'Metal Gear Solid',
    'ff7': 'Final Fantasy VII',
    'gt4': 'Gran Turismo 4',
    'godofwar': 'God of War',
    'sonic1': 'Sonic the Hedgehog',
    'kfk2mp2': 'The King of Fighters 2002: Magic Plus II'
}

merged = {**games, **manual_games}

ts_content = "export const GAME_NAMES: Record<string, string> = {\n"
for k, v in merged.items():
    if v is None: continue
    v_escaped = str(v).replace("'", "\\'").replace("\n", " ")
    ts_content += f"  '{k}': '{v_escaped}',\n"
ts_content += "};\n"

with open("src/data/gameNames.ts", "w", encoding='utf-8') as f:
    f.write(ts_content)

print(f"gameNames.ts updated successfully with {len(merged)} titles!")
