/* ======================================================
   purchases.js — Purchase & Supplier Management
   ====================================================== */

let allPurchases = [];
window.editPurchase        = (...a) => editPurchase(...a);
window.deletePurchase      = (...a) => deletePurchase(...a);
window.savePurchase        = (...a) => savePurchase(...a);
window.viewPurchaseItems   = (...a) => viewPurchaseItems(...a);
window.addPurchaseItemRow  = (...a) => addPurchaseItemRow(...a);
window.calcPurchaseTotal   = (...a) => calcPurchaseTotal(...a);

async function loadPurchases() {
  const res = await API.get('purchases');
  allPurchases = (res.data || []);
  renderPurchasesTable(allPurchases);
}

function renderPurchasesTable(purchases) {
  const tbody = document.getElementById('purchases-tbody');
  if (!purchases.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-msg">No purchases logged yet.</td></tr>`;
    return;
  }
  const sorted = [...purchases].sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));
  tbody.innerHTML = sorted.map(p => {
    const items = safeJSON(p.items, []);
    const statusBadge = p.payment_status === 'paid' ? 'badge-green' : p.payment_status === 'partial' ? 'badge-orange' : 'badge-red';
    return `<tr>
      <td style="font-weight:700;color:var(--primary)">${esc(p.invoice_no||'—')}</td>
      <td>${fmtDate(p.purchase_date)}</td>
      <td>${esc(p.supplier_name||'—')}</td>
      <td>
        <span title="${items.map(i => i.name+'×'+i.qty).join(', ')}"
          style="cursor:help;color:var(--text-2);font-size:.8rem">
          ${items.length} item${items.length !== 1 ? 's' : ''}
          <i class="fas fa-info-circle" style="color:var(--text-3)"></i>
        </span>
      </td>
      <td style="font-weight:700">${fmt(p.total_amount)}</td>
      <td>${fmt(p.paid_amount)}</td>
      <td><span class="badge ${statusBadge}">${p.payment_status}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-icon btn-edit" onclick="editPurchase('${p.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-icon" onclick="viewPurchaseItems('${p.id}')" title="View items"><i class="fas fa-list"></i></button>
          <button class="btn-icon btn-delete" onclick="deletePurchase('${p.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function purchaseFormHTML(p = {}) {
  const pItems = safeJSON(p.items, [{ name: '', qty: 1, unit: 'piece', cost: 0 }]);
  return `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="form-row-2">
        <div class="form-row">
          <label>Invoice No.</label>
          <input type="text" id="pf-invoice" class="form-input" value="${esc(p.invoice_no || genInvoiceNo('PUR'))}" />
        </div>
        <div class="form-row">
          <label>Purchase Date *</label>
          <input type="date" id="pf-date" class="form-input" value="${p.purchase_date ? p.purchase_date.slice(0,10) : todayStr()}" />
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-row">
          <label>Supplier Name *</label>
          <input type="text" id="pf-sup" class="form-input" value="${esc(p.supplier_name||'')}" placeholder="Supplier name" list="supplier-datalist" />
          <datalist id="supplier-datalist">${allSuppliers.map(s => `<option value="${esc(s.name)}">`).join('')}</datalist>
        </div>
        <div class="form-row">
          <label>Payment Status</label>
          <select id="pf-status" class="form-input">
            <option value="paid" ${p.payment_status==='paid'?'selected':''}>Paid</option>
            <option value="partial" ${p.payment_status==='partial'?'selected':''}>Partial</option>
            <option value="pending" ${p.payment_status==='pending'?'selected':''}>Pending</option>
          </select>
        </div>
      </div>

      <!-- Purchase Items -->
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <label style="font-size:.78rem;font-weight:700;color:var(--text-2)">Purchase Items</label>
          <button class="btn-sm btn-secondary" type="button" onclick="addPurchaseItemRow()"><i class="fas fa-plus"></i> Add Row</button>
        </div>
        <div id="purchase-items-rows">
          ${pItems.map((it, i) => purchaseItemRowHTML(it, i)).join('')}
        </div>
      </div>

      <div class="form-row-2">
        <div class="form-row">
          <label>Total Amount (₹) *</label>
          <input type="number" id="pf-total" class="form-input" value="${p.total_amount||''}" min="0" step="0.01" onchange="updatePaidFromTotal()" />
        </div>
        <div class="form-row">
          <label>Amount Paid (₹)</label>
          <input type="number" id="pf-paid" class="form-input" value="${p.paid_amount||''}" min="0" step="0.01" />
        </div>
      </div>
      <div class="form-row">
        <label>Notes</label>
        <textarea id="pf-notes" class="form-input" rows="2">${esc(p.notes||'')}</textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:6px">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="savePurchase('${p.id||''}')">
          <i class="fas fa-save"></i> ${p.id ? 'Update' : 'Save Purchase'}
        </button>
      </div>
    </div>`;
}

let _purItemCount = 1;
function purchaseItemRowHTML(item = {}, idx) {
  return `<div class="ingredient-row pur-item-row" id="pur-row-${idx}">
    <input type="text" class="form-input pur-item-name" placeholder="Item name" value="${esc(item.name||'')}" style="flex:3" />
    <input type="number" class="form-input pur-item-qty" placeholder="Qty" value="${item.qty||1}" min="0" style="flex:1" />
    <select class="form-input pur-item-unit" style="flex:1">
      ${['piece','ml','tola','kg','packet','box'].map(u => `<option value="${u}" ${item.unit===u?'selected':''}>${u}</option>`).join('')}
    </select>
    <input type="number" class="form-input pur-item-cost" placeholder="₹ cost" value="${item.cost||''}" min="0" step="0.01" style="flex:1" onchange="calcPurchaseTotal()" />
    <button type="button" class="ingredient-remove" onclick="document.getElementById('pur-row-${idx}').remove();calcPurchaseTotal()"><i class="fas fa-times"></i></button>
  </div>`;
}

function addPurchaseItemRow() {
  const container = document.getElementById('purchase-items-rows');
  const div = document.createElement('div');
  div.innerHTML = purchaseItemRowHTML({}, ++_purItemCount);
  container.appendChild(div.firstElementChild);
}

function calcPurchaseTotal() {
  const rows = document.querySelectorAll('.pur-item-row');
  let total = 0;
  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('.pur-item-qty')?.value) || 0;
    const cost = parseFloat(row.querySelector('.pur-item-cost')?.value) || 0;
    total += qty * cost;
  });
  const totalInput = document.getElementById('pf-total');
  if (totalInput) totalInput.value = total.toFixed(2);
}

function updatePaidFromTotal() {
  const t = document.getElementById('pf-total').value;
  const p = document.getElementById('pf-paid');
  if (p && !p.value) p.value = t;
}

function collectPurchaseItems() {
  const rows = document.querySelectorAll('.pur-item-row');
  const items = [];
  rows.forEach(row => {
    const name = row.querySelector('.pur-item-name')?.value.trim();
    if (!name) return;
    items.push({
      name,
      qty: parseFloat(row.querySelector('.pur-item-qty')?.value) || 1,
      unit: row.querySelector('.pur-item-unit')?.value || 'piece',
      cost: parseFloat(row.querySelector('.pur-item-cost')?.value) || 0
    });
  });
  return items;
}

function editPurchase(id) {
  const p = allPurchases.find(x => x.id === id);
  if (!p) return;
  _purItemCount = safeJSON(p.items, []).length + 1;
  Modal.open('Edit Purchase', purchaseFormHTML(p));
}

function viewPurchaseItems(id) {
  const p = allPurchases.find(x => x.id === id);
  if (!p) return;
  const items = safeJSON(p.items, []);
  Modal.open(`Purchase Items – ${p.invoice_no}`, `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Cost</th><th>Total</th></tr></thead>
        <tbody>
          ${items.map(i => `<tr>
            <td>${esc(i.name)}</td><td>${i.qty}</td><td>${i.unit}</td>
            <td>${fmt(i.cost)}</td><td>${fmt(i.qty * i.cost)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="text-align:right;margin-top:12px;font-weight:800;font-size:1rem">Total: ${fmt(p.total_amount)}</div>`);
}

async function savePurchase(existingId) {
  const supplier_name = document.getElementById('pf-sup').value.trim();
  const total = parseFloat(document.getElementById('pf-total').value);
  if (!supplier_name || isNaN(total)) { toast('Supplier and total are required.', 'error'); return; }

  const items = collectPurchaseItems();
  const data = {
    invoice_no: document.getElementById('pf-invoice').value.trim(),
    purchase_date: document.getElementById('pf-date').value,
    supplier_name,
    items: JSON.stringify(items),
    total_amount: total,
    paid_amount: parseFloat(document.getElementById('pf-paid').value) || 0,
    payment_status: document.getElementById('pf-status').value,
    notes: document.getElementById('pf-notes').value.trim()
  };

  try {
    if (existingId) {
      await API.put('purchases', existingId, data);
      toast('Purchase updated!');
    } else {
      await API.post('purchases', data);
      toast('Purchase saved!');
    }
    Modal.close();
    await loadPurchases();
    if (typeof loadDashboard === 'function') loadDashboard();
  } catch (e) { toast('Error saving purchase.', 'error'); }
}

async function deletePurchase(id) {
  if (!await confirm2('Delete this purchase record?')) return;
  await API.delete('purchases', id);
  toast('Purchase deleted.');
  await loadPurchases();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-add-purchase').addEventListener('click', () => {
    _purItemCount = 1;
    Modal.open('Log New Purchase', purchaseFormHTML());
  });
  document.getElementById('pur-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderPurchasesTable(allPurchases.filter(p =>
      (p.supplier_name||'').toLowerCase().includes(q) ||
      (p.invoice_no||'').toLowerCase().includes(q)
    ));
  });
});
