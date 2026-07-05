/* ===========================================================
   TENDER TAKER — data store
   Everything lives in localStorage under one key. No backend.
   Swap this file for real API calls later without touching the UI logic much,
   since every dashboard talks to Store.* only.
   =========================================================== */

const DB_KEY = 'tendertaker_db_v1';
const SESSION_KEY = 'tendertaker_session_v1';

const Store = {

  _read(){
    const raw = localStorage.getItem(DB_KEY);
    if(!raw){ return { users:[], tenders:[], applications:[], seq:1000 }; }
    try{ return JSON.parse(raw); } catch(e){ return { users:[], tenders:[], applications:[], seq:1000 }; }
  },
  _write(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); },

  nextRef(prefix){
    const db = this._read();
    db.seq += 1;
    this._write(db);
    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(db.seq).padStart(4,'0')}`;
  },

  // ---------- users ----------
  getUsers(){ return this._read().users; },
  findUserByEmail(email){
    return this._read().users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  createUser({ name, email, password, role, companyName }){
    const db = this._read();
    const user = {
      id: 'u' + Date.now() + Math.floor(Math.random()*1000),
      name, email, password, role, // role: 'company' | 'corporate'
      companyName: companyName || null,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    this._write(db);
    return user;
  },

  // ---------- session ----------
  setSession(userId){ localStorage.setItem(SESSION_KEY, userId); },
  clearSession(){ localStorage.removeItem(SESSION_KEY); },
  getCurrentUser(){
    const id = localStorage.getItem(SESSION_KEY);
    if(!id) return null;
    return this._read().users.find(u => u.id === id) || null;
  },

  // ---------- tenders ----------
  getTenders(){ return this._read().tenders; },
  getTenderById(id){ return this._read().tenders.find(t => t.id === id); },
  getTendersByCompany(companyId){ return this._read().tenders.filter(t => t.companyId === companyId); },
  getOpenTenders(){ return this._read().tenders.filter(t => t.status === 'open'); },
  createTender({ companyId, companyName, title, category, description, budget, deadline }){
    const db = this._read();
    const tender = {
      id: 't' + Date.now() + Math.floor(Math.random()*1000),
      ref: this.nextRef('TT'),
      companyId, companyName, title, category, description, budget, deadline,
      status: 'open', // open | closed | awarded
      createdAt: new Date().toISOString()
    };
    db.tenders.push(tender);
    this._write(db);
    return tender;
  },
  updateTenderStatus(tenderId, status){
    const db = this._read();
    const t = db.tenders.find(x => x.id === tenderId);
    if(t){ t.status = status; this._write(db); }
    return t;
  },

  // ---------- applications ----------
  getApplications(){ return this._read().applications; },
  getApplicationsForTender(tenderId){ return this._read().applications.filter(a => a.tenderId === tenderId); },
  getApplicationsByCorporate(corporateId){ return this._read().applications.filter(a => a.corporateId === corporateId); },
  getApplicationById(id){ return this._read().applications.find(a => a.id === id); },
  hasApplied(tenderId, corporateId){
    return this._read().applications.some(a => a.tenderId === tenderId && a.corporateId === corporateId);
  },
  createApplication({ tenderId, corporateId, corporateName, pitch, documents }){
    const db = this._read();
    const app = {
      id: 'a' + Date.now() + Math.floor(Math.random()*1000),
      ref: this.nextRef('APP'),
      tenderId, corporateId, corporateName, pitch,
      documents: documents || [], // [{name,size,type,dataUrl|null}]
      status: 'pending', // pending | shortlisted | verified | rejected
      appliedAt: new Date().toISOString()
    };
    db.applications.push(app);
    this._write(db);
    return app;
  },
  updateApplicationStatus(appId, status){
    const db = this._read();
    const a = db.applications.find(x => x.id === appId);
    if(a){ a.status = status; this._write(db); }
    return a;
  },
  toggleDocVerified(appId, docIndex){
    const db = this._read();
    const a = db.applications.find(x => x.id === appId);
    if(a && a.documents[docIndex]){
      a.documents[docIndex].verified = !a.documents[docIndex].verified;
      this._write(db);
    }
    return a;
  },

  // ---------- seed demo data (first run only) ----------
  seedIfEmpty(){
    const db = this._read();
    if(db.users.length) return;

    const company = {
      id: 'u_demo_company', name: 'Priya Nair', email: 'company@demo.com', password: 'demo123',
      role: 'company', companyName: 'Konkan Infra Pvt. Ltd.', createdAt: new Date().toISOString()
    };
    const corporate = {
      id: 'u_demo_corporate', name: 'Rahul Deshmukh', email: 'bidder@demo.com', password: 'demo123',
      role: 'corporate', companyName: 'Deshmukh Builders & Co.', createdAt: new Date().toISOString()
    };
    db.users.push(company, corporate);

    const t1 = {
      id: 't_demo_1', ref: 'TT-2026-1001', companyId: company.id, companyName: company.companyName,
      title: 'Construction of Rural Road — Roha to Nagothane Stretch',
      category: 'Civil & Infrastructure',
      description: 'Laying and asphalting of a 12km rural road stretch including drainage work. Site survey report attached separately on request.',
      budget: '4200000', deadline: '2026-08-15', status: 'open', createdAt: new Date().toISOString()
    };
    const t2 = {
      id: 't_demo_2', ref: 'TT-2026-1002', companyId: company.id, companyName: company.companyName,
      title: 'Supply of Structural Steel — Warehouse Expansion Phase II',
      category: 'Procurement & Supply',
      description: 'Supply of ISMB and ISA grade structural steel for warehouse expansion, approx. 80 metric tonnes, delivery in 3 lots.',
      budget: '1850000', deadline: '2026-07-30', status: 'open', createdAt: new Date().toISOString()
    };
    db.tenders.push(t1, t2);

    const app1 = {
      id: 'a_demo_1', ref: 'APP-2026-1003', tenderId: 't_demo_1', corporateId: corporate.id,
      corporateName: corporate.companyName,
      pitch: 'We have completed 14 similar rural road projects across Raigad district in the last 6 years, with our own asphalting plant and a crew of 40. We can mobilise within 10 days of award and complete the stretch inside 75 working days.',
      documents: [
        { name: 'company_registration.pdf', size: 240213, type: 'application/pdf', verified: true },
        { name: 'gst_certificate.pdf', size: 118442, type: 'application/pdf', verified: false },
        { name: 'past_project_photos.pdf', size: 990120, type: 'application/pdf', verified: false }
      ],
      status: 'pending', appliedAt: new Date().toISOString()
    };
    db.applications.push(app1);

    db.seq = 1003;
    this._write(db);
  }
};

Store.seedIfEmpty();
