(function(){
  const user = Store.getCurrentUser();
  if(!user || user.role !== 'company'){ location.href = 'index.html'; return; }

  document.getElementById('whoName').textContent = user.companyName || user.name;
  document.getElementById('logoutBtn').addEventListener('click', () => {
    Store.clearSession(); location.href = 'index.html';
  });

  // ---------- section nav ----------
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.main-section').forEach(s => s.classList.add('hidden'));
      document.getElementById('section-' + item.dataset.section).classList.remove('hidden');
      if(item.dataset.section === 'overview') renderOverview();
      if(item.dataset.section === 'tenders') renderTenders();
    });
  });

  function fmtMoney(v){ return '₹' + Number(v).toLocaleString('en-IN'); }
  function fmtDate(d){ return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }); }
  function toast(msg){
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ---------- overview ----------
  function renderOverview(){
    const myTenders = Store.getTendersByCompany(user.id);
    const allApps = Store.getApplications().filter(a => myTenders.some(t => t.id === a.tenderId));
    document.getElementById('statTotal').textContent = myTenders.length;
    document.getElementById('statOpen').textContent = myTenders.filter(t => t.status === 'open').length;
    document.getElementById('statApps').textContent = allApps.length;
    document.getElementById('statVerified').textContent = allApps.filter(a => a.status === 'verified').length;
    document.getElementById('tenderCount').textContent = myTenders.length;

    const recent = allApps.slice().sort((a,b) => new Date(b.appliedAt) - new Date(a.appliedAt)).slice(0,5);
    const box = document.getElementById('recentApps');
    if(!recent.length){ box.innerHTML = '<p class="hint">No applications yet — once corporates apply to your tenders, they will show up here.</p>'; return; }
    box.innerHTML = recent.map(a => {
      const t = Store.getTenderById(a.tenderId);
      return `<div class="applicant-row">
        <div>
          <div class="who-name">${escapeHtml(a.corporateName)}</div>
          <div class="pitch-preview">applied to <b>${escapeHtml(t ? t.title : 'a tender')}</b></div>
        </div>
        <div class="right"><span class="stamp stamp-${a.status}">${statusLabel(a.status)}</span></div>
      </div>`;
    }).join('');
  }

  // ---------- post tender ----------
  document.getElementById('tenderForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('tTitle').value.trim();
    const category = document.getElementById('tCategory').value;
    const description = document.getElementById('tDesc').value.trim();
    const budget = document.getElementById('tBudget').value;
    const deadline = document.getElementById('tDeadline').value;

    Store.createTender({
      companyId: user.id, companyName: user.companyName || user.name,
      title, category, description, budget, deadline
    });
    e.target.reset();
    toast('Tender published.');
    document.querySelector('.nav-item[data-section="tenders"]').click();
  });

  // ---------- my tenders ----------
  function statusLabel(s){ return s.replace('_',' '); }

  function renderTenders(){
    const myTenders = Store.getTendersByCompany(user.id).slice().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
    const list = document.getElementById('tendersList');
    document.getElementById('tenderCount').textContent = myTenders.length;

    if(!myTenders.length){
      list.innerHTML = `<div class="card empty-state"><div class="glyph">📋</div><h3>No tenders posted yet</h3><p>Post your first tender and applications will appear here for review.</p></div>`;
      return;
    }

    list.innerHTML = myTenders.map(t => {
      const apps = Store.getApplicationsForTender(t.id);
      return `<div class="card tender-card">
        <div class="tender-top">
          <div>
            <div class="tender-ref mono">${t.ref}</div>
            <div class="tender-title">${escapeHtml(t.title)}</div>
            <span class="tag">${escapeHtml(t.category)}</span>
          </div>
          <span class="stamp stamp-${t.status}">${t.status}</span>
        </div>
        <p class="tender-desc">${escapeHtml(t.description)}</p>
        <div class="tender-meta">
          <span>Budget <b>${fmtMoney(t.budget)}</b></span>
          <span>Deadline <b>${fmtDate(t.deadline)}</b></span>
          <span>Applications <b>${apps.length}</b></span>
        </div>
        <div class="tender-actions">
          <button class="btn btn-outline btn-sm" data-view-applicants="${t.id}">View applications (${apps.length})</button>
          ${t.status === 'open' ? `<button class="btn btn-outline btn-sm" data-close-tender="${t.id}">Close tender</button>` : ''}
          ${t.status === 'closed' ? `<button class="btn btn-outline btn-sm" data-reopen-tender="${t.id}">Reopen</button>` : ''}
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-view-applicants]').forEach(btn => {
      btn.addEventListener('click', () => openApplicantsModal(btn.dataset.viewApplicants));
    });
    list.querySelectorAll('[data-close-tender]').forEach(btn => {
      btn.addEventListener('click', () => { Store.updateTenderStatus(btn.dataset.closeTender, 'closed'); renderTenders(); toast('Tender closed to new applications.'); });
    });
    list.querySelectorAll('[data-reopen-tender]').forEach(btn => {
      btn.addEventListener('click', () => { Store.updateTenderStatus(btn.dataset.reopenTender, 'open'); renderTenders(); toast('Tender reopened.'); });
    });
  }

  // ---------- applicants modal ----------
  let currentTenderId = null;

  function openApplicantsModal(tenderId){
    currentTenderId = tenderId;
    const t = Store.getTenderById(tenderId);
    document.getElementById('applicantsTenderRef').textContent = t.ref;
    document.getElementById('applicantsTenderTitle').textContent = t.title;
    renderApplicantsList();
    document.getElementById('applicantsOverlay').classList.remove('hidden');
  }

  function renderApplicantsList(){
    const apps = Store.getApplicationsForTender(currentTenderId).slice().sort((a,b) => new Date(b.appliedAt)-new Date(a.appliedAt));
    const body = document.getElementById('applicantsBody');
    if(!apps.length){
      body.innerHTML = `<div class="empty-state"><div class="glyph">📭</div><h3>No applications yet</h3><p>Check back once corporates start applying to this tender.</p></div>`;
      return;
    }
    body.innerHTML = apps.map(a => {
      const verifiedDocs = a.documents.filter(d => d.verified).length;
      return `<div class="applicant-row">
        <div>
          <div class="who-name">${escapeHtml(a.corporateName)}</div>
          <div class="pitch-preview">${escapeHtml(a.pitch.slice(0,110))}${a.pitch.length>110?'…':''}</div>
          <div class="hint" style="margin-top:4px;">${a.documents.length} document(s) · ${verifiedDocs} verified</div>
        </div>
        <div class="right">
          <span class="stamp stamp-${a.status}">${statusLabel(a.status)}</span>
          <button class="btn btn-dark btn-sm" data-review="${a.id}">Review</button>
        </div>
      </div>`;
    }).join('');
    body.querySelectorAll('[data-review]').forEach(btn => {
      btn.addEventListener('click', () => openReviewModal(btn.dataset.review));
    });
  }

  // ---------- review modal ----------
  let currentAppId = null;

  function openReviewModal(appId){
    currentAppId = appId;
    renderReviewModal();
    document.getElementById('reviewOverlay').classList.remove('hidden');
  }

  function renderReviewModal(){
    const a = Store.getApplicationById(currentAppId);
    document.getElementById('reviewRef').textContent = a.ref + ' · ' + statusLabel(a.status).toUpperCase();
    document.getElementById('reviewCorpName').textContent = a.corporateName;
    document.getElementById('reviewPitch').textContent = a.pitch;

    const docsBox = document.getElementById('reviewDocs');
    if(!a.documents.length){
      docsBox.innerHTML = '<p class="hint">No documents were attached to this application.</p>';
    } else {
      docsBox.innerHTML = a.documents.map((d, idx) => `
        <div class="doc-row">
          <span class="dname">${escapeHtml(d.name)} <span class="hint">(${(d.size/1024).toFixed(0)} KB)</span></span>
          <label class="doc-check">
            <input type="checkbox" data-doc-idx="${idx}" ${d.verified ? 'checked' : ''}>
            Verified
          </label>
        </div>`).join('');
      docsBox.querySelectorAll('[data-doc-idx]').forEach(cb => {
        cb.addEventListener('change', () => {
          Store.toggleDocVerified(currentAppId, Number(cb.dataset.docIdx));
        });
      });
    }
  }

  document.getElementById('btnShortlist').addEventListener('click', () => {
    Store.updateApplicationStatus(currentAppId, 'shortlisted');
    renderReviewModal(); renderApplicantsList(); toast('Applicant shortlisted.');
  });
  document.getElementById('btnVerify').addEventListener('click', () => {
    Store.updateApplicationStatus(currentAppId, 'verified');
    renderReviewModal(); renderApplicantsList(); toast('Application verified and approved.');
  });
  document.getElementById('btnReject').addEventListener('click', () => {
    Store.updateApplicationStatus(currentAppId, 'rejected');
    renderReviewModal(); renderApplicantsList(); toast('Application rejected.');
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.add('hidden'));
  });
  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', (e) => { if(e.target === ov) ov.classList.add('hidden'); });
  });

  function escapeHtml(str){
    const d = document.createElement('div'); d.textContent = str == null ? '' : str; return d.innerHTML;
  }

  renderOverview();
  renderTenders();
})();
