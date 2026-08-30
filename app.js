/* BattleTech Mini Collection App v1.4 */

let allMechs = [];
let filteredMechs = [];
let ownedSet = new Set();
let compareSet = new Set();
let compareMode = false;

// Rarity mode state
let rarityData = null;
let rarityFilteredMechs = [];
let rarityCurrentEra = '3028';
let rarityCurrentFaction = '';
let raritySortColumn = 'name';
let raritySortDir = 'asc';

const STORAGE_KEY = 'bt-minis-owned';

// DOM elements
const cardGrid = document.getElementById('cardGrid');
const searchInput = document.getElementById('searchInput');
const factionFilter = document.getElementById('factionFilter');
const weightFilter = document.getElementById('weightFilter');
const yearFilter = document.getElementById('yearFilter');
const sourceFilter = document.getElementById('sourceFilter');
const sortSelect = document.getElementById('sortSelect');
const ownedOnlyFilter = document.getElementById('ownedOnlyFilter');
const compareBtn = document.getElementById('compareBtn');
const totalCount = document.getElementById('totalCount');
const ownedCount = document.getElementById('ownedCount');
const detailModal = document.getElementById('detailModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
const compareModal = document.getElementById('compareModal');
const compareBody = document.getElementById('compareBody');
const compareClose = document.getElementById('compareClose');

// Mode toggle elements
const modeCollection = document.getElementById('modeCollection');
const modeRarity = document.getElementById('modeRarity');
const body = document.body;

// Rarity DOM elements
const raritySearchInput = document.getElementById('raritySearchInput');
const rarityEraSelect = document.getElementById('rarityEraSelect');
const rarityFactionSelect = document.getElementById('rarityFactionSelect');
const rarityWeightFilter = document.getElementById('rarityWeightFilter');
const raritySortSelect = document.getElementById('raritySortSelect');
const rarityTableContainer = document.getElementById('rarityTableContainer');

// Weight class order for sorting
const WEIGHT_ORDER = { 'Light': 0, 'Medium': 1, 'Heavy': 2, 'Assault': 3, 'N/A': 4, 'Unknown': 5 };

// ==================== MODE TOGGLE ====================

function setMode(mode) {
    if (mode === 'rarity') {
        body.classList.remove('body-mode-collection');
        body.classList.add('body-mode-rarity');
        modeCollection.classList.remove('active');
        modeRarity.classList.add('active');
        // Lazy load rarity data
        if (!rarityData) {
            loadRarityData();
        } else {
            renderRarityTable();
        }
    } else {
        body.classList.remove('body-mode-rarity');
        body.classList.add('body-mode-collection');
        modeCollection.classList.add('active');
        modeRarity.classList.remove('active');
    }
}

modeCollection.addEventListener('click', () => setMode('collection'));
modeRarity.addEventListener('click', () => setMode('rarity'));

// ==================== RARITY MODE ====================

// Faction display names mapping (short names for dropdown)
const FACTION_DISPLAY = {
    'Star League 2750': 'Star League',
    'Capellan Confederation (House Liao): 3028-3039': 'Liao (Capellan)',
    'Capellan Confederation (House Liao): 3050-3057': 'Liao (Capellan)',
    'Draconis Combine (House Kurita): 3028-3039': 'Kurita (Draconis)',
    'Draconis Combine (House Kurita): 3050-3057': 'Kurita (Draconis)',
    'Federated Suns (House Davion): 3028-3039': 'Davion (Federated Suns)',
    'Federated Suns (House Davion): 3050-3057': 'Davion (Federated Suns)',
    'Free Rasalhague Republic: 3039-3050': 'FRR (Free Rasalhague)',
    'Free Worlds League (House Marik): 3028-3039': 'Marik (Free Worlds)',
    'Free Worlds League (House Marik): 3050-3057': 'Marik (Free Worlds)',
    'Lyran Commonwealth (House Steiner): 3028-3039': 'Steiner (Lyran)',
    'Lyran Commonwealth (House Steiner): 3050': 'Steiner (Lyran)',
    'Lyran Commonwealth (House Steiner): 3057': 'Steiner (Lyran)',
    'St. Ives Compact: 3039-3050': 'St. Ives Compact',
    'Mercenary / Periphery General: 3028-3050': 'Mercenary / Periphery',
    'Magistracy Of Canopus: 3028-3050': 'Canopus (Magistracy)',
    'Outworlds Alliance: 3028-3050': 'Outworlds Alliance',
    'Taurian Concordat: 3028-3050': 'Taurian Concordat'
};

async function loadRarityData() {
    try {
        rarityTableContainer.innerHTML = '<div class="empty-state"><h3>Loading rarity data...</h3></div>';
        const response = await fetch('xotl-rarity.json');
        rarityData = await response.json();
        populateRarityFactions();
        renderRarityTable();
    } catch (err) {
        rarityTableContainer.innerHTML = `<div class="empty-state"><h3>Error loading rarity data</h3><p>${err.message}</p></div>`;
    }
}

// Map era value to the column keys we care about
function getEraColumnKeys(era) {
    // Returns the possible column key patterns for an era
    const eraMap = {
        '2750': ['Regular', 'Royal'],
        '3028': ['3028'],
        '3039': ['3039'],
        '3050': ['3050', 'A/B (3050)', 'C/D/F (3050)'],
        '3057': ['A/B (3057)', 'C/D/F (3057)']
    };
    return eraMap[era] || [era];
}

// For a given era, determine which factions are available and what columns they show
function getFactionsForEra(era) {
    if (!rarityData) return [];
    
    const eraColKeys = getEraColumnKeys(era);
    const factions = [];
    
    for (const section of rarityData.sections) {
        const cols = section.era_columns.filter(c => eraColKeys.includes(c));
        if (cols.length > 0) {
            factions.push({
                faction: section.faction,
                displayName: FACTION_DISPLAY[section.faction] || section.faction,
                columns: cols
            });
        }
    }
    return factions;
}

function populateRarityFactions() {
    const factions = getFactionsForEra(rarityCurrentEra);
    rarityFactionSelect.innerHTML = '';
    
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All Factions';
    rarityFactionSelect.appendChild(allOption);
    
    for (const f of factions) {
        const opt = document.createElement('option');
        opt.value = f.faction;
        opt.textContent = f.displayName;
        rarityFactionSelect.appendChild(opt);
    }
}

function getWeightClass(tonnage) {
    if (tonnage <= 35) return 'Light';
    if (tonnage <= 55) return 'Medium';
    if (tonnage <= 75) return 'Heavy';
    return 'Assault';
}

function rarityClassForValue(val) {
    if (val === undefined || val === null) return 'na';
    if (val <= 3) return 'rare';
    if (val <= 6) return 'uncommon';
    return 'common';
}

function renderRarityTable() {
    if (!rarityData) return;
    
    const search = raritySearchInput.value.toLowerCase().trim();
    const weightFilterVal = rarityWeightFilter.value;
    const factions = getFactionsForEra(rarityCurrentEra);
    
    // Filter factions based on dropdown
    const visibleFactions = rarityCurrentFaction 
        ? factions.filter(f => f.faction === rarityCurrentFaction)
        : factions;
    
    // Build column list: each faction × its columns for this era
    const columns = [];
    for (const f of visibleFactions) {
        for (const col of f.columns) {
            columns.push({
                faction: f.faction,
                factionDisplay: f.displayName,
                column: col,
                key: `${f.faction}|||${col}`
            });
        }
    }
    
    // Filter mechs
    rarityFilteredMechs = rarityData.mechs.filter(m => {
        // Search
        if (search) {
            const nameMatch = (m.name || '').toLowerCase().includes(search);
            const variantMatch = (m.variant || '').toLowerCase().includes(search);
            if (!nameMatch && !variantMatch) return false;
        }
        // Weight
        if (weightFilterVal) {
            const wc = getWeightClass(m.tonnage);
            if (wc !== weightFilterVal) return false;
        }
        // Must have data for at least one visible faction/column
        const hasData = visibleFactions.some(f => {
            const sec = m.sections[f.faction];
            if (!sec) return false;
            return f.columns.some(c => sec[c] !== undefined);
        });
        if (!hasData && visibleFactions.length > 0) return false;
        return true;
    });
    
    // Sort
    rarityFilteredMechs.sort((a, b) => {
        let cmp = 0;
        if (raritySortColumn === 'name') {
            cmp = (a.name || '').localeCompare(b.name || '');
        } else if (raritySortColumn === 'tonnage') {
            cmp = (a.tonnage || 0) - (b.tonnage || 0);
        } else if (raritySortColumn === 'availability') {
            // Sort by availability in the first visible column (or selected faction)
            const refKey = columns.length > 0 ? columns[0] : null;
            if (refKey) {
                const aVal = (a.sections[refKey.faction] || {})[refKey.column];
                const bVal = (b.sections[refKey.faction] || {})[refKey.column];
                // N/A goes to bottom
                const aNum = aVal === undefined ? -1 : aVal;
                const bNum = bVal === undefined ? -1 : bVal;
                cmp = aNum - bNum;
            }
        } else {
            // Could be a column key for sorting by specific faction/column
            const parts = raritySortColumn.split('|||');
            if (parts.length === 2) {
                const aVal = (a.sections[parts[0]] || {})[parts[1]];
                const bVal = (b.sections[parts[0]] || {})[parts[1]];
                const aNum = aVal === undefined ? -1 : aVal;
                const bNum = bVal === undefined ? -1 : bVal;
                cmp = aNum - bNum;
            }
        }
        return raritySortDir === 'asc' ? cmp : -cmp;
    });
    
    if (rarityFilteredMechs.length === 0) {
        rarityTableContainer.innerHTML = '<div class="empty-state"><h3>No mechs found</h3><p>Try adjusting your filters</p></div>';
        return;
    }
    
    // Build table
    const sortClass = raritySortDir === 'asc' ? 'sorted-asc' : 'sorted-desc';
    
    let html = '<table class="rarity-table"><thead><tr>';
    // First column: mech name
    const nameSortClass = raritySortColumn === 'name' ? ` class="sortable ${sortClass}"` : ' class="sortable"';
    html += `<th${nameSortClass} data-sort="name">Mech</th>`;
    // Tonnage column
    const tonSortClass = raritySortColumn === 'tonnage' ? ` class="sortable ${sortClass}"` : ' class="sortable"';
    html += `<th${tonSortClass} data-sort="tonnage">Tons</th>`;
    // Faction columns
    for (const col of columns) {
        const colSortClass = raritySortColumn === col.key ? ` class="sortable ${sortClass}"` : ' class="sortable"';
        const colLabel = col.column.replace(/\(\d+\)/, '').trim();
        const factionShort = col.factionDisplay.split(' (')[0];
        html += `<th${colSortClass} data-sort="${col.key}" title="${col.factionDisplay} — ${col.column}">${factionShort}<br><span style="font-size:0.65rem;opacity:0.7">${colLabel}</span></th>`;
    }
    html += '</tr></thead><tbody>';
    
    for (const mech of rarityFilteredMechs) {
        html += '<tr>';
        html += `<td>${mech.variant || ''} — ${mech.name || ''}</td>`;
        html += `<td style="text-align:center;color:var(--text-secondary)">${mech.tonnage || '—'}</td>`;
        for (const col of columns) {
            const val = (mech.sections[col.faction] || {})[col.column];
            const cls = rarityClassForValue(val);
            if (val === undefined || val === null) {
                html += `<td><span class="rarity-cell na">—</span></td>`;
            } else {
                html += `<td><span class="rarity-cell ${cls}">${val}</span></td>`;
            }
        }
        html += '</tr>';
    }
    
    html += '</tbody></table>';
    rarityTableContainer.innerHTML = html;
    
    // Attach sort listeners to headers
    rarityTableContainer.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            if (raritySortColumn === sortKey) {
                raritySortDir = raritySortDir === 'asc' ? 'desc' : 'asc';
            } else {
                raritySortColumn = sortKey;
                raritySortDir = 'asc';
            }
            renderRarityTable();
        });
    });
}

// Rarity event listeners
raritySearchInput.addEventListener('input', renderRarityTable);
rarityWeightFilter.addEventListener('change', renderRarityTable);
raritySortSelect.addEventListener('change', () => {
    raritySortColumn = raritySortSelect.value;
    raritySortDir = 'asc';
    renderRarityTable();
});

rarityEraSelect.addEventListener('change', () => {
    rarityCurrentEra = rarityEraSelect.value;
    rarityCurrentFaction = '';
    populateRarityFactions();
    renderRarityTable();
});

rarityFactionSelect.addEventListener('change', () => {
    rarityCurrentFaction = rarityFactionSelect.value;
    renderRarityTable();
});

// ==================== COLLECTION MODE (unchanged) ====================

// Load data
async function loadData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        allMechs = data.mechs;
        
        // Populate filter dropdowns
        populateYearFilter();
        populateSourceFilter();
        
        // Load owned from localStorage
        loadOwned();
        
        // Initial render
        applyFilters();
    } catch (err) {
        cardGrid.innerHTML = `<div class="empty-state"><h3>Error loading data</h3><p>${err.message}</p></div>`;
    }
}

function populateYearFilter() {
    const years = [...new Set(allMechs.map(m => m.year).filter(y => y))].sort();
    years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearFilter.appendChild(opt);
    });
}

function populateSourceFilter() {
    const sources = [...new Set(allMechs.map(m => m.source).filter(s => s))].sort();
    sources.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        sourceFilter.appendChild(opt);
    });
}

function loadOwned() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            ownedSet = new Set(JSON.parse(stored));
        }
    } catch (e) {
        ownedSet = new Set();
    }
}

function saveOwned() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ownedSet]));
}

function getMechId(mech) {
    return (mech.title || mech.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Filtering
function applyFilters() {
    const search = searchInput.value.toLowerCase().trim();
    const faction = factionFilter.value;
    const weight = weightFilter.value;
    const year = yearFilter.value;
    const source = sourceFilter.value;
    const ownedOnly = ownedOnlyFilter.checked;
    const sort = sortSelect.value;

    filteredMechs = allMechs.filter(m => {
        // Search
        if (search) {
            const nameMatch = m.name.toLowerCase().includes(search);
            const altMatch = (m.altName || '').toLowerCase().includes(search);
            const titleMatch = (m.title || '').toLowerCase().includes(search);
            const sourceMatch = (m.source || '').toLowerCase().includes(search);
            if (!nameMatch && !altMatch && !titleMatch && !sourceMatch) return false;
        }
        // Faction
        if (faction && m.faction !== faction) return false;
        // Weight
        if (weight && m.weightClass !== weight) return false;
        // Year
        if (year && m.year !== parseInt(year)) return false;
        // Source
        if (source) {
        if (source && m.source !== source) return false;
        }
        // Owned only
        if (ownedOnly && !ownedSet.has(getMechId(m))) return false;
        return true;
    });

    // Sort
    filteredMechs.sort((a, b) => {
        switch (sort) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'year':
                return (a.year || 9999) - (b.year || 9999);
            case 'weightClass':
                return (WEIGHT_ORDER[a.weightClass] || 99) - (WEIGHT_ORDER[b.weightClass] || 99);
            case 'faction':
                return a.faction.localeCompare(b.faction) || a.name.localeCompare(b.name);
            default:
                return a.name.localeCompare(b.name);
        }
    });

    renderCards();
    updateStats();
}

function updateStats() {
    totalCount.textContent = `${filteredMechs.length} of ${allMechs.length} mechs`;
    const ownedTotal = allMechs.filter(m => ownedSet.has(getMechId(m))).length;
    ownedCount.textContent = `${ownedTotal} owned`;
    ownedCount.style.color = ownedTotal > 0 ? 'var(--accent)' : 'var(--text-secondary)';
}

// Render
function renderCards() {
    if (filteredMechs.length === 0) {
        cardGrid.innerHTML = '<div class="empty-state"><h3>No mechs found</h3><p>Try adjusting your filters</p></div>';
        return;
    }

    cardGrid.innerHTML = filteredMechs.map(mech => {
        const id = getMechId(mech);
        const owned = ownedSet.has(id);
        const compareSelected = compareSet.has(id);
        const compareBadge = compareSelected ? `<div class="card-compare-badge">${[...compareSet].indexOf(id) + 1}</div>` : '';
        
        const imageHtml = mech.imageUrl
            ? `<img src="${mech.imageUrl}" alt="${mech.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'>🤖</div>'">`
            : `<div class="no-image">🤖</div>`;
        
        const altNameHtml = mech.altName ? `<div class="card-alt-name">aka ${mech.altName}</div>` : '';
        
        const factionTag = mech.faction === 'Clan'
            ? '<span class="tag tag-faction-clan">Clan</span>'
            : '<span class="tag tag-faction-is">IS</span>';
        
        const weightClass = mech.weightClass || 'Unknown';
        const weightTagClass = `tag-weight-${(mech.weightClass || 'na').toLowerCase().replace('/', '-')}`;
        const weightTag = `<span class="tag ${weightTagClass}">${weightClass}</span>`;
        
        const sourceLabel = mech.source || '';
        
        return `
            <div class="card ${owned ? 'owned' : ''} ${compareSelected ? 'compare-selected' : ''}" data-mech-id="${id}">
                ${compareBadge}
                <div class="card-checkbox">
                    <input type="checkbox" ${owned ? 'checked' : ''} data-mech-id="${id}" class="owned-checkbox" onclick="event.stopPropagation()">
                </div>
                <div class="card-image">${imageHtml}</div>
                <div class="card-body">
                    <div class="card-name">${mech.name}</div>
                    <div class="card-source">${sourceLabel}</div>
                    ${altNameHtml}
                    <div class="card-tags">${factionTag}${weightTag}</div>
                    <div class="card-year">${mech.year || '—'}</div>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.mechId;
            if (compareMode) {
                toggleCompare(id);
            } else {
                showDetail(id);
            }
        });
    });

    document.querySelectorAll('.owned-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const id = cb.dataset.mechId;
            if (cb.checked) {
                ownedSet.add(id);
            } else {
                ownedSet.delete(id);
            }
            saveOwned();
            updateStats();
            cb.closest('.card').classList.toggle('owned', cb.checked);
        });
    });
}

// Detail Modal
let currentDetailId = null;

function findVariants(mech) {
    // Find other entries with the same base mech name
    const baseName = mech.name.replace(/ IIC$/, '').trim();
    return allMechs.filter(m => {
        const mBase = m.name.replace(/ IIC$/, '').trim();
        return mBase === baseName;
    });
}

function showDetail(id) {
    const mech = allMechs.find(m => getMechId(m) === id);
    if (!mech) return;
    currentDetailId = id;

    const variants = findVariants(mech);
    const variantIdx = variants.findIndex(m => getMechId(m) === id);
    const hasVariants = variants.length > 1;
    const prevVariant = hasVariants ? variants[(variantIdx - 1 + variants.length) % variants.length] : null;
    const nextVariant = hasVariants ? variants[(variantIdx + 1) % variants.length] : null;

    const imageHtml = mech.imageUrl
        ? `<img src="${mech.imageUrl}" alt="${mech.name}" class="detail-image" onerror="this.style.display='none'">`
        : '<div class="detail-no-image">🤖</div>';
    
    const altNameHtml = mech.altName ? `<div class="detail-alt-name">aka ${mech.altName}</div>` : '';
    
    const sources = [mech.source].filter(s => s);
    const sourcesHtml = sources.map(s => `<li>${s}</li>`).join('');
    
    const catalogNumber = mech.catalogNumber || '';
    const baseNumber = mech.baseNumber || '';

    const variantNav = hasVariants ? `
        <div class="variant-nav">
            <button class="variant-btn" onclick="showDetail('${getMechId(prevVariant)}')" title="${prevVariant.title}">‹</button>
            <span class="variant-count">${variantIdx + 1} / ${variants.length}</span>
            <button class="variant-btn" onclick="showDetail('${getMechId(nextVariant)}')" title="${nextVariant.title}">›</button>
        </div>
    ` : '';

    modalBody.innerHTML = `
        ${variantNav}
        ${imageHtml}
        <div class="detail-name">${mech.name}</div>
        ${mech.source ? `<div class="detail-source">${mech.source}</div>` : ''}
        ${altNameHtml}
        <div class="card-tags" style="margin-bottom: 16px;">
            <span class="tag ${mech.faction === 'Clan' ? 'tag-faction-clan' : 'tag-faction-is'}">${mech.faction}</span>
            <span class="tag tag-weight-${(mech.weightClass || 'na').toLowerCase().replace('/', '-')}">${mech.weightClass || 'Unknown'}</span>
        </div>
        <div class="detail-section">
            <div class="detail-label">Model / Variants</div>
            <div class="detail-value">${mech.model || '—'}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Year</div>
            <div class="detail-value">${mech.year || '—'}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Base Number</div>
            <div class="detail-value">${baseNumber || '—'}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Catalog Number</div>
            <div class="detail-value">${catalogNumber || '—'}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Manufacturer</div>
            <div class="detail-value">${mech.manufacturer || '—'}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Material</div>
            <div class="detail-value">${mech.material || '—'}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Source Packs</div>
            <ul class="detail-sources">${sourcesHtml || '<li>—</li>'}</ul>
        </div>
        <div class="detail-section">
            <label class="owned-only" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" ${ownedSet.has(id) ? 'checked' : ''} id="detailOwnedCheckbox">
                <span style="font-size: 1rem;">Owned</span>
            </label>
        </div>
    `;

    const detailCb = document.getElementById('detailOwnedCheckbox');
    if (detailCb) {
        detailCb.addEventListener('change', () => {
            if (detailCb.checked) {
                ownedSet.add(id);
            } else {
                ownedSet.delete(id);
            }
            saveOwned();
            updateStats();
            renderCards();
        });
    }

    detailModal.classList.add('active');
}

// Compare Mode
function toggleCompare(id) {
    if (compareSet.has(id)) {
        compareSet.delete(id);
    } else {
        if (compareSet.size >= 6) {
            alert('Maximum 6 mechs for comparison');
            return;
        }
        compareSet.add(id);
    }
    updateCompareButton();
    renderCards();
}

function updateCompareButton() {
    const count = compareSet.size;
    compareBtn.textContent = `Compare (${count})`;
    compareBtn.disabled = count < 2;
    compareBtn.classList.toggle('active', compareMode);
}

function showCompare() {
    const ids = [...compareSet];
    if (ids.length < 2) return;

    const mechs = ids.map(id => allMechs.find(m => getMechId(m) === id)).filter(m => m);

    const headers = mechs.map(m => {
        const img = m.imageUrl
            ? `<img src="${m.imageUrl}" alt="${m.name}" onerror="this.style.display='none'">`
            : '<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);border-radius:4px;">🤖</div>';
        return `<th><div class="compare-header">${img}<span>${m.name}</span></div></th>`;
    }).join('');

    const rows = [
        { label: 'Alt Name', get: m => m.altName || '—' },
        { label: 'Faction', get: m => m.faction },
        { label: 'Weight', get: m => m.weightClass || 'Unknown' },
        { label: 'Model', get: m => m.model || '—' },
        { label: 'Year', get: m => m.year || '—' },
        { label: 'Base #', get: m => m.baseNumber || '—' },
        { label: 'Catalog #', get: m => m.catalogNumber || '—' },
        { label: 'Manufacturer', get: m => m.manufacturer || '—' },
        { label: 'Material', get: m => m.material || '—' },
        { label: 'Source', get: m => m.source || '—' },
    ];

    const bodyRows = rows.map(row => {
        const cells = mechs.map(m => `<td>${row.get(m)}</td>`).join('');
        return `<tr><th>${row.label}</th>${cells}</tr>`;
    }).join('');

    compareBody.innerHTML = `
        <h2 style="margin-bottom: 16px;">Compare Mechs</h2>
        <div style="overflow-x: auto;">
            <table class="compare-table">
                <thead><tr><th></th>${headers}</tr></thead>
                <tbody>${bodyRows}</tbody>
            </table>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 8px;">
            <button class="btn-compare" onclick="clearCompare()">Clear Selection</button>
        </div>
    `;

    compareModal.classList.add('active');
}

function clearCompare() {
    compareSet.clear();
    compareMode = false;
    updateCompareButton();
    renderCards();
    compareModal.classList.remove('active');
}

// Event Listeners
searchInput.addEventListener('input', applyFilters);
factionFilter.addEventListener('change', applyFilters);
weightFilter.addEventListener('change', applyFilters);
yearFilter.addEventListener('change', applyFilters);
sourceFilter.addEventListener('change', applyFilters);
sortSelect.addEventListener('change', applyFilters);
ownedOnlyFilter.addEventListener('change', applyFilters);

compareBtn.addEventListener('click', () => {
    if (compareSet.size >= 2) {
        showCompare();
    } else if (compareSet.size === 1) {
        // Need at least 2
        compareMode = !compareMode;
        compareBtn.classList.toggle('active', compareMode);
    }
});

modalClose.addEventListener('click', () => detailModal.classList.remove('active'));
compareClose.addEventListener('click', () => compareModal.classList.remove('active'));

detailModal.addEventListener('click', e => {
    if (e.target === detailModal) detailModal.classList.remove('active');
});
compareModal.addEventListener('click', e => {
    if (e.target === compareModal) compareModal.classList.remove('active');
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        detailModal.classList.remove('active');
        compareModal.classList.remove('active');
    }
    // Variant navigation
    if (!detailModal.classList.contains('active') || !currentDetailId) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const mech = allMechs.find(m => getMechId(m) === currentDetailId);
        if (!mech) return;
        const variants = findVariants(mech);
        if (variants.length < 2) return;
        const idx = variants.findIndex(m => getMechId(m) === currentDetailId);
        const nextIdx = e.key === 'ArrowLeft'
            ? (idx - 1 + variants.length) % variants.length
            : (idx + 1) % variants.length;
        showDetail(getMechId(variants[nextIdx]));
    }
});

// Long press on card for compare mode on mobile
let pressTimer = null;
cardGrid.addEventListener('touchstart', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    pressTimer = setTimeout(() => {
        compareMode = true;
        compareBtn.classList.add('active');
        toggleCompare(card.dataset.mechId);
    }, 500);
});
cardGrid.addEventListener('touchend', () => clearTimeout(pressTimer));
cardGrid.addEventListener('touchmove', () => clearTimeout(pressTimer));

// Init
loadData();
