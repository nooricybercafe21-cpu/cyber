/* ======================================================
   inventory.js — Smart Inventory Management
   ====================================================== */

let allInventory = [];

// ── Expose functions globally so modal onclick works after publish ──
window.editInventoryItem  = (...a) => editInventoryItem(...a);
window.adjustStock        = (...a) => adjustStock(...a);
window.deleteInventoryItem= (...a) => deleteInventoryItem(...a);
window.saveInventoryItem  = (...a) => saveInventoryItem(...a);
window.applyStockAdjust   = (...a) => applyStockAdjust(...a);
window.onCatChange        = (...a) => onCatChange(...a);

async function loadInventory() {
  const res = await API.get('inventory');
  allInventory = (res.data || []).filter(i => i.active !== false);
  renderInventoryTable(allInventory);
  checkLowStock(allInventory);
}

function renderInventoryTable(items) {
  const tbody = document.getElementById('inventory-tbody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-msg">No items found. Add your first inventory item.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(item => {
    const stockClass = item.stock_qty <= 0 ? 'stock-low' : item.stock_qty <= (item.low_stock_threshold || 5) ? 'stock-warn' : 'stock-ok';
    const unit = item.unit === 'ml' ? 'ml' : item.unit === 'tola' ? 'tola' : item.unit === 'service' ? 'svc' : 'pcs';
    return `<tr>
      <td>
        <div style="font-weight:700">${esc(item.name)}</div>
        ${item.variant_label ? `<small style="color:var(--text-3)">${esc(item.variant_label)}</small>` : ''}
        ${item.barcode ? `<small style="color:var(--text-3)"> | 🔲 ${esc(item.barcode)}</small>` : ''}
      </td>
      <td>${catBadge(item.category)}</td>
      <td style="color:var(--text-3);font-size:.75rem">${esc(item.sku || '—')}</td>
      <td class="${stockClass}">${fmtN(item.stock_qty)} ${unit}</td>
      <td><span class="badge badge-gray">${item.unit}</span></td>
      <td>${fmt(item.cost_price)}</td>
      <td style="font-weight:700;color:var(--primary)">${fmt(item.sell_price)}</td>
      <td style="font-size:.78rem;color:var(--text-3)">${fmtN(item.low_stock_threshold || 5)} ${unit}</td>
      <td>${item.stock_qty <= 0 ? '<span class="badge badge-red">Out</span>' : item.stock_qty <= (item.low_stock_threshold || 5) ? '<span class="badge badge-orange">Low</span>' : '<span class="badge badge-green">OK</span>'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-icon btn-edit" title="Edit" onclick="editInventoryItem('${item.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-icon" title="Adjust Stock" onclick="adjustStock('${item.id}')"><i class="fas fa-boxes"></i></button>
          <button class="btn-icon btn-delete" title="Delete" onclick="deleteInventoryItem('${item.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function checkLowStock(items) {
  const low = items.filter(i => i.stock_qty <= (i.low_stock_threshold || 5) && i.unit !== 'service');
  const countEl = document.getElementById('alert-count');
  const alertList = document.getElementById('alert-list');
  if (low.length > 0) {
    countEl.textContent = low.length;
    countEl.style.display = 'flex';
    alertList.innerHTML = low.map(i => `
      <div class="alert-item">
        <i class="fas fa-exclamation-triangle"></i>
        <strong>${esc(i.name)}</strong>: ${fmtN(i.stock_qty)} ${i.unit} remaining
      </div>`).join('');
  } else {
    countEl.style.display = 'none';
    alertList.innerHTML = '<p class="empty-msg">All items are well stocked.</p>';
  }
  document.getElementById('stat-low-stock').textContent = low.length;
}

function inventoryFormHTML(item = {}) {
  const cats = ['attar_bulk','attar_variant','mobile_accessory','cyber_service','bottle','other'];
  const units = ['piece','ml','tola','service'];
  return `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="form-row-2">
        <div class="form-row">
          <label>Item Name *</label>
          <input type="text" id="fi-name" class="form-input" value="${esc(item.name||'')}" placeholder="e.g. Mitti Attar" />
        </div>
        <div class="form-row">
          <label>Category *</label>
          <select id="fi-cat" class="form-input" onchange="onCatChange(this.value)">
            ${cats.map(c => `<option value="${c}" ${item.category===c?'selected':''}>${catLabel(c)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-row">
          <label>SKU</label>
          <input type="text" id="fi-sku" class="form-input" value="${esc(item.sku||'')}" placeholder="Optional SKU code" />
        </div>
        <div class="form-row">
          <label>Barcode</label>
          <input type="text" id="fi-barcode" class="form-input" value="${esc(item.barcode||'')}" placeholder="Barcode (optional)" />
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-row">
          <label>Unit *</label>
          <select id="fi-unit" class="form-input">
            ${units.map(u => `<option value="${u}" ${item.unit===u?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label>Opening Stock *</label>
          <input type="number" id="fi-stock" class="form-input" value="${item.stock_qty||0}" min="0" />
        </div>
        <div class="form-row">
          <label>Low-Stock Alert</label>
          <input type="number" id="fi-low" class="form-input" value="${item.low_stock_threshold||5}" min="0" />
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-row">
          <label>Cost Price (₹)</label>
          <input type="number" id="fi-cost" class="form-input" value="${item.cost_price||''}" min="0" step="0.01" />
        </div>
        <div class="form-row">
          <label>Selling Price (₹) *</label>
          <input type="number" id="fi-sell" class="form-input" value="${item.sell_price||''}" min="0" step="0.01" />
        </div>
      </div>
      <div id="fi-attar-extra" style="${(item.category||'') === 'attar_variant' ? '' : 'display:none'}">
        <div class="form-row-2">
          <div class="form-row">
            <label>Variant Label</label>
            <input type="text" id="fi-variant" class="form-input" value="${esc(item.variant_label||'')}" placeholder="e.g. 6ml Roll-on" />
          </div>
          <div class="form-row">
            <label>Volume (ml)</label>
            <input type="number" id="fi-volume" class="form-input" value="${item.volume_ml||''}" min="0" />
          </div>
        </div>
      </div>
      <div class="form-row">
        <label>Description</label>
        <textarea id="fi-desc" class="form-input" rows="2" placeholder="Notes about this item">${esc(item.description||'')}</textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:6px">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="saveInventoryItem('${item.id||''}')">
          <i class="fas fa-save"></i> ${item.id ? 'Update' : 'Add Item'}
        </button>
      </div>
    </div>`;
}

function onCatChange(val) {
  const extra = document.getElementById('fi-attar-extra');
  if (extra) extra.style.display = val === 'attar_variant' ? '' : 'none';
}

function editInventoryItem(id) {
  const item = allInventory.find(i => i.id === id);
  if (!item) return;
  Modal.open('Edit Inventory Item', inventoryFormHTML(item));
}

async function saveInventoryItem(existingId) {
  const name = document.getElementById('fi-name').value.trim();
  const sell_price = parseFloat(document.getElementById('fi-sell').value);
  if (!name || isNaN(sell_price)) { toast('Please fill in required fields.', 'error'); return; }

  const data = {
    name,
    category: document.getElementById('fi-cat').value,
    sku: document.getElementById('fi-sku').value.trim(),
    barcode: document.getElementById('fi-barcode').value.trim(),
    unit: document.getElementById('fi-unit').value,
    stock_qty: parseFloat(document.getElementById('fi-stock').value) || 0,
    low_stock_threshold: parseFloat(document.getElementById('fi-low').value) || 5,
    cost_price: parseFloat(document.getElementById('fi-cost').value) || 0,
    sell_price,
    variant_label: document.getElementById('fi-variant')?.value.trim() || '',
    volume_ml: parseFloat(document.getElementById('fi-volume')?.value) || 0,
    description: document.getElementById('fi-desc').value.trim(),
    active: true
  };

  try {
    if (existingId) {
      await API.put('inventory', existingId, data);
      toast('Item updated successfully!');
    } else {
      await API.post('inventory', data);
      toast('Item added to inventory!');
    }
    Modal.close();
    await loadInventory();
    if (typeof loadPOSProducts === 'function') loadPOSProducts();
    if (typeof loadDashboard === 'function') loadDashboard();
  } catch (e) { toast('Error saving item.', 'error'); }
}

async function adjustStock(id) {
  const item = allInventory.find(i => i.id === id);
  if (!item) return;
  Modal.open(`Adjust Stock – ${item.name}`, `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div style="background:var(--surface2);border-radius:8px;padding:12px;display:flex;justify-content:space-between">
        <span style="font-size:.85rem;color:var(--text-2)">Current Stock</span>
        <strong style="font-size:1.1rem">${fmtN(item.stock_qty)} ${item.unit}</strong>
      </div>
      <div class="form-row">
        <label>Adjustment Type</label>
        <select id="adj-type" class="form-input">
          <option value="add">Add Stock (Purchase / Restock)</option>
          <option value="sub">Remove Stock (Wastage / Return)</option>
          <option value="set">Set Exact Quantity</option>
        </select>
      </div>
      <div class="form-row">
        <label>Quantity (${item.unit})</label>
        <input type="number" id="adj-qty" class="form-input" min="0" step="0.01" placeholder="Enter quantity" />
      </div>
      <div class="form-row">
        <label>Reason</label>
        <input type="text" id="adj-reason" class="form-input" placeholder="Optional note" />
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="applyStockAdjust('${id}', ${item.stock_qty})">Apply</button>
      </div>
    </div>`);
}

async function applyStockAdjust(id, currentQty) {
  const type = document.getElementById('adj-type').value;
  const qty = parseFloat(document.getElementById('adj-qty').value);
  if (isNaN(qty) || qty < 0) { toast('Invalid quantity.', 'error'); return; }

  let newQty;
  if (type === 'add') newQty = currentQty + qty;
  else if (type === 'sub') newQty = Math.max(0, currentQty - qty);
  else newQty = qty;

  await API.patch('inventory', id, { stock_qty: newQty });
  toast(`Stock updated to ${fmtN(newQty)}`);
  Modal.close();
  await loadInventory();
  if (typeof loadPOSProducts === 'function') loadPOSProducts();
}

async function deleteInventoryItem(id) {
  if (!await confirm2('Delete this inventory item?')) return;
  await API.patch('inventory', id, { active: false });
  toast('Item removed.');
  await loadInventory();
  if (typeof loadPOSProducts === 'function') loadPOSProducts();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-add-inventory').addEventListener('click', () => {
    Modal.open('Add New Inventory Item', inventoryFormHTML());
  });

  document.getElementById('inv-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const cat = document.getElementById('inv-filter-cat').value;
    renderInventoryTable(allInventory.filter(i =>
      (i.name||'').toLowerCase().includes(q) &&
      (!cat || i.category === cat)
    ));
  });

  document.getElementById('inv-filter-cat').addEventListener('change', e => {
    const cat = e.target.value;
    const q = document.getElementById('inv-search').value.toLowerCase();
    renderInventoryTable(allInventory.filter(i =>
      (i.name||'').toLowerCase().includes(q) &&
      (!cat || i.category === cat)
    ));
  });

  // Bell click
  document.getElementById('low-stock-bell').addEventListener('click', () => {
    document.getElementById('alert-panel').classList.toggle('hidden');
  });
});
