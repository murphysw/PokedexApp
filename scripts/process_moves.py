import csv
import io
import json
import os
from pathlib import Path
import urllib.request

SUPPORTED_VERSION_GROUPS = [
    'red-blue',
    'yellow',
    'gold-silver',
    'crystal',
    'ruby-sapphire',
    'emerald',
    'firered-leafgreen',
    'diamond-pearl',
    'platinum',
    'heartgold-soulsilver',
    'black-white',
    'black-2-white-2',
    'x-y',
    'omega-ruby-alpha-sapphire',
    'sun-moon',
    'ultra-sun-ultra-moon',
    'lets-go-pikachu-lets-go-eevee',
]

def fetch_csv(url: str) -> list[dict[str, str]]:
    req = urllib.request.Request(url, headers={'User-Agent': 'PokedexApp/1.0'})
    content = urllib.request.urlopen(req).read().decode('utf-8')
    return list(csv.DictReader(io.StringIO(content)))

def generate_tm_data(data_dir: str = "assets/data"):
    data_path = Path(data_dir)
    tms_dir = data_path / "tms"
    tms_dir.mkdir(parents=True, exist_ok=True)
    pokemon_moves_dir = data_path / "pokemon-moves"

    print("Fetching machine definitions from PokeAPI GitHub repository...")
    machines_csv = fetch_csv('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/machines.csv')
    items_csv = fetch_csv('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/items.csv')
    vg_csv = fetch_csv('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/version_groups.csv')

    vg_map = {row['id']: row['identifier'] for row in vg_csv}
    item_map = {row['id']: row['identifier'] for row in items_csv}

    # Load move metadata
    moves_file = data_path / "moves.json"
    with open(moves_file, "r", encoding="utf-8") as f:
        moves_list = json.load(f)
    moves_map = {m['id']: m for m in moves_list}

    # Extract reverse map from local pokemon-moves: (move_id, version_group) -> list of pokemon_id
    print("Indexing TM learnsets across all Pokémon...")
    tm_learners: dict[tuple[int, str], list[int]] = {}
    pokemon_files = sorted([f for f in os.listdir(pokemon_moves_dir) if f.endswith(".json")], key=lambda x: int(x.split(".")[0]))
    for fname in pokemon_files:
        pokemon_id = int(fname.split(".")[0])
        with open(pokemon_moves_dir / fname, "r", encoding="utf-8") as f:
            pmoves = json.load(f)
        for move_entry in pmoves:
            mid = move_entry["moveId"]
            for detail in move_entry.get("versionGroupDetails", []):
                if detail.get("learn_method") == "tm":
                    vg = detail.get("version_group")
                    key = (mid, vg)
                    if key not in tm_learners:
                        tm_learners[key] = []
                    tm_learners[key].append(pokemon_id)

    print(f"Indexed TM learnsets for {len(pokemon_files)} Pokémon across {len(tm_learners)} (move, version_group) pairs.")

    # Group machines by version group
    grouped_tms: dict[str, list[dict]] = {vg: [] for vg in SUPPORTED_VERSION_GROUPS}

    for m in machines_csv:
        vg = vg_map.get(m['version_group_id'])
        if vg not in grouped_tms:
            continue

        item_id = m['item_id']
        raw_identifier = item_map.get(item_id, "")
        if not (raw_identifier.startswith("tm") or raw_identifier.startswith("hm")):
            continue

        is_hm = raw_identifier.startswith("hm")
        try:
            number = int(raw_identifier[2:])
        except ValueError:
            number = 0

        machine_label = f"{'HM' if is_hm else 'TM'}{number:02d}"
        move_id = int(m['move_id'])
        move_meta = moves_map.get(move_id, {})
        learnable_pokemon = sorted(tm_learners.get((move_id, vg), []))

        grouped_tms[vg].append({
            "machine": machine_label,
            "number": number,
            "isHm": is_hm,
            "moveId": move_id,
            "moveName": move_meta.get("name", ""),
            "moveType": move_meta.get("type", "normal"),
            "category": move_meta.get("category", "status"),
            "power": move_meta.get("power"),
            "accuracy": move_meta.get("accuracy"),
            "pp": move_meta.get("pp"),
            "description": move_meta.get("description", ""),
            "pokemonIds": learnable_pokemon,
        })

    # Sort each version group's TMs naturally: TMs first by number, then HMs by number
    for vg in grouped_tms:
        grouped_tms[vg].sort(key=lambda x: (1 if x["isHm"] else 0, x["number"]))
        # Write individual small version group file (~35-75KB)
        vg_file = tms_dir / f"{vg}.json"
        with open(vg_file, "w", encoding="utf-8") as f:
            json.dump(grouped_tms[vg], f, separators=(',', ':'))
        print(f"Wrote {vg_file} ({len(grouped_tms[vg])} machines)")

    # Also write master compact tms.json
    master_file = data_path / "tms.json"
    with open(master_file, "w", encoding="utf-8") as f:
        json.dump(grouped_tms, f, separators=(',', ':'))
    print(f"Wrote {master_file} ({len(grouped_tms)} version groups)")

def generate_split_move_files(input_file="raw-moves.json", output_dir="data"):
    out_path = Path(output_dir)
    pokemon_dir = out_path / "pokemon-moves"
    pokemon_dir.mkdir(parents=True, exist_ok=True)

    with open(input_file, "r", encoding="utf-8") as f:
        raw_moves = json.load(f)

    moves_list = []
    pokemon_moves_map = {}

    for move in raw_moves:
        moves_list.append({
            "id": move.get("id"),
            "name": move.get("name"),
            "type": move.get("type"),
            "category": move.get("category"),
            "power": move.get("power"),
            "accuracy": move.get("accuracy"),
            "pp": move.get("pp"),
            "description": move.get("description")
        })

        move_id = move.get("id")
        move_name = move.get("name")

        for entry in move.get("learnedBy", []):
            pokemon_id = entry.get("pokemonId")
            version_details = entry.get("versionGroupDetails", [])

            if pokemon_id not in pokemon_moves_map:
                pokemon_moves_map[pokemon_id] = []

            pokemon_moves_map[pokemon_id].append({
                "moveId": move_id,
                "moveName": move_name,
                "versionGroupDetails": version_details
            })

    with open(out_path / "moves.json", "w", encoding="utf-8") as f:
        json.dump(moves_list, f, indent=2)

    for pokemon_id, moves in pokemon_moves_map.items():
        with open(pokemon_dir / f"{pokemon_id}.json", "w", encoding="utf-8") as f:
            json.dump(moves, f, indent=2)

    print(f"Done! Generated moves.json and {len(pokemon_moves_map)} individual Pokémon files.")

if __name__ == "__main__":
    generate_tm_data()