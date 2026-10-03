import json
from pathlib import Path

def generate_split_move_files(input_file="raw-moves.json", output_dir="data"):
    out_path = Path(output_dir)
    pokemon_dir = out_path / "pokemon-moves"
    pokemon_dir.mkdir(parents=True, exist_ok=True)

    with open(input_file, "r", encoding="utf-8") as f:
        raw_moves = json.load(f)

    moves_list = []
    pokemon_moves_map = {}

    for move in raw_moves:
        # 1. Lightweight Master Move Index (no flavor text or learnedBy)
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

        # 2. Map pokemonId -> learned move entries
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

    # Save lightweight moves.json master list
    with open(out_path / "moves.json", "w", encoding="utf-8") as f:
        json.dump(moves_list, f, indent=2)

    # Save individual {pokemonId}.json files
    for pokemon_id, moves in pokemon_moves_map.items():
        with open(pokemon_dir / f"{pokemon_id}.json", "w", encoding="utf-8") as f:
            json.dump(moves, f, indent=2)

    print(f"Done! Generated moves.json and {len(pokemon_moves_map)} individual Pokémon files.")

if __name__ == "__main__":
    generate_split_move_files()