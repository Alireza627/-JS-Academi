// ---------- Storage helpers ----------
function getAccounts() {
  try { return JSON.parse(localStorage.getItem('accounts')) || []; }
  catch { return []; }
}
function saveAccounts(accounts) { localStorage.setItem('accounts', JSON.stringify(accounts)); }
function getActiveEmail() { return localStorage.getItem('activeAccount') || null; }
function setActiveEmail(email) { if (email) localStorage.setItem('activeAccount', email); }
function clearActiveEmail() { localStorage.removeItem('activeAccount'); }
function findAccount(email) { return getAccounts().find(a => a.email === email) || null; }
function upsertAccount(acc) {
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.email === acc.email);
  if (idx >= 0) accounts[idx] = { ...accounts[idx], ...acc };
  else accounts.push(acc);
  saveAccounts(accounts);
}















// ---------- Theme & Accent (per-account) ----------
(function initTheme() {
  const activeEmail = getActiveEmail();
  const acc = activeEmail ? findAccount(activeEmail) : null;

  const themeClass = acc?.theme || localStorage.getItem('theme') || 'theme-light';
  document.body.classList.remove('theme-light','theme-dark');
  document.body.classList.add(themeClass);

  const accent = acc?.accent || localStorage.getItem('accent');
  if (accent) document.documentElement.style.setProperty('--accent', accent);

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const dark = document.body.classList.contains('theme-dark');
      const newTheme = dark ? 'theme-light' : 'theme-dark';
      document.body.classList.remove('theme-light','theme-dark');
      document.body.classList.add(newTheme);
      const email = getActiveEmail();
      if (email) upsertAccount({ email, theme: newTheme });
      else localStorage.setItem('theme', newTheme);
    });
  }
})();










// ---------- Landing about toggle ----------
(function initLanding() {
  const aboutBtn = document.getElementById('aboutBtn');
  const aboutSection = document.getElementById('aboutSection');
  if (aboutBtn && aboutSection) aboutBtn.addEventListener('click', () => aboutSection.classList.toggle('open'));
})();









// ---------- Security: simple SQL injection detection ----------
function hasSqlInjection(str) {
  if (!str) return false;
  const s = String(str).toLowerCase();
  const patterns = [
    'select ', 'insert ', 'update ', 'delete ', 'drop ', 'alter ', 'create ',
    ' union ', '--', ';', '/*', '*/', ' xp_', ' or ', ' and ', "' or '1'='1", '" or "1"="1', ' exec '
  ];
  return patterns.some(p => s.includes(p));
}

















// ---------- Register page ----------
(function initRegister() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const fullName = document.getElementById('fullName');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const phone = document.getElementById('phone');
  const securityCheck = document.getElementById('securityCheck');

  const setInvalid = (el, invalid) => el.classList.toggle('is-invalid', invalid);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;

    // name
    setInvalid(fullName, !(fullName.value && fullName.value.trim().length >= 3));
    ok = ok && !fullName.classList.contains('is-invalid');

    // email (normalized)
    const emailVal = email.value.trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
    setInvalid(email, !emailOk); ok = ok && emailOk;

    // password
    const passVal = password.value;
    const passOk = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(passVal);
    setInvalid(password, !passOk); ok = ok && passOk;

    // phone (Iran mobile format)
    const phoneOk = /^09\d{9}$/.test(phone.value.trim());
    setInvalid(phone, !phoneOk); ok = ok && phoneOk;

    // simple SQL safety check (demo)
    const secText = securityCheck.value.trim();
    const secOk = !(hasSqlInjection(secText) || hasSqlInjection(fullName.value) || hasSqlInjection(emailVal));
    setInvalid(securityCheck, !secOk); ok = ok && secOk;

    // prevent duplicate emails
    const exist = findAccount(emailVal);
    if (exist) { alert('این ایمیل قبلاً ثبت شده است. لطفاً ورود کنید یا ایمیل دیگری وارد کنید.'); ok = false; }

    if (ok) {
      const newAcc = {
        email: emailVal,
        name: fullName.value.trim(),
        phone: phone.value.trim(),
        password: passVal, // demo only; hash in production
        avatar: null,
        accent: '#0d6efd',
        theme: 'theme-light'
      };
      upsertAccount(newAcc);
      setActiveEmail(newAcc.email);
      window.location.href = 'dashboard.html';
    }
  });
})();



















// ---------- Login page ----------
(function initLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const email = document.getElementById('loginEmail');
  const password = document.getElementById('loginPassword');
  const setInvalid = (el, invalid) => el.classList.toggle('is-invalid', invalid);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailVal = email.value.trim().toLowerCase();
    const passVal = password.value.trim();

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
    const passOk = !!passVal;
    setInvalid(email, !emailOk);
    setInvalid(password, !passOk);
    if (!emailOk || !passOk) return;

    const acc = findAccount(emailVal);
    if (!acc || acc.password !== passVal) {
      alert('ایمیل یا رمز عبور نادرست است.');
      return;
    }
    setActiveEmail(acc.email);
    window.location.href = 'dashboard.html';
  });
})();

// ---------- Dashboard UI (sidebar, accounts, avatar, accent, logout) ----------
(function initDashboard() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const toggleBtn = document.getElementById('sidebarToggle');
  const closeBtn = document.getElementById('closeSidebar');
  const createAccountBtn = document.getElementById('createAccountBtn');
  const accountList = document.getElementById('accountList');
  const profileUpload = document.getElementById('profileUpload');
const profilePreview = document.getElementById('profilePreview');

  const profileIcon = document.getElementById('profileIcon');
  const accentPicker = document.getElementById('accentPicker');
  const logoutBtn = document.getElementById('logoutBtn');

  toggleBtn?.addEventListener('click', () => sidebar.classList.toggle('open'));
  closeBtn?.addEventListener('click', () => sidebar.classList.remove('open'));
  createAccountBtn?.addEventListener('click', () => { window.location.href = 'register.html'; });

  function renderAccounts() {
    const accounts = getAccounts();
    const activeEmail = getActiveEmail();
    accountList.innerHTML = '';
    accounts.forEach(acc => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.innerHTML = `
        <img class="account-avatar" src="${acc.avatar || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f464.svg'}" alt="">
        <div class="flex-grow-1">
          <div class="fw-semibold">${acc.name || acc.email}</div>
          <div class="text-muted small">${acc.email}</div>
        </div>
        ${acc.email === activeEmail ? '<span class="badge bg-primary">فعال</span>' : ''}
      `;
      li.addEventListener('click', () => {
        setActiveEmail(acc.email);
        applyAccountThemeAccentAvatar();
        renderAccounts();
      });
      accountList.appendChild(li);
    });
  }

 function applyAccountThemeAccentAvatar() {
  const activeEmail = getActiveEmail();
  const acc = activeEmail ? findAccount(activeEmail) : null;

  // تغییر تم
  const theme = acc?.theme || 'theme-light';
  document.body.classList.remove('theme-light','theme-dark');
  document.body.classList.add(theme);

  // تغییر accent
  const accent = acc?.accent || '#0d6efd';
  document.documentElement.style.setProperty('--accent', accent);

  // گرفتن المنت پروفایل
  const profilePreview = document.getElementById('profilePreview');

  // تغییر آواتار
  const avatar = acc?.avatar || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f464.svg';
  if (profilePreview) profilePreview.src = avatar;
}

























// وقتی کاربر عکس انتخاب می‌کند
document.getElementById('profileUpload').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      // تغییر عکس در بخش پروفایل اصلی
      const profilePreview = document.getElementById('profilePreview');
      if (profilePreview) {
        profilePreview.src = e.target.result;
      }
      // تغییر عکس در نوبار
      const profileIcon = document.getElementById('profileIcon');
      if (profileIcon) {
        profileIcon.src = e.target.result;
      }


    };
    reader.readAsDataURL(file);
  }
});



  renderAccounts();
  applyAccountThemeAccentAvatar();






















  // avatar upload (per active account)
  if (profilePreview && profileUpload) {
    profilePreview.addEventListener('click', () => profileUpload.click());
    profileUpload.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const email = getActiveEmail();
        if (!email) return;
        upsertAccount({ email, avatar: reader.result });
        applyAccountThemeAccentAvatar();
        renderAccounts();
      };
      reader.readAsDataURL(file);
    });
  }


















  // accent per account
  accentPicker?.querySelectorAll('.accent-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      const email = getActiveEmail();
      if (email) {
        upsertAccount({ email, accent: color });
        applyAccountThemeAccentAvatar();
      } else {
        document.documentElement.style.setProperty('--accent', color);
        localStorage.setItem('accent', color);
      }
    });
  });













  // logout: delete active account; if others exist, switch; else go home
  logoutBtn?.addEventListener('click', () => {
    const activeEmail = getActiveEmail();
    if (!activeEmail) { window.location.href = 'index.html'; return; }
    let accounts = getAccounts();
    accounts = accounts.filter(a => a.email !== activeEmail);
    saveAccounts(accounts);
    if (accounts.length > 0) {
      setActiveEmail(accounts[0].email);
      applyAccountThemeAccentAvatar();
      renderAccounts();
      location.reload();
    } else {
      clearActiveEmail();
      window.location.href = 'index.html';
    }
  });
})();

















// ---------- Search + Navbar smooth scroll ----------
(function initSearchAndNavLinks() {
  const form = document.getElementById('dashboardSearch');
  if (form) {
    const input = form.querySelector('input[type="search"]');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      const target = document.getElementById(q) || document.querySelector(`[data-key="${q}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('pulse');
        setTimeout(() => target.classList.remove('pulse'), 1500);
      } else {
        alert('بخش مورد نظر یافت نشد: overview, courses, purchased, milestones, news, stats, tasks, faq, community.');
      }
    });
  }

  document.querySelectorAll('.nav-links .nav-link[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('pulse');
        setTimeout(() => target.classList.remove('pulse'), 1200);
      }
    });
  });
})();














// ---------- Rotator ----------
(function initRotator() {
  const rotator = document.getElementById('heroRotator');
  if (!rotator) return;
  const imgs = Array.from(rotator.querySelectorAll('.rotator-img'));
  let idx = 0;
  function show(i) { imgs.forEach((img, k) => img.classList.toggle('active', k === i)); }
  show(idx);
  setInterval(() => { idx = (idx + 1) % imgs.length; show(idx); }, 3200);
})();












// ---------- Reveal on scroll ----------
(function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));
})();













// ---------- Charts & Courses (fixed images; no user upload) ----------
(function initChartsAndCourses() {
  const pathCanvas = document.getElementById('pathChart');
  const progressCanvas = document.getElementById('progressChart');
  const coursesList = document.getElementById('coursesList');
  const purchasedList = document.getElementById('purchasedList');

  // course catalog (12 items)
  const courses = [
    { id:'c1',  title:'JS مقدماتی تا پیشرفته', price: 1200000, off: 20, stars: 4.7, img:'https://clickaval.com/blog/wp-content/uploads/2019/02/javscript.png' },
    { id:'c2',  title:'HTML/CSS مدرن',         price: 800000,  off: 15, stars: 4.6, img:'https://media1.maktabkhooneh.org/courses/images/shirafkan.webp?expire=4893471932&token=6f01458d2f924aa313adc141d21d9610&md5=bwFFjS-SSqMTrcFB0h2WEA==' },
    { id:'c3',  title:'React حرفه‌ای',          price: 1500000, off: 25, stars: 4.8, img:'https://codeyad.com/_ipx/f_webp&q_100&fit_contain/codeyad/assets/images/Courses/4f02cbdf-213b-4217-b65f-e976eef284bf.webp' },
    { id:'c4',  title:'Node.js و API',          price: 1400000, off: 10, stars: 4.5, img:'https://codeyad.com/_ipx/f_webp&q_100&fit_contain/codeyad/assets/images/Courses/295168e5-2f6a-4ac1-8835-2b699dc74c7a.webp' },
    { id:'c6',  title:'DevOps مقدماتی',         price: 900000,  off: 12, stars: 4.4, img:'https://www.imahmoudi.ir/wp-content/uploads/2020/12/ultimate-guide-devops-e1558342120973-931x440-1.jpg' },
    { id:'c7',  title:'TypeScript کاربردی',     price: 1100000, off: 22, stars: 4.7, img:'https://cdn.thenewstack.io/media/2022/01/10b88c68-typescript-logo.png' },
    { id:'c8',  title:'Testing با Jest',         price: 700000,  off: 15, stars: 4.3, img:'https://decentro.tech/blog/wp-content/uploads/Jest-Tech-Blog.jpeg' },
    { id:'c9',  title:'Next.js SSR/SSG',        price: 1600000, off: 20, stars: 4.8, img:'https://ponisha.ir/blog/wp-content/uploads/2022/09/NEXTJS-1-1024x576.jpg' },
    { id:'c10', title:'Vue 3',                  price: 1200000, off: 17, stars: 4.6, img:'https://codeyad.com/_ipx/f_webp&q_100&fit_contain/codeyad/assets/images/Courses/56e059fa-d412-49e5-8d39-438f6f96eddb.webp' },
    { id:'c11', title:'SvelteKit پیشرفته',      price: 1250000, off: 16, stars: 4.5, img:'https://th.bing.com/th/id/R.ef3a136ad846b98a7f93238670b9b2f5?rik=fgazhsjCmntD3w&pid=ImgRaw&r=0' },
   
  ];

  function renderCourses() {
    if (!coursesList) return;
    coursesList.innerHTML = '';
    courses.forEach((c) => {
      const finalPrice = Math.round(c.price * (1 - c.off/100));
      const col = document.createElement('div');
      col.className = 'col';
      col.innerHTML = `
        <div class="card h-100 glass card-3d">
          <img src="${c.img}" class="card-img-top" alt="${c.title}">
          <div class="card-body">
            <h4 class="h6 fw-bold mb-2">${c.title}</h4>
            <div class="small text-muted mb-2">امتیاز: ${'★'.repeat(Math.round(c.stars))} (${c.stars.toFixed(1)})</div>
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-success">-${c.off}%</span>
              <span class="text-decoration-line-through small">${c.price.toLocaleString('fa-IR')} تومان</span>
              <strong class="text-primary">${finalPrice.toLocaleString('fa-IR')} تومان</strong>
            </div>
            <div class="d-grid mt-3">
              <button class="btn btn-primary btn-sm">افزودن به سبد</button>
            </div>
          </div>
        </div>
      `;
      coursesList.appendChild(col);
    });
  }
  renderCourses();



















  // purchased demo
  if (purchasedList) {
    const purchased = [
      { title:'JS مقدماتی تا پیشرفته', progress: 68 },
      { title:'Node.js و API', progress: 40 },
      { title:'React حرفه‌ای', progress: 25 }
    ];
    purchased.forEach(p => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `<span>${p.title}</span><span class="badge bg-primary">${p.progress}%</span>`;
      purchasedList.appendChild(li);
    });
  }

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

  if (pathCanvas && window.Chart) {
    new Chart(pathCanvas, {
      type: 'radar',
      data: {
        labels: ['HTML/CSS','JavaScript','Frontend','Backend','DB/Auth','DevOps'],
        datasets: [{
          label: 'مسیر فول‌استک',
          data: [80, 90, 85, 70, 65, 50],
          borderColor: accent,
          backgroundColor: 'rgba(13,110,253,0.2)'
        }]
      },
      options: { scales: { r: { grid: { color: '#888' }, pointLabels: { color: 'inherit' } } } }
    });
  }

  if (progressCanvas && window.Chart) {
    new Chart(progressCanvas, {
      type: 'bar',
      data: {
        labels: ['JS مقدماتی تا پیشرفته','Node.js و API','React حرفه‌ای'],
        datasets: [{ label: 'درصد تماشا', data: [68, 40, 25], backgroundColor: accent }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
    });
  }
})();

// ---------- Cross-tab sync ----------
window.addEventListener('storage', (e) => {
  if (['accent','accounts','activeAccount'].includes(e.key)) location.reload();
});
