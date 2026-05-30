/* ======================================================
   khata.js — Khata / Credit Ledger
   ====================================================== */

let allKhataEntries = [];
window.saveKhataEntry = (...a) => saveKhataEntry(...a);

async function loadKhata() {
  const res = await API.get('khata_ledger');
  allKhataEntries = (res.data || []).sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
  renderKhataTable(allKhataEntries);
  renderKhataSummary();
}

function renderKhataTable(entries) {
  const tbody = document.getElementById('khata-tbody');
  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-msg">No ledger entries yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = entries.map(e => {
    const typeClass = e.type === 'payment' ? 'type-payment' : e.type === 'credit' ? 'type-credit' : 'type-debit';
    const typeIcon = e.type === 'payment' ? 'arrow-down' : e.type === 'credit' ? 'arrow-up' : 'minus';
    return `<tr>
      <td>${fmtDate(e.transaction_date)}</td>
      <td style="font-weight:600">${esc(e.customer_name||'—')}</td>
      <td><span class="${typeClass}"><i class="fas fa-${typeIcon}"></i> ${e.type}</span></td>
      <td style="color:var(--text-2);font-size:.82rem">${esc(e.description||'—')}</td>
      <td style="font-weight:700;${e.type==='payment'?'color:var(--green)':e.type==='credit'?'color:var(--red)':'color:var(--blue)'}">${e.type==='payment'?'−':'+'} ${fmt(e.amount)}</td>
      <td style="font-weight:700">${fmt(e.balance_after)}</td>
    </tr>`;
  }).join('');
}

function renderKhataSummary() {
  const container = document.getElementById('khata-summary-cards');
  // Group by customer
  const byCustomer = {};
  allKhataEntries.forEach(e => {
    if (!e.customer_id) return;
    if (!byCustomer[e.customer_id]) {
      byCustomer[e.customer_id] = { name: e.customer_name, latest_balance: 0, id: e.customer_id };
    }
    // Take the most recent entry's balance
    const existing = byCustomer[e.customer_id];
    const eDate = new Date(e.transaction_date);
    if (!existing._latestDate || eDate > existing._latestDate) {
      existing.latest_balance = e.balance_after;
      existing._latestDate = eDate;
    }
  });

  const entries = Object.values(byCustomer).filter(c => c.latest_balance > 0);
  if (!entries.length) {
    container.innerHTML = `<div class="khata-summary-card"><div style="color:var(--green);font-size:.85rem;font-weight:700"><i class="fas fa-check-circle"></i> All accounts settled!</div></div>`;
    return;
  }
  container.innerHTML = entries.map(c => `
    <div class="khata-summary-card">
      <div class="khata-summary-name">${esc(c.name)}</div>
      <div class="khata-summary-bal ${c.latest_balance > 0 ? 'credit' : 'ok'}">${fmt(c.latest_balance)}</div>
      <div style="font-size:.72rem;color:var(--text-3);margin-top:4px">Outstanding</div>
    </div>`).join('');
}

function khataFormHTML() {
  return `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="form-row">
        <label>Customer *</label>
        <input type="text" id="kf-cust-search" class="form-input" placeholder="Type customer name…" list="kf-cust-list" />
        <datalist id="kf-cust-list">
          ${allCustomers.map(c => `<option value="${esc(c.name)}" data-id="${c.id}">`).join('')}
        </datalist>
      </div>
      <div class="form-row-2">
        <div class="form-row">
          <label>Type *</label>
          <select id="kf-type" class="form-input">
            <option value="credit">Credit (Customer owes you)</option>
            <option value="payment">Payment (Customer paid)</option>
            <option value="debit">Debit (You owe customer)</option>
          </select>
        </div>
        <div class="form-row">
          <label>Amount (₹) *</label>
          <input type="number" id="kf-amount" class="form-input" min="0" step="0.01" placeholder="0.00" />
        </div>
      </div>
      <div class="form-row">
        <label>Date</label>
        <input type="date" id="kf-date" class="form-input" value="${todayStr()}" />
      </div>
      <div class="form-row">
        <label>Description</label>
        <input type="text" id="kf-desc" class="form-input" placeholder="What is this for?" />
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:6px">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="saveKhataEntry()">
          <i class="fas fa-save"></i> Add Entry
        </button>
      </div>
    </div>`;
}

async function saveKhataEntry() {
  const custName = document.getElementById('kf-cust-search').value.trim();
  const amount = parseFloat(document.getElementById('kf-amount').value);
  const type = document.getElementById('kf-type').value;
  if (!custName || isNaN(amount) || amount <= 0) { toast('Fill in all required fields.', 'error'); return; }

  const customer = allCustomers.find(c => c.name.toLowerCase() === custName.toLowerCase());
  if (!customer) { toast('Customer not found. Add them first.', 'error'); return; }

  // Compute new balance
  let balanceDelta = type === 'credit' ? amount : type === 'payment' ? -amount : amount;
  const currentBalance = customer.khata_balance || 0;
  const newBalance = Math.max(0, currentBalance + balanceDelta);

  await API.post('khata_ledger', {
    customer_id: customer.id,
    customer_name: customer.name,
    transaction_date: new Date(document.getElementById('kf-date').value).toISOString(),
    type,
    amount,
    description: document.getElementById('kf-desc').value.trim(),
    sale_id: '',
    balance_after: newBalance
  });

  await API.patch('customers', customer.id, { khata_balance: newBalance });

  toast('Khata entry added!');
  Modal.close();
  await loadKhata();
  await loadCustomers();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-add-khata').addEventListener('click', () => {
    Modal.open('Add Khata Entry', khataFormHTML());
  });

  document.getElementById('khata-cust-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderKhataTable(allKhataEntries.filter(en =>
      (en.customer_name||'').toLowerCase().includes(q)
    ));
  });
});
