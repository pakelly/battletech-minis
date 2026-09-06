/* BattleTech Mini Collection App v1.5 */
const APP_VERSION = 'v1.5';
const DEPLOY_TIME = '20260905.1733';

let allMechs = [];

// Filter elements
const searchInput = document.getElementById('searchInput');
const sourceFilter = document.getElementById('sourceFilter');
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

function escapeAttr(s) {
    return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function unescapeAttr(s) {
    return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}

let filteredMechs = [];

function applyFilters() {
    const search = searchInput.value.toLowerCase().trim();
    const source = sourceFilter.value;

    let filtered = allMechs.filter(m => {
        const nameMatch = m.name.toLowerCase().includes(search);
        const altMatch = m.altName && m.altName.toLowerCase().includes(search);
        const titleMatch = m.title && m.title.toLowerCase().includes(search);
        const sourceMatch = (m.source || '').toLowerCase().includes(search);
        if (!nameMatch && !altMatch && !titleMatch && !sourceMatch) return false;
        if (source && m.source !== source) return false;
        return true;
    });

    // Sort by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    filteredMechs = filtered;
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
            <div class="card" data-mech-id="${escapeAttr(id)}">
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
    id = unescapeAttr(id);
    const mech = allMechs.find(m => getMechId(m) === id);
    if (!mech) return;

    const currentIdx = filteredMechs.findIndex(m => getMechId(m) === id);
    const prevMech = currentIdx > 0 ? filteredMechs[currentIdx - 1] : null;
    const nextMech = currentIdx < filteredMechs.length - 1 ? filteredMechs[currentIdx + 1] : null;

    const imgSrc = mech.imageUrl || '';
    const sources = [mech.source].filter(s => s);
    const sourcesHtml = sources.map(s => `<li>${s}</li>`).join('');

    modalBody.innerHTML = `
        <div class="detail-nav">
            ${prevMech ? `<button class="nav-btn nav-prev" onclick="showDetail('${escapeAttr(getMechId(prevMech))}')">‹ Prev</button>` : `<button class="nav-btn nav-prev" disabled>‹ Prev</button>`}
            <span class="nav-counter">${currentIdx + 1} / ${filteredMechs.length}</span>
            ${nextMech ? `<button class="nav-btn nav-next" onclick="showDetail('${escapeAttr(getMechId(nextMech))}')">Next ›</button>` : `<button class="nav-btn nav-next" disabled>Next ›</button>`}
        </div>
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
    modalBody.scrollTop = 0;
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
sourceFilter.addEventListener('change', applyFilters);

// Card click delegation (avoids inline onclick with apostrophe issues)
cardGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (card) {
        const id = card.getAttribute('data-mech-id');
        if (id) showDetail(id);
    }
});

// Keyboard navigation in detail view
document.addEventListener('keydown', (e) => {
    if (!detailModal.classList.contains('active')) return;
    if (e.key === 'ArrowLeft') {
        const prev = document.querySelector('.nav-prev');
        if (prev && !prev.disabled) prev.click();
    } else if (e.key === 'ArrowRight') {
        const next = document.querySelector('.nav-next');
        if (next && !next.disabled) next.click();
    } else if (e.key === 'Escape') {
        detailModal.classList.remove('active');
    }
});

// Init
loadData();
