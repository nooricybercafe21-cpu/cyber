/* ======================================================
   banking.js — Airtel Payment Bank Retailer Module
   Deposit · Withdrawal · Fund Transfer · Services
   ====================================================== */

let allBankingTxns = [];
window.editBankingTxn    = (...a) => editBankingTxn(...a);
window.deleteBankingTxn  = (...a) => deleteBankingTxn(...a);
window.saveBankingTxn    = (...a) => saveBankingTxn(...a);
window.selectTxnType     = (...a) => selectTxnType(...a);
window.calcBankingEarnings=(...a) => calcBankingEarnings(...a);

const TXN_TYPES = {
  cash_deposit:    { label: 'Cash Deposit',       icon: 'fa-arrow-down',     color: '#22c55e', badge: 'badge-green'  },
  cash_withdrawal: { label: 'Cash Withdrawal',    icon: 'fa-arrow-up',       color: '#ef4444', badge: 'badge-red'    },
  fund_transfer:   { label: 'Fund Transfer',      icon: 'fa-exchange-alt',   color: '#3b82f6', badge: 'badge-blue'   },
  account_open:    { label: 'Account Opening',    icon: 'fa-user-plus',      color: '#a855f7', badge: 'badge-purple' },
  mini_statement:  { label: 'Mini Statement',     icon: 'fa-file-alt',       color: '#14b8a6', badge: 'badge-gray'   },
  aadhaar_pay:     { label: 'Aadhaar Pay',        icon: 'fa-fingerprint',    color: '#f97316', badge: 'badge-orange' },
  insurance:       { label: 'Insurance Premium',  icon: 'fa-shield-alt',     color: '#6366f1', badge: 'badge-purple' },
  emi_collection:  { label: 'EMI Collection',     icon: 'fa-calendar-check', color: '#0ea5e9', badge: 'badge-blue'   },
  other:           { label: 'Other Service',      icon: 'fa-cog',            color: '#64748b', badge: 'badge-gray'   }
};

// Default service charges (₹ per transaction) — retailer can edit
const DEFAULT_CHARGES = {
  cash_deposit: 0, cash_withdrawal: 10, fund_transfer: 5,
  account_open: 0, mini_statement: 2, aadhaar_pay: 5,
  insurance: 0, emi_collection: 10, other: 0
};

// Default commissions (₹ per transaction) from Airtel
const DEFAULT_COMMISSIONS = {
  cash_deposit: 5, cash_withdrawal: 7, fund_transfer: 5,
  account_open: 50, mini_statement: 1, aadhaar_pay: 5,
  insurance: 30, emi_collection: 15, other: 0
};

async function loadBanking() {
  const res = await API.get('banking_transactions');
  allBankingTxns = (res.data || []).sort((a,b) => new Date(b.txn_date) - new Date(a.txn_date));
  renderBankingTable(allBankingTxns);
  renderBankingSummary();
}

function renderBankingSummary() {
  const today = todayStr();
  const monthStart = today.slice(0,7) + '-01';

  const todayTxns  = allBankingTxns.filter(t => (t.txn_date||'').slice(0,10) === today && t.status === 'success');
  const monthTxns  = allBankingTxns.filter(t => (t.txn_date||'') >= monthStart && t.status === 'success');

  const todayComm  = todayTxns.reduce((s,t)  => s + (t.commission_earned||0), 0);
  const monthComm  = monthTxns.reduce((s,t)  => s + (t.commission_earned||0), 0);
  const todayCharge= todayTxns.reduce((s,t)  => s + (t.service_charge||0), 0);
  const monthCharge= monthTxns.reduce((s,t)  => s + (t.service_charge||0), 0);

  const totalDeposit    = monthTxns.filter(t=>t.txn_type==='cash_deposit').reduce((s,t) => s+(t.amount||0),0);
  const totalWithdrawal = monthTxns.filter(t=>t.txn_type==='cash_withdrawal').reduce((s,t) => s+(t.amount||0),0);

  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('bnk-today-comm',   fmt(todayComm + todayCharge));
  set('bnk-month-comm',   fmt(monthComm + monthCharge));
  set('bnk-month-deposit',fmt(totalDeposit));
  set('bnk-month-withdraw',fmt(totalWithdrawal));
  set('bnk-month-count',  monthTxns.length);

  // Breakdown by type
  renderBankingTypeBreakdown(monthTxns);
}

function renderBankingTypeBreakdown(txns) {
  const el = document.getElementById('bnk-type-breakdown');
  if (!el) return;
  const typeMap = {};
  txns.forEach(t => {
    const tp = t.txn_type || 'other';
    if (!typeMap[tp]) typeMap[tp] = { count:0, amount:0, earned:0 };
    typeMap[tp].count++;
    typeMap[tp].amount += t.amount || 0;
    typeMap[tp].earned += (t.commission_earned||0) + (t.service_charge||0);
  });
  const sorted = Object.entries(typeMap).sort((a,b) => b[1].earned - a[1].earned);
  if (!sorted.length) { el.innerHTML = '<p class="empty-msg">No banking transactions this month.</p>'; return; }
  el.innerHTML = sorted.map(([tp, d]) => {
    const info = TXN_TYPES[tp] || TXN_TYPES.other;
    return `<div class="op-row">
      <div class="op-icon" style="background:${info.color}20;color:${info.color}"><i class="fas ${info.icon}"></i></div>
      <div class="op-name">${info.label}</div>
      <div class="op-stats">
        <span class="op-count">${d.count} txn</span>
        <span class="op-amount">${fmt(d.amount)}</span>
        <span class="op-commission" style="color:var(--green)">+${fmt(d.earned)}</span>
      </div>
    </div>`;
  }).join('');
}

function renderBankingTable(txns) {
  const tbody = document.getElementById('banking-tbody');
  if (!txns.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-msg">No banking transactions yet. Click "+ New Transaction" to start.</td></tr>`;
    return;
  }
  tbody.innerHTML = txns.map(t => {
    const info = TXN_TYPES[t.txn_type] || TXN_TYPES.other;
    const statusBadge = t.status==='success'?'badge-green':t.status==='pending'?'badge-orange':t.status==='failed'?'badge-red':'badge-gray';
    const earned = (t.commission_earned||0) + (t.service_charge||0);
    return `<tr>
      <td>${fmtDate(t.txn_date)}</td>
      <td>
        <div style="font-weight:700">${esc(t.customer_name||'—')}</div>
        <div style="font-size:.75rem;color:var(--text-3)">${esc(t.customer_phone||'')}${t.account_no ? ' · A/C: '+esc(t.account_no) : ''}</div>
      </td>
      <td>
        <span style="font-weight:700;color:${info.color}">
          <i class="fas ${info.icon}"></i> ${info.label}
        </span>
      </td>
      <td style="font-weight:800;font-size:1rem">${fmt(t.amount)}</td>
      <td style="color:var(--blue);font-weight:600">${fmt(t.service_charge||0)}</td>
      <td style="color:var(--green);font-weight:700">+${fmt(t.commission_earned||0)}</td>
      <td style="background:var(--green-light);color:#15803d;font-weight:800;border-radius:6px;padding:4px 8px;font-size:.85rem;text-align:center">${fmt(earned)}</td>
      <td><span class="badge ${statusBadge}">${t.status||'success'}</span></td>
      <td>
        <div style="display:flex;gap:5px">
          <button class="btn-icon btn-edit" onclick="editBankingTxn('${t.id}')" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-icon btn-delete" onclick="deleteBankingTxn('${t.id}')" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function bankingFormHTML(t = {}) {
  const type = t.txn_type || 'cash_deposit';
  return `
    <div style="display:flex;flex-direction:column;gap:12px">
      <!-- Transaction Type Selector -->
      <div class="form-row">
        <label>Transaction Type *</label>
        <div class="txn-type-grid" id="txn-type-grid">
          ${Object.entries(TXN_TYPES).map(([key, info]) => `
            <button type="button" class="txn-type-btn ${(t.txn_type||'cash_deposit')===key?'active':''}"
              data-type="${key}" onclick="selectTxnType('${key}')"
              style="--tc:${info.color}">
              <i class="fas ${info.icon}"></i>
              <span>${info.label}</span>
            </button>`).join('')}
        </div>
        <input type="hidden" id="bf-type" value="${type}" />
      </div>

      <div class="form-row-2">
        <div class="form-row">
          <label>Date *</label>
          <input type="date" id="bf-date" class="form-input" value="${t.txn_date ? t.txn_date.slice(0,10) : todayStr()}" />
        </div>
        <div class="form-row">
          <label>Transaction / Ref ID</label>
          <input type="text" id="bf-txnid" class="form-input" value="${esc(t.transaction_id||genInvoiceNo('TXN'))}" />
        </div>
      </div>

      <div class="form-row-2">
        <div class="form-row">
          <label>Customer Name *</label>
          <input type="text" id="bf-cname" class="form-input" value="${esc(t.customer_name||'')}" placeholder="Full name" />
        </div>
        <div class="form-row">
          <label>Mobile Number</label>
          <input type="tel" id="bf-phone" class="form-input" value="${esc(t.customer_phone||'')}" placeholder="10-digit number" maxlength="10" />
        </div>
      </div>

      <div class="form-row">
        <label>Account Number / Aadhaar (optional)</label>
        <input type="text" id="bf-accno" class="form-input" value="${esc(t.account_no||'')}" placeholder="Last 4 digits or full account number" />
      </div>

      <div class="form-row-2">
        <div class="form-row">
          <label>Transaction Amount (₹) *</label>
          <input type="number" id="bf-amount" class="form-input" value="${t.amount||''}" min="0" step="0.01"
            placeholder="e.g. 5000" oninput="calcBankingEarnings()" />
        </div>
        <div class="form-row">
          <label>Service Charge (₹) <small style="color:var(--text-3)">charged to customer</small></label>
          <input type="number" id="bf-charge" class="form-input" value="${t.service_charge !== undefined ? t.service_charge : (DEFAULT_CHARGES[type]||0)}"
            min="0" step="0.01" oninput="calcBankingEarnings()" />
        </div>
      </div>

      <div class="form-row">
        <label>Commission from Airtel (₹) <small style="color:var(--text-3)">auto-suggested</small></label>
        <input type="number" id="bf-comm" class="form-input" value="${t.commission_earned !== undefined ? t.commission_earned : (DEFAULT_COMMISSIONS[type]||0)}"
          min="0" step="0.01" oninput="calcBankingEarnings()" />
      </div>

      <!-- Earnings Preview -->
      <div style="background:var(--green-light);border-radius:10px;padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="text-align:center">
          <div style="font-size:.7rem;color:#15803d;font-weight:600">SERVICE CHARGE</div>
          <div id="bf-charge-preview" style="font-size:1.1rem;font-weight:800;color:var(--blue)">${fmt(t.service_charge||0)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:.7rem;color:#15803d;font-weight:600">TOTAL EARNED</div>
          <div id="bf-total-preview" style="font-size:1.1rem;font-weight:800;color:var(--green)">${fmt((t.service_charge||0)+(t.commission_earned||0))}</div>
        </div>
      </div>

      <div class="form-row-2">
        <div class="form-row">
          <label>Bank Ref No.</label>
          <input type="text" id="bf-bankref" class="form-input" value="${esc(t.bank_ref_no||'')}" placeholder="Bank reference number" />
        </div>
        <div class="form-row">
          <label>Status</label>
          <select id="bf-status" class="form-input">
            <option value="success"  ${(t.status||'success')==='success' ?'selected':''}>✅ Success</option>
            <option value="pending"  ${t.status==='pending' ?'selected':''}>⏳ Pending</option>
            <option value="failed"   ${t.status==='failed'  ?'selected':''}>❌ Failed</option>
            <option value="reversed" ${t.status==='reversed'?'selected':''}>↩️ Reversed</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <label>Notes</label>
        <input type="text" id="bf-notes" class="form-input" value="${esc(t.notes||'')}" placeholder="Any remarks…" />
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:6px">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="saveBankingTxn('${t.id||''}')">
          <i class="fas fa-save"></i> ${t.id ? 'Update' : 'Save Transaction'}
        </button>
      </div>
    </div>`;
}

function selectTxnType(type) {
  document.querySelectorAll('.txn-type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.txn-type-btn[data-type="${type}"]`)?.classList.add('active');
  const hiddenInput = document.getElementById('bf-type');
  if (hiddenInput) hiddenInput.value = type;
  // Update default service charge & commission
  const chargeEl = document.getElementById('bf-charge');
  const commEl   = document.getElementById('bf-comm');
  if (chargeEl && !parseFloat(chargeEl.value)) chargeEl.value = DEFAULT_CHARGES[type] || 0;
  if (commEl)   commEl.value = DEFAULT_COMMISSIONS[type] || 0;
  calcBankingEarnings();
}

function calcBankingEarnings() {
  const charge = parseFloat(document.getElementById('bf-charge')?.value) || 0;
  const comm   = parseFloat(document.getElementById('bf-comm')?.value)   || 0;
  const total  = charge + comm;
  const cp = document.getElementById('bf-charge-preview');
  const tp = document.getElementById('bf-total-preview');
  if (cp) cp.textContent = fmt(charge);
  if (tp) tp.textContent = fmt(total);
}

function editBankingTxn(id) {
  const t = allBankingTxns.find(x => x.id === id);
  if (!t) return;
  Modal.open('Edit Banking Transaction', bankingFormHTML(t));
}

async function saveBankingTxn(existingId) {
  const cname  = document.getElementById('bf-cname').value.trim();
  const amount = parseFloat(document.getElementById('bf-amount').value);
  if (!cname || isNaN(amount)) { toast('Customer name and amount are required.', 'error'); return; }

  const service_charge    = parseFloat(document.getElementById('bf-charge').value) || 0;
  const commission_earned = parseFloat(document.getElementById('bf-comm').value)   || 0;

  const data = {
    txn_date:           document.getElementById('bf-date').value,
    txn_type:           document.getElementById('bf-type').value,
    customer_name:      cname,
    customer_phone:     document.getElementById('bf-phone').value.trim(),
    account_no:         document.getElementById('bf-accno').value.trim(),
    amount,
    service_charge,
    commission_earned,
    transaction_id:     document.getElementById('bf-txnid').value.trim(),
    bank_ref_no:        document.getElementById('bf-bankref').value.trim(),
    status:             document.getElementById('bf-status').value,
    notes:              document.getElementById('bf-notes').value.trim()
  };

  try {
    if (existingId) {
      await API.put('banking_transactions', existingId, data);
      toast('Transaction updated!');
    } else {
      await API.post('banking_transactions', data);
      const earned = service_charge + commission_earned;
      toast(`✅ Transaction saved! Earned: ${fmt(earned)}`);
    }
    Modal.close();
    await loadBanking();
    if (typeof loadDashboard === 'function') loadDashboard();
  } catch(e) { toast('Error saving transaction.', 'error'); }
}

async function deleteBankingTxn(id) {
  if (!await confirm2('Delete this banking transaction?')) return;
  await API.delete('banking_transactions', id);
  toast('Transaction deleted.');
  await loadBanking();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-new-banking')?.addEventListener('click', () => {
    Modal.open('New Banking Transaction', bankingFormHTML());
    setTimeout(calcBankingEarnings, 50);
  });

  // Quick type buttons on the page
  document.querySelectorAll('.bnk-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      Modal.open(`New ${TXN_TYPES[type]?.label || 'Transaction'}`, bankingFormHTML({ txn_type: type }));
      setTimeout(() => { selectTxnType(type); calcBankingEarnings(); }, 50);
    });
  });

  document.getElementById('bnk-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderBankingTable(allBankingTxns.filter(t =>
      (t.customer_name||'').toLowerCase().includes(q) ||
      (t.customer_phone||'').includes(q) ||
      (t.transaction_id||'').toLowerCase().includes(q)
    ));
  });

  document.getElementById('bnk-type-filter')?.addEventListener('change', e => {
    const type = e.target.value;
    renderBankingTable(type ? allBankingTxns.filter(t => t.txn_type === type) : allBankingTxns);
  });

  document.getElementById('bnk-date-filter')?.addEventListener('change', e => {
    const d = e.target.value;
    renderBankingTable(d ? allBankingTxns.filter(t => (t.txn_date||'').slice(0,10) === d) : allBankingTxns);
  });
});
