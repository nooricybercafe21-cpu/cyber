/* ======================================================
   recharge.js — Mobile Recharge & DTH Log
   Noori Cyber Cafe & Noori Perfume
   ====================================================== */

let allRecharges = [];
window.editRecharge          = (...a) => editRecharge(...a);
window.deleteRecharge        = (...a) => deleteRecharge(...a);
window.saveRecharge          = (...a) => saveRecharge(...a);
window.autoFillCommission    = (...a) => autoFillCommission(...a);
window.calcRechargeCommission= (...a) => calcRechargeCommission(...a);

const OPERATORS = ['Airtel','Jio','Vi','BSNL','Airtel DTH','Dish TV','Tata Play','Sun Direct','Videocon D2H'];
const RECHARGE_TYPES = ['Prepaid','Postpaid','DTH','Data Card','FASTag'];

const OP_COLORS = {
  'Airtel':        '#ef4444',
  'Jio':           '#1d4ed8',
  'Vi':            '#7c3aed',
  'BSNL':          '#15803d',
  'Airtel DTH':    '#dc2626',
  'Dish TV':       '#ea580c',
  'Tata Play':     '#0369a1',
  'Sun Direct':    '#d97706',
  'Videocon D2H':  '#6d28d9'
};

const OP_ICONS = {
  'Airtel':'📱','Jio':'🔵','Vi':'💜','BSNL':'🟢',
  'Airtel DTH':'📡','Dish TV':'📡','Tata Play':'📡','Sun Direct':'📡','Videocon D2H':'📡'
};

// Default commission rates % per operator
const DEFAULT_COMMISSION = {
  'Airtel':2.5,'Jio':2,'Vi':2.5,'BSNL':2,
  'Airtel DTH':2,'Dish TV':2,'Tata Play':2,'Sun Direct':2,'Videocon D2H':2
};

async function loadRecharges() {
  const res = await API.get('recharges');
  allRecharges = (res.data || []).sort((a, b) => new Date(b.recharge_date) - new Date(a.recharge_date));
  renderRechargesTable(allRecharges);
  renderRechargeSummary();
}

function renderRechargeSummary() {
  const today = todayStr();
  const monthStart = today.slice(0,7) + '-01';

  const todayData  = allRecharges.filter(r => (r.recharge_date||'').slice(0,10) === today && r.status === 'success');
  const monthData  = allRecharges.filter(r => (r.recharge_date||'') >= monthStart && r.status === 'success');

  const todayAmt   = todayData.reduce((s,r) => s + (r.plan_amount||0), 0);
  const monthAmt   = monthData.reduce((s,r) => s + (r.plan_amount||0), 0);
  const todayComm  = todayData.reduce((s,r) => s + (r.commission_earned||0), 0);
  const monthComm  = monthData.reduce((s,r) => s + (r.commission_earned||0), 0);
  const totalCount = monthData.length;

  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('rch-today-amt',   fmt(todayAmt));
  set('rch-month-amt',   fmt(monthAmt));
  set('rch-today-comm',  fmt(todayComm));
  set('rch-month-comm',  fmt(monthComm));
  set('rch-month-count', totalCount);

  // Operator breakdown
  renderOperatorBreakdown(monthData);
}

function renderOperatorBreakdown(data) {
  const el = document.getElementById('rch-operator-breakdown');
  if (!el) return;
  const opMap = {};
  data.forEach(r => {
    const op = r.operator || 'Other';
    if (!opMap[op]) opMap[op] = { count: 0, amount: 0, commission: 0 };
    opMap[op].count++;
    opMap[op].amount += r.plan_amount || 0;
    opMap[op].commission += r.commission_earned || 0;
  });
  const sorted = Object.entries(opMap).sort((a,b) => b[1].amount - a[1].amount);
  if (!sorted.length) { el.innerHTML = '<p class="empty-msg">No recharges this month.</p>'; return; }
  el.innerHTML = sorted.map(([op, d]) => `
    <div class="op-row">
      <div class="op-icon" style="background:${OP_COLORS[op]||'#5b4fcf'}20;color:${OP_COLORS[op]||'#5b4fcf'}">${OP_ICONS[op]||'📱'}</div>
      <div class="op-name">${esc(op)}</div>
      <div class="op-stats">
        <span class="op-count">${d.count} recharges</span>
        <span class="op-amount">${fmt(d.amount)}</span>
        <span class="op-commission" style="color:var(--green)">+${fmt(d.commission)}</span>
      </div>
    </div>`).join('');
}

function renderRechargesTable(recharges) {
  const tbody = document.getElementById('recharges-tbody');
  if (!recharges.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-msg">No recharges logged yet. Click "+ New Recharge" to start.</td></tr>`;
    return;
  }
  tbody.innerHTML = recharges.map(r => {
    const statusBadge = r.status==='success'?'badge-green':r.status==='pending'?'badge-orange':r.status==='failed'?'badge-red':'badge-gray';
    const opColor = OP_COLORS[r.operator] || '#5b4fcf';
    return `<tr>
      <td>${fmtDate(r.recharge_date)}</td>
      <td>
        <div style="font-weight:700">${esc(r.customer_name||'—')}</div>
        <div style="font-size:.75rem;color:var(--text-3)">${esc(r.customer_phone||'')}</div>
      </td>
      <td>
        <span style="font-weight:700;color:${opColor}">${OP_ICONS[r.operator]||'📱'} ${esc(r.operator||'—')}</span>
        <div style="font-size:.72rem;color:var(--text-3)">${esc(r.recharge_type||'')}</div>
      </td>
      <td style="font-weight:800;color:var(--primary);font-size:1rem">${fmt(r.plan_amount)}</td>
      <td style="color:var(--green);font-weight:700">+${fmt(r.commission_earned)}</td>
      <td style="font-size:.75rem;color:var(--text-3)">${esc(r.recharge_no||'—')}</td>
      <td style="font-size:.72rem;color:var(--text-3)">${esc(r.transaction_id||'—')}</td>
      <td><span class="badge ${statusBadge}">${r.status||'success'}</span></td>
      <td>
        <div style="display:flex;gap:5px">
          <button class="btn-icon btn-edit" onclick="editRecharge('${r.id}')" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-icon btn-delete" onclick="deleteRecharge('${r.id}')" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function rechargeFormHTML(r = {}) {
  const autoComm = r.operator ? DEFAULT_COMMISSION[r.operator] || 2 : 2;
  return `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="form-row-2">
        <div class="form-row">
          <label>Date *</label>
          <input type="date" id="rf-date" class="form-input" value="${r.recharge_date ? r.recharge_date.slice(0,10) : todayStr()}" />
        </div>
        <div class="form-row">
          <label>Recharge No. / Receipt No.</label>
          <input type="text" id="rf-rno" class="form-input" value="${esc(r.recharge_no || genInvoiceNo('RCH'))}" />
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-row">
          <label>Customer Name</label>
          <input type="text" id="rf-cname" class="form-input" value="${esc(r.customer_name||'')}" placeholder="Customer name" />
        </div>
        <div class="form-row">
          <label>Mobile Number *</label>
          <input type="tel" id="rf-phone" class="form-input" value="${esc(r.customer_phone||'')}" placeholder="10-digit number" maxlength="10" />
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-row">
          <label>Operator *</label>
          <select id="rf-operator" class="form-input" onchange="autoFillCommission(this.value)">
            ${OPERATORS.map(o => `<option value="${o}" ${r.operator===o?'selected':''}>${OP_ICONS[o]||'📱'} ${o}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label>Type *</label>
          <select id="rf-type" class="form-input">
            ${RECHARGE_TYPES.map(t => `<option value="${t}" ${r.recharge_type===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-row">
          <label>Plan Amount (₹) *</label>
          <input type="number" id="rf-amount" class="form-input" value="${r.plan_amount||''}" min="0" step="0.01"
            placeholder="e.g. 239" oninput="calcRechargeCommission()" />
        </div>
        <div class="form-row">
          <label>Commission % <small style="color:var(--text-3)">(auto-filled)</small></label>
          <input type="number" id="rf-commrate" class="form-input" value="${r.commission_rate !== undefined ? r.commission_rate : autoComm}"
            min="0" max="100" step="0.1" oninput="calcRechargeCommission()" />
        </div>
      </div>
      <div style="background:var(--green-light);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:.82rem;color:#15803d;font-weight:600">💰 Commission Earned</span>
        <span id="rf-comm-preview" style="font-size:1.1rem;font-weight:800;color:var(--green)">${fmt(r.commission_earned||0)}</span>
      </div>
      <div class="form-row-2">
        <div class="form-row">
          <label>Transaction ID</label>
          <input type="text" id="rf-txnid" class="form-input" value="${esc(r.transaction_id||'')}" placeholder="From recharge portal" />
        </div>
        <div class="form-row">
          <label>Status</label>
          <select id="rf-status" class="form-input">
            <option value="success" ${(r.status||'success')==='success'?'selected':''}>✅ Success</option>
            <option value="pending" ${r.status==='pending'?'selected':''}>⏳ Pending</option>
            <option value="failed"  ${r.status==='failed' ?'selected':''}>❌ Failed</option>
            <option value="refunded"${r.status==='refunded'?'selected':''}>↩️ Refunded</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label>Notes</label>
        <input type="text" id="rf-notes" class="form-input" value="${esc(r.notes||'')}" placeholder="Any remarks…" />
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:6px">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="saveRecharge('${r.id||''}')">
          <i class="fas fa-save"></i> ${r.id ? 'Update' : 'Save Recharge'}
        </button>
      </div>
    </div>`;
}

function autoFillCommission(operator) {
  const rate = DEFAULT_COMMISSION[operator] || 2;
  const rateEl = document.getElementById('rf-commrate');
  if (rateEl) { rateEl.value = rate; calcRechargeCommission(); }
}

function calcRechargeCommission() {
  const amount = parseFloat(document.getElementById('rf-amount')?.value) || 0;
  const rate   = parseFloat(document.getElementById('rf-commrate')?.value) || 0;
  const comm   = parseFloat(((amount * rate) / 100).toFixed(2));
  const preview = document.getElementById('rf-comm-preview');
  if (preview) preview.textContent = fmt(comm);
}

function editRecharge(id) {
  const r = allRecharges.find(x => x.id === id);
  if (!r) return;
  Modal.open('Edit Recharge', rechargeFormHTML(r));
}

async function saveRecharge(existingId) {
  const phone  = document.getElementById('rf-phone').value.trim();
  const amount = parseFloat(document.getElementById('rf-amount').value);
  if (!phone || isNaN(amount)) { toast('Mobile number and amount are required.', 'error'); return; }

  const rate = parseFloat(document.getElementById('rf-commrate').value) || 0;
  const commission_earned = parseFloat(((amount * rate) / 100).toFixed(2));

  const data = {
    recharge_date:    document.getElementById('rf-date').value,
    recharge_no:      document.getElementById('rf-rno').value.trim(),
    customer_name:    document.getElementById('rf-cname').value.trim(),
    customer_phone:   phone,
    operator:         document.getElementById('rf-operator').value,
    recharge_type:    document.getElementById('rf-type').value,
    plan_amount:      amount,
    commission_rate:  rate,
    commission_earned,
    transaction_id:   document.getElementById('rf-txnid').value.trim(),
    status:           document.getElementById('rf-status').value,
    notes:            document.getElementById('rf-notes').value.trim()
  };

  try {
    if (existingId) {
      await API.put('recharges', existingId, data);
      toast('Recharge updated!');
    } else {
      await API.post('recharges', data);
      toast(`✅ Recharge saved! Commission: ${fmt(commission_earned)}`);
    }
    Modal.close();
    await loadRecharges();
    if (typeof loadDashboard === 'function') loadDashboard();
  } catch(e) { toast('Error saving recharge.', 'error'); }
}

async function deleteRecharge(id) {
  if (!await confirm2('Delete this recharge record?')) return;
  await API.delete('recharges', id);
  toast('Recharge deleted.');
  await loadRecharges();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-new-recharge')?.addEventListener('click', () => {
    Modal.open('New Mobile Recharge', rechargeFormHTML());
    setTimeout(calcRechargeCommission, 50);
  });

  // Quick recharge buttons on the page
  document.querySelectorAll('.op-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const op = btn.dataset.op;
      Modal.open(`New ${op} Recharge`, rechargeFormHTML({ operator: op, commission_rate: DEFAULT_COMMISSION[op]||2 }));
      setTimeout(() => autoFillCommission(op), 50);
    });
  });

  document.getElementById('rch-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderRechargesTable(allRecharges.filter(r =>
      (r.customer_phone||'').includes(q) ||
      (r.customer_name||'').toLowerCase().includes(q) ||
      (r.operator||'').toLowerCase().includes(q) ||
      (r.recharge_no||'').toLowerCase().includes(q)
    ));
  });

  document.getElementById('rch-op-filter')?.addEventListener('change', e => {
    const op = e.target.value;
    const q  = document.getElementById('rch-search').value.toLowerCase();
    renderRechargesTable(allRecharges.filter(r =>
      (!op || r.operator === op) &&
      ((r.customer_phone||'').includes(q) || (r.customer_name||'').toLowerCase().includes(q))
    ));
  });

  document.getElementById('rch-date-filter')?.addEventListener('change', e => {
    const d = e.target.value;
    renderRechargesTable(d ? allRecharges.filter(r => (r.recharge_date||'').slice(0,10) === d) : allRecharges);
  });
});
