// --- STATE MANAGEMENT ---
const state = {
  package: null,     // { id, name, price, limit, extraPageCost, ... }
  brandKit: false,
  industry: "",      // Stores user industry input
  pages: [],         // Array of page names
  addons: [],
  pagePlans: {}      // Stores Step 3 data: { "Home": { notes: "...", drawData: [...] } }
};

const BASE_BRAND_KIT_PRICE = 500;

// Industries & Suggestions DB
const SUGGESTION_DB = {
  "restaurant": ["Menu", "Reservations", "Events", "About Us", "Gallery", "Catering"],
  "boutique": ["Shop", "Lookbook", "About Us", "FAQ", "Press", "Returns"],
  "contractor": ["Services", "Projects", "Testimonials", "About Us", "Get Quote"],
  "hotel": ["Rooms", "Amenities", "Local Guide", "Booking", "Gallery"],
  "ecommerce": ["Shop All", "New Arrivals", "About", "Shipping Info", "Track Order"],
  "default": ["Home", "Contact", "About", "Services", "Gallery"]
};

// --- PERSISTENCE ---
function saveState() {
  localStorage.setItem('onboardingState', JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem('onboardingState');
  if (raw) Object.assign(state, JSON.parse(raw));
}

// --- NAVIGATION ---
function nextStep(stepNumber) {
  saveState();
  window.location.href = `step${stepNumber}.html`;
}

// --- STEP 2: PACKAGES & PAGE BUILDER ---
function selectPackage(id, name, price, limit, brandKitBundlePrice, extraPageCost, element) {
  document.querySelectorAll('.package-card').forEach(el => el.classList.remove('selected'));
  if (element) element.classList.add('selected');

  state.package = { id, name, price, limit, brandKitBundlePrice, extraPageCost };
  
  // Initialize default pages if empty
  if (state.pages.length === 0) {
    state.pages = ['Home', 'Contact'];
  }
  
  handlePackageSelected();
  calculateTotal();
  updateBrandKitDisplay();
  updatePageBuilderUI(); // Refresh page builder limits
  saveState();
}

function handlePackageSelected(isRestore) {
  const notice = document.getElementById('brandingLockedNotice');
  const unlocked = document.getElementById('brandingUnlocked');
  const pageBuilder = document.getElementById('pageBuilderSection');
  
  if (notice) notice.classList.add('hidden');
  if (unlocked) unlocked.classList.remove('hidden');
  if (pageBuilder) {
    pageBuilder.classList.remove('hidden');
    // Open page builder automatically if first time
    if (!isRestore) {
      const pbCol = document.querySelector('[data-key="step2-pages"]');
      if (pbCol) pbCol.classList.remove('collapsed');
    }
  }

  const branding = document.getElementById('brandingSection');
  if (branding && !isRestore) branding.classList.remove('collapsed');
  
  if (window.initCollapsibles) window.initCollapsibles(); 
}

// Page Builder Logic
function initPageBuilder() {
  const input = document.getElementById('industryInput');
  if (!input) return;

  // Render existing pages
  renderActivePages();

  input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      generateSuggestions(input.value);
      state.industry = input.value;
      saveState();
    }
  });

  if (state.industry) {
    input.value = state.industry;
    generateSuggestions(state.industry);
  }
}

function generateSuggestions(query) {
  const container = document.getElementById('suggestionChips');
  if (!container) return;
  
  container.innerHTML = '';
  let found = false;
  
  // Find matching key
  Object.keys(SUGGESTION_DB).forEach(key => {
    if (query.toLowerCase().includes(key)) {
      renderChips(SUGGESTION_DB[key], container);
      found = true;
    }
  });

  if (!found) renderChips(SUGGESTION_DB['default'], container);
}

function renderChips(pages, container) {
  pages.forEach(page => {
    const chip = document.createElement('div');
    chip.className = 'suggestion-chip';
    if (state.pages.includes(page)) chip.classList.add('added');
    chip.textContent = `+ ${page}`;
    chip.onclick = () => addPage(page);
    container.appendChild(chip);
  });
}

function addPage(nameRaw) {
  const input = document.getElementById('customPageInput');
  const name = nameRaw || input.value.trim();
  
  if (!name) return;
  if (!state.pages.includes(name)) {
    state.pages.push(name);
    if (input) input.value = '';
    renderActivePages();
    generateSuggestions(state.industry || ''); // Refresh chips status
    calculateTotal();
    saveState();
  }
}

function removePage(name) {
  state.pages = state.pages.filter(p => p !== name);
  renderActivePages();
  generateSuggestions(state.industry || '');
  calculateTotal();
  saveState();
}

function renderActivePages() {
  const list = document.getElementById('activePagesList');
  const countEl = document.getElementById('pageCountDisplay');
  const warning = document.getElementById('pageLimitWarning');
  
  if (!list || !state.package) return;
  
  list.innerHTML = '';
  state.pages.forEach(page => {
    const tag = document.createElement('div');
    tag.className = 'page-tag';
    tag.innerHTML = `${page} <span class="page-tag-remove" onclick="removePage('${page}')">&times;</span>`;
    list.appendChild(tag);
  });

  const limit = state.package.limit;
  const current = state.pages.length;
  if (countEl) countEl.textContent = `${current}/${limit}`;

  // Over limit logic
  if (current > limit) {
    const extra = current - limit;
    const cost = extra * state.package.extraPageCost;
    warning.innerHTML = `You are ${extra} page(s) over your limit. Added cost: <strong>$${cost}</strong>`;
    warning.classList.add('visible');
  } else {
    warning.classList.remove('visible');
  }
}

function updatePageBuilderUI() {
  renderActivePages();
}

// --- CALCULATION ---
function calculateTotal() {
  const fwItems = document.getElementById('fw-items');
  if (!fwItems) return;

  let html = '';
  let total = 0;

  if (state.package) {
    html += `<div class="fw-item"><span>${state.package.name}</span><span>$${state.package.price.toLocaleString()}</span></div>`;
    total += state.package.price;

    // Extra Pages
    if (state.pages.length > state.package.limit) {
      const extra = state.pages.length - state.package.limit;
      const extraCost = extra * state.package.extraPageCost;
      html += `<div class="fw-item"><span style="color:#ff6b6b">${extra} Extra Pages</span><span>$${extraCost.toLocaleString()}</span></div>`;
      total += extraCost;
    }
  }

  if (state.brandKit) {
    let kitPrice = BASE_BRAND_KIT_PRICE;
    let label = 'Brand Kit';
    if (state.package && state.package.brandKitBundlePrice) {
      kitPrice = Number(state.package.brandKitBundlePrice);
      label += ' (Bundled)';
    }
    html += `<div class="fw-item"><span>+ ${label}</span><span>$${kitPrice.toLocaleString()}</span></div>`;
    total += kitPrice;
  }

  state.addons.forEach(addon => {
    html += `<div class="fw-item"><span>+ ${addon.name}</span><span>$${Number(addon.price).toLocaleString()}</span></div>`;
    total += Number(addon.price) || 0;
  });

  if (!html) html = '<p class="empty-state">Select a package to start...</p>';
  fwItems.innerHTML = html;

  const headerTotalEl = document.getElementById('fw-header-total');
  if (headerTotalEl) headerTotalEl.textContent = `$${total.toLocaleString()}`;
  
  const fullTotalEl = document.getElementById('fw-full-total');
  if (fullTotalEl) fullTotalEl.textContent = `$${total.toLocaleString()}`;

  const depositEl = document.getElementById('fw-deposit');
  if (depositEl) depositEl.textContent = `$${(total / 2).toLocaleString()}`;
}

// --- STEP 3: PLAN & CANVAS LOGIC ---
function initStep3() {
  if (!document.body.classList.contains('step3')) return;
  
  const container = document.getElementById('planContainer');
  const pkgId = state.package ? state.package.id : 'basic';
  
  container.innerHTML = ''; // Clear

  if (pkgId === 'basic') {
    // BASIC: Notes only
    renderBasicPlan(container);
  } else if (pkgId === 'standard') {
    // STANDARD: Visual Mockups
    renderStandardPlan(container);
  } else if (pkgId === 'advanced') {
    // ADVANCED: Flowchart / Ecosystem
    renderAdvancedPlan(container);
  }
}

function renderBasicPlan(container) {
  state.pages.forEach((page, index) => {
    const noteVal = state.pagePlans[page]?.notes || '';
    const html = `
      <div class="plan-card">
        <div class="plan-card-header">
          <span>${index + 1}. ${page}</span>
        </div>
        <div class="plan-card-body">
          <label>Page Goals & Content Notes</label>
          <textarea rows="5" oninput="savePageNote('${page}', this.value)" placeholder="What should be on this page?">${noteVal}</textarea>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
  });
}

function renderStandardPlan(container) {
  const intro = `<div style="text-align:center; margin-bottom:30px;"><p>Use the drag-tool to sketch layout ideas for your pages.</p></div>`;
  container.insertAdjacentHTML('beforeend', intro);

  state.pages.forEach((page, index) => {
    const id = `canvas-${index}`;
    const html = `
      <div class="plan-card">
        <div class="plan-card-header">
          <span>${page} Layout</span>
        </div>
        <div class="plan-card-body">
          <div class="mockup-toolbar">
            <button class="tool-btn" onclick="setTool('${id}', 'rect')">⬜</button>
            <button class="tool-btn" onclick="setTool('${id}', 'text')">T</button>
            <button class="tool-btn" onclick="clearCanvas('${id}')">🗑️</button>
          </div>
          <canvas id="${id}" class="canvas-container"></canvas>
          <div style="margin-top:20px;">
            <label>Specific Requirements</label>
            <textarea rows="2" oninput="savePageNote('${page}', this.value)" placeholder="Notes...">${state.pagePlans[page]?.notes || ''}</textarea>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    
    // Init Canvas after render
    setTimeout(() => initCanvas(id, page), 100);
  });
}

function renderAdvancedPlan(container) {
  const intro = `<div style="text-align:center; margin-bottom:30px;">
    <h2>Ecosystem Map</h2>
    <p>Map out how your website connects to your business tools.</p>
  </div>`;
  container.insertAdjacentHTML('beforeend', intro);

  const html = `
    <div class="integration-row">
      <div class="plan-card">
        <div class="plan-card-header">System Flowchart</div>
        <div class="plan-card-body">
          <div class="mockup-toolbar">
            <button class="tool-btn" onclick="setTool('advancedCanvas', 'rect')">⬜</button>
            <button class="tool-btn" onclick="setTool('advancedCanvas', 'line')">🔗</button>
            <button class="tool-btn" onclick="clearCanvas('advancedCanvas')">🗑️</button>
          </div>
          <canvas id="advancedCanvas" class="canvas-container" style="height:600px;"></canvas>
        </div>
      </div>
      
      <div class="integration-list">
        <h4>Integrations</h4>
        <p style="font-size:0.8rem;">Drag ideas onto the map or list them here.</p>
        <div class="integration-item">Stripe / Payments</div>
        <div class="integration-item">Mailchimp</div>
        <div class="integration-item">Calendly</div>
        <div class="integration-item">Google Analytics</div>
        <div class="integration-item">Zapier</div>
        <hr style="border:0; border-top:1px solid var(--border-light); margin:15px 0;">
        <label>Technical Notes</label>
        <textarea rows="10" id="advancedNotes" oninput="saveAdvancedNotes(this.value)" placeholder="Describe complex logic here...">${state.advancedNotes || ''}</textarea>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', html);
  setTimeout(() => initCanvas('advancedCanvas', 'SYSTEM_FLOW'), 100);
}

function savePageNote(pageName, text) {
  if (!state.pagePlans[pageName]) state.pagePlans[pageName] = {};
  state.pagePlans[pageName].notes = text;
  saveState();
}

function saveAdvancedNotes(text) {
  state.advancedNotes = text;
  saveState();
}

// --- SIMPLE CANVAS LOGIC ---
// Very basic drawing tool for "Paint-like" feel
let activeTool = 'rect';
let isDrawing = false;
let startX, startY;

function setTool(canvasId, tool) {
  activeTool = tool;
  // Visual feedback for buttons could be added here
}

function initCanvas(canvasId, storageKey) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  
  // Resize logic
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;

  ctx.strokeStyle = '#2CA6E0';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(44, 166, 224, 0.1)';
  
  // Restore if exists (simplified for MVP - usually requires complex object storage)
  // For this demo, we won't fully persist canvas bitmap data as it gets huge in localStorage
  
  canvas.addEventListener('mousedown', e => {
    isDrawing = true;
    startX = e.offsetX;
    startY = e.offsetY;
  });

  canvas.addEventListener('mousemove', e => {
    if (!isDrawing) return;
    if (activeTool === 'rect') {
      // Simple preview (clearing messes up previous drawings in this simple implementation)
      // For a real paint tool, we'd need a secondary canvas layer or object list
    }
  });

  canvas.addEventListener('mouseup', e => {
    if (!isDrawing) return;
    isDrawing = false;
    const endX = e.offsetX;
    const endY = e.offsetY;
    
    ctx.beginPath();
    if (activeTool === 'rect') {
      ctx.rect(startX, startY, endX - startX, endY - startY);
      ctx.fill();
      ctx.stroke();
    } else if (activeTool === 'line') {
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    } else if (activeTool === 'text') {
      ctx.fillStyle = '#fff';
      ctx.font = '16px Montserrat';
      ctx.fillText('Content Block', startX, startY);
      ctx.fillStyle = 'rgba(44, 166, 224, 0.1)'; // Reset
    }
  });
}

function clearCanvas(id) {
  const canvas = document.getElementById(id);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// --- SHARED UTILS ---
function toggleBrandKit(element) {
  state.brandKit = !state.brandKit;
  if (element) element.classList.toggle('selected', state.brandKit);
  calculateTotal();
  updateBrandKitDisplay();
  saveState();
}

function updateBrandKitDisplay() {
  const bar = document.getElementById('brand-kit-bar');
  if (!bar) return;
  const ogPriceEl = bar.querySelector('.og-price');
  const discountLabelEl = bar.querySelector('.discount-label');
  const finalPriceEl = bar.querySelector('.final-price');
  if (!finalPriceEl) return;

  const hasBundle = !!(state.package && state.package.brandKitBundlePrice);
  const displayPrice = hasBundle ? Number(state.package.brandKitBundlePrice) : BASE_BRAND_KIT_PRICE;

  if (hasBundle && displayPrice !== BASE_BRAND_KIT_PRICE) {
    if (ogPriceEl) { ogPriceEl.textContent = `$${BASE_BRAND_KIT_PRICE.toLocaleString()}`; ogPriceEl.style.display = 'inline'; }
    if (discountLabelEl) discountLabelEl.style.display = 'block';
  } else {
    if (ogPriceEl) ogPriceEl.style.display = 'none';
    if (discountLabelEl) discountLabelEl.style.display = 'none';
  }
  finalPriceEl.textContent = `$${displayPrice.toLocaleString()}`;
  bar.classList.toggle('selected', !!state.brandKit);
}

function toggleWidget() {
  const widget = document.getElementById('floating-widget');
  if (widget) widget.classList.toggle('collapsed');
}

function togglePackageDetails(buttonEl) {
  const card = buttonEl.closest('.package-card');
  if (card) {
    const expanded = card.classList.toggle('expanded');
    buttonEl.textContent = expanded ? 'Close Details' : 'View Details';
  }
}

function initCollapsibles() {
  const sections = document.querySelectorAll('[data-collapsible]');
  sections.forEach(section => {
    const header = section.querySelector('[data-collapsible-header]');
    if (!header || header.hasAttribute('data-has-listener')) return;
    header.setAttribute('data-has-listener', 'true');
    header.addEventListener('click', (e) => {
      e.preventDefault();
      section.classList.toggle('collapsed');
    });
  });
}

// Global Init
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initCollapsibles();
  if (window.location.pathname.includes('step2')) {
    initPageBuilder();
    if(state.package) handlePackageSelected(true);
  }
  if (window.location.pathname.includes('step3')) initStep3();
  calculateTotal();
  updateBrandKitDisplay();
});
