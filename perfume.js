/* ======================================================
   notes.js — Quick Notes / Staff Board (Noori Shop)
   ====================================================== */

let allNotes = [];
let currentNoteFilter = 'all';
window.editNote        = (...a) => editNote(...a);
window.deleteNote      = (...a) => deleteNote(...a);
window.saveNote        = (...a) => saveNote(...a);
window.toggleNoteDone  = (...a) => toggleNoteDone(...a);

async function loadNotes() {
  const res = await API.get('shop_notes');
  allNotes = (res.data || []).sort((a, b) => {
    // Urgent first, then by date
    const prio = { urgent: 0, normal: 1, info: 2 };
    if (prio[a.priority] !== prio[b.priority]) return prio[a.priority] - prio[b.priority];
    return new Date(b.created_date) - new Date(a.created_date);
  });
  renderNotesGrid(allNotes);
}

function renderNotesGrid(notes) {
  const grid = document.getElementById('notes-grid');
  const filtered = currentNoteFilter === 'all' ? notes : notes.filter(n => n.priority === currentNoteFilter);
  const active = filtered.filter(n => !n.done);
  const done   = filtered.filter(n => n.done);
  const all = [...active, ...done];

  if (!all.length) {
    grid.innerHTML = `<p class="empty-msg" style="grid-column:1/-1">No notes found. Add your first note!</p>`;
    return;
  }
  grid.innerHTML = all.map((n, i) => {
    const prioDot = `<span class="note-priority-dot dot-${n.priority||'info'}"></span>`;
    const prioLabel = n.priority === 'urgent' ? '🔴 Urgent' : n.priority === 'normal' ? '🟡 Normal' : '🔵 Info';
    return `
      <div class="note-card priority-${n.priority||'info'} ${n.done?'note-done':''}"
           style="${n.done?'opacity:.55;':''}animation-delay:${i*0.05}s">
        <div class="note-card-header">
          <div>
            <div class="note-card-title">${n.done ? '<s>' : ''}${esc(n.title)}${n.done ? '</s>' : ''}</div>
            <small>${prioDot}${prioLabel}</small>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn-icon" onclick="toggleNoteDone('${n.id}', ${!n.done})" title="${n.done?'Mark Pending':'Mark Done'}">
              <i class="fas fa-${n.done ? 'undo' : 'check-circle'}" style="color:${n.done?'var(--text-3)':'var(--green)'}"></i>
            </button>
            <button class="btn-icon btn-edit" onclick="editNote('${n.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn-icon btn-delete" onclick="deleteNote('${n.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div class="note-card-body">${esc(n.body||'').replace(/\n/g,'<br>')}</div>
        <div class="note-card-footer">
          <span>${fmtDate(n.created_date)}</span>
          ${n.done ? '<span style="color:var(--green);font-weight:700">✓ Done</span>' : ''}
        </div>
      </div>`;
  }).join('');
}

function noteFormHTML(n = {}) {
  return `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="form-row">
        <label>Title *</label>
        <input type="text" id="nf-title" class="form-input" value="${esc(n.title||'')}" placeholder="e.g. Order Oud Al-Maliki from supplier" />
      </div>
      <div class="form-row">
        <label>Details</label>
        <textarea id="nf-body" class="form-input" rows="4" placeholder="Add details, phone numbers, reminders…">${esc(n.body||'')}</textarea>
      </div>
      <div class="form-row">
        <label>Priority</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.82rem">
            <input type="radio" name="nf-prio" value="urgent" ${(n.priority||'normal')==='urgent'?'checked':''} /> 🔴 Urgent
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.82rem">
            <input type="radio" name="nf-prio" value="normal" ${(n.priority||'normal')==='normal'?'checked':''} /> 🟡 Normal
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.82rem">
            <input type="radio" name="nf-prio" value="info"   ${(n.priority||'normal')==='info'?'checked':''} /> 🔵 Info
          </label>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:6px">
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="saveNote('${n.id||''}')">
          <i class="fas fa-save"></i> ${n.id ? 'Update' : 'Add Note'}
        </button>
      </div>
    </div>`;
}

function editNote(id) {
  const n = allNotes.find(x => x.id === id);
  if (!n) return;
  Modal.open('Edit Note', noteFormHTML(n));
}

async function saveNote(existingId) {
  const title = document.getElementById('nf-title').value.trim();
  if (!title) { toast('Title is required.', 'error'); return; }
  const priority = document.querySelector('input[name="nf-prio"]:checked')?.value || 'normal';
  const data = {
    title,
    body: document.getElementById('nf-body').value.trim(),
    priority,
    created_date: existingId ? (allNotes.find(n => n.id === existingId)?.created_date || new Date().toISOString()) : new Date().toISOString(),
    done: existingId ? (allNotes.find(n => n.id === existingId)?.done || false) : false
  };
  try {
    if (existingId) {
      await API.put('shop_notes', existingId, data);
      toast('Note updated!');
    } else {
      await API.post('shop_notes', data);
      toast('Note saved! 📝');
    }
    Modal.close();
    await loadNotes();
  } catch (err) { toast('Error saving note.', 'error'); }
}

async function toggleNoteDone(id, doneState) {
  await API.patch('shop_notes', id, { done: doneState });
  toast(doneState ? '✓ Marked as done!' : 'Marked as pending.');
  await loadNotes();
}

async function deleteNote(id) {
  if (!await confirm2('Delete this note?')) return;
  await API.delete('shop_notes', id);
  toast('Note deleted.');
  await loadNotes();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-add-note').addEventListener('click', () => {
    Modal.open('Add Quick Note', noteFormHTML());
  });

  document.getElementById('notes-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderNotesGrid(allNotes.filter(n =>
      (n.title||'').toLowerCase().includes(q) ||
      (n.body||'').toLowerCase().includes(q)
    ));
  });

  // Priority filter tabs in notes
  document.querySelectorAll('#page-notes .filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#page-notes .filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentNoteFilter = btn.dataset.priority;
      renderNotesGrid(allNotes);
    });
  });
});
