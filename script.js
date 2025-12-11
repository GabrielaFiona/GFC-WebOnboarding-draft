// --- STATE MANAGEMENT ---
const state = {
    package: null,   // { id, name, price, includedPages, brandKitBundlePrice }
    brandKit: false, // Boolean: true if selected
    pages: [],       // Array of strings (Page Names)
    addons: []       // Array of { id, name, price }
};

const EXTRA_PAGE_COST = 150; // Base rate, will be dynamic later
const BASE_BRAND_KIT_PRICE = 500; // Standalone price for Brand Kit

// --- PACKAGE SELECTION ---
function selectPackage(id, name, price, includedPages, brandKitBundlePrice, element) {
    // 1. Visual selection
    document.querySelectorAll('.package-card').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    // 2. Update State
    state.package = { 
        id, 
        name, 
        price, 
        includedPages, 
        brandKitBundlePrice // New property to store the bundled price
    };

    // 3. Update UI text
    document.getElementById('included-pages-count').innerText = includedPages;
    document.getElementById('addons-section').classList.remove('hidden');

    // 4. Smooth scroll to addons
    setTimeout(() => {
        document.getElementById('addons-section').scrollIntoView({ behavior: 'smooth' });
    }, 200);

    // 5. Open invoice if closed
    const widget = document.getElementById('floating-widget');
    if(widget.classList.contains('collapsed')) {
        widget.classList.remove('collapsed');
    }

    // Recalculate everything, including potentially bundled Brand Kit price
    calculateTotal();
}

// --- BRAND KIT LOGIC (NEW) ---
function toggleBrandKit(element) {
    state.brandKit = !state.brandKit;
    element.classList.toggle('selected', state.brandKit);
    
    // Update the UI price display on the bar
    updateBrandKitDisplay();
    
    calculateTotal();
}

function updateBrandKitDisplay() {
    const bar = document.getElementById('brand-kit-bar');
    const ogPriceEl = bar.querySelector('.og-price');
    const discountLabelEl = bar.querySelector('.discount-label');
    const finalPriceEl = bar.querySelector('.final-price');

    if (state.brandKit && state.package && state.package.brandKitBundlePrice) {
        // Bundled Price Display
        const bundledPrice = state.package.brandKitBundlePrice;
        ogPriceEl.innerText = `$${BASE_BRAND_KIT_PRICE.toLocaleString()}`;
        finalPriceEl.innerText = `$${bundledPrice.toLocaleString()}`;

        ogPriceEl.style.display = 'inline';
        discountLabelEl.style.display = 'block';
    } else {
        // Standard Price Display or Not Selected
        finalPriceEl.innerText = `$${BASE_BRAND_KIT_PRICE.toLocaleString()}`;
        ogPriceEl.style.display = 'none';
        discountLabelEl.style.display = 'none';
    }
}


// --- PAGE BUILDER LOGIC (Simplified for Step 2 for now, we'll update extra page costs later) ---
function addPage() {
    const input = document.getElementById('newPageName');
    const name = input.value.trim();

    if (name) {
        state.pages.push(name);
        input.value = ''; // Clear input
        renderPageList();
        calculateTotal();
    }
}

function removePage(index) {
    state.pages.splice(index, 1);
    renderPageList();
    calculateTotal();
}

function handleEnter(e) {
    if (e.key === 'Enter') addPage();
}

function renderPageList() {
    const list = document.getElementById('page-list');
    if (!list) return; // Guard for Step 1
    
    list.innerHTML = ''; // Clear current list

    state.pages.forEach((page, index) => {
        const div = document.createElement('div');
        div.className = 'page-item';
        div.innerHTML = `
            ${page}
            <span class="remove-page" onclick="removePage(${index})">&times;</span>
        `;
        list.appendChild(div);
    });

    const totalPageCountEl = document.getElementById('total-page-count');
    if (totalPageCountEl) totalPageCountEl.innerText = state.pages.length;
}

// --- ADDONS LOGIC ---
function toggleAddon(id, name, price, element) {
    element.classList.toggle('selected');
    
    if (element.classList.contains('selected')) {
        state.addons.push({ id, name, price });
    } else {
        state.addons = state.addons.filter(a => a.id !== id);
    }
    calculateTotal();
}

// --- INVOICE CALCULATION (Updated to handle Brand Kit) ---
function calculateTotal() {
    const fwItems = document.getElementById('fw-items');
    let html = '';
    let total = 0;
    let extraCost = 0;

    // 1. Base Package
    if (state.package) {
        html += `<div class="fw-item"><span>${state.package.name}</span><span>$${state.package.price.toLocaleString()}</span></div>`;
        total += state.package.price;
    }

    // 2. Brand Kit Check
    if (state.brandKit) {
        let kitPrice = BASE_BRAND_KIT_PRICE;
        let kitLabel = "Brand Kit";
        
        // If a package is selected and has a bundle price, use it
        if (state.package && state.package.brandKitBundlePrice) {
            kitPrice = state.package.brandKitBundlePrice;
            kitLabel += " (Bundled Price)";
        }
        
        html += `<div class="fw-item"><span>+ ${kitLabel}</span><span>$${kitPrice.toLocaleString()}</span></div>`;
        total += kitPrice;
        
        // Ensure the visual price display is updated if package changes
        updateBrandKitDisplay(); 
    }

    // 3. Extra Pages Calculation
    // NOTE: For now, we use a constant EXTRA_PAGE_COST. We'll update this in the next steps 
    // to use the package-specific costs you provided (150, 175, 200).
    if (state.package) {
        const extraPages = Math.max(0, state.pages.length - state.package.includedPages);
        if (extraPages > 0) {
            extraCost = extraPages * EXTRA_PAGE_COST;
            html += `<div class="fw-item"><span>Extra Pages (${extraPages} x $${EXTRA_PAGE_COST})</span><span>$${extraCost.toLocaleString()}</span></div>`;
            total += extraCost;
        } 
    }

    // Update UI tag (Only exists on Step 2)
    const tag = document.getElementById('extra-page-cost');
    if (tag) {
        if (extraCost > 0) {
            tag.style.display = 'inline';
            tag.innerText = `+ Extra Cost: $${extraCost}`;
        } else {
            tag.style.display = 'none';
        }
    }

    // 4. Add-ons
    state.addons.forEach(addon => {
        html += `<div class="fw-item"><span>+ ${addon.name}</span><span>$${addon.price.toLocaleString()}</span></div>`;
        total += addon.price;
    });

    // Render
    if (html === '') html = '<p class="empty-state">Select a package to start...</p>';
    fwItems.innerHTML = html;

    // Update Floating Widget totals
    const headerTotalEl = document.getElementById('fw-header-total');
    if(headerTotalEl) headerTotalEl.innerText = '$' + total.toLocaleString();

    const fullTotalEl = document.getElementById('fw-full-total');
    if(fullTotalEl) fullTotalEl.innerText = '$' + total.toLocaleString();

    const depositEl = document.getElementById('fw-deposit');
    if(depositEl) depositEl.innerText = '$' + (total / 2).toLocaleString();
}

function toggleWidget() {
    document.getElementById('floating-widget').classList.toggle('collapsed');
}
