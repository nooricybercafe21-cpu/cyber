/* ======================================================
   expenses.js — Daily Expense Tracker (Noori Shop)
   ====================================================== */

let allExpenses = [];
window.editExpense   = (...a) => editExpense(...a);
window.deleteExpense = (...a) => deleteExpense(...a);
window.saveExpense   = (...a) => saveExpense(...a);

const EXP_CAT_LABELS = {
  rent: '🏠 Rent', electricity: '⚡ Electricity', internet: '🌐 Internet',
  salary: '👤 Salary', purchase: '📦 Stock Purchase', maintenance: '🔧 Maintenance', other: '📌 Other'
};
const EXP_CAT_COLORS = {
  rent: 'badge-purple', electricity: 'badge-orange', internet: 'badge-blue',
  salary: 'badge-teal', purchase: 'badge-green', maintenance: 'badge-gray', other: 'badge-gray'
};

async function loadExpenses() {
  const res = await API.get('expenses');
  allExpenses = (res.data || []).sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
  renderExpensesTable(allExpenses);
  renderExpenseSummary();
}

function renderExpenseSummary() {
  const today = todayStr();
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = today.slice(0, 7) + '-01';

  const todayTotal  = allExpenses.filter(e => (e.expense_date||'').slice(0,10) === today).reduce((s,e) => s + (e.amount||0), 0);
  const weekTotal   = allExpenses.filter(e => new Date(e.expense_date) >= weekAgo).reduce((s,e) => s + (e.amount||0), 0);
  const monthTotal  = allExpenses.filter(e => (e.expense_date||'') >= monthStart).reduce((s,e) => s + (e.amount||0), 0);

  const el = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  el('exp-today-total', fmt(todayTotal));
  el('exp-week-total',  fmt(weekTotal));
  el('exp-month-total', fmt(monthTotal));
}

function renderExpensesTable(expenses) {
  const tbody = document.getElementById('expenses-tbody');
  if (!expenses.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-msg">No expenses logged. Tap "+ Log Expense" to add your first entry.</td></tr>`;
    return;
  }
  tbody.innerHTML = expenses.map(e => `
    <tr>
      <td>${fmtDate(e.expense_date)}</td>
      <td><span class="badge ${EXP_CAT_COLORS[e.category]||'badge-gray'}">${EXP_CAT_LABELS[e.category]||e.category}</span></td>
      <td>${esc(e.description||'—')}</td>
      <td style="font-weight:700;color:var(--red)">${fmt(e.amount)}</td>
      <td><span class="badge badge-gray">${(e.paid_via||'cash').toUpperCase()}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn-icon btn-edit" onclick="editExpense('${e.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-icon btn-delete" onclick="deleteExpense('${e.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function expenseFormHTML(e = {}) {
  return `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="form-row-2">
        <div class="form-row">
          <label>Date *</label>
          <input type="date" id="ef-date" class="form-input" value="${e.expense_date ? e.expense_date.slice(0,10) : todayStr()}" />
        </div>
        <div class="form-row">
          <label>Category *</label>
          <select id="ef-cat" class="form-input">
            ${Object.entries(EXP_CAT_LABELS).map(([k,v]) => `<option value="${k}" ${e.category===k?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <label>Description *</label>
        <input type="text" id="ef-desc" class="form-input" value="${esc(e.description||'')}" placeholder="e.g. Monthly internet bill – Airtel" />
      </div>
      <div class="form-row-2">
        <div class="form-row">
          <label>Amount (₹) *</label>
          <input type="number" id="ef-amount" class="form-input" value="${e.amount||''}" min="0" step="0.01" placeholder="0.00" />
        </div>
        <div class="form-row">
          <label>Paid Via</label>
          <select id="ef-paid" class="form-input">
            <option value="cash" ${e.paid_via==='cash'?'selected':''}>Cash</option>
            <option value="upi"  ${e.paid_via==='upi' ?'selected':''}>UPI</option>
            <option value="bank" ${e.paid_via==='bank'?'selected':''}>Bank Transfer</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label>Notes</label>
        <textarea id="ef-notes" class="form-input" rows="2" placeholder="Any extra details…">${esc(e.notes||'')}</textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:6px">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="saveExpense('${e.id||''}')">
          <i class="fas fa-save"></i> ${e.id ? 'Update' : 'Save Expense'}
        </button>
      </div>
    </div>`;
}

function editExpense(id) {
  const e = allExpenses.find(x => x.id === id);
  if (!e) return;
  Modal.open('Edit Expense', expenseFormHTML(e));
}

async function saveExpense(existingId) {
  const desc = document.getElementById('ef-desc').value.trim();
  const amount = parseFloat(document.getElementById('ef-amount').value);
  if (!desc || isNaN(amount)) { toast('Description and amount are required.', 'error'); return; }
  const data = {
    expense_date: document.getElementById('ef-date').value,
    category: document.getElementById('ef-cat').value,
    description: desc,
    amount,
    paid_via: document.getElementById('ef-paid').value,
    notes: document.getElementById('ef-notes').value.trim()
  };
  try {
    if (existingId) {
      await API.put('expenses', existingId, data);
      toast('Expense updated!');
    } else {
      await API.post('expenses', data);
      toast('Expense logged! 💸');
    }
    Modal.close();
    await loadExpenses();
  } catch (err) { toast('Error saving expense.', 'error'); }
}

async function deleteExpense(id) {
  if (!await confirm2('Delete this expense entry?')) return;
  await API.delete('expenses', id);
  toast('Expense deleted.');
  await loadExpenses();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-add-expense').addEventListener('click', () => {
    Modal.open('Log New Expense', expenseFormHTML());
  });

  document.getElementById('exp-date-filter').addEventListener('change', e => {
    const d = e.target.value;
    const cat = document.getElementById('exp-cat-filter').value;
    renderExpensesTable(allExpenses.filter(exp =>
      (!d || (exp.expense_date||'').slice(0,10) === d) &&
      (!cat || exp.category === cat)
    ));
  });

  document.getElementById('exp-cat-filter').addEventListener('change', e => {
    const cat = e.target.value;
    const d = document.getElementById('exp-date-filter').value;
    renderExpensesTable(allExpenses.filter(exp =>
      (!d || (exp.expense_date||'').slice(0,10) === d) &&
      (!cat || exp.category === cat)
    ));
  });
});
