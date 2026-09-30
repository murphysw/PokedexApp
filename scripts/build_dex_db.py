#!/usr/bin/env python3
"""Build the offline Pokédex data and sprite assets from PokeAPI."""

from __future__ import annotations

import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import requests

API_BASE = "https://pokeapi.co/api/v2/"
FIRST_POKEMON_ID = 1
LAST_POKEMON_ID = 807
API_WORKERS = 8
SPRITE_WORKERS = 12
REQUEST_TIMEOUT = 30
REQUEST_ATTEMPTS = 3

VERSION_TO_GROUP = {
	"red": "red-blue",
	"blue": "red-blue",
	"yellow": "yellow",
	"gold": "gold-silver",
	"silver": "gold-silver",
	"crystal": "crystal",
	"ruby": "ruby-sapphire",
	"sapphire": "ruby-sapphire",
	"emerald": "emerald",
	"firered": "firered-leafgreen",
	"leafgreen": "firered-leafgreen",
	"diamond": "diamond-pearl",
	"pearl": "diamond-pearl",
	"platinum": "platinum",
	"heartgold": "heartgold-soulsilver",
	"soulsilver": "heartgold-soulsilver",
	"black": "black-white",
	"white": "black-white",
	"black-2": "black-2-white-2",
	"white-2": "black-2-white-2",
	"x": "x-y",
	"y": "x-y",
	"omega-ruby": "omega-ruby-alpha-sapphire",
	"alpha-sapphire": "omega-ruby-alpha-sapphire",
	"sun": "sun-moon",
	"moon": "sun-moon",
	"ultra-sun": "ultra-sun-ultra-moon",
	"ultra-moon": "ultra-sun-ultra-moon",
	"lets-go-pikachu": "lets-go-pikachu-lets-go-eevee",
	"lets-go-eevee": "lets-go-pikachu-lets-go-eevee",
}
GEN1_TO_GEN7_VERSION_GROUPS = set(VERSION_TO_GROUP.values())
VERSION_GROUP_ORDER = [
	"red-blue",
	"yellow",
	"gold-silver",
	"crystal",
	"ruby-sapphire",
	"emerald",
	"firered-leafgreen",
	"diamond-pearl",
	"platinum",
	"heartgold-soulsilver",
	"black-white",
	"black-2-white-2",
	"x-y",
	"omega-ruby-alpha-sapphire",
	"sun-moon",
	"ultra-sun-ultra-moon",
	"lets-go-pikachu-lets-go-eevee",
]
VERSION_TO_POKEDEX = {
	"red": ("kanto",),
	"blue": ("kanto",),
	"yellow": ("kanto",),
	"gold": ("original-johto",),
	"silver": ("original-johto",),
	"crystal": ("original-johto",),
	"ruby": ("hoenn",),
	"sapphire": ("hoenn",),
	"emerald": ("hoenn",),
	"firered": ("kanto",),
	"leafgreen": ("kanto",),
	"diamond": ("original-sinnoh",),
	"pearl": ("original-sinnoh",),
	"platinum": ("extended-sinnoh", "original-sinnoh"),
	"heartgold": ("updated-johto", "original-johto"),
	"soulsilver": ("updated-johto", "original-johto"),
	"black": ("original-unova",),
	"white": ("original-unova",),
	"black-2": ("updated-unova", "original-unova"),
	"white-2": ("updated-unova", "original-unova"),
	"x": ("kalos-central", "kalos-coastal", "kalos-mountain"),
	"y": ("kalos-central", "kalos-coastal", "kalos-mountain"),
	"omega-ruby": ("updated-hoenn", "hoenn"),
	"alpha-sapphire": ("updated-hoenn", "hoenn"),
	"sun": ("original-alola", "original-melemele", "original-akala", "original-ulaula", "original-poni"),
	"moon": ("original-alola", "original-melemele", "original-akala", "original-ulaula", "original-poni"),
	"ultra-sun": ("updated-alola", "updated-melemele", "updated-akala", "updated-ulaula", "updated-poni"),
	"ultra-moon": ("updated-alola", "updated-melemele", "updated-akala", "updated-ulaula", "updated-poni"),
	"lets-go-pikachu": ("letsgo-kanto", "kanto"),
	"lets-go-eevee": ("letsgo-kanto", "kanto"),
}

STAT_NAMES = {
	"hp": "hp",
	"attack": "atk",
	"defense": "def",
	"special-attack": "spa",
	"special-defense": "spdef",
	"speed": "spe",
}

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "assets" / "data"
SPRITES_DIR = PROJECT_ROOT / "assets" / "sprites"


def request_json(url: str) -> Any:
	for attempt in range(REQUEST_ATTEMPTS):
		try:
			response = requests.get(url, timeout=REQUEST_TIMEOUT)
			response.raise_for_status()
			return response.json()
		except requests.RequestException:
			if attempt == REQUEST_ATTEMPTS - 1:
				raise
			time.sleep(0.5 * (2**attempt))
	raise RuntimeError(f"Could not fetch {url}")


def fetch_pokemon_bundle(pokemon_id: int) -> tuple[dict[str, Any], dict[str, Any], list[dict[str, Any]]]:
	pokemon = request_json(f"{API_BASE}pokemon/{pokemon_id}/")
	species = request_json(pokemon["species"]["url"])
	encounters = request_json(f"{API_BASE}pokemon/{pokemon_id}/encounters/")
	return pokemon, species, encounters


def fetch_resource(url: str) -> tuple[str, Any]:
	return url, request_json(url)


def get_id_from_url(url: str | None) -> int | None:
	if not url:
		return None
	try:
		return int(url.rstrip("/").rsplit("/", 1)[-1])
	except ValueError:
		return None


def get_link_name(value: Any) -> str | None:
	return value.get("name") if isinstance(value, dict) else None


def get_base_stats(pokemon_data: dict[str, Any]) -> dict[str, int]:
	return {
		STAT_NAMES[stat["stat"]["name"]]: stat["base_stat"]
		for stat in pokemon_data.get("stats", [])
		if stat["stat"]["name"] in STAT_NAMES
	}


def get_ability_description(ability_data: dict[str, Any]) -> str:
	for entry in ability_data.get("effect_entries", []):
		if entry.get("language", {}).get("name") == "en":
			return entry.get("short_effect") or entry.get("effect", "")
	for entry in ability_data.get("flavor_text_entries", []):
		if entry.get("language", {}).get("name") == "en":
			return entry.get("flavor_text", "").replace("\n", " ").replace("\f", " ")
	return ""


def get_regional_dex_numbers(species_data: dict[str, Any]) -> dict[str, int]:
	return {
		entry["pokedex"]["name"]: entry["entry_number"]
		for entry in species_data.get("pokedex_numbers", [])
	}


def get_local_dex_numbers(species_data: dict[str, Any]) -> dict[str, int]:
	regional_numbers = get_regional_dex_numbers(species_data)
	supported_pokedexes = {
		pokedex_name
		for pokedex_names in VERSION_TO_POKEDEX.values()
		for pokedex_name in pokedex_names
	}
	return {
		pokedex_name: entry_number
		for pokedex_name, entry_number in regional_numbers.items()
		if pokedex_name in supported_pokedexes
	}


def normalize_flavor_text(text: str) -> str:
	return " ".join(text.replace("\f", " ").replace("\n", " ").split())


def get_move_metadata(move_data: dict[str, Any]) -> dict[str, Any]:
	flavor_text_entries = []
	for entry in move_data.get("flavor_text_entries", []):
		if entry.get("language", {}).get("name") != "en":
			continue
		version_group = get_link_name(entry.get("version_group"))
		if version_group not in GEN1_TO_GEN7_VERSION_GROUPS:
			continue
		flavor_text_entries.append(
			{
				"version_group": version_group,
				"text": normalize_flavor_text(entry.get("flavor_text", "")),
			}
		)

	version_order = {name: index for index, name in enumerate(VERSION_GROUP_ORDER)}
	description = ""
	if flavor_text_entries:
		description = max(
			flavor_text_entries,
			key=lambda entry: version_order.get(entry["version_group"], -1),
		)["text"]

	effects = next(
		(
			{"short": entry.get("short_effect", ""), "full": entry.get("effect", "")}
			for entry in move_data.get("effect_entries", [])
			if entry.get("language", {}).get("name") == "en"
		),
		{"short": "", "full": ""},
	)
	if not description:
		description = effects["short"] or effects["full"]

	return {
		"type": get_link_name(move_data.get("type")),
		"category": get_link_name(move_data.get("damage_class")),
		"power": move_data.get("power"),
		"accuracy": move_data.get("accuracy"),
		"pp": move_data.get("pp"),
		"description": description,
		"flavor_text_entries": flavor_text_entries,
		"effects": effects,
		"effectChance": move_data.get("effect_chance"),
		"target": get_link_name(move_data.get("target")),
	}


def normalize_evolution_details(details: list[dict[str, Any]]) -> list[dict[str, Any]]:
	return [
		{
			"trigger": get_link_name(detail.get("trigger")),
			"min_level": detail.get("min_level"),
			"held_item": get_link_name(detail.get("held_item")),
			"item": get_link_name(detail.get("item")),
			"time_of_day": detail.get("time_of_day"),
			"known_move": get_link_name(detail.get("known_move")),
			"known_move_type": get_link_name(detail.get("known_move_type")),
			"gender": detail.get("gender"),
			"location": get_link_name(detail.get("location")),
			"min_happiness": detail.get("min_happiness"),
			"min_affection": detail.get("min_affection"),
			"min_beauty": detail.get("min_beauty"),
			"party_species": get_link_name(detail.get("party_species")),
			"party_type": get_link_name(detail.get("party_type")),
			"relative_physical_stats": detail.get("relative_physical_stats"),
			"trade_species": get_link_name(detail.get("trade_species")),
			"needs_overworld_rain": detail.get("needs_overworld_rain", False),
			"turn_upside_down": detail.get("turn_upside_down", False),
			"version_group": get_link_name(detail.get("version_group")),
		}
		for detail in details
	]


def build_evolution_index(chain_data: dict[str, Any]) -> dict[int, dict[str, Any]]:
	index: dict[int, dict[str, Any]] = {}

	def visit(
		node: dict[str, Any],
		parent: dict[str, Any] | None = None,
		incoming_details: list[dict[str, Any]] | None = None,
	) -> None:
		species = node["species"]
		species_id = get_id_from_url(species.get("url"))
		if species_id is None:
			return

		evolutions = []
		for child in node.get("evolves_to", []):
			child_species = child["species"]
			child_id = get_id_from_url(child_species.get("url"))
			if child_id is None:
				continue
			details = normalize_evolution_details(child.get("evolution_details", []))
			evolutions.append({"id": child_id, "name": child_species["name"], "details": details})
			visit(child, {"id": species_id, "name": species["name"]}, child.get("evolution_details", []))

		index[species_id] = {
			"parent": parent,
			"incomingDetails": normalize_evolution_details(incoming_details or []),
			"evolutions": evolutions,
		}

	visit(chain_data["chain"])
	return index


def get_location_version_details(encounter: dict[str, Any]) -> list[dict[str, Any]]:
	details = []
	for version_detail in encounter.get("version_details", []):
		version = version_detail["version"]["name"]
		version_group = VERSION_TO_GROUP.get(version)
		if version_group is None:
			continue
		details.append(
			{
				"version": version,
				"versionGroup": version_group,
				"maxChance": version_detail["max_chance"],
				"encounterDetails": version_detail["encounter_details"],
			}
		)
	return details


def build_records(
	pokemon_data: dict[str, Any],
	species_data: dict[str, Any],
	encounters: list[dict[str, Any]],
	moves: dict[int, dict[str, Any]],
	locations: dict[int, dict[str, Any]],
	ability_descriptions: dict[str, str],
	mega_form_data: dict[str, dict[str, Any]],
	evolution_index: dict[int, dict[str, Any]],
) -> dict[str, Any]:
	pokemon_id = pokemon_data["id"]
	base_stats = get_base_stats(pokemon_data)
	version_groups = {
		VERSION_TO_GROUP[entry["version"]["name"]]
		for entry in pokemon_data.get("game_indices", [])
		if entry["version"]["name"] in VERSION_TO_GROUP
	}

	for pokemon_move in pokemon_data.get("moves", []):
		move_data = pokemon_move["move"]
		move_id = get_id_from_url(move_data.get("url"))
		if move_id is None:
			continue

		learned_details = []
		for detail in pokemon_move.get("version_group_details", []):
			version_group = detail["version_group"]["name"]
			if version_group not in GEN1_TO_GEN7_VERSION_GROUPS:
				continue
			version_groups.add(version_group)
			learn_method = detail["move_learn_method"]["name"]
			learned_details.append(
				{
					"version_group": version_group,
					"level_learned_at": detail["level_learned_at"],
					"learn_method": "tm" if learn_method == "machine" else learn_method,
				}
			)

		if learned_details:
			move = moves.setdefault(
				move_id,
				{"id": move_id, "name": move_data["name"], "learnedBy": []},
			)
			move["learnedBy"].append(
				{"pokemonId": pokemon_id, "versionGroupDetails": learned_details}
			)

	pokemon_locations = []
	for encounter in encounters:
		version_details = get_location_version_details(encounter)
		if not version_details:
			continue
		area = encounter["location_area"]
		area_id = get_id_from_url(area.get("url"))
		if area_id is None:
			continue

		pokemon_locations.append(
			{
				"locationAreaId": area_id,
				"locationArea": area["name"],
				"versionGroups": sorted({detail["versionGroup"] for detail in version_details}),
			}
		)
		location = locations.setdefault(
			area_id,
			{"id": area_id, "name": area["name"], "pokemon": []},
		)
		location["pokemon"].append(
			{"pokemonId": pokemon_id, "versionDetails": version_details}
		)

	chain = species_data.get("evolution_chain", {})
	evolution = evolution_index.get(pokemon_id, {})
	abilities = [
		{
			"name": entry["ability"]["name"],
			"isHidden": entry["is_hidden"],
			"description": ability_descriptions.get(entry["ability"]["name"], ""),
		}
		for entry in pokemon_data.get("abilities", [])
	]
	mega_forms = []
	for variety in species_data.get("varieties", []):
		form = variety["pokemon"]
		if "mega" not in form["name"].split("-"):
			continue
		form_data = mega_form_data.get(form["url"])
		if not form_data:
			continue
		form_stats = get_base_stats(form_data)
		form_sprites = form_data.get("sprites", {})
		other_sprites = form_sprites.get("other") or {}
		official_artwork = other_sprites.get("official-artwork") or {}
		mega_forms.append(
			{
				"id": form_data["id"],
				"name": form["name"],
				"spritePath": f"assets/sprites/{form_data['id']}.png",
				"spriteUrls": {
					"frontDefault": form_sprites.get("front_default"),
					"officialArtwork": official_artwork.get("front_default"),
				},
				"statOverrides": {
					stat: value for stat, value in form_stats.items() if value != base_stats.get(stat)
				},
			}
		)

	return {
		"id": pokemon_id,
		"name": pokemon_data["name"],
		"nationalNo": pokemon_id,
		"regionalDexNumbers": get_regional_dex_numbers(species_data),
		"localDexNumbers": get_local_dex_numbers(species_data),
		"baseStats": base_stats,
		"types": [entry["type"]["name"] for entry in sorted(pokemon_data["types"], key=lambda item: item["slot"])],
		"abilities": abilities,
		"megaForms": mega_forms,
		"generation": species_data.get("generation", {}).get("name"),
		"evolutionChainId": get_id_from_url(chain.get("url")),
		"evolvesFrom": evolution.get("parent"),
		"evolutionDetails": evolution.get("incomingDetails", []),
		"evolutions": evolution.get("evolutions", []),
		"versionGroups": sorted(version_groups),
		"locations": sorted(pokemon_locations, key=lambda location: location["locationAreaId"]),
	}


def fetch_resources(urls: set[str]) -> tuple[dict[str, Any], list[tuple[str, str]]]:
	resources = {}
	failures = []
	sorted_urls = sorted(urls)
	with ThreadPoolExecutor(max_workers=API_WORKERS) as executor:
		futures = {executor.submit(fetch_resource, url): url for url in sorted_urls}
		for completed, future in enumerate(as_completed(futures), start=1):
			url = futures[future]
			try:
				resource_url, data = future.result()
				resources[resource_url] = data
			except (requests.RequestException, TypeError, ValueError) as error:
				failures.append((url, str(error)))
			print(f"Fetched auxiliary resource {completed}/{len(sorted_urls)}", flush=True)
	return resources, failures


def download_sprite(pokemon_id: int) -> tuple[int, str | None, bool]:
	destination = SPRITES_DIR / f"{pokemon_id}.png"
	if destination.is_file() and destination.stat().st_size > 0:
		return pokemon_id, None, True

	urls = (
		f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{pokemon_id}.png",
		f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{pokemon_id}.png",
	)
	last_error: requests.RequestException | None = None
	for url in urls:
		for attempt in range(REQUEST_ATTEMPTS):
			try:
				response = requests.get(url, timeout=REQUEST_TIMEOUT)
				response.raise_for_status()
				destination.write_bytes(response.content)
				return pokemon_id, None, False
			except requests.HTTPError as error:
				last_error = error
				if error.response is not None and error.response.status_code == 404:
					break
				if attempt < REQUEST_ATTEMPTS - 1:
					time.sleep(0.5 * (2**attempt))
			except requests.RequestException as error:
				last_error = error
				if attempt < REQUEST_ATTEMPTS - 1:
					time.sleep(0.5 * (2**attempt))
	return pokemon_id, str(last_error or "download failed"), False


def write_json(filename: str, value: Any) -> None:
	destination = DATA_DIR / filename
	temporary = destination.with_suffix(f"{destination.suffix}.tmp")
	temporary.write_text(
		json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
		encoding="utf-8",
	)
	temporary.replace(destination)


def main() -> int:
	DATA_DIR.mkdir(parents=True, exist_ok=True)
	SPRITES_DIR.mkdir(parents=True, exist_ok=True)

	pokemon_records = []
	moves: dict[int, dict[str, Any]] = {}
	locations: dict[int, dict[str, Any]] = {}
	pokemon_bundles: dict[int, tuple[dict[str, Any], dict[str, Any], list[dict[str, Any]]]] = {}
	failed_pokemon: list[tuple[int, str]] = []
	pokemon_ids = range(FIRST_POKEMON_ID, LAST_POKEMON_ID + 1)

	with ThreadPoolExecutor(max_workers=API_WORKERS) as executor:
		futures = {executor.submit(fetch_pokemon_bundle, pokemon_id): pokemon_id for pokemon_id in pokemon_ids}
		for completed, future in enumerate(as_completed(futures), start=1):
			pokemon_id = futures[future]
			try:
				pokemon_bundles[pokemon_id] = future.result()
			except (requests.RequestException, KeyError, TypeError, ValueError) as error:
				failed_pokemon.append((pokemon_id, str(error)))
			print(f"Fetched {completed}/{LAST_POKEMON_ID} (Pokemon #{pokemon_id})", flush=True)

	ability_urls = set()
	mega_form_urls = set()
	evolution_urls = set()
	for pokemon_data, species_data, _ in pokemon_bundles.values():
		ability_urls.update(
			entry["ability"]["url"]
			for entry in pokemon_data.get("abilities", [])
			if entry.get("ability", {}).get("url")
		)
		mega_form_urls.update(
			variety["pokemon"]["url"]
			for variety in species_data.get("varieties", [])
			if "mega" in variety.get("pokemon", {}).get("name", "").split("-")
			and variety.get("pokemon", {}).get("url")
		)
		chain_url = species_data.get("evolution_chain", {}).get("url")
		if chain_url:
			evolution_urls.add(chain_url)

	resource_urls = ability_urls | mega_form_urls | evolution_urls
	resource_data, failed_resources = fetch_resources(resource_urls)
	ability_descriptions = {
		resource_data[url]["name"]: get_ability_description(resource_data[url])
		for url in ability_urls
		if url in resource_data
	}
	mega_form_data = {url: resource_data[url] for url in mega_form_urls if url in resource_data}
	evolution_index: dict[int, dict[str, Any]] = {}
	for url in evolution_urls:
		if url not in resource_data:
			continue
		try:
			evolution_index.update(build_evolution_index(resource_data[url]))
		except (KeyError, TypeError, ValueError) as error:
			failed_resources.append((url, str(error)))

	for pokemon_id, (pokemon_data, species_data, encounters) in sorted(pokemon_bundles.items()):
		try:
			pokemon_records.append(
				build_records(
					pokemon_data,
					species_data,
					encounters,
					moves,
					locations,
					ability_descriptions,
					mega_form_data,
					evolution_index,
				)
			)
		except (KeyError, TypeError, ValueError) as error:
			failed_pokemon.append((pokemon_id, str(error)))

	move_urls = {f"{API_BASE}move/{move_id}/" for move_id in moves}
	move_resources, failed_move_resources = fetch_resources(move_urls)
	failed_resources.extend(failed_move_resources)
	for move_id, move in moves.items():
		move_data = move_resources.get(f"{API_BASE}move/{move_id}/")
		if move_data is not None:
			move.update(get_move_metadata(move_data))

	downloaded_sprites = 0
	cached_sprites = 0
	failed_sprites: list[tuple[int, str]] = []
	sprite_ids = set(range(FIRST_POKEMON_ID, LAST_POKEMON_ID + 1))
	sprite_ids.update(
		form["id"]
		for pokemon in pokemon_records
		for form in pokemon["megaForms"]
	)
	with ThreadPoolExecutor(max_workers=SPRITE_WORKERS) as executor:
		futures = {
			executor.submit(download_sprite, pokemon_id): pokemon_id
			for pokemon_id in sorted(sprite_ids)
		}
		for future in as_completed(futures):
			pokemon_id, error, cached = future.result()
			if error:
				failed_sprites.append((pokemon_id, error))
				print(f"Sprite failed for #{pokemon_id}: {error}", flush=True)
			elif cached:
				cached_sprites += 1
			else:
				downloaded_sprites += 1

	if not failed_pokemon and not failed_resources:
		pokemon_records.sort(key=lambda pokemon: pokemon["id"])
		for location in locations.values():
			location["pokemon"].sort(key=lambda entry: entry["pokemonId"])
		write_json("pokemon.json", pokemon_records)
		write_json("moves.json", sorted(moves.values(), key=lambda move: move["id"]))
		write_json("locations.json", sorted(locations.values(), key=lambda location: location["id"]))
		print(f"JSON databases written to {DATA_DIR}")
	else:
		print("JSON databases were not written because some Pokémon or metadata requests failed.")

	print("\nBuild summary")
	print(f"Pokémon fetched: {len(pokemon_records)}/{LAST_POKEMON_ID}")
	print(f"Unique moves: {len(moves)}")
	print(f"Location areas: {len(locations)}")
	print(f"Sprites present: {downloaded_sprites + cached_sprites}/{len(sprite_ids)} ({downloaded_sprites} downloaded, {cached_sprites} cached)")
	if failed_pokemon:
		print(f"Failed Pokémon requests: {len(failed_pokemon)}")
		for pokemon_id, error in failed_pokemon:
			print(f"  #{pokemon_id}: {error}")
	if failed_resources:
		print(f"Failed metadata requests: {len(failed_resources)}")
		for url, error in failed_resources:
			print(f"  {url}: {error}")
	if failed_sprites:
		print(f"Failed sprite downloads: {len(failed_sprites)}")

	return int(bool(failed_pokemon or failed_resources or failed_sprites))


if __name__ == "__main__":
	raise SystemExit(main())
