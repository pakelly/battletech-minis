/* BattleTech Mini Collection App v1.5 */
const APP_VERSION = 'v1.5';
const DEPLOY_TIME = '20260905.1733';

let allMechs = [];

// Filter elements
const searchInput = document.getElementById('searchInput');
const factionFilter = document.getElementById('factionFilter');
const weightFilter = document.getElementById('weightFilter');
const yearFilter = document.getElementById('yearFilter');
const sourceFilter = document.getElementById('sourceFilter');
const sortSelect = document.getElementById('sortSelect');
const cardGrid = document.getElementById('cardGrid');
const totalCount = document.getElementById('totalCount');

// Detail modal elements
const detailModal = document.getElementById('detailModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

async function loadData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        allMechs = data.mechs;

        // Populate year filter
        const years = [...new Set(allMechs.map(m => m.year).filter(y => y))].sort((a, b) => a - b);
        years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearFilter.appendChild(opt);
        });

        // Populate source filter
        const sources = [...new Set(allMechs.map(m => m.source).filter(s => s))].sort();
        sources.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            sourceFilter.appendChild(opt);
        });

        applyFilters();
    } catch (err) {
        console.error('Failed to load data:', err);
        cardGrid.innerHTML = '<p>Failed to load mini data.</p>';
    }
}

function getMechId(m) {
    return `${m.name}|${m.source || ''}|${m.model || ''}`;
}

function applyFilters() {
    const search = searchInput.value.toLowerCase().trim();
    const faction = factionFilter.value;
    const weight = weightFilter.value;
    const year = yearFilter.value;
    const source = sourceFilter.value;
    const sort = sortSelect.value;

    let filtered = allMechs.filter(m => {
        const nameMatch = m.name.toLowerCase().includes(search);
        const altMatch = m.altName && m.altName.toLowerCase().includes(search);
        const titleMatch = m.title && m.title.toLowerCase().includes(search);
        const sourceMatch = (m.source || '').toLowerCase().includes(search);
        if (!nameMatch && !altMatch && !titleMatch && !sourceMatch) return false;
        if (faction && m.faction !== faction) return false;
        if (weight && m.weightClass !== weight) return false;
        if (year && m.year != year) return false;
        if (source && m.source !== source) return false;
        return true;
    });

    // Sort
    const weightOrder = { Light: 0, Medium: 1, Heavy: 2, Assault: 3, 'N/A': 4 };
    filtered.sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'year') return (a.year || 0) - (b.year || 0);
        if (sort === 'weightClass') return (weightOrder[a.weightClass] ?? 5) - (weightOrder[b.weightClass] ?? 5);
        if (sort === 'faction') return (a.faction || '').localeCompare(b.faction || '');
        return 0;
    });

    renderCards(filtered);
    totalCount.textContent = `${filtered.length} minis`;
}

function renderCards(mechs) {
    cardGrid.innerHTML = mechs.map(mech => {
        const id = getMechId(mech);
        const imgSrc = mech.imageUrl || '';
        const imgFallback = mech.imageFile || '';
        const sourceLabel = mech.source || '';

        return `
            <div class="card" data-mech-id="${id}" onclick="showDetail('${id}')">
                <div class="card-image">
                    ${imgSrc ? `<img src="${imgSrc}" alt="${mech.name}" loading="lazy" onerror="this.style.display='none'">` : ''}
                </div>
                <div class="card-info">
                    <div class="card-name">${mech.altName ? mech.name + ' (' + mech.altName + ')' : mech.name}</div>
                    <div class="card-source">${sourceLabel}</div>
                </div>
            </div>
        `;
    }).join('');
}

function showDetail(id) {
    const mech = allMechs.find(m => getMechId(m) === id);
    if (!mech) return;

    const imgSrc = mech.imageUrl || '';
    const sources = [mech.source].filter(s => s);
    const sourcesHtml = sources.map(s => `<li>${s}</li>`).join('');

    modalBody.innerHTML = `
        <div class="detail-header">
            <h2>${mech.altName ? mech.name + ' (' + mech.altName + ')' : mech.name}</h2>
        </div>
        ${imgSrc ? `<img src="${imgSrc}" alt="${mech.name}" class="detail-image" onerror="this.style.display='none'">` : ''}
        <div class="detail-meta">
            <div class="detail-row"><span class="detail-label">Model</span><span>${mech.model || '—'}</span></div>
            <div class="detail-row"><span class="detail-label">Faction</span><span>${mech.faction || '—'}</span></div>
            <div class="detail-row"><span class="detail-label">Weight</span><span>${mech.weightClass || '—'}</span></div>
            <div class="detail-row"><span class="detail-label">Year</span><span>${mech.year || '—'}</span></div>
            <div class="detail-row"><span class="detail-label">Base #</span><span>${mech.baseNumber || '—'}</span></div>
            <div class="detail-row"><span class="detail-label">Catalog #</span><span>${mech.catalogNumber || '—'}</span></div>
            <div class="detail-row"><span class="detail-label">Manufacturer</span><span>${mech.manufacturer || '—'}</span></div>
            <div class="detail-row"><span class="detail-label">Material</span><span>${mech.material || '—'}</span></div>
            <div class="detail-row"><span class="detail-label">Parts</span><span>${mech.parts || '—'}</span></div>
            ${mech.source ? `<div class="detail-source">${mech.source}</div>` : ''}
            <ul class="detail-sources">${sourcesHtml || '<li>—</li>'}</ul>
        </div>
    `;

    detailModal.classList.add('active');
}

modalClose.addEventListener('click', () => {
    detailModal.classList.remove('active');
});

detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
        detailModal.classList.remove('active');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        detailModal.classList.remove('active');
    }
});

// Event listeners
searchInput.addEventListener('input', applyFilters);
factionFilter.addEventListener('change', applyFilters);
weightFilter.addEventListener('change', applyFilters);
yearFilter.addEventListener('change', applyFilters);
sourceFilter.addEventListener('change', applyFilters);
sortSelect.addEventListener('change', applyFilters);

// Init
loadData();
