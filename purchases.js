/* ======================================================
   pos.js — POS / Billing
   ====================================================== */

let posProducts = [];
window.addToCart        = (...a) => addToCart(...a);
window.addAttarToCart   = (...a) => addAttarToCart(...a);
window.changeQty        = (...a) => changeQty(...a);
window.removeFromCart   = (...a) => removeFromCart(...a);
window.selectPOSCustomer= (...a) => selectPOSCustomer(...a);
window.clearPOSCustomer = (...a) => clearPOSCustomer(...a);
window.completeSale     = (...a) => completeSale(...a);
let cart = [];
let posCurrentCustomer = null;
let posCurrentCat = 'all';

async function loadPOSProducts() {
  const res = await API.get('inventory');
  posProducts = (res.data || []).filter(i => i.active !== false && i.sell_price > 0);
  renderPOSGrid(posProducts);
}

function renderPOSGrid(products) {
  const grid = document.getElementById('pos-product-grid');
  const cat = posCurrentCat;
  const q = document.getElementById('pos-search').value.toLowerCase();
  let filtered = products.filter(p =>
    (cat === 'all' || p.category === cat) &&
    ((p.name||'').toLowerCase().includes(q) || (p.barcode||'').includes(q))
  );
  if (!filtered.length) {
    grid.innerHTML = `<p class="empty-msg" style="grid-column:1/-1">No products found.</p>`;
    return;
  }
  grid.innerHTML = filtered.map(p => {
    const out = p.unit !== 'service' && p.stock_qty <= 0;
    return `<div class="product-card${out?' out-of-stock':''}" onclick="addToCart('${p.id}')">
      <div class="pc-cat">${catLabel(p.category)}</div>
      <div class="pc-name">${esc(p.name)}${p.variant_label ? ' – '+esc(p.variant_label) : ''}</div>
      <div class="pc-price">${fmt(p.sell_price)} ${p.unit !== 'piece' && p.unit !== 'service' ? '/ '+p.unit : ''}</div>
      <div class="pc-stock ${p.stock_qty <= (p.low_stock_threshold||5) ? 'stock-warn' : 'stock-ok'}">
        ${p.unit === 'service' ? '<i class="fas fa-infinity"></i>' : fmtN(p.stock_qty)+' '+p.unit}
      </div>
    </div>`;
  }).join('');
}

function addToCart(productId) {
  const p = posProducts.find(x => x.id === productId);
  if (!p) return;

  // For attar_bulk: ask volume to sell
  if (p.unit === 'ml' || p.unit === 'tola') {
    showAttarModal(p);
    return;
  }

  const existing = cart.find(c => c.id === productId && !c.customVolume);
  if (existing) {
    if (p.unit !== 'service' && existing.qty >= p.stock_qty) {
      toast('Not enough stock!', 'error'); return;
    }
    existing.qty++;
  } else {
    cart.push({ id: p.id, name: p.name + (p.variant_label ? ' – ' + p.variant_label : ''), price: p.sell_price, qty: 1, unit: p.unit, category: p.category, stock: p.stock_qty });
  }
  renderCart();
}

function showAttarModal(p) {
  Modal.open(`Sell ${p.name}`, `
    <div style="display:flex;flex-direction:column;gap:14px">
      <p style="font-size:.85rem;color:var(--text-2)">Current bulk stock: <strong>${fmtN(p.stock_qty)} ${p.unit}</strong></p>
      <div class="form-row">
        <label>Volume to sell (${p.unit})</label>
        <input type="number" id="attar-vol" class="form-input" min="0.1" step="0.1" placeholder="e.g. 6" />
      </div>
      <div class="form-row">
        <label>Custom Price (₹) <small style="color:var(--text-3)">Leave blank to auto-calculate</small></label>
        <input type="number" id="attar-price" class="form-input" min="0" step="0.01" placeholder="Auto: ${p.sell_price}/${p.unit}" />
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="addAttarToCart('${p.id}')">Add to Cart</button>
      </div>
    </div>`);
}

function addAttarToCart(productId) {
  const p = posProducts.find(x => x.id === productId);
  if (!p) return;
  const vol = parseFloat(document.getElementById('attar-vol').value);
  if (!vol || vol <= 0) { toast('Enter a valid volume.', 'error'); return; }
  if (vol > p.stock_qty) { toast('Not enough stock!', 'error'); return; }

  const customPrice = parseFloat(document.getElementById('attar-price').value);
  const unitPrice = isNaN(customPrice) || customPrice <= 0 ? p.sell_price : customPrice;
  const total = parseFloat((unitPrice * vol).toFixed(2));

  cart.push({
    id: p.id, name: `${p.name} (${vol}${p.unit})`,
    price: total, qty: 1, unit: p.unit, category: p.category,
    stock: p.stock_qty, customVolume: vol, unitPriceRef: unitPrice
  });
  Modal.close();
  renderCart();
  toast(`Added ${vol}${p.unit} of ${p.name}`);
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const emptyMsg = document.getElementById('cart-empty-msg');
  if (!cart.length) {
    container.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = '';
    updateCartTotals();
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';

  container.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div style="flex:1;min-width:0">
        <div class="cart-item-name">${esc(item.name)}</div>
        <div class="cart-item-sub">${fmt(item.price)} each</div>
      </div>
      <div class="qty-ctrl">
        ${item.customVolume ? '' : `<button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>`}
        <span class="qty-display">${item.customVolume ? '1' : item.qty}</span>
        ${item.customVolume ? '' : `<button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>`}
      </div>
      <div class="cart-item-total">${fmt(item.price * item.qty)}</div>
      <i class="fas fa-times cart-item-remove" onclick="removeFromCart(${idx})"></i>
    </div>`).join('');

  updateCartTotals();
}

function changeQty(idx, delta) {
  const item = cart[idx];
  const p = posProducts.find(x => x.id === item.id);
  const newQty = item.qty + delta;
  if (newQty <= 0) { cart.splice(idx, 1); renderCart(); return; }
  if (p && p.unit !== 'service' && newQty > p.stock_qty) { toast('Not enough stock!', 'error'); return; }
  cart[idx].qty = newQty;
  renderCart();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  renderCart();
}

function updateCartTotals() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = parseFloat(document.getElementById('cart-discount').value) || 0;
  const redeemed = posCurrentCustomer ? (parseFloat(document.getElementById('redeem-points').value) || 0) : 0;
  const total = Math.max(0, subtotal - discount - redeemed);

  document.getElementById('cart-subtotal').textContent = fmt(subtotal);
  document.getElementById('cart-total').textContent = fmt(total);
}

function clearCart() {
  cart = [];
  document.getElementById('cart-discount').value = 0;
  if (document.getElementById('redeem-points')) document.getElementById('redeem-points').value = 0;
  renderCart();
}

// Customer search
let allCustomers_pos = [];
async function loadPOSCustomers() {
  const res = await API.get('customers');
  allCustomers_pos = (res.data || []).filter(c => c.active !== false);
}

document.addEventListener('DOMContentLoaded', () => {
  const custInput = document.getElementById('pos-customer-search');
  const custDrop  = document.getElementById('pos-customer-dropdown');

  custInput.addEventListener('input', () => {
    const q = custInput.value.toLowerCase().trim();
    if (!q) { custDrop.classList.add('hidden'); return; }
    const matches = allCustomers_pos.filter(c =>
      (c.name||'').toLowerCase().includes(q) || (c.phone||'').includes(q)
    ).slice(0, 6);
    if (!matches.length) { custDrop.classList.add('hidden'); return; }
    custDrop.innerHTML = matches.map(c => `
      <div class="dropdown-item" onclick="selectPOSCustomer('${c.id}')">
        <strong>${esc(c.name)}</strong>
        <small style="color:var(--text-3)"> — ${esc(c.phone||'')} | ${fmtN(c.loyalty_points||0)} pts</small>
      </div>`).join('');
    custDrop.classList.remove('hidden');
  });

  document.getElementById('pos-clear-customer').addEventListener('click', clearPOSCustomer);
  document.addEventListener('click', e => {
    if (!custInput.contains(e.target) && !custDrop.contains(e.target)) custDrop.classList.add('hidden');
  });

  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      posCurrentCat = btn.dataset.cat;
      renderPOSGrid(posProducts);
    });
  });

  document.getElementById('pos-search').addEventListener('input', () => renderPOSGrid(posProducts));
  document.getElementById('cart-discount').addEventListener('input', updateCartTotals);
  document.getElementById('clear-cart').addEventListener('click', clearCart);
  document.getElementById('btn-checkout').addEventListener('click', completeSale);
});

function selectPOSCustomer(id) {
  const c = allCustomers_pos.find(x => x.id === id);
  if (!c) return;
  posCurrentCustomer = c;
  document.getElementById('pos-customer-search').value = c.name;
  document.getElementById('pos-customer-dropdown').classList.add('hidden');
  document.getElementById('pos-customer-badge').classList.remove('hidden');
  document.getElementById('pos-customer-name-badge').textContent = c.name;
  document.getElementById('pos-customer-points-badge').textContent = `${fmtN(c.loyalty_points||0)} pts available`;
  document.getElementById('loyalty-row').style.display = 'flex';
  const redeemInput = document.getElementById('redeem-points');
  redeemInput.max = c.loyalty_points || 0;
  document.getElementById('available-points').textContent = `(${fmtN(c.loyalty_points||0)} pts)`;
  redeemInput.addEventListener('input', updateCartTotals);
  updateCartTotals();
}

function clearPOSCustomer() {
  posCurrentCustomer = null;
  document.getElementById('pos-customer-search').value = '';
  document.getElementById('pos-customer-badge').classList.add('hidden');
  document.getElementById('loyalty-row').style.display = 'none';
  document.getElementById('redeem-points').value = 0;
  updateCartTotals();
}

async function completeSale() {
  if (!cart.length) { toast('Cart is empty!', 'error'); return; }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = parseFloat(document.getElementById('cart-discount').value) || 0;
  const redeemed = posCurrentCustomer ? (parseFloat(document.getElementById('redeem-points').value) || 0) : 0;
  const total = Math.max(0, subtotal - discount - redeemed);
  const payMethod = document.querySelector('input[name="pay-method"]:checked').value;
  const invoiceNo = genInvoiceNo('INV');
  const saleDate = new Date().toISOString();

  // Build sale items
  const saleItems = cart.map(i => ({
    id: i.id, name: i.name, qty: i.qty, price: i.price,
    unit: i.unit, category: i.category, customVolume: i.customVolume || null
  }));

  // Points: 1 pt per ₹10 on attar/mobile
  const eligibleTotal = cart.filter(i => ['attar_variant','attar_bulk','mobile_accessory'].includes(i.category))
    .reduce((s, i) => s + i.price * i.qty, 0);
  const pointsEarned = Math.floor(eligibleTotal / 10);

  const saleData = {
    invoice_no: invoiceNo,
    sale_date: saleDate,
    customer_id: posCurrentCustomer?.id || '',
    customer_name: posCurrentCustomer?.name || 'Walk-in',
    customer_phone: posCurrentCustomer?.phone || '',
    items: JSON.stringify(saleItems),
    subtotal, discount,
    total_amount: total,
    payment_method: payMethod,
    paid_amount: total,
    points_earned: pointsEarned,
    points_redeemed: redeemed,
    receipt_sent_via: [
      document.getElementById('send-whatsapp').checked ? 'whatsapp' : '',
      document.getElementById('send-email').checked ? 'email' : ''
    ].filter(Boolean).join(',')
  };

  try {
    await API.post('sales', saleData);

    // Deduct stock
    for (const item of cart) {
      const invItem = allInventory.find(i => i.id === item.id);
      if (invItem && invItem.unit !== 'service') {
        const deduct = item.customVolume ? item.customVolume : item.qty;
        const newQty = Math.max(0, invItem.stock_qty - deduct);
        await API.patch('inventory', item.id, { stock_qty: newQty });
      }
    }

    // Update customer
    if (posCurrentCustomer) {
      const newPts = (posCurrentCustomer.loyalty_points || 0) + pointsEarned - redeemed;
      const newSpent = (posCurrentCustomer.total_spent || 0) + total;
      await API.patch('customers', posCurrentCustomer.id, {
        loyalty_points: Math.max(0, newPts),
        total_spent: newSpent
      });

      // Khata entry if method is khata
      if (payMethod === 'khata') {
        const newBal = (posCurrentCustomer.khata_balance || 0) + total;
        await API.patch('customers', posCurrentCustomer.id, { khata_balance: newBal });
        await API.post('khata_ledger', {
          customer_id: posCurrentCustomer.id,
          customer_name: posCurrentCustomer.name,
          transaction_date: saleDate,
          type: 'credit',
          amount: total,
          description: `Sale on credit – ${invoiceNo}`,
          sale_id: '',
          balance_after: newBal
        });
      }
    }

    showReceipt({ ...saleData, items: saleItems, subtotal, discount, total, invoiceNo, saleDate });
    clearCart();
    clearPOSCustomer();
    await loadInventory();
    await loadPOSCustomers();
    if (typeof loadDashboard === 'function') loadDashboard();
    toast(`Sale completed! ${pointsEarned > 0 ? `+${pointsEarned} pts earned.` : ''}`);

  } catch (e) { console.error(e); toast('Error processing sale.', 'error'); }
}

// showReceipt and closeReceipt are defined in app.js with full Noori branding
