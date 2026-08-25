#!/usr/bin/env python3
"""
Parse Sarna wiki sections 7-13 to extract individual mech mini entries.
Each row in the wiki tables becomes one entry with its own image, source, etc.
"""

import json
import re
import os

RAW_DIR = "data/raw"
SECTIONS = {
    7: "BattleTech Beginner Boxes and BattleTech: A Game of Armored Combat",
    8: "BattleTech Clan Invasion",
    9: "Independent Release ForcePacks",
    10: "Alpha Strike",
    11: "Mercenaries",
    12: "Faction Force Packs",
    13: "Premium Miniatures",
}

def clean_wikilink(text):
    """Extract display text from [[wikilink]] syntax, handling pipes and aliases."""
    # Remove [[File:...]] - handled separately
    # For [[BattleMech]] links like [[Wolverine (BattleMech)|Wolverine]], get the display text
    def replace_link(m):
        inner = m.group(1)
        if '|' in inner:
            return inner.split('|')[1]
        return inner
    return re.sub(r'\[\[([^\]]+)\]\]', replace_link, text)

def extract_mech_name(text):
    """Extract the clean mech name from wiki markup like ''[[Dire Wolf (Daishi)|Dire Wolf]]'' """
    # Remove '' markers
    text = text.replace("''", "")
    # Extract from [[...|...]] 
    m = re.search(r'\[\[([^\]]+)\]\]', text)
    if m:
        inner = m.group(1)
        if '|' in inner:
            return inner.split('|')[1].strip()
        return inner.strip()
    return text.strip()

def extract_alt_name(text):
    """Extract alt name from [[Dire Wolf (Daishi)|Dire Wolf]] -> 'Daishi'"""
    text = text.replace("''", "")
    m = re.search(r'\[\[([^\]]+)\]\]', text)
    if m:
        inner = m.group(1)
        if '|' in inner:
            parts = inner.split('|')
            main_part = parts[0]
            # Extract parenthetical
            pm = re.search(r'\(([^)]+)\)', main_part)
            if pm:
                return pm.group(1).strip()
    return ""

def extract_image_filename(text):
    """Extract filename from [[File:filename.jpg|40px]]"""
    m = re.search(r'\[\[File:([^\]|]+)', text)
    if m:
        return m.group(1).strip()
    return ""

def clean_source(text):
    """Clean source pack name from wiki markup."""
    # Remove [[...|...]] links, keep display text
    text = clean_wikilink(text)
    # Remove ''' bold markers
    text = text.replace("'''", "")
    # Remove '' italic markers
    text = text.replace("''", "")
    # Clean up whitespace and <br/> tags
    text = text.replace("<br/>", " ").replace("<br>", " ")
    # Collapse multiple spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_table_row(row_lines):
    """Parse a single table row (list of cell texts) into a mech entry."""
    # row_lines is a list of cell contents
    if len(row_lines) < 10:
        return None
    
    image_cell = row_lines[0]
    base_number = row_lines[1].strip()
    catalog_number = row_lines[2].strip()
    model = row_lines[3].strip()
    name_cell = row_lines[4]
    parts = row_lines[5].strip()
    manufacturer = row_lines[6].strip()
    year = row_lines[7].strip()
    material = row_lines[8].strip()
    source_cell = row_lines[9]
    
    # Extract image filename
    image_file = extract_image_filename(image_cell)
    
    # Extract mech name
    name = extract_mech_name(name_cell)
    alt_name = extract_alt_name(name_cell)
    
    # Clean model - remove wiki links, bold/italic markers, and <br> tags
    model = clean_wikilink(model)
    model = model.replace("'''", "").replace("''", "")
    model = model.replace("<br/>", " ").replace("<br>", " ")
    model = re.sub(r'\s+', ' ', model).strip()
    
    # Clean catalog number
    catalog_number = catalog_number.replace("<br/>", " ").replace("<br>", " ")
    catalog_number = re.sub(r'\s+', ' ', catalog_number).strip()
    
    # Clean source
    source = clean_source(source_cell)
    
    # Clean name - remove <br> tags
    name = name.replace("<br/>", " ").replace("<br>", " ")
    name = re.sub(r'\s+', ' ', name).strip()
    
    # Clean manufacturer - remove wiki links
    manufacturer = clean_wikilink(manufacturer)
    manufacturer = manufacturer.replace("'''", "").replace("''", "")
    manufacturer = re.sub(r'\s+', ' ', manufacturer).strip()
    
    # Clean parts - remove <br> tags
    parts = parts.replace("<br/>", " ").replace("<br>", " ")
    parts = re.sub(r'\s+', ' ', parts).strip()
    
    # Parse year
    try:
        year_int = int(year)
    except:
        year_int = 0
    
    return {
        "name": name,
        "altName": alt_name,
        "model": model,
        "baseNumber": base_number,
        "catalogNumber": catalog_number,
        "year": year_int,
        "source": source,
        "imageFile": image_file,
        "manufacturer": manufacturer,
        "material": material,
        "parts": parts,
    }

def parse_section(filepath):
    """Parse a section's wikitext and return list of mech entries."""
    with open(filepath) as f:
        content = f.read()
    
    entries = []
    
    # Find table rows. Tables start with {| and end with |}
    # Rows start with |-
    # Cells are separated by | or || at start of line or inline
    
    # Split into table rows
    lines = content.split('\n')
    in_table = False
    current_row = []
    in_row = False
    
    for line in lines:
        stripped = line.strip()
        
        if stripped.startswith('{|'):
            in_table = True
            in_row = False
            current_row = []
            continue
        
        if stripped.startswith('|}'):
            if in_row and current_row:
                entry = parse_table_row(current_row)
                if entry:
                    entries.append(entry)
            in_table = False
            in_row = False
            current_row = []
            continue
        
        if not in_table:
            continue
        
        # New row
        if stripped.startswith('|-'):
            if in_row and current_row:
                entry = parse_table_row(current_row)
                if entry:
                    entries.append(entry)
            current_row = []
            in_row = True
            continue
        
        if not in_row:
            continue
        
        # Skip header rows
        if stripped.startswith('!'):
            continue
        
        # Cell content - could be on same line as | or on its own line
        # In MediaWiki tables, cells start with | or ||
        if stripped.startswith('|') and not stripped.startswith('||'):
            # New cell
            cell_content = stripped[1:].strip()
            current_row.append(cell_content)
        elif stripped.startswith('||'):
            cell_content = stripped[2:].strip()
            current_row.append(cell_content)
        elif current_row:
            # Continuation of previous cell
            current_row[-1] += ' ' + stripped
    
    return entries

def determine_faction(name, alt_name, source):
    """Determine faction based on mech name and source."""
    clan_mechs = {
        'Adder', 'Bane', 'Blood Asp', 'Dire Wolf', 'Ebon Jaguar', 'Executioner',
        'Fire Moth', 'Gargoyle', 'Hellbringer', 'Howler', 'Ice Ferret',
        'Kingfisher', 'Kit Fox', 'Locust IIC', 'Mad Cat', 'Mad Dog',
        'Marauder IIC', 'Mist Lynx', 'Mongrel', 'Nova', 'Nova Cat',
        'Rifleman IIC', 'Shadow Cat', 'Stormcrow', 'Summoner', 'Timber Wolf',
        'Viper', 'Warhawk', 'Wolfhound IIC', 'Wraith', 'Battle Cobra',
        'Black Python', 'Huntsman', 'Jade Falcon', 'Karhu', 'Lance',
        ' sagittaire', 'Solitaire', 'Stag', 'Vapor Eagle',
    }
    
    # Also check for Clan in source
    if any(word in source.lower() for word in ['clan', 'wolf\'s dragoons']):
        # Wolf's Dragoons are technically Inner Sphere but often grouped with Clan tech
        if name in clan_mechs or alt_name in ['Daishi', 'Koshi', 'Ryoken', 'Thor', 'Mad Cat', 'Viper', 'Puma', 'Baboon', 'Gargoyle', 'Executioner', 'Caesar']:
            return 'Clan'
    
    if name in clan_mechs or alt_name in ['Daishi', 'Koshi', 'Ryoken', 'Thor', 'Mad Cat', 'Viper', 'Puma', 'Baboon', 'Gargoyle', 'Executioner']:
        return 'Clan'
    
    return 'Inner Sphere'

def determine_weight_class(name, model, source):
    """Determine weight class from the existing data or heuristics."""
    # This will be merged with existing data later
    return ""

def build_image_url(image_file):
    """Build Sarna URL from image filename."""
    if not image_file:
        return ""
    # URL-encode the filename, replacing spaces with underscores
    # The Sarna Special:FilePath pattern uses underscores
    encoded = image_file.replace(' ', '_')
    return f"https://www.sarna.net/wiki/Special:FilePath/{encoded}"

def main():
    # Parse all sections
    all_entries = []
    
    for section_num, section_name in SECTIONS.items():
        filepath = os.path.join(RAW_DIR, f"section_{section_num}.txt")
        if not os.path.exists(filepath):
            print(f"Warning: {filepath} not found, skipping section {section_num}")
            continue
        
        entries = parse_section(filepath)
        print(f"Section {section_num} ({section_name}): {len(entries)} entries")
        all_entries.extend(entries)
    
    print(f"\nTotal raw entries from all sections: {len(all_entries)}")
    
    # Now load OLD data.json (from git) to get faction, weightClass for each mech
    # We use git HEAD because data.json may have been overwritten by a previous run
    import subprocess
    result = subprocess.run(['git', 'show', 'HEAD:data.json'], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
    if result.returncode == 0:
        existing_data = json.loads(result.stdout)
    else:
        # Fallback: read the file directly
        with open('data.json') as f:
            existing_data = json.load(f)
    
    # Build lookup from existing data by mech name
    # Also try cleaned names (with <br> removed) as keys
    existing_lookup = {}
    for m in existing_data['mechs']:
        # Use the name as-is
        existing_lookup[m['name']] = m
        # Also add a cleaned version
        clean_name = m['name'].replace('<br/>', ' ').replace('<br>', ' ')
        clean_name = re.sub(r'\s+', ' ', clean_name).strip()
        if clean_name != m['name']:
            existing_lookup[clean_name] = m
    # Also try case-insensitive lookup
    existing_lookup_lower = {k.lower(): v for k, v in existing_lookup.items()}
    
    # Build new entries: one per row from the wiki
    new_entries = []
    
    # Load found images (images discovered by searching Sarna API that aren't in the wiki table rows)
    found_images_path = '/tmp/all_found_images.json'
    found_images = {}
    if os.path.exists(found_images_path):
        with open(found_images_path) as f:
            found_images = json.load(f)
    
    for entry in all_entries:
        name = entry['name']
        source = entry.get('source', '')
        
        # Get faction and weightClass from existing data
        existing = existing_lookup.get(name, {})
        if not existing:
            # Try case-insensitive
            existing = existing_lookup_lower.get(name.lower(), {})
        faction = existing.get('faction', determine_faction(name, entry.get('altName', ''), entry.get('source', '')))
        weight_class = existing.get('weightClass', '')
        
        # Get image file - use wiki table image, or fall back to found images
        image_file = entry.get('imageFile', '')
        if not image_file:
            lookup_key = f"{name}|||{source}"
            image_file = found_images.get(lookup_key, '')
        
        # Build image URL
        image_url = build_image_url(image_file)
        
        # Build title
        title = f"{name} ({source})"
        
        new_entry = {
            "name": name,
            "altName": entry.get('altName', ''),
            "title": title,
            "model": entry.get('model', ''),
            "baseNumber": entry.get('baseNumber', ''),
            "catalogNumber": entry.get('catalogNumber', ''),
            "year": entry.get('year', 0),
            "source": source,
            "imageFile": image_file,
            "imageUrl": image_url,
            "manufacturer": entry.get('manufacturer', ''),
            "material": entry.get('material', ''),
            "parts": entry.get('parts', ''),
            "faction": faction,
            "weightClass": weight_class,
        }
        new_entries.append(new_entry)
    
    print(f"Total new entries: {len(new_entries)}")
    
    # Sort by name, then by year
    new_entries.sort(key=lambda x: (x['name'], x['year']))
    
    # Write new data.json
    output = {"mechs": new_entries}
    with open('data.json', 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nWrote {len(new_entries)} entries to data.json")
    
    # Print some stats
    multi_check = {}
    for e in new_entries:
        multi_check.setdefault(e['name'], []).append(e)
    
    multi_names = {k: v for k, v in multi_check.items() if len(v) > 1}
    print(f"Mechs with multiple entries: {len(multi_names)}")
    
    # Verify specific mechs
    for check_name in ['Rifleman', 'Thunderbolt', 'Enforcer']:
        entries = multi_check.get(check_name, [])
        print(f"\n{check_name}: {len(entries)} entries")
        for e in entries:
            print(f"  - {e['title']} | image: {e['imageFile']}")
    
    # Check for entries with no image
    no_image = [e for e in new_entries if not e['imageFile']]
    print(f"\nEntries with no image: {len(no_image)}")
    for e in no_image[:10]:
        print(f"  - {e['name']} ({e['source']})")

if __name__ == '__main__':
    main()
