# BattleTech Mini Collection Viewer

A static web app for browsing Catalyst Game Labs plastic BattleTech miniatures (2019–present).

## Features

- **Browse** 227 unique mechs in a card grid with images from Sarna.net
- **Filter** by faction (Inner Sphere/Clan), weight class, year, and source pack
- **Search** by mech name or alternative name
- **Sort** by name, year, weight class, or faction
- **Compare mode** — select 2+ mechs for side-by-side stat comparison
- **Collection tracking** — mark mechs as "Owned" (saved to localStorage)
- **Detail view** — click any card for full info: variants, sources, catalog numbers, base numbers
- Dark theme, responsive design, no dependencies, no build step

## Data Source

All miniature data is parsed from the [Sarna wiki page "Miniatures - Catalyst Game Labs"](https://www.sarna.net/wiki/Miniatures_-_Catalyst_Game_Labs) using the MediaWiki API. The parser (`parse_data.py`) fetches sections 7–13 of that page and extracts table rows into structured JSON.

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `style.css` | Dark theme styles |
| `app.js` | App logic (filtering, rendering, compare, localStorage) |
| `data.json` | Mech data (227 entries) |
| `parse_data.py` | Python script to fetch & parse Sarna wiki data |
| `data/raw/section_*.txt` | Raw wikitext from Sarna API sections |

## Running Locally

```bash
cd battletech-minis
python3 -m http.server 8080
# Open http://localhost:8080
```

## Regenerating Data

```bash
cd battletech-minis
python3 parse_data.py
```

This fetches sections 7–13 from the Sarna API and regenerates `data.json`.

## Deploying to GitHub Pages

1. Create a repo (e.g., `bt-minis`)
2. Copy `index.html`, `style.css`, `app.js`, `data.json` to the repo root
3. Enable GitHub Pages in repo settings → Pages → Source: main branch
4. The app will be available at `https://<username>.github.io/bt-minis/`

## Data Model

Each mech entry in `data.json`:

```json
{
  "name": "Timber Wolf",
  "altName": "Mad Cat",
  "model": "Prime Config / T Config",
  "faction": "Clan",
  "weightClass": "Heavy",
  "year": 2020,
  "source": "Clan Invasion Box Set",
  "sources": ["Clan Invasion Box Set", "Alpha Strike Boxed Set", ...],
  "catalogNumber": "35030",
  "catalogNumbers": ["35030", "35690", ...],
  "baseNumber": "14",
  "baseNumbers": ["14", "a14", ...],
  "imageFile": "Clan Invasion Box - Timber Wolf.jpg",
  "imageUrl": "https://www.sarna.net/wiki/Special:Redirect/file/Clan+Invasion+Box+-+Timber+Wolf.jpg",
  "manufacturer": "Catalyst Game Labs",
  "material": "Plastic",
  "parts": "1"
}
```

## Stats

- 227 unique mechs (deduplicated by name)
- 135 with images, 92 without
- Clan: 62, Inner Sphere: 165
- Light: 45, Medium: 54, Heavy: 46, Assault: 55, Vehicles/Other: 27
- Years covered: 2019–2026
