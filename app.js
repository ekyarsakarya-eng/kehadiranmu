const API_URL = 'https://script.google.com/macros/s/AKfycbyMxCBHwzIKwQ6504TdbvuPC2BkZsyl7yhVYJF_JQuSy4_BQ3jFD-4xM8yc59gmnYk/exec';
const LOGO_APP = 'logo.png';
const app = document.getElementById('app');
let currentUser = JSON.parse(sessionStorage.getItem('user') || 'null');
let appSetting = JSON.parse(sessionStorage.getItem('setting') || '{}');
let liveClockInterval = null;
let absenStream = null;
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// DARK MODE HELPER
function applyDarkMode() {
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleDarkMode() {
  isDarkMode =!isDarkMode;
  localStorage.setItem('darkMode', isDarkMode);
  applyDarkMode();
  renderHome();
}

// TOAST NOTIF + HAPTIC
function showToast(msg, type = 'success') {
  if (navigator.vibrate) navigator.vibrate(type === 'success'? 50 : [50, 50, 50]);
  
  const toast = document.createElement('div');
  const bg = type === 'success'? 'bg-green-500' : type === 'warning'? 'bg-orange-500' : 'bg-red-500';
  const icon = type === 'success'? 'ri-check-line' : type === 'warning'? 'ri-alert-line' : 'ri-close-line';
  
  toast.className = `fixed top-4 left-1/2 -translate-x-1/2 ${bg} text-white px-6 py-3 rounded-lg shadow-2xl z-[200] flex items-center gap-2 transition-all duration-300`;
  toast.style.transform = 'translate(-50%, -100px)';
  toast.innerHTML = `<i class="${icon} text-xl"></i><p class="font-semibold text-sm">${msg}</p>`;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.style.transform = 'translate(-50%, 0)', 10);
  setTimeout(() => {
    toast.style.transform = 'translate(-50%, -100px)';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function showModal(text) {
  document.getElementById('modal-text').innerText = text;
  document.getElementById('modal-popup').classList.remove('hidden');
  document.getElementById('modal-popup').classList.add('flex');
}
function closeModal() {
  document.getElementById('modal-popup').classList.add('hidden');
}

async function apiCall(action, payload = {}) {
  console.log('[USER API] Call:', action, payload);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ action,...payload }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const text = await res.text();
    console.log('[USER API] Raw:', text);
    return JSON.parse(text);
  } catch (e) {
    console.error('API Error:', e);
    showToast('Gagal konek server', 'error');
    return { status: 'error', msg: 'Gagal konek ke server: ' + e.message };
  }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return { text: 'Selamat Pagi', icon: 'ri-sun-line', color: 'text-yellow-500' };
  if (h >= 11 && h < 15) return { text: 'Selamat Siang', icon: 'ri-sun-cloudy-line', color: 'text-orange-500' };
  if (h >= 15 && h < 18) return { text: 'Selamat Sore', icon: 'ri-sun-foggy-line', color: 'text-orange-600' };
  return { text: 'Selamat Malam', icon: 'ri-moon-clear-line', color: 'text-indigo-400' };
}

async function renderLogin() {
  if (liveClockInterval) clearInterval(liveClockInterval);
  sessionStorage.clear();
  currentUser = null;
  applyDarkMode();
  
  const res = await apiCall('get_setting');
  if (res.status === 'success') {
    appSetting = res.data;
    sessionStorage.setItem('setting', JSON.stringify(appSetting));
  }
  
  app.innerHTML = `
  <div class="flex items-center justify-center h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
    <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-11/12 max-w-sm">
      <img src="${LOGO_APP}" class="w-20 h-20 rounded-full mx-auto mb-4 object-cover shadow-lg">
      <h1 class="font-header font-extrabold text-center mb-6 text-gray-900 dark:text-white" style="font-size: clamp(16px, 4vw, 20px);">ABSENSI KEHADIRAN TERPADU</h1>
      <input id="username" type="text" placeholder="Username" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mb-3 focus:border-[#800000] focus:outline-none transition">
      <input id="password" type="password" placeholder="Password" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mb-3 focus:border-[#800000] focus:outline-none transition">
      <button onclick="login()" class="w-full text-white p-3 rounded-xl font-bold bg-gradient-to-r from-[#800000] to-[#a00000] shadow-lg active:scale-95 transition">Login</button>
      <p id="err" class="text-red-500 text-sm mt-2 text-center"></p>
      <p class="text-xs text-gray-400 text-center mt-4">Hubungi admin jika belum punya akun</p>
    </div>
  </div>`;
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('err');
  if (!username ||!password) {
    showToast('Username & Password wajib diisi', 'error');
    return;
  }
  errEl.innerText = 'Login...';
  const res = await apiCall('login', { username, password });
  if (res.status === 'success') {
    currentUser = res.data;
    appSetting = res.setting || {};
    sessionStorage.setItem('user', JSON.stringify(currentUser));
    sessionStorage.setItem('setting', JSON.stringify(appSetting));
    showToast('Login berhasil!', 'success');
    setTimeout(() => renderHome(), 500);
  } else {
    errEl.innerText = res.msg;
    showToast(res.msg, 'error');
  }
}

function logout() {
  if (liveClockInterval) clearInterval(liveClockInterval);
  sessionStorage.removeItem('user');
  currentUser = null;
  renderLogin();
}

async function renderHome() {
  const loginRes = await apiCall('login', { username: currentUser.Username, password: currentUser.Password });
  if (loginRes.status === 'success') {
    currentUser = loginRes.data;
    sessionStorage.setItem('user', JSON.stringify(currentUser));
  }

  const res = await apiCall('get_dashboard', { nama: currentUser.Nama });
  const rekapRes = await apiCall('get_rekap_user', { nama: currentUser.Nama });

  let fotoUser = currentUser.URL_Logo || 'https://placehold.co/100x100/FFFFFF/800000?text=U';
  fotoUser = fotoUser.replace(/\s/g, '');
  if (fotoUser.includes('uc?export=view&id=')) {
    const fileId = fotoUser.split('id=')[1].split('&')[0];
    fotoUser = `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
  }
  if (fotoUser.includes('drive.google.com')) {
    fotoUser += (fotoUser.includes('?')? '&' : '?') + 'v=' + Date.now();
  }

  const jamMasuk = res.jamMasuk || '00:00';
  const jamPulang = res.jamPulang || '00:00';
  const sudahMasuk = jamMasuk!== '00:00' && jamMasuk!== '-';
  const sudahPulang = jamPulang!== '00:00' && jamPulang!== '-';
  
  let statusText = 'Belum Absen Masuk';
  let statusColor = 'bg-red-500';
  let statusIcon = 'ri-close-circle-line';
  
  if (sudahPulang) {
    statusText = `Sudah Pulang ${jamPulang}`;
    statusColor = 'bg-blue-500';
    statusIcon = 'ri-home-4-line';
  } else if (sudahMasuk) {
    statusText = `Sudah Masuk ${jamMasuk}`;
    statusColor = 'bg-green-500';
    statusIcon = 'ri-checkbox-circle-line';
  }

  let totalHadir = 0;
  if (rekapRes.status === 'success') {
    const now = new Date();
    const bulanIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dataBulan = rekapRes.data.filter(r => {
      if (!r.Tanggal) return false;
      const tgl = r.Tanggal.includes('/')? r.Tanggal.split('/').reverse().join('-') : r.Tanggal;
      return tgl.startsWith(bulanIni);
    });
    totalHadir = dataBulan.filter(r => r['Jam Masuk'] && r['Jam Masuk']!== '-').length;
  }

  const greeting = getGreeting();
  
  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-3 flex justify-between items-center sticky top-0 z-50">
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <img src="${LOGO_APP}" class="w-9 h-9 rounded-full object-cover flex-shrink-0">
      <div class="min-w-0 flex-1 overflow-hidden">
        <p class="font-header font-extrabold text-gray-900 dark:text-white tracking-tight whitespace-nowrap" 
           style="font-size: clamp(11px, 3.5vw, 16px);">
           ABSENSI KEHADIRAN TERPADU
        </p>
      </div>
    </div>
    <div class="flex gap-3 text-xl text-gray-600 dark:text-gray-300 flex-shrink-0 pl-2">
      <i class="ri-notification-3-line"></i>
      <i class="ri-menu-line"></i>
    </div>
  </div>
  
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="mb-4">
      <div class="flex items-center gap-2 mb-1">
        <i class="${greeting.icon} text-2xl ${greeting.color}"></i>
        <p class="text-lg font-bold text-gray-800 dark:text-white">${greeting.text}, ${currentUser.Nama.split(' ')[0]}!</p>
      </div>
      <p id="liveClock" class="text-4xl font-extrabold text-gray-900 dark:text-white font-header"></p>
      <p id="liveDate" class="text-sm text-gray-500 dark:text-gray-400"></p>
    </div>

    <div onclick="renderAbsen()" class="${statusColor} text-white rounded-2xl p-4 shadow-lg mb-4 active:scale-95 transition cursor-pointer">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <i class="${statusIcon} text-3xl"></i>
          <div>
            <p class="text-xs opacity-90">Status Hari Ini</p>
            <p class="font-bold text-lg">${statusText}</p>
          </div>
        </div>
        <i class="ri-arrow-right-s-line text-2xl"></i>
      </div>
      <div id="countdownPulang" class="text-xs mt-2 opacity-90"></div>
    </div>

    <div class="relative overflow-hidden rounded-2xl">
      <div id="swipeContainer" class="flex transition-transform duration-300" style="transform: translateX(0%);">
        <div class="w-full flex-shrink-0">
          <div class="bg-gradient-to-br from-[#800000] to-[#a00000] text-white rounded-2xl p-5 shadow-xl">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <img src="${fotoUser}" class="w-14 h-14 rounded-full object-cover bg-white p-1 shadow-lg">
                <div>
                  <p class="font-bold text-lg">${currentUser.Nama}</p>
                  <p class="text-xs opacity-80">${currentUser.Jabatan || 'Karyawan'}</p>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-4">
              <button onclick="quickAbsen('IN')" class="bg-white/20 backdrop-blur-sm rounded-xl p-4 active:scale-95 transition">
                <i class="ri-login-circle-line text-3xl mb-1"></i>
                <p class="font-bold text-sm">Absen Masuk</p>
              </button>
              <button onclick="quickAbsen('OUT')" class="bg-white/20 backdrop-blur-sm rounded-xl p-4 active:scale-95 transition">
                <i class="ri-logout-circle-line text-3xl mb-1"></i>
                <p class="font-bold text-sm">Absen Pulang</p>
              </button>
            </div>
            <button onclick="renderAbsen()" class="w-full bg-white text-[#800000] py-3 rounded-xl font-bold active:scale-95 transition">
              Buka Kamera Absen
            </button>
          </div>
        </div>

        <div class="w-full flex-shrink-0">
          <div class="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-5 shadow-xl">
            <p class="font-bold text-lg mb-4">Statistik Bulan Ini</p>
            <div class="grid grid-cols-3 gap-3 text-center mb-4">
              <div class="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p class="text-3xl font-bold">${totalHadir}</p>
                <p class="text-xs opacity-90 mt-1">Hadir</p>
              </div>
              <div class="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p class="text-3xl font-bold">0</p>
                <p class="text-xs opacity-90 mt-1">Izin</p>
              </div>
              <div class="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p class="text-3xl font-bold">0</p>
                <p class="text-xs opacity-90 mt-1">Alpha</p>
              </div>
            </div>
            <button onclick="renderRekap()" class="w-full bg-white text-blue-600 py-3 rounded-xl font-bold active:scale-95 transition">
              Lihat Detail Rekap
            </button>
          </div>
        </div>
      </div>
      
      <div class="flex justify-center gap-2 mt-3">
        <button onclick="swipeCard(0)" id="dot-0" class="w-2 h-2 rounded-full bg-[#800000] transition"></button>
        <button onclick="swipeCard(1)" id="dot-1" class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 transition"></button>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4 text-center mt-6 text-xs">
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-mail-send-line text-3xl text-orange-500"></i>Izin</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-suitcase-line text-3xl text-sky-600"></i>Cuti</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-time-line text-3xl text-gray-700 dark:text-gray-400"></i>Lembur</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-calendar-todo-line text-3xl text-purple-600"></i>Shift</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-walk-line text-3xl text-red-600"></i>Patroli</button>
      <button onclick="renderAccount()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-user-3-line text-3xl text-indigo-600"></i>Account</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-information-line text-3xl text-gray-500"></i>Info</button>
      <button onclick="logout()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-logout-box-r-line text-3xl text-black dark:text-white"></i>Keluar</button>
    </div>
  </div>
  ${renderBottomNav('home')}
  `;
  
  applyDarkMode();
  startLiveClock();
  updateCountdown(sudahMasuk, sudahPulang);
}

function startLiveClock() {
  if (liveClockInterval) clearInterval(liveClockInterval);
  
  function update() {
    const now = new Date();
    const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tgl = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    const clockEl = document.getElementById('liveClock');
    const dateEl = document.getElementById('liveDate');
    if (clockEl) clockEl.innerText = jam;
    if (dateEl) dateEl.innerText = tgl;
  }
  
  update();
  liveClockInterval = setInterval(update, 1000);
}

function updateCountdown(sudahMasuk, sudahPulang) {
  if (!sudahMasuk || sudahPulang) return;
  
  const el = document.getElementById('countdownPulang');
  if (!el) return;
  
  const now = new Date();
  const pulang = new Date();
  pulang.setHours(17, 0, 0, 0);
  
  if (now > pulang) {
    el.innerText = 'Waktunya pulang!';
    return;
  }
  
  const diff = pulang - now;
  const jam = Math.floor(diff / 3600000);
  const menit = Math.floor((diff % 3600000) / 60000);
  el.innerText = `Pulang dalam ${jam} jam ${menit} menit`;
  
  setTimeout(() => updateCountdown(true, false), 60000);
}

let currentCard = 0;
function swipeCard(idx) {
  currentCard = idx;
  const container = document.getElementById('swipeContainer');
  if (container) container.style.transform = `translateX(-${idx * 100}%)`;
  
  document.getElementById('dot-0').className = idx === 0? 'w-2 h-2 rounded-full bg-[#800000] transition' : 'w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 transition';
  document.getElementById('dot-1').className = idx === 1? 'w-2 h-2 rounded-full bg-[#800000] transition' : 'w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 transition';
}

async function quickAbsen(tipe) {
  showToast(`Membuka kamera untuk Absen ${tipe}...`, 'success');
  setTimeout(() => renderAbsen(), 300);
}

const API_URL = 'https://script.google.com/macros/s/AKfycbyMxCBHwzIKwQ6504TdbvuPC2BkZsyl7yhVYJF_JQuSy4_BQ3jFD-4xM8yc59gmnYk/exec';
const LOGO_APP = 'logo.png';
const app = document.getElementById('app');
let currentUser = JSON.parse(sessionStorage.getItem('user') || 'null');
let appSetting = JSON.parse(sessionStorage.getItem('setting') || '{}');
let liveClockInterval = null;
let absenStream = null;
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// DARK MODE HELPER
function applyDarkMode() {
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleDarkMode() {
  isDarkMode =!isDarkMode;
  localStorage.setItem('darkMode', isDarkMode);
  applyDarkMode();
  renderHome();
}

// TOAST NOTIF + HAPTIC
function showToast(msg, type = 'success') {
  if (navigator.vibrate) navigator.vibrate(type === 'success'? 50 : [50, 50, 50]);
  
  const toast = document.createElement('div');
  const bg = type === 'success'? 'bg-green-500' : type === 'warning'? 'bg-orange-500' : 'bg-red-500';
  const icon = type === 'success'? 'ri-check-line' : type === 'warning'? 'ri-alert-line' : 'ri-close-line';
  
  toast.className = `fixed top-4 left-1/2 -translate-x-1/2 ${bg} text-white px-6 py-3 rounded-lg shadow-2xl z-[200] flex items-center gap-2 transition-all duration-300`;
  toast.style.transform = 'translate(-50%, -100px)';
  toast.innerHTML = `<i class="${icon} text-xl"></i><p class="font-semibold text-sm">${msg}</p>`;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.style.transform = 'translate(-50%, 0)', 10);
  setTimeout(() => {
    toast.style.transform = 'translate(-50%, -100px)';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function showModal(text) {
  document.getElementById('modal-text').innerText = text;
  document.getElementById('modal-popup').classList.remove('hidden');
  document.getElementById('modal-popup').classList.add('flex');
}
function closeModal() {
  document.getElementById('modal-popup').classList.add('hidden');
}

async function apiCall(action, payload = {}) {
  console.log('[USER API] Call:', action, payload);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ action,...payload }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const text = await res.text();
    console.log('[USER API] Raw:', text);
    return JSON.parse(text);
  } catch (e) {
    console.error('API Error:', e);
    showToast('Gagal konek server', 'error');
    return { status: 'error', msg: 'Gagal konek ke server: ' + e.message };
  }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return { text: 'Selamat Pagi', icon: 'ri-sun-line', color: 'text-yellow-500' };
  if (h >= 11 && h < 15) return { text: 'Selamat Siang', icon: 'ri-sun-cloudy-line', color: 'text-orange-500' };
  if (h >= 15 && h < 18) return { text: 'Selamat Sore', icon: 'ri-sun-foggy-line', color: 'text-orange-600' };
  return { text: 'Selamat Malam', icon: 'ri-moon-clear-line', color: 'text-indigo-400' };
}

async function renderLogin() {
  if (liveClockInterval) clearInterval(liveClockInterval);
  sessionStorage.clear();
  currentUser = null;
  applyDarkMode();
  
  const res = await apiCall('get_setting');
  if (res.status === 'success') {
    appSetting = res.data;
    sessionStorage.setItem('setting', JSON.stringify(appSetting));
  }
  
  app.innerHTML = `
  <div class="flex items-center justify-center h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
    <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-11/12 max-w-sm">
      <img src="${LOGO_APP}" class="w-20 h-20 rounded-full mx-auto mb-4 object-cover shadow-lg">
      <h1 class="font-header font-extrabold text-center mb-6 text-gray-900 dark:text-white" style="font-size: clamp(16px, 4vw, 20px);">ABSENSI KEHADIRAN TERPADU</h1>
      <input id="username" type="text" placeholder="Username" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mb-3 focus:border-[#800000] focus:outline-none transition">
      <input id="password" type="password" placeholder="Password" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mb-3 focus:border-[#800000] focus:outline-none transition">
      <button onclick="login()" class="w-full text-white p-3 rounded-xl font-bold bg-gradient-to-r from-[#800000] to-[#a00000] shadow-lg active:scale-95 transition">Login</button>
      <p id="err" class="text-red-500 text-sm mt-2 text-center"></p>
      <p class="text-xs text-gray-400 text-center mt-4">Hubungi admin jika belum punya akun</p>
    </div>
  </div>`;
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('err');
  if (!username ||!password) {
    showToast('Username & Password wajib diisi', 'error');
    return;
  }
  errEl.innerText = 'Login...';
  const res = await apiCall('login', { username, password });
  if (res.status === 'success') {
    currentUser = res.data;
    appSetting = res.setting || {};
    sessionStorage.setItem('user', JSON.stringify(currentUser));
    sessionStorage.setItem('setting', JSON.stringify(appSetting));
    showToast('Login berhasil!', 'success');
    setTimeout(() => renderHome(), 500);
  } else {
    errEl.innerText = res.msg;
    showToast(res.msg, 'error');
  }
}

function logout() {
  if (liveClockInterval) clearInterval(liveClockInterval);
  sessionStorage.removeItem('user');
  currentUser = null;
  renderLogin();
}

async function renderHome() {
  const loginRes = await apiCall('login', { username: currentUser.Username, password: currentUser.Password });
  if (loginRes.status === 'success') {
    currentUser = loginRes.data;
    sessionStorage.setItem('user', JSON.stringify(currentUser));
  }

  const res = await apiCall('get_dashboard', { nama: currentUser.Nama });
  const rekapRes = await apiCall('get_rekap_user', { nama: currentUser.Nama });

  let fotoUser = currentUser.URL_Logo || 'https://placehold.co/100x100/FFFFFF/800000?text=U';
  fotoUser = fotoUser.replace(/\s/g, '');
  if (fotoUser.includes('uc?export=view&id=')) {
    const fileId = fotoUser.split('id=')[1].split('&')[0];
    fotoUser = `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
  }
  if (fotoUser.includes('drive.google.com')) {
    fotoUser += (fotoUser.includes('?')? '&' : '?') + 'v=' + Date.now();
  }

  const jamMasuk = res.jamMasuk || '00:00';
  const jamPulang = res.jamPulang || '00:00';
  const sudahMasuk = jamMasuk!== '00:00' && jamMasuk!== '-';
  const sudahPulang = jamPulang!== '00:00' && jamPulang!== '-';
  
  let statusText = 'Belum Absen Masuk';
  let statusColor = 'bg-red-500';
  let statusIcon = 'ri-close-circle-line';
  
  if (sudahPulang) {
    statusText = `Sudah Pulang ${jamPulang}`;
    statusColor = 'bg-blue-500';
    statusIcon = 'ri-home-4-line';
  } else if (sudahMasuk) {
    statusText = `Sudah Masuk ${jamMasuk}`;
    statusColor = 'bg-green-500';
    statusIcon = 'ri-checkbox-circle-line';
  }

  let totalHadir = 0;
  if (rekapRes.status === 'success') {
    const now = new Date();
    const bulanIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dataBulan = rekapRes.data.filter(r => {
      if (!r.Tanggal) return false;
      const tgl = r.Tanggal.includes('/')? r.Tanggal.split('/').reverse().join('-') : r.Tanggal;
      return tgl.startsWith(bulanIni);
    });
    totalHadir = dataBulan.filter(r => r['Jam Masuk'] && r['Jam Masuk']!== '-').length;
  }

  const greeting = getGreeting();
  
  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-3 flex justify-between items-center sticky top-0 z-50">
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <img src="${LOGO_APP}" class="w-9 h-9 rounded-full object-cover flex-shrink-0">
      <div class="min-w-0 flex-1 overflow-hidden">
        <p class="font-header font-extrabold text-gray-900 dark:text-white tracking-tight whitespace-nowrap" 
           style="font-size: clamp(11px, 3.5vw, 16px);">
           ABSENSI KEHADIRAN TERPADU
        </p>
      </div>
    </div>
    <div class="flex gap-3 text-xl text-gray-600 dark:text-gray-300 flex-shrink-0 pl-2">
      <i class="ri-notification-3-line"></i>
      <i class="ri-menu-line"></i>
    </div>
  </div>
  
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="mb-4">
      <div class="flex items-center gap-2 mb-1">
        <i class="${greeting.icon} text-2xl ${greeting.color}"></i>
        <p class="text-lg font-bold text-gray-800 dark:text-white">${greeting.text}, ${currentUser.Nama.split(' ')[0]}!</p>
      </div>
      <p id="liveClock" class="text-4xl font-extrabold text-gray-900 dark:text-white font-header"></p>
      <p id="liveDate" class="text-sm text-gray-500 dark:text-gray-400"></p>
    </div>

    <div onclick="renderAbsen()" class="${statusColor} text-white rounded-2xl p-4 shadow-lg mb-4 active:scale-95 transition cursor-pointer">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <i class="${statusIcon} text-3xl"></i>
          <div>
            <p class="text-xs opacity-90">Status Hari Ini</p>
            <p class="font-bold text-lg">${statusText}</p>
          </div>
        </div>
        <i class="ri-arrow-right-s-line text-2xl"></i>
      </div>
      <div id="countdownPulang" class="text-xs mt-2 opacity-90"></div>
    </div>

    <div class="relative overflow-hidden rounded-2xl">
      <div id="swipeContainer" class="flex transition-transform duration-300" style="transform: translateX(0%);">
        <div class="w-full flex-shrink-0">
          <div class="bg-gradient-to-br from-[#800000] to-[#a00000] text-white rounded-2xl p-5 shadow-xl">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <img src="${fotoUser}" class="w-14 h-14 rounded-full object-cover bg-white p-1 shadow-lg">
                <div>
                  <p class="font-bold text-lg">${currentUser.Nama}</p>
                  <p class="text-xs opacity-80">${currentUser.Jabatan || 'Karyawan'}</p>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-4">
              <button onclick="quickAbsen('IN')" class="bg-white/20 backdrop-blur-sm rounded-xl p-4 active:scale-95 transition">
                <i class="ri-login-circle-line text-3xl mb-1"></i>
                <p class="font-bold text-sm">Absen Masuk</p>
              </button>
              <button onclick="quickAbsen('OUT')" class="bg-white/20 backdrop-blur-sm rounded-xl p-4 active:scale-95 transition">
                <i class="ri-logout-circle-line text-3xl mb-1"></i>
                <p class="font-bold text-sm">Absen Pulang</p>
              </button>
            </div>
            <button onclick="renderAbsen()" class="w-full bg-white text-[#800000] py-3 rounded-xl font-bold active:scale-95 transition">
              Buka Kamera Absen
            </button>
          </div>
        </div>

        <div class="w-full flex-shrink-0">
          <div class="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-5 shadow-xl">
            <p class="font-bold text-lg mb-4">Statistik Bulan Ini</p>
            <div class="grid grid-cols-3 gap-3 text-center mb-4">
              <div class="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p class="text-3xl font-bold">${totalHadir}</p>
                <p class="text-xs opacity-90 mt-1">Hadir</p>
              </div>
              <div class="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p class="text-3xl font-bold">0</p>
                <p class="text-xs opacity-90 mt-1">Izin</p>
              </div>
              <div class="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p class="text-3xl font-bold">0</p>
                <p class="text-xs opacity-90 mt-1">Alpha</p>
              </div>
            </div>
            <button onclick="renderRekap()" class="w-full bg-white text-blue-600 py-3 rounded-xl font-bold active:scale-95 transition">
              Lihat Detail Rekap
            </button>
          </div>
        </div>
      </div>
      
      <div class="flex justify-center gap-2 mt-3">
        <button onclick="swipeCard(0)" id="dot-0" class="w-2 h-2 rounded-full bg-[#800000] transition"></button>
        <button onclick="swipeCard(1)" id="dot-1" class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 transition"></button>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4 text-center mt-6 text-xs">
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-mail-send-line text-3xl text-orange-500"></i>Izin</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-suitcase-line text-3xl text-sky-600"></i>Cuti</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-time-line text-3xl text-gray-700 dark:text-gray-400"></i>Lembur</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-calendar-todo-line text-3xl text-purple-600"></i>Shift</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-walk-line text-3xl text-red-600"></i>Patroli</button>
      <button onclick="renderAccount()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-user-3-line text-3xl text-indigo-600"></i>Account</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-information-line text-3xl text-gray-500"></i>Info</button>
      <button onclick="logout()" class="flex flex-col items-center gap-1 active:scale-90 transition text-gray-700 dark:text-gray-300"><i class="ri-logout-box-r-line text-3xl text-black dark:text-white"></i>Keluar</button>
    </div>
  </div>
  ${renderBottomNav('home')}
  `;
  
  applyDarkMode();
  startLiveClock();
  updateCountdown(sudahMasuk, sudahPulang);
}

function startLiveClock() {
  if (liveClockInterval) clearInterval(liveClockInterval);
  
  function update() {
    const now = new Date();
    const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tgl = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    const clockEl = document.getElementById('liveClock');
    const dateEl = document.getElementById('liveDate');
    if (clockEl) clockEl.innerText = jam;
    if (dateEl) dateEl.innerText = tgl;
  }
  
  update();
  liveClockInterval = setInterval(update, 1000);
}

function updateCountdown(sudahMasuk, sudahPulang) {
  if (!sudahMasuk || sudahPulang) return;
  
  const el = document.getElementById('countdownPulang');
  if (!el) return;
  
  const now = new Date();
  const pulang = new Date();
  pulang.setHours(17, 0, 0, 0);
  
  if (now > pulang) {
    el.innerText = 'Waktunya pulang!';
    return;
  }
  
  const diff = pulang - now;
  const jam = Math.floor(diff / 3600000);
  const menit = Math.floor((diff % 3600000) / 60000);
  el.innerText = `Pulang dalam ${jam} jam ${menit} menit`;
  
  setTimeout(() => updateCountdown(true, false), 60000);
}

let currentCard = 0;
function swipeCard(idx) {
  currentCard = idx;
  const container = document.getElementById('swipeContainer');
  if (container) container.style.transform = `translateX(-${idx * 100}%)`;
  
  document.getElementById('dot-0').className = idx === 0? 'w-2 h-2 rounded-full bg-[#800000] transition' : 'w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 transition';
  document.getElementById('dot-1').className = idx === 1? 'w-2 h-2 rounded-full bg-[#800000] transition' : 'w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 transition';
}

async function quickAbsen(tipe) {
  showToast(`Membuka kamera untuk Absen ${tipe}...`, 'success');
  setTimeout(() => renderAbsen(), 300);
}
