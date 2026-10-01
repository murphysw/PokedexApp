# Offline Living Dex Pokédex

An Expo app for tracking a living Pokédex across games from Generations 1–7. Pokémon, move, location, and sprite data are bundled locally so browsing and tracking work without runtime network requests.

## Run the app

```bash
npm install
npx expo start
```

## Rebuild offline data

Install the Python dependency and regenerate the databases and sprites when refreshing source data:

```bash
python -m pip install -r requirements.txt
python scripts/build_dex_db.py
```

Generated data is stored in `assets/data/` and sprites in `assets/sprites/`. See [SPECIFICATION.md](SPECIFICATION.md) for schemas, remake rules, and application requirements.
