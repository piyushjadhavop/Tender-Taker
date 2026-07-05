(function(){
  const user = Store.getCurrentUser();
  if(!user || user.role !== 'corporate'){ location.href = 'index.html'; return; }

  document.getElementById('whoName').textContent = user.companyName || user.name;
  document.getElementById('logoutBtn').addEventListener('click', () => {
    Store.clearSession(); location.href = 'index.html';
  });

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.main-section').forEach(s => s.classList.add('hidden'));
      document.getElementById('section-' + item.dataset.section).classList.remove('hidden');
      if(item.dataset.section === 'browse') renderBrowse();
      if(item.dataset.section === 'myapps') renderMyApps();
    });
  });

  function fmtMoney(v){ return '₹' + Number(v).toLocaleString('en-IN'); }
  function fmtDate(d){ return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }); }
  function escapeHtml(str){ const d = document.createElement('div'); d.textContent = str == null ? '' : str; return d.innerHTML; }
  function toast(msg){
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }
  function statusLabel(s){ return s.replace('_',' '); }

  // ---------- browse ----------
  function renderBrowse(){
    const q = (document.getElementById('searchInput').value || '').toLowerCase();
    const cat = document.getElementById('categoryFilter').value;
    let tenders = Store.getOpenTenders().slice().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    if(q) tenders = tenders.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    if(cat) tenders = tenders.filter(t => t.category === cat);

    const list = document.getElementById('browseList');
    if(!tenders.length){
      list.innerHTML = `<div class="card empty-state"><div class="glyph">🔍</div><h3>No open tenders match</h3><p>Try clearing filters, or check back soon — new tenders are posted regularly.</p></div>`;
      return;
    }
    list.innerHTML = tenders.map(t => {
      const applied = Store.hasApplied(t.id, user.id);
      return `<div class="card tender-card">
        <div class="tender-top">
          <div>
            <div class="tender-ref mono">${t.ref}</div>
            <div class="tender-title">${escapeHtml(t.title)}</div>
            <span class="tag">${escapeHtml(t.category)}</span>
          </div>
          <span class="stamp stamp-open">open</span>
        </div>
        <p class="tender-desc">${escapeHtml(t.description)}</p>
        <div class="tender-meta">
          <span>Budget <b>${fmtMoney(t.budget)}</b></span>
          <span>Deadline <b>${fmtDate(t.deadline)}</b></span>
          <span>Posted by <b>${escapeHtml(t.companyName)}</b></span>
        </div>
        <div class="tender-actions">
          ${applied
            ? `<button class="btn btn-outline btn-sm" disabled>Already applied</button>`
            : `<button class="btn btn-primary btn-sm" data-apply="${t.id}">Apply with a pitch</button>`}
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-apply]').forEach(btn => {
      btn.addEventListener('click', () => openApplyModal(btn.dataset.apply));
    });
  }
  document.getElementById('searchInput').addEventListener('input', renderBrowse);
  document.getElementById('categoryFilter').addEventListener('change', renderBrowse);

  // ---------- apply modal ----------
  let currentTenderId = null;
  let stagedFiles = []; // {name,size,type,dataUrl|null}

  function openApplyModal(tenderId){
    currentTenderId = tenderId;
    stagedFiles = [];
    const t = Store.getTenderById(tenderId);
    document.getElementById('applyTenderRef').textContent = t.ref;
    document.getElementById('applyTenderTitle').textContent = t.title;
    document.getElementById('pitchInput').value = '';
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('applyOverlay').classList.remove('hidden');
  }

  const fileDropZone = document.getElementById('fileDropZone');
  const fileInput = document.getElementById('fileInput');
  fileDropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    let pending = files.length;
    if(!pending) return;

    files.forEach(file => {
      const MAX_PREVIEW = 2 * 1024 * 1024; // 2MB
      const meta = { name: file.name, size: file.size, type: file.type, dataUrl: null, verified: false };
      if(file.size <= MAX_PREVIEW){
        const reader = new FileReader();
        reader.onload = () => { meta.dataUrl = reader.result; stagedFiles.push(meta); renderFileList(); };
        reader.onerror = () => { stagedFiles.push(meta); renderFileList(); };
        reader.readAsDataURL(file);
      } else {
        stagedFiles.push(meta);
        renderFileList();
      }
    });
    fileInput.value = '';
  });

  function renderFileList(){
    const box = document.getElementById('fileList');
    box.innerHTML = stagedFiles.map((f, idx) => `
      <div class="file-chip">
        <span class="fname">${escapeHtml(f.name)} <span class="hint">(${(f.size/1024).toFixed(0)} KB)</span></span>
        <button type="button" data-remove="${idx}" aria-label="Remove file">&times;</button>
      </div>`).join('');
    box.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => { stagedFiles.splice(Number(btn.dataset.remove), 1); renderFileList(); });
    });
  }

  document.getElementById('applyForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const pitch = document.getElementById('pitchInput').value.trim();
    Store.createApplication({
      tenderId: currentTenderId,
      corporateId: user.id,
      corporateName: user.companyName || user.name,
      pitch,
      documents: stagedFiles
    });
    document.getElementById('applyOverlay').classList.add('hidden');
    toast('Application submitted.');
    renderBrowse();
  });

  // ---------- my applications ----------
  function renderMyApps(){
    const apps = Store.getApplicationsByCorporate(user.id).slice().sort((a,b) => new Date(b.appliedAt)-new Date(a.appliedAt));
    document.getElementById('appCount').textContent = apps.length;
    const list = document.getElementById('myAppsList');
    if(!apps.length){
      list.innerHTML = `<div class="card empty-state"><div class="glyph">🗂️</div><h3>You haven't applied to anything yet</h3><p>Browse open tenders and submit a pitch — your applications will be tracked here.</p></div>`;
      return;
    }
    list.innerHTML = apps.map(a => {
      const t = Store.getTenderById(a.tenderId);
      return `<div class="card tender-card">
        <div class="tender-top">
          <div>
            <div class="tender-ref mono">${a.ref} · for ${t ? t.ref : '—'}</div>
            <div class="tender-title">${escapeHtml(t ? t.title : 'Tender no longer available')}</div>
            <span class="tag">${t ? escapeHtml(t.companyName) : ''}</span>
          </div>
          <span class="stamp stamp-${a.status}">${statusLabel(a.status)}</span>
        </div>
        <p class="tender-desc">${escapeHtml(a.pitch.slice(0,140))}${a.pitch.length>140?'…':''}</p>
        <div class="tender-meta">
          <span>Documents <b>${a.documents.length}</b></span>
          <span>Applied <b>${fmtDate(a.appliedAt)}</b></span>
        </div>
        <div class="tender-actions">
          <button class="btn btn-outline btn-sm" data-detail="${a.id}">View details</button>
        </div>
      </div>`;
    }).join('');
    list.querySelectorAll('[data-detail]').forEach(btn => {
      btn.addEventListener('click', () => openDetail(btn.dataset.detail));
    });
  }

  function openDetail(appId){
    const a = Store.getApplicationById(appId);
    const t = Store.getTenderById(a.tenderId);
    document.getElementById('detailRef').textContent = a.ref;
    document.getElementById('detailTitle').textContent = t ? t.title : 'Tender no longer available';
    document.getElementById('detailBody').innerHTML = `
      <p class="hint" style="margin-bottom:14px;">Status: <span class="stamp stamp-${a.status}">${statusLabel(a.status)}</span></p>
      <label>Your pitch</label>
      <p style="font-size:13.5px; color:var(--ink-soft); background:var(--paper); border:1px solid var(--paper-line); border-radius:6px; padding:14px; margin-bottom:18px;">${escapeHtml(a.pitch)}</p>
      <label>Documents submitted</label>
      ${a.documents.length ? a.documents.map(d => `
        <div class="doc-row">
          <span class="dname">${escapeHtml(d.name)} <span class="hint">(${(d.size/1024).toFixed(0)} KB)</span></span>
          <span class="stamp ${d.verified ? 'stamp-verified' : 'stamp-pending'}" style="font-size:9.5px;">${d.verified ? 'verified' : 'awaiting review'}</span>
        </div>`).join('') : '<p class="hint">No documents attached.</p>'}
    `;
    document.getElementById('detailOverlay').classList.remove('hidden');
  }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.add('hidden'));
  });
  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', (e) => { if(e.target === ov) ov.classList.add('hidden'); });
  });

  renderBrowse();
  renderMyApps();
})();
