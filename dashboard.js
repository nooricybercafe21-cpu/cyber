/* ======================================================
   customers.js — Customer Management & Loyalty
   ====================================================== */

let allCustomers = [];
window.editCustomer          = (...a) => editCustomer(...a);
window.deleteCustomer        = (...a) => deleteCustomer(...a);
window.saveCustomer          = (...a) => saveCustomer(...a);
window.viewCustomerHistory   = (...a) => viewCustomerHistory(...a);
window.openKhataPayment      = (...a) => openKhataPayment(...a);
window.processKhataPayment   = (...a) => processKhataPayment(...a);
window.sendWhatsAppReminder  = (...a) => sendWhatsAppReminder(...a);

async function loadCustomers() {
  const res = await API.get('customers');
  allCustomers = (res.data || []).filter(c => c.active !== false);
  renderCustomersGrid(allCustomers);

  // Update stat
  document.getElementById('stat-customers').textContent = allCustomers.length;

  // Update POS customer list
  if (typeof allCustomers_pos !== 'undefined') {
    allCustomers_pos.length = 0;
    allCustomers_pos.push(...allCustomers);
  }

  // Khata total
  const khataTotal = allCustomers.reduce((s, c) => s + (c.khata_balance || 0), 0);
  document.getElementById('stat-khata').textContent = fmt(khataTotal);
}

function renderCustomersGrid(customers) {
  const grid = document.getElementById('customers-grid');
  if (!customers.length) {
    grid.innerHTML = `<p class="empty-msg" style="grid-column:1/-1">No customers added yet.</p>`;
    return;
  }
  const sorted = [...customers].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));
  grid.innerHTML = sorted.map(c => {
    const color = avatarColor(c.name);
    const initials = avatarInitials(c.name);
    const khataClass = (c.khata_balance || 0) > 0 ? 'badge-red' : 'badge-green';
    return `<div class="customer-card">
      <div class="customer-card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="customer-avatar" style="background:${color}">${esc(initials)}</div>
          <div>
            <div class="customer-name">${esc(c.name)}</div>
            ${c.phone ? `<div style="font-size:.75rem;color:var(--text-3)">${esc(c.phone)}</div>` : ''}
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-icon btn-edit" onclick="editCustomer('${c.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-icon btn-delete" onclick="deleteCustomer('${c.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="customer-metrics">
        <div class="cust-metric">
          <div class="cust-metric-val">${fmt(c.total_spent||0)}</div>
          <div class="cust-metric-label">Total Spent</div>
        </div>
        <div class="cust-metric">
          <div class="cust-metric-val" style="color:var(--primary)">${fmtN(c.loyalty_points||0)}</div>
          <div class="cust-metric-label">Loyalty Pts</div>
        </div>
        <div class="cust-metric">
          <div class="cust-metric-val ${(c.khata_balance||0) > 0 ? 'text-red' : ''}"
            style="${(c.khata_balance||0) > 0 ? 'color:var(--red)' : 'color:var(--green)'}">
            ${fmt(c.khata_balance||0)}</div>
          <div class="cust-metric-label">Khata Due</div>
        </div>
      </div>
      ${c.notes ? `<div style="margin-top:10px;font-size:.75rem;color:var(--text-3);font-style:italic">${esc(c.notes)}</div>` : ''}
      <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">
        <button class="btn-sm btn-secondary" onclick="viewCustomerHistory('${c.id}')"><i class="fas fa-history"></i> History</button>
        ${(c.khata_balance||0) > 0 ? `<button class="btn-sm" style="background:var(--red-light);color:var(--red);border:none;border-radius:6px" onclick="openKhataPayment('${c.id}')"><i class="fas fa-rupee-sign"></i> Collect</button>` : ''}
        ${c.phone ? `<button class="btn-sm" style="background:#dcfce7;color:#15803d;border:none;border-radius:6px" onclick="sendWhatsAppReminder('${c.id}')"><i class="fab fa-whatsapp"></i></button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function customerFormHTML(c = {}) {
  return `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="form-row">
        <label>Customer Name *</label>
        <input type="text" id="cf-name" class="form-input" value="${esc(c.name||'')}" placeholder="Full name" />
      </div>
      <div class="form-row-2">
        <div class="form-row">
          <label>Phone</label>
          <input type="tel" id="cf-phone" class="form-input" value="${esc(c.phone||'')}" placeholder="+91 XXXXX XXXXX" />
        </div>
        <div class="form-row">
          <label>Email</label>
          <input type="email" id="cf-email" class="form-input" value="${esc(c.email||'')}" placeholder="optional" />
        </div>
      </div>
      <div class="form-row">
        <label>Address</label>
        <input type="text" id="cf-address" class="form-input" value="${esc(c.address||'')}" placeholder="Optional" />
      </div>
      <div class="form-row-2">
        <div class="form-row">
          <label>Opening Loyalty Points</label>
          <input type="number" id="cf-points" class="form-input" value="${c.loyalty_points||0}" min="0" />
        </div>
        <div class="form-row">
          <label>Opening Khata Balance (₹)</label>
          <input type="number" id="cf-khata" class="form-input" value="${c.khata_balance||0}" min="0" step="0.01" />
        </div>
      </div>
      <div class="form-row">
        <label>Notes</label>
        <textarea id="cf-notes" class="form-input" rows="2" placeholder="Preferences, special notes…">${esc(c.notes||'')}</textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:6px">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="saveCustomer('${c.id||''}')">
          <i class="fas fa-save"></i> ${c.id ? 'Update' : 'Add Customer'}
        </button>
      </div>
    </div>`;
}

function editCustomer(id) {
  const c = allCustomers.find(x => x.id === id);
  if (!c) return;
  Modal.open('Edit Customer', customerFormHTML(c));
}

async function saveCustomer(existingId) {
  const name = document.getElementById('cf-name').value.trim();
  if (!name) { toast('Customer name is required.', 'error'); return; }
  const data = {
    name,
    phone: document.getElementById('cf-phone').value.trim(),
    email: document.getElementById('cf-email').value.trim(),
    address: document.getElementById('cf-address').value.trim(),
    loyalty_points: parseFloat(document.getElementById('cf-points').value) || 0,
    khata_balance: parseFloat(document.getElementById('cf-khata').value) || 0,
    total_spent: 0,
    notes: document.getElementById('cf-notes').value.trim(),
    active: true
  };
  try {
    if (existingId) {
      await API.put('customers', existingId, data);
      toast('Customer updated!');
    } else {
      await API.post('customers', data);
      toast('Customer added!');
    }
    Modal.close();
    await loadCustomers();
  } catch (e) { toast('Error saving customer.', 'error'); }
}

async function deleteCustomer(id) {
  if (!await confirm2('Remove this customer?')) return;
  await API.patch('customers', id, { active: false });
  toast('Customer removed.');
  await loadCustomers();
}

async function viewCustomerHistory(id) {
  const c = allCustomers.find(x => x.id === id);
  if (!c) return;
  const salesRes = await API.get('sales');
  const custSales = (salesRes.data || []).filter(s => s.customer_id === id)
    .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
  Modal.open(`Purchase History – ${c.name}`, `
    <div style="margin-bottom:16px;display:flex;gap:16px;flex-wrap:wrap">
      <div style="background:var(--primary-light);border-radius:8px;padding:12px 18px;text-align:center">
        <div style="font-size:1.2rem;font-weight:800;color:var(--primary)">${fmt(c.total_spent||0)}</div>
        <div style="font-size:.72rem;color:var(--text-3)">Total Spent</div>
      </div>
      <div style="background:var(--yellow-light);border-radius:8px;padding:12px 18px;text-align:center">
        <div style="font-size:1.2rem;font-weight:800;color:var(--yellow)">${fmtN(c.loyalty_points||0)}</div>
        <div style="font-size:.72rem;color:var(--text-3)">Loyalty Points</div>
      </div>
      <div style="background:${(c.khata_balance||0)>0?'var(--red-light)':'var(--green-light)'};border-radius:8px;padding:12px 18px;text-align:center">
        <div style="font-size:1.2rem;font-weight:800;color:${(c.khata_balance||0)>0?'var(--red)':'var(--green)'}">${fmt(c.khata_balance||0)}</div>
        <div style="font-size:.72rem;color:var(--text-3)">Khata Balance</div>
      </div>
    </div>
    ${custSales.length ? `
    <table class="data-table">
      <thead><tr><th>Invoice</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th></tr></thead>
      <tbody>
        ${custSales.map(s => `<tr>
          <td style="font-weight:700;color:var(--primary)">${esc(s.invoice_no)}</td>
          <td>${fmtDate(s.sale_date)}</td>
          <td>${safeJSON(s.items,[]).length} items</td>
          <td style="font-weight:700">${fmt(s.total_amount)}</td>
          <td><span class="badge badge-blue">${s.payment_method||'—'}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p class="empty-msg">No purchases yet.</p>'}`);
}

async function openKhataPayment(id) {
  const c = allCustomers.find(x => x.id === id);
  if (!c) return;
  Modal.open(`Collect Payment – ${c.name}`, `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="background:var(--red-light);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:.85rem;color:var(--text-2)">Outstanding Khata</span>
        <strong style="font-size:1.2rem;color:var(--red)">${fmt(c.khata_balance)}</strong>
      </div>
      <div class="form-row">
        <label>Amount Received (₹)</label>
        <input type="number" id="khata-pay-amount" class="form-input" value="${c.khata_balance}" min="0" step="0.01" />
      </div>
      <div class="form-row">
        <label>Payment Method</label>
        <select id="khata-pay-method" class="form-input">
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
        </select>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="processKhataPayment('${id}', ${c.khata_balance})">
          <i class="fas fa-check"></i> Record Payment
        </button>
      </div>
    </div>`);
}

async function processKhataPayment(customerId, currentBalance) {
  const amount = parseFloat(document.getElementById('khata-pay-amount').value);
  if (!amount || amount <= 0) { toast('Enter a valid amount.', 'error'); return; }

  const newBalance = Math.max(0, currentBalance - amount);
  await API.patch('customers', customerId, { khata_balance: newBalance });

  const c = allCustomers.find(x => x.id === customerId);
  await API.post('khata_ledger', {
    customer_id: customerId,
    customer_name: c?.name || '',
    transaction_date: new Date().toISOString(),
    type: 'payment',
    amount,
    description: `Payment received via ${document.getElementById('khata-pay-method').value}`,
    sale_id: '',
    balance_after: newBalance
  });

  toast(`₹${amount} collected. Remaining: ${fmt(newBalance)}`);
  Modal.close();
  await loadCustomers();
  if (typeof loadKhata === 'function') loadKhata();
}

function sendWhatsAppReminder(id) {
  const c = allCustomers.find(x => x.id === id);
  if (!c || !c.phone) return;
  const msg = encodeURIComponent(`Hello ${c.name}, this is a friendly reminder that you have an outstanding balance of ${fmt(c.khata_balance || 0)} at our shop. Please visit us at your convenience. Thank you! 🙏`);
  window.open(`https://wa.me/91${c.phone.replace(/\D/g,'')}?text=${msg}`, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-add-customer').addEventListener('click', () => {
    Modal.open('Add New Customer', customerFormHTML());
  });
  document.getElementById('cust-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderCustomersGrid(allCustomers.filter(c =>
      (c.name||'').toLowerCase().includes(q) || (c.phone||'').includes(q)
    ));
  });
});
