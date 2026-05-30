/* ======================================================
   suppliers.js — Supplier Management
   ====================================================== */

let allSuppliers = [];
window.editSupplier   = (...a) => editSupplier(...a);
window.deleteSupplier = (...a) => deleteSupplier(...a);
window.saveSupplier   = (...a) => saveSupplier(...a);

async function loadSuppliers() {
  const res = await API.get('suppliers');
  allSuppliers = (res.data || []).filter(s => s.active !== false);
  renderSuppliersGrid(allSuppliers);
}

function renderSuppliersGrid(suppliers) {
  const grid = document.getElementById('suppliers-grid');
  if (!suppliers.length) {
    grid.innerHTML = `<p class="empty-msg" style="grid-column:1/-1">No suppliers added yet.</p>`;
    return;
  }
  grid.innerHTML = suppliers.map(s => {
    const color = avatarColor(s.name);
    const initials = avatarInitials(s.name);
    return `<div class="supplier-card">
      <div class="supplier-card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="supplier-avatar" style="background:${color}">${esc(initials)}</div>
          <div>
            <div class="supplier-name">${esc(s.name)}</div>
            ${s.category ? `<span class="badge badge-gray" style="font-size:.65rem">${esc(s.category)}</span>` : ''}
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-icon btn-edit" title="Edit" onclick="editSupplier('${s.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-icon btn-delete" title="Delete" onclick="deleteSupplier('${s.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="supplier-info">
        ${s.contact_person ? `<div class="info-row"><i class="fas fa-user"></i>${esc(s.contact_person)}</div>` : ''}
        ${s.phone ? `<div class="info-row"><i class="fas fa-phone"></i><a href="tel:${esc(s.phone)}" style="color:var(--primary)">${esc(s.phone)}</a></div>` : ''}
        ${s.email ? `<div class="info-row"><i class="fas fa-envelope"></i>${esc(s.email)}</div>` : ''}
        ${s.address ? `<div class="info-row"><i class="fas fa-map-marker-alt"></i>${esc(s.address)}</div>` : ''}
        ${s.notes ? `<div class="info-row" style="color:var(--text-3);font-style:italic"><i class="fas fa-sticky-note"></i>${esc(s.notes)}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function supplierFormHTML(s = {}) {
  return `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="form-row">
        <label>Supplier / Company Name *</label>
        <input type="text" id="sf-name" class="form-input" value="${esc(s.name||'')}" placeholder="e.g. Al-Noor Attar House" />
      </div>
      <div class="form-row-2">
        <div class="form-row">
          <label>Contact Person</label>
          <input type="text" id="sf-contact" class="form-input" value="${esc(s.contact_person||'')}" placeholder="Name" />
        </div>
        <div class="form-row">
          <label>Category</label>
          <input type="text" id="sf-cat" class="form-input" value="${esc(s.category||'')}" placeholder="e.g. Attar, Mobile, Bottles" />
        </div>
      </div>
      <div class="form-row-2">
        <div class="form-row">
          <label>Phone</label>
          <input type="tel" id="sf-phone" class="form-input" value="${esc(s.phone||'')}" placeholder="+91  XXXXX XXXXX" />
        </div>
        <div class="form-row">
          <label>Email</label>
          <input type="email" id="sf-email" class="form-input" value="${esc(s.email||'')}" placeholder="email@example.com" />
        </div>
      </div>
      <div class="form-row">
        <label>Address</label>
        <input type="text" id="sf-address" class="form-input" value="${esc(s.address||'')}" placeholder="City, State" />
      </div>
      <div class="form-row">
        <label>Notes</label>
        <textarea id="sf-notes" class="form-input" rows="2" placeholder="Payment terms, delivery info…">${esc(s.notes||'')}</textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:6px">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="saveSupplier('${s.id||''}')">
          <i class="fas fa-save"></i> ${s.id ? 'Update' : 'Add Supplier'}
        </button>
      </div>
    </div>`;
}

function editSupplier(id) {
  const s = allSuppliers.find(x => x.id === id);
  if (!s) return;
  Modal.open('Edit Supplier', supplierFormHTML(s));
}

async function saveSupplier(existingId) {
  const name = document.getElementById('sf-name').value.trim();
  if (!name) { toast('Supplier name is required.', 'error'); return; }
  const data = {
    name,
    contact_person: document.getElementById('sf-contact').value.trim(),
    category: document.getElementById('sf-cat').value.trim(),
    phone: document.getElementById('sf-phone').value.trim(),
    email: document.getElementById('sf-email').value.trim(),
    address: document.getElementById('sf-address').value.trim(),
    notes: document.getElementById('sf-notes').value.trim(),
    active: true
  };
  try {
    if (existingId) {
      await API.put('suppliers', existingId, data);
      toast('Supplier updated!');
    } else {
      await API.post('suppliers', data);
      toast('Supplier added!');
    }
    Modal.close();
    await loadSuppliers();
  } catch (e) { toast('Error saving supplier.', 'error'); }
}

async function deleteSupplier(id) {
  if (!await confirm2('Delete this supplier?')) return;
  await API.patch('suppliers', id, { active: false });
  toast('Supplier removed.');
  await loadSuppliers();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-add-supplier').addEventListener('click', () => {
    Modal.open('Add New Supplier', supplierFormHTML());
  });
  document.getElementById('sup-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderSuppliersGrid(allSuppliers.filter(s =>
      (s.name||'').toLowerCase().includes(q) || (s.category||'').toLowerCase().includes(q)
    ));
  });
});
