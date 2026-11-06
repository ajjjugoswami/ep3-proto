'use strict';

const productList = { sort: 'id', dir: 1, page: 0, size: 10, ...readListState('productList') };

function renderProducts() {
  document.title = 'Products · EP3 Admin';
  listCtl = { state: productList, refresh: refreshProducts, noun: 'products' };
  $('#view').innerHTML = `<div class="detail-page">
    ${moduleHeadHTML('products', `<a class="btn btn-primary" href="product.html?mode=new">${icon('plus')}Add New Product</a>`)}
    <div class="detail-scroll list-view"><section class="card card-clip list-card" id="productResults" aria-label="Products"></section></div>
  </div>`;
  refreshProducts();
}

function refreshProducts() {
  saveListState('productList', productList);
  const rows = sortRows(market.products, p => p[productList.sort], productList.dir);
  if (!rows.length) {
    $('#productResults').innerHTML = `<div class="empty"><h3>No products yet</h3><p>Add a product to start creating instruments.</p><a class="btn btn-primary" href="product.html?mode=new">${icon('plus')}Add New Product</a></div>`;
    return;
  }
  const pages = Math.max(1, Math.ceil(rows.length / productList.size));
  productList.page = Math.min(productList.page, pages - 1);
  const start = productList.page * productList.size;
  patchListTable($('#productResults'), `<div class="table-scroll"><table class="tbl">
      <thead><tr>${sortHeader('id', 'Name ID')}${sortHeader('description', 'Product Description', 'hide-compact')}${sortHeader('clearingHouse', 'Clearing House', 'hide-compact')}<th class="acts"><span class="sr">Actions</span></th></tr></thead>
      <tbody>${rows.slice(start, start + productList.size).map(p => `<tr data-href="${esc(productHref(p.id))}">
        <td><a class="firm-name mono" href="${esc(productHref(p.id))}">${esc(p.id)}</a><span class="firm-id show-compact">${esc(p.description)}</span></td>
        <td class="hide-compact">${esc(p.description)}</td>
        <td class="hide-compact">${esc(p.clearingHouse)}</td>
        <td class="acts">
          <a class="icon-btn" href="${esc(productHref(p.id))}" aria-label="View ${esc(p.id)}" title="View">${icon('eye')}</a>
          <a class="icon-btn" href="${esc(productHref(p.id, 'edit'))}" aria-label="Edit ${esc(p.id)}" title="Edit">${icon('edit')}</a>
          <a class="icon-btn" href="${esc(productHref(p.id, 'copy'))}" aria-label="Copy ${esc(p.id)}" title="Copy">${icon('copy')}</a>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>
    ${pagerHTML(rows.length)}`);
}

function renderProductPage() {
  const mode = param('mode');
  if (mode === 'new') {
    startProductForm('new', { ...blankMarketValues(), id: '', type: IT.DEFAULT, description: '', categoryLevels: [] });
    return;
  }
  const product = productById(param('id'));
  if (!product) {
    marketNotFound('Product not found', param('id'), 'products.html', 'Products');
    return;
  }
  if (mode === 'edit') startProductForm('edit', clone(product));
  else if (mode === 'copy') startProductForm('copy', { ...clone(product), id: '' });
  else renderProductView(product);
}

function renderProductView(p) {
  document.title = `${p.id} · EP3 Admin`;
  const sections = productSections(p);
  const children = market.instruments.filter(i => i.productId === p.id).length;
  $('#view').innerHTML = `<div class="detail-page">
    <div class="detail-head detail-head-plain">
      <a class="crumb" href="products.html">${icon('back')}Products</a>
      <header class="firm-head">
        <div>
          <div class="firm-title"><h1 class="large-title" tabindex="-1">${esc(p.id)}</h1></div>
          <div class="firm-meta"><span>${esc(p.type)}</span><span>·</span><span>${children} instrument${children === 1 ? '' : 's'}</span></div>
        </div>
        <div class="head-acts">
          <a class="btn btn-gray" href="${esc(withQuery('instrument.html', { mode: 'new', productId: p.id }))}">${icon('plus')}Create Instrument</a>
          <a class="btn btn-gray" href="${esc(productHref(p.id, 'copy'))}">${icon('copy')}Copy</a>
          <a class="btn btn-primary" href="${esc(productHref(p.id, 'edit'))}">${icon('edit')}Edit Product</a>
        </div>
      </header>
    </div>
    <div class="detail-scroll"><div class="split">${railHTML(sections)}<div class="sections">${sectionsReadHTML(sections, p)}</div></div></div>
  </div>`;
  startSpy();
}

function validateProduct() {
  const v = form.draft;
  const e = validateSections(productSections(v), v);
  if (form.mode === 'create') {
    const id = String(v.id || '').trim();
    if (id && productById(id)) e.id = 'Another product already uses this ID. Enter a different one.';
  }
  Object.assign(e, validateLimits(v), validateSubTypes(v));
  return e;
}

function startProductForm(mode, draft) {
  const editing = mode === 'edit';
  const title = editing ? 'Edit Product' : 'Create Product';
  const back = editing
    ? editBack(productHref(draft.id), draft.id, 'products.html', 'Products')
    : { href: 'products.html', label: 'Products' };
  document.title = `${title} · EP3 Admin`;
  startMarketForm({
    mode: editing ? 'edit' : 'create',
    draft,
    sections: productSections,
    validate: validateProduct,
    submit: submitProduct,
    onChange: k => { if (refreshOnChange(k)) refreshFormBody(document.getElementById(`firm-${k}`) ? `#firm-${k}` : undefined); },
    crumb: back,
    title,
    backHref: back.href,
    saveLabel: 'Save',
    extra: `<button class="btn btn-gray" type="button" data-act="product-save-create">Save and Create an Instrument</button>
      ${editing ? `<button class="btn btn-danger-soft" type="button" data-act="product-remove">${icon('trash')}Remove Product</button>` : ''}`,
  });
}

function syncChildInstruments(saved, flags) {
  const keys = Object.entries(SYNC_GROUPS).filter(([flag]) => flags[flag]).flatMap(([, list]) => list);
  const children = market.instruments.filter(i => i.productId === saved.id && i.state !== 'Terminated');
  children.forEach(i => keys.forEach(k => { i[k] = clone(saved[k] ?? ''); }));
  return children.length;
}

async function submitProduct() {
  const v = form.draft;
  const creating = form.mode === 'create';
  const andCreate = form.saveAndCreate;
  form.saveAndCreate = false;
  if (!creating && !andCreate && !isDirty()) return;
  v.id = String(v.id || '').trim();
  form.errors = validateProduct();
  if (Object.keys(form.errors).length) {
    revealFormErrors(productSections(v));
    updateDock();
    return;
  }
  updateDock();
  const flags = Object.fromEntries(Object.keys(SYNC_GROUPS).map(k => [k, !!v[k]]));
  const syncing = Object.values(flags).some(Boolean);
  if (creating || syncing) {
    const ok = await ask(creating
      ? { title: 'Add this product?', text: `This creates the product ${v.id}.`, confirm: 'Add Product', glyph: 'check' }
      : { title: 'Apply to all instruments?', text: `This saves ${v.id} and updates the selected settings on its instruments, except terminated ones.`, confirm: 'Save and Apply', glyph: 'warn' });
    if (!ok) return;
  }
  form.saving = true;
  updateDock();
  await wait(350);
  const saved = clone(v);
  Object.keys(SYNC_GROUPS).forEach(k => delete saved[k]);
  if (creating) market.products.unshift(saved);
  else market.products[market.products.findIndex(p => p.id === form.original.id)] = saved;
  const synced = syncing ? syncChildInstruments(saved, flags) : 0;
  saveMarket();
  form = null;
  go(andCreate ? withQuery('instrument.html', { mode: 'new', productId: saved.id }) : 'products.html');
  toast(syncing ? `Product saved and ${synced} instrument${synced === 1 ? '' : 's'} updated.` : 'Product successfully saved.');
}

async function removeProduct() {
  const id = form.original.id;
  const ok = await ask({ title: `Remove ${id}?`, text: 'This permanently removes the product. Its instruments stay in the list.', confirm: 'Remove Product', danger: true, glyph: 'trash' });
  if (!ok) return;
  market.products = market.products.filter(p => p.id !== id);
  saveMarket();
  form = null;
  go('products.html');
  toast('Product deleted.');
}

function openCategorySheet() {
  const levels = form.draft.categoryLevels || (form.draft.categoryLevels = []);
  const known = [...new Set(market.products.map(p => (p.categoryLevels || [])[levels.length]).filter(Boolean))];
  openFormSheet({
    title: 'Add Category',
    submit: 'Submit',
    values: { category: '' },
    fields: [{ k: 'category', label: 'Add Category', req: true, ph: 'Enter Category', help: known.length ? `Existing at this level: ${known.join(', ')}` : '' }],
    onSubmit: v => {
      const name = v.category.trim();
      if (name && !levels.includes(name)) levels.push(name);
      refreshFormBody('[data-act="category-add"]');
      updateDock();
    },
  });
}
