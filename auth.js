(function(){
  // if already logged in, bounce straight to the right dashboard
  const existing = Store.getCurrentUser();
  if(existing){
    location.href = existing.role === 'company' ? 'company-dashboard.html' : 'corporate-dashboard.html';
    return;
  }

  let selectedRole = 'company';

  const rolePills = document.querySelectorAll('.role-pill');
  const companyNameField = document.getElementById('companyNameField');
  const tabs = document.querySelectorAll('.tab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  rolePills.forEach(pill => {
    pill.addEventListener('click', () => {
      rolePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedRole = pill.dataset.role;
      companyNameField.querySelector('label').textContent =
        selectedRole === 'company' ? 'Company name' : 'Business / firm name';
    });
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      loginForm.classList.toggle('hidden', !isLogin);
      registerForm.classList.toggle('hidden', isLogin);
    });
  });

  function goToDashboard(user){
    Store.setSession(user.id);
    location.href = user.role === 'company' ? 'company-dashboard.html' : 'corporate-dashboard.html';
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginErr');
    const user = Store.findUserByEmail(email);
    if(!user || user.password !== password){
      errEl.textContent = 'Email or password is incorrect.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
    goToDashboard(user);
  });

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const companyName = document.getElementById('regCompanyName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const errEl = document.getElementById('regErr');

    if(password.length < 6){
      errEl.textContent = 'Password must be at least 6 characters.';
      errEl.style.display = 'block';
      return;
    }
    if(Store.findUserByEmail(email)){
      errEl.textContent = 'An account with this email already exists — log in instead.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
    const user = Store.createUser({ name, email, password, role: selectedRole, companyName });
    goToDashboard(user);
  });
})();
