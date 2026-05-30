/* ======================================================
   app.js — Main App Controller (Navigation, Init)
   Noori Cyber Cafe & Noori Perfume
   ====================================================== */

// Expose global functions for modal onclicks after publish
window.closeReceipt     = () => closeReceipt();
window.seedSampleData   = () => seedSampleData();
window.viewSaleReceipt  = (...a) => viewSaleReceipt(...a);

const PAGE_TITLES = {
  dashboard:        '🏠 Dashboard',
  pos:              '🛒 POS / Billing',
  inventory:        '📦 Inventory',
  'perfume-creator':'🧪 Perfume Creator',
  purchases:        '🚚 Purchases',
  suppliers:        '🤝 Suppliers',
  customers:        '👥 Customers',
  khata:            '📒 Khata Ledger',
  recharge:         '📱 Mobile Recharge & DTH',
  banking:          '🏦 Airtel Payment Bank',
  expenses:         '💸 Daily Expenses',
  notes:            '📝 Quick Notes',
  'sales-history':  '🧾 Sales History',
  analytics:        '📈 Analytics'
};

const PAGE_LOADERS = {
  dashboard:        loadDashboard,
  pos:              () => { loadPOSProducts(); loadPOSCustomers(); },
  inventory:        loadInventory,
  'perfume-creator':() => { loadRecipes(); wireRecipeCustomerAutocomplete(); },
  purchases:        loadPurchases,
  suppliers:        loadSuppliers,
  customers:        loadCustomers,
  khata:            loadKhata,
  recharge:         loadRecharges,
  banking:          loadBanking,
  expenses:         loadExpenses,
  notes:            loadNotes,
  'sales-history':  loadSalesHistory,
  analytics:        loadAnalytics
};

let currentPage = 'dashboard';

function navigateTo(page) {
  if (!document.getElementById(`page-${page}`)) return;

  // Animate out old page
  const oldPage = document.querySelector('.page.active');
  if (oldPage) oldPage.classList.remove('active');

  // Show new page with animation
  const newPage = document.getElementById(`page-${page}`);
  newPage.classList.add('active', 'page-enter');
  setTimeout(() => newPage.classList.remove('page-enter'), 400);

  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`.nav-item[data-page="${page}"]`).forEach(n => n.classList.add('active'));

  // Update title
  document.getElementById('page-title').textContent = PAGE_TITLES[page] || page;

  currentPage = page;

  if (PAGE_LOADERS[page]) PAGE_LOADERS[page]();

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.add('hidden');
}

// Sales History
async function loadSalesHistory() {
  const res = await API.get('sales');
  const sales = (res.data || []).sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
  renderSalesHistoryTable(sales);
}

function renderSalesHistoryTable(sales) {
  const tbody = document.getElementById('sales-tbody');
  if (!sales.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">No sales recorded yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = sales.map(s => {
    const items = safeJSON(s.items, []);
    const payBadge = s.payment_method === 'khata' ? 'badge-red' : s.payment_method === 'upi' ? 'badge-blue' : s.payment_method === 'card' ? 'badge-purple' : 'badge-green';
    return `<tr>
      <td style="font-weight:700;color:var(--primary)">${esc(s.invoice_no||'—')}</td>
      <td>${fmtDate(s.sale_date)}</td>
      <td>${esc(s.customer_name||'Walk-in')}</td>
      <td>
        <span title="${items.map(i => i.name+' ×'+i.qty).join(', ')}" style="cursor:help">
          ${items.length} item${items.length!==1?'s':''} <i class="fas fa-info-circle" style="color:var(--text-3)"></i>
        </span>
      </td>
      <td style="font-weight:700">${fmt(s.total_amount)}</td>
      <td><span class="badge ${payBadge}">${s.payment_method||'cash'}</span></td>
      <td>
        <button class="btn-icon" onclick="viewSaleReceipt('${s.id}')" title="View Receipt"><i class="fas fa-receipt"></i></button>
      </td>
    </tr>`;
  }).join('');
}

async function viewSaleReceipt(saleId) {
  const res = await API.getOne('sales', saleId);
  if (!res) return;
  showReceipt({
    ...res,
    items: safeJSON(res.items, []),
    subtotal: res.subtotal,
    discount: res.discount,
    total: res.total_amount,
    invoiceNo: res.invoice_no,
    saleDate: res.sale_date
  });
}

// Sales search & filter
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sale-search').addEventListener('input', async () => {
    const q = document.getElementById('sale-search').value.toLowerCase();
    const from = document.getElementById('sale-date-from').value;
    const to   = document.getElementById('sale-date-to').value;
    const res  = await API.get('sales');
    const filtered = (res.data || []).filter(s =>
      (!q || (s.customer_name||'').toLowerCase().includes(q) || (s.invoice_no||'').toLowerCase().includes(q)) &&
      (!from || s.sale_date >= from) &&
      (!to   || s.sale_date <= to + 'T23:59:59')
    ).sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
    renderSalesHistoryTable(filtered);
  });
  ['sale-date-from','sale-date-to'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      document.getElementById('sale-search').dispatchEvent(new Event('input'));
    });
  });
});

// ==================== NAVIGATION WIRING ====================
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  // Any element with data-page (quick actions, etc.)
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-page]');
    if (link && !link.classList.contains('nav-item') && link.tagName !== 'A') {
      e.preventDefault();
      navigateTo(link.dataset.page);
    } else if (link && link.tagName === 'A' && !link.classList.contains('nav-item')) {
      e.preventDefault();
      navigateTo(link.dataset.page);
    }
  });

  // Sidebar collapse
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.body.classList.toggle('sidebar-collapsed');
  });

  // Mobile menu
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('hidden');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.add('hidden');
  });

  // Live clock
  const updateClock = () => {
    const el = document.getElementById('clock');
    if (el) {
      const now = new Date();
      el.textContent = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    }
  };
  updateClock();
  setInterval(updateClock, 1000);

  // Start splash → then navigate dashboard
  initSplash();
});

// ==================== SPLASH SCREEN ====================
function initSplash() {
  const splash = document.getElementById('splash-screen');
  setTimeout(() => {
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
        navigateTo('dashboard');
        checkSeedNeeded();
      }, 600);
    }
  }, 2200); // 2.2 seconds splash display
}

// ==================== RECEIPT (overrides pos.js version with Noori branding) ====================
function showReceipt(sale) {
  const items = Array.isArray(sale.items) ? sale.items : safeJSON(sale.items, []);
  const date = new Date(sale.saleDate || sale.sale_date).toLocaleString('en-IN');
  let html = `
    <div class="receipt-noori-header">
      <div class="receipt-noori-name">نوری Noori</div>
      <div class="receipt-noori-sub">Noori Cyber Cafe &amp; Noori Perfume</div>
      <div style="font-size:.72rem;color:var(--text-3);margin-top:4px">📍 Your Trusted Neighborhood Shop</div>
    </div>
    <div style="font-size:.75rem;color:var(--text-2);margin-bottom:10px">
      <div>Invoice: <strong style="color:var(--primary)">${esc(sale.invoice_no||sale.invoiceNo)}</strong></div>
      <div>${date}</div>
      <div>Customer: <strong>${esc(sale.customer_name||'Walk-in Customer')}</strong></div>
    </div>
    <hr class="receipt-divider" />
    ${items.map(i => `
      <div class="receipt-line">
        <span>${esc(i.name)} ×${i.qty}</span>
        <span>${fmt(i.price * i.qty)}</span>
      </div>`).join('')}
    <hr class="receipt-divider" />
    <div class="receipt-line"><span>Subtotal</span><span>${fmt(sale.subtotal)}</span></div>
    ${(sale.discount||0) > 0 ? `<div class="receipt-line" style="color:var(--green)"><span>Discount</span><span>−${fmt(sale.discount)}</span></div>` : ''}
    ${(sale.points_redeemed||0) > 0 ? `<div class="receipt-line" style="color:var(--blue)"><span>Points Redeemed</span><span>−${fmt(sale.points_redeemed)}</span></div>` : ''}
    <div class="receipt-total-line"><span>TOTAL</span><span>${fmt(sale.total||sale.total_amount)}</span></div>
    <div class="receipt-line" style="font-size:.72rem;color:var(--text-3)"><span>Payment</span><span>${(sale.payment_method||'cash').toUpperCase()}</span></div>
    ${(sale.points_earned||0) > 0 ? `<div style="text-align:center;margin-top:10px;background:var(--primary-light);border-radius:8px;padding:8px;font-size:.78rem;color:var(--primary);font-weight:700">🌟 +${fmtN(sale.points_earned)} Noori Loyalty Points Earned!</div>` : ''}
    <hr class="receipt-divider" />
    <div style="text-align:center;font-size:.72rem;color:var(--text-3);line-height:1.8">
      شکریہ! Thank you for visiting Noori Shop!<br>
      Come again soon 😊🌿<br>
      <span style="color:var(--primary);font-weight:700">نوری — Quality you can trust</span>
    </div>`;
  document.getElementById('receipt-content').innerHTML = html;
  document.getElementById('receipt-modal').classList.remove('hidden');
}

function closeReceipt() {
  document.getElementById('receipt-modal').classList.add('hidden');
}

// ==================== SEED DATA ====================
async function seedSampleData() {
  toast('Loading Noori sample data…', 'info');

  // Suppliers
  const sRes = await API.get('suppliers');
  if (!(sRes.data||[]).length) {
    await API.post('suppliers', { name: 'Al-Noor Attar Traders', contact_person: 'Shahid Bhai', phone: '9876543210', category: 'Attar / Perfume', address: 'Kannauj, UP', notes: 'Best quality raw attar, 3-day delivery', active: true });
    await API.post('suppliers', { name: 'Noori Bottle House', contact_person: 'Rafiq Bhai', phone: '9988776655', category: 'Bottles & Packaging', address: 'Sadar Bazar, Delhi', notes: '6ml, 12ml, 50ml bottles available', active: true });
    await API.post('suppliers', { name: 'Mobile Zone Wholesale', contact_person: 'Ravi Kumar', phone: '9123456789', category: 'Mobile Accessories', address: 'Nehru Place, Delhi', notes: 'Min order ₹500. Good quality covers.', active: true });
    await API.post('suppliers', { name: 'Airtel Business', contact_person: 'Customer Care', phone: '121', category: 'Internet / ISP', address: 'Online', notes: 'Monthly broadband bill ₹899', active: true });
  }

  // Inventory
  const iRes = await API.get('inventory');
  if (!(iRes.data||[]).length) {
    const items = [
      { name: 'Mitti Attar', category: 'attar_bulk', unit: 'ml', stock_qty: 500, low_stock_threshold: 50, cost_price: 1.2, sell_price: 3, description: 'Earthy petrichor – very popular in monsoon', active: true },
      { name: 'Majmua Attar', category: 'attar_bulk', unit: 'ml', stock_qty: 300, low_stock_threshold: 30, cost_price: 2.5, sell_price: 6, description: 'Classic Kannauj blend', active: true },
      { name: 'Oud Al-Maliki', category: 'attar_bulk', unit: 'tola', stock_qty: 20, low_stock_threshold: 3, cost_price: 400, sell_price: 800, description: 'Premium Oud – bestseller', active: true },
      { name: 'Rose Attar', category: 'attar_bulk', unit: 'ml', stock_qty: 250, low_stock_threshold: 25, cost_price: 3, sell_price: 8, description: 'Pure Desi Gulab', active: true },
      { name: 'Sandal Attar', category: 'attar_bulk', unit: 'ml', stock_qty: 180, low_stock_threshold: 20, cost_price: 2, sell_price: 5, description: 'Mysore sandalwood base', active: true },
      { name: 'Noori Signature – 6ml Roll-on', category: 'attar_variant', unit: 'piece', stock_qty: 30, low_stock_threshold: 5, cost_price: 20, sell_price: 55, variant_label: '6ml Roll-on', volume_ml: 6, active: true },
      { name: 'Mitti – 3ml Roll-on', category: 'attar_variant', unit: 'piece', stock_qty: 20, low_stock_threshold: 5, cost_price: 12, sell_price: 35, variant_label: '3ml Roll-on', volume_ml: 3, active: true },
      { name: 'Majmua – 12ml Spray', category: 'attar_variant', unit: 'piece', stock_qty: 15, low_stock_threshold: 5, cost_price: 60, sell_price: 149, variant_label: '12ml Spray', volume_ml: 12, active: true },
      { name: 'Tempered Glass (iPhone 14)', category: 'mobile_accessory', unit: 'piece', stock_qty: 8, low_stock_threshold: 10, cost_price: 20, sell_price: 80, barcode: '8901234567890', active: true },
      { name: 'Type-C Charging Cable', category: 'mobile_accessory', unit: 'piece', stock_qty: 25, low_stock_threshold: 5, cost_price: 50, sell_price: 149, active: true },
      { name: 'Samsung A54 Back Cover', category: 'mobile_accessory', unit: 'piece', stock_qty: 15, low_stock_threshold: 5, cost_price: 40, sell_price: 129, active: true },
      { name: 'Earphones (Type-C)', category: 'mobile_accessory', unit: 'piece', stock_qty: 10, low_stock_threshold: 3, cost_price: 80, sell_price: 249, active: true },
      { name: 'Color Printout (A4)', category: 'cyber_service', unit: 'service', stock_qty: 999, low_stock_threshold: 999, cost_price: 2, sell_price: 10, active: true },
      { name: 'B&W Printout (A4)', category: 'cyber_service', unit: 'service', stock_qty: 999, low_stock_threshold: 999, cost_price: 0.5, sell_price: 3, active: true },
      { name: 'Lamination (A4)', category: 'cyber_service', unit: 'service', stock_qty: 999, low_stock_threshold: 999, cost_price: 8, sell_price: 25, active: true },
      { name: 'Photocopy', category: 'cyber_service', unit: 'service', stock_qty: 999, low_stock_threshold: 999, cost_price: 0.5, sell_price: 2, active: true },
      { name: 'Photo Print (4×6)', category: 'cyber_service', unit: 'service', stock_qty: 999, low_stock_threshold: 999, cost_price: 5, sell_price: 20, active: true },
      { name: 'Scanning (per page)', category: 'cyber_service', unit: 'service', stock_qty: 999, low_stock_threshold: 999, cost_price: 1, sell_price: 5, active: true },
    ];
    for (const item of items) await API.post('inventory', item);
  }

  // Customers
  const cRes = await API.get('customers');
  if (!(cRes.data||[]).length) {
    await API.post('customers', { name: 'Ahmed Khan', phone: '9876501234', loyalty_points: 150, khata_balance: 0, total_spent: 1500, notes: 'Prefers Oud-based attars. Regular customer.', active: true });
    await API.post('customers', { name: 'Priya Sharma', phone: '9876509876', loyalty_points: 80, khata_balance: 250, total_spent: 800, notes: 'Comes for cyber cafe services', active: true });
    await API.post('customers', { name: 'Rajan Mehta', phone: '9123400001', loyalty_points: 0, khata_balance: 500, total_spent: 300, notes: 'Has pending khata – remind on WhatsApp', active: true });
    await API.post('customers', { name: 'Fatima Begum', phone: '9988001122', loyalty_points: 220, khata_balance: 0, total_spent: 2200, notes: 'Loves Mitti and Rose blend', active: true });
  }

  // Sample expense
  const eRes = await API.get('expenses');
  if (!(eRes.data||[]).length) {
    await API.post('expenses', { expense_date: todayStr(), category: 'internet', description: 'Airtel broadband monthly bill', amount: 899, paid_via: 'upi', notes: 'Auto-pay on 5th' });
    await API.post('expenses', { expense_date: todayStr(), category: 'electricity', description: 'Electricity bill – June', amount: 1200, paid_via: 'cash', notes: '' });
  }

  // Sample note
  const nRes = await API.get('shop_notes');
  if (!(nRes.data||[]).length) {
    await API.post('shop_notes', { title: 'Order Oud Al-Maliki – stock low!', body: 'Call Shahid Bhai: 9876543210\nOrder at least 30 tola.\nLast rate: ₹400/tola.', priority: 'urgent', created_date: new Date().toISOString(), done: false });
    await API.post('shop_notes', { title: 'Tempered glass stock low for iPhone 14', body: 'Only 8 pieces left. Order from Mobile Zone.', priority: 'normal', created_date: new Date().toISOString(), done: false });
    await API.post('shop_notes', { title: 'Noori Perfume Recipe Competition – Eid special', body: 'Prepare 5 new custom blends before Eid. Use Rose + Oud base.', priority: 'info', created_date: new Date().toISOString(), done: false });
  }

  toast('✅ Noori sample data loaded! Explore your shop 🎉', 'success');

  // Reload all modules
  await loadInventory();
  await loadSuppliers();
  await loadCustomers();
  loadDashboard();
}

async function checkSeedNeeded() {
  const res = await API.get('inventory');
  if ((res.data||[]).length === 0) {
    const banner = document.createElement('div');
    banner.id = 'seed-banner';
    banner.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#1e1b4b,#4338ca);color:#fff;padding:16px 24px;border-radius:14px;box-shadow:0 8px 32px rgba(91,79,207,.4);display:flex;align-items:center;gap:14px;z-index:8000;font-size:.85rem;max-width:90vw;animation:slideDown .4s ease';
    banner.innerHTML = `
      <div style="font-size:1.5rem">🏪</div>
      <div>
        <div style="font-weight:800;font-size:.9rem">Welcome to Noori Shop Manager!</div>
        <div style="color:#a5b4fc;font-size:.78rem;margin-top:2px">Load sample data to explore all features?</div>
      </div>
      <button onclick="seedSampleData();document.getElementById('seed-banner').remove()"
        style="background:#f97316;color:#fff;padding:9px 18px;border-radius:8px;border:none;cursor:pointer;font-weight:800;font-size:.82rem;white-space:nowrap;flex-shrink:0">
        🚀 Load Samples
      </button>
      <button onclick="this.closest('#seed-banner').remove()"
        style="color:#818cf8;border:none;background:none;cursor:pointer;font-size:1.1rem;flex-shrink:0">✕</button>`;
    document.body.appendChild(banner);
  }
}
