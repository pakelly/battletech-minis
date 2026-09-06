/* BattleTech Mini Collection App v1.3 */
const APP_VERSION = 'v1.4';
const DEPLOY_TIME = '20260906.1557';

let allMechs = [];
let filteredMechs = [];
let ownedSet = new Set();

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
const totalCount = document.getElementById('totalCount');
const ownedCount = document.getElementById('ownedCount');
const detailModal = document.getElementById('detailModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

// Weight class order for sorting
const WEIGHT_ORDER = { 'Light': 0, 'Medium': 1, 'Heavy': 2, 'Assault': 3, 'N/A': 4, 'Unknown': 5 };

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
            <div class="card ${owned ? 'owned' : ''}" data-mech-id="${id}">
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
            showDetail(id);
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

// Event Listeners
searchInput.addEventListener('input', applyFilters);
factionFilter.addEventListener('change', applyFilters);
weightFilter.addEventListener('change', applyFilters);
yearFilter.addEventListener('change', applyFilters);
sourceFilter.addEventListener('change', applyFilters);
sortSelect.addEventListener('change', applyFilters);
ownedOnlyFilter.addEventListener('change', applyFilters);

modalClose.addEventListener('click', () => detailModal.classList.remove('active'));

detailModal.addEventListener('click', e => {
    if (e.target === detailModal) detailModal.classList.remove('active');
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        detailModal.classList.remove('active');
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

// Init
loadData();
