/* ======================================================
   perfume.js — Perfume Creator & Custom Blend Logger
   ====================================================== */

let allRecipes = [];
let recipeIngredients = [];
window.addIngredientRow    = (...a) => addIngredientRow(...a);
window.removeIngredientRow = (...a) => removeIngredientRow(...a);
window.updateBlendBar      = (...a) => updateBlendBar(...a);
window.loadRecipeForEdit   = (...a) => loadRecipeForEdit(...a);
window.deleteRecipe        = (...a) => deleteRecipe(...a);

async function loadRecipes() {
  const res = await API.get('perfume_recipes');
  allRecipes = (res.data || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  renderRecipesList(allRecipes);
}

function renderRecipesList(recipes) {
  const container = document.getElementById('recipes-list');
  if (!recipes.length) {
    container.innerHTML = `<p class="empty-msg">No recipes saved yet. Create your first blend!</p>`;
    return;
  }
  container.innerHTML = recipes.map(r => {
    const ingredients = safeJSON(r.ingredients, []);
    return `<div class="recipe-card">
      <div class="recipe-card-header">
        <div>
          <div class="recipe-card-title">
            ${r.is_favourite ? '⭐ ' : ''}${esc(r.recipe_name)}
          </div>
          ${r.customer_name ? `<div class="recipe-card-customer"><i class="fas fa-user"></i> ${esc(r.customer_name)}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span style="font-size:.75rem;color:var(--text-3)">${fmtDate(r.created_date)}</span>
          <button class="btn-icon btn-edit" onclick="loadRecipeForEdit('${r.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-icon btn-delete" onclick="deleteRecipe('${r.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div style="font-size:.78rem;color:var(--text-2);margin-bottom:6px">
        <i class="fas fa-flask"></i> ${r.total_volume_ml || '?'}ml blend
      </div>
      <div class="recipe-ingredients">
        ${ingredients.map(i => `<span class="ingredient-pill">${esc(i.name)} ${i.percent}%</span>`).join('')}
      </div>
      ${r.notes ? `<div style="margin-top:8px;font-size:.75rem;color:var(--text-3);font-style:italic">${esc(r.notes)}</div>` : ''}
    </div>`;
  }).join('');
}

function addIngredientRow(item = {}) {
  // Get bulk attar items from inventory
  const attarItems = (typeof allInventory !== 'undefined' ? allInventory : [])
    .filter(i => ['attar_bulk','attar_variant'].includes(i.category));

  const idx = recipeIngredients.length;
  const rowDiv = document.createElement('div');
  rowDiv.className = 'ingredient-row';
  rowDiv.id = `ri-row-${idx}`;
  rowDiv.innerHTML = `
    <select class="ri-base" style="flex:3;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:.8rem;background:var(--surface)">
      <option value="">-- Select Attar --</option>
      ${attarItems.map(a => `<option value="${esc(a.name)}" ${item.name===a.name?'selected':''}>${esc(a.name)}</option>`).join('')}
      <option value="__custom__" ${!attarItems.find(a=>a.name===item.name)&&item.name?'selected':''}>Custom…</option>
    </select>
    <input type="text" class="ri-custom-name" placeholder="Custom name"
      style="flex:2;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:.8rem;${!item.name||attarItems.find(a=>a.name===item.name)?'display:none':''}"
      value="${esc(item.customName||item.name||'')}" />
    <input type="number" class="ri-percent" placeholder="%" min="0" max="100" step="0.1"
      style="flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:.8rem;text-align:center"
      value="${item.percent||''}" oninput="updateBlendBar()" />
    <span style="font-size:.78rem;color:var(--text-3)">%</span>
    <button type="button" class="ingredient-remove" onclick="removeIngredientRow(${idx})"><i class="fas fa-times"></i></button>`;

  rowDiv.querySelector('.ri-base').addEventListener('change', function() {
    const customInput = rowDiv.querySelector('.ri-custom-name');
    customInput.style.display = this.value === '__custom__' ? '' : 'none';
  });

  document.getElementById('ingredients-list').appendChild(rowDiv);
  recipeIngredients.push(rowDiv);
  updateBlendBar();
}

function removeIngredientRow(idx) {
  const row = document.getElementById(`ri-row-${idx}`);
  if (row) row.remove();
  updateBlendBar();
}

function updateBlendBar() {
  const rows = document.querySelectorAll('#ingredients-list .ingredient-row');
  let total = 0;
  rows.forEach(row => {
    total += parseFloat(row.querySelector('.ri-percent')?.value) || 0;
  });
  total = Math.min(total, 100);
  const bar = document.getElementById('blend-bar');
  const label = document.getElementById('blend-percent-total');
  bar.style.width = total + '%';
  label.textContent = total.toFixed(1) + '%';
  if (total > 100) {
    bar.classList.add('over');
    label.style.color = 'var(--red)';
  } else {
    bar.classList.remove('over');
    label.style.color = '';
  }
}

function collectIngredients() {
  const rows = document.querySelectorAll('#ingredients-list .ingredient-row');
  const result = [];
  rows.forEach(row => {
    const select = row.querySelector('.ri-base');
    const customInput = row.querySelector('.ri-custom-name');
    const percent = parseFloat(row.querySelector('.ri-percent')?.value) || 0;
    const name = select?.value === '__custom__' ? (customInput?.value.trim() || '') : (select?.value || '');
    if (name && percent > 0) result.push({ name, percent });
  });
  return result;
}

async function saveRecipe() {
  const name = document.getElementById('recipe-name').value.trim();
  if (!name) { toast('Recipe name is required.', 'error'); return; }
  const ingredients = collectIngredients();
  if (!ingredients.length) { toast('Add at least one ingredient.', 'error'); return; }

  const custSearch = document.getElementById('recipe-customer-search').value.trim();
  const customer = allCustomers.find(c => c.name.toLowerCase() === custSearch.toLowerCase());

  const data = {
    recipe_name: name,
    customer_id: customer?.id || '',
    customer_name: customer?.name || custSearch,
    ingredients: JSON.stringify(ingredients),
    total_volume_ml: parseFloat(document.getElementById('recipe-volume').value) || 0,
    notes: document.getElementById('recipe-notes').value.trim(),
    created_date: new Date().toISOString().slice(0, 10),
    is_favourite: document.getElementById('recipe-fav').checked
  };

  const editId = document.getElementById('recipe-edit-id')?.value;
  try {
    if (editId) {
      await API.put('perfume_recipes', editId, data);
      toast('Recipe updated!');
      const hiddenInput = document.getElementById('recipe-edit-id');
      if (hiddenInput) hiddenInput.value = '';
      document.getElementById('btn-save-recipe').innerHTML = '<i class="fas fa-save"></i> Save Recipe';
    } else {
      await API.post('perfume_recipes', data);
      toast('Recipe saved! 🌺');
    }
    clearRecipeForm();
    await loadRecipes();
  } catch (e) { toast('Error saving recipe.', 'error'); }
}

function clearRecipeForm() {
  document.getElementById('recipe-name').value = '';
  document.getElementById('recipe-customer-search').value = '';
  document.getElementById('recipe-volume').value = '';
  document.getElementById('recipe-notes').value = '';
  document.getElementById('recipe-fav').checked = false;
  document.getElementById('ingredients-list').innerHTML = '';
  recipeIngredients = [];
  updateBlendBar();
}

async function loadRecipeForEdit(id) {
  const r = allRecipes.find(x => x.id === id);
  if (!r) return;
  document.getElementById('recipe-name').value = r.recipe_name || '';
  document.getElementById('recipe-customer-search').value = r.customer_name || '';
  document.getElementById('recipe-volume').value = r.total_volume_ml || '';
  document.getElementById('recipe-notes').value = r.notes || '';
  document.getElementById('recipe-fav').checked = !!r.is_favourite;

  // Clear and re-add ingredients
  document.getElementById('ingredients-list').innerHTML = '';
  recipeIngredients = [];
  const ingredients = safeJSON(r.ingredients, []);
  ingredients.forEach(i => addIngredientRow(i));

  // Set edit ID
  let hiddenInput = document.getElementById('recipe-edit-id');
  if (!hiddenInput) {
    hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = 'recipe-edit-id';
    document.getElementById('btn-save-recipe').before(hiddenInput);
  }
  hiddenInput.value = id;
  document.getElementById('btn-save-recipe').innerHTML = '<i class="fas fa-save"></i> Update Recipe';

  // Scroll to form
  document.querySelector('.perfume-form-card').scrollIntoView({ behavior: 'smooth' });
}

async function deleteRecipe(id) {
  if (!await confirm2('Delete this recipe?')) return;
  await API.delete('perfume_recipes', id);
  toast('Recipe deleted.');
  await loadRecipes();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-add-ingredient').addEventListener('click', () => addIngredientRow());
  document.getElementById('btn-save-recipe').addEventListener('click', saveRecipe);

  document.getElementById('recipe-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    renderRecipesList(allRecipes.filter(r =>
      (r.recipe_name||'').toLowerCase().includes(q) ||
      (r.customer_name||'').toLowerCase().includes(q)
    ));
  });

  // Customer autocomplete for recipe
  const custInput = document.getElementById('recipe-customer-search');
  custInput.addEventListener('input', () => {
    // just use native datalist — will wire up below after customers load
  });
});

// Called after customers load to add datalist
function wireRecipeCustomerAutocomplete() {
  let dl = document.getElementById('recipe-customer-datalist');
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = 'recipe-customer-datalist';
    document.body.appendChild(dl);
    document.getElementById('recipe-customer-search').setAttribute('list', 'recipe-customer-datalist');
  }
  dl.innerHTML = allCustomers.map(c => `<option value="${esc(c.name)}">`).join('');
}
