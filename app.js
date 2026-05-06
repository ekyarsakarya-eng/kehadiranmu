// === CONFIG & GLOBAL VAR ===
const API_URL = 'https://script.google.com/macros/s/AKfycbwhx18lwhm5pfx_NQXwMUn8Jp5wUwiCIUdQsaM5keeJvJDpmef927M45ToDDm5vpsN1/exec';
const LOGO_APP = 'logo.png';
const APP_NAME = 'ABSENSI KEHADIRAN TERPADU';
const app = document.getElementById('app');
let currentUser = JSON.parse(sessionStorage.getItem('user') || 'null');
let appSetting = JSON.parse(sessionStorage.getItem('setting') || '{}');
let liveClockInterval = null;
let absenStream = null;
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let absenFoto = null;
let absenTipe = 'IN';
let currentLokasi = null;
let patroliFoto = null;
let kejadianFoto = null;
let urgensiKejadian = 'Rendah';
let rekapDataCache = [];
let rekapPage = 0;
const REKAP_PER_PAGE = 10;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });
}
if ('Notification' in window) Notification.requestPermission();

// === UTILS ===
function stopAllStreams() {
  if (absenStream) {
    absenStream.getTracks().forEach(t => t.stop());
    absenStream = null;
  }
  if (liveClockInterval) {
    clearInterval(liveClockInterval);
    liveClockInterval = null;
  }
}

function getTimeMode() {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return 'pagi';
  if (h >= 11 && h < 15) return 'siang';
  if (h >= 15 && h < 18) return 'sore';
  return 'malam';
}

function applyDarkMode() {
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  // FIX: Set data-time buat ganti warna maroon ke gold
  document.documentElement.setAttribute('data-time', getTimeMode());
}

function toggleDarkMode() {
  isDarkMode =!isDarkMode;
  localStorage.setItem('darkMode', isDarkMode);
  applyDarkMode();
  renderHome();
}

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
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

async function apiCall(action, payload = {}) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ action,...payload }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const text = await res.text();
    return JSON.parse(text);
  } catch (e) {
    showToast('Gagal konek server', 'error');
    return { status: 'error', msg: e.message };
  }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return { text: 'Pagi', icon: 'ri-sun-line', color: 'text-yellow-500' };
  if (h >= 11 && h < 15) return { text: 'Siang', icon: 'ri-sun-cloudy-line', color: 'text-orange-500' };
  if (h >= 15 && h < 18) return { text: 'Sore', icon: 'ri-sun-foggy-line', color: 'text-orange-600' };
  return { text: 'Malam', icon: 'ri-moon-clear-line', color: 'text-indigo-400' };
}

function formatTanggal(date) {
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function updateWaktu() {
  if (liveClockInterval) clearInterval(liveClockInterval);
  function update() {
    const now = new Date();
    const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const el = document.getElementById('jamDigital');
    if (el) el.innerText = jam;
  }
  update();
  liveClockInterval = setInterval(update, 1000);
}

function renderBottomNav(active) {
  return `
  <div class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex justify-around text-xs py-3 shadow-2xl">
    <button onclick="renderHome()" class="flex flex-col items-center gap-1 ${active === 'home'? 'text-[#800000] dark:text-[var(--accent-primary)]' : 'text-gray-500 dark:text-gray-400'} active:scale-90 transition">
      <i class="ri-home-5-fill text-2xl"></i>
      <p class="font-semibold">Home</p>
    </button>
    <button onclick="renderAccount()" class="flex flex-col items-center gap-1 ${active === 'account'? 'text-[#800000] dark:text-[var(--accent-primary)]' : 'text-gray-500 dark:text-gray-400'} active:scale-90 transition">
      <i class="ri-user-3-fill text-2xl"></i>
      <p class="font-semibold">Account</p>
    </button>
  </div>`;
}

// === LOGIN ===
async function renderLogin() {
  stopAllStreams();
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
    <div class="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl w-11/12 max-w-sm">
      <img src="${LOGO_APP}" class="w-24 h-24 rounded-full mx-auto mb-4 object-cover shadow-lg">
      <h1 class="font-header font-extrabold text-center mb-6 text-gray-900 dark:text-white" style="font-size: clamp(16px, 4vw, 20px);">${APP_NAME}</h1>
      <input id="username" type="text" placeholder="Username" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-4 rounded-2xl mb-3 focus:border-[#800000] focus:outline-none transition">
      <div class="relative mb-3">
        <input id="password" type="password" placeholder="Password" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-4 pr-12 rounded-2xl focus:border-[#800000] focus:outline-none transition">
        <button type="button" onclick="togglePassword()" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 active:scale-90">
          <i id="iconPassword" class="ri-eye-off-line text-xl"></i>
        </button>
      </div>
      <button onclick="login()" class="w-full text-white p-4 rounded-2xl font-bold bg-gradient-to-r from-[#800000] to-[#a00000] shadow-lg active:scale-95 transition">Login</button>
      <p id="err" class="text-red-500 text-sm mt-3 text-center"></p>
    </div>
  </div>`;
}

function togglePassword() {
  const input = document.getElementById('password');
  const icon = document.getElementById('iconPassword');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'ri-eye-line text-xl';
  } else {
    input.type = 'password';
    icon.className = 'ri-eye-off-line text-xl';
  }
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
  stopAllStreams();
  sessionStorage.removeItem('user');
  currentUser = null;
  renderLogin();
}

// === HOME & DASHBOARD ===
function renderHome() {
  const greeting = getGreeting();
  const html = `
    <div class="min-h-screen pb-24 bg-gray-100 dark:bg-gray-900 dashboard-container">
      <div class="px-4 pt-6 pb-4">
        <div class="flex flex-col items-center gap-3 mb-4">
          <div class="w-full flex items-center justify-between">
            <button class="ripple w-10 h-10 rounded-full glass flex items-center justify-center">
              <i class="ri-notification-3-line text-gray-800 dark:text-white"></i>
            </button>
            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-red-800 to-red-900 flex items-center justify-center shadow-lg animate-glow">
              <img src="${LOGO_APP}" class="w-10 h-10 object-contain" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'ri-hospital-line text-white text-2xl\\'></i>'"/>
            </div>
            <button onclick="toggleDarkMode()" class="ripple w-10 h-10 rounded-full glass flex items-center justify-center">
              <i class="ri-${isDarkMode? 'sun' : 'moon'}-line text-gray-800 dark:text-white"></i>
            </button>
          </div>
          <div class="text-center">
            <p class="text-xs text-gray-500 dark:text-gray-400">Selamat ${greeting.text}!</p>
            <h1 class="font-header text-xl font-black text-gray-900 dark:text-white">${currentUser.Nama}</h1>
            <p class="text-xs text-gray-600 dark:text-gray-300">${currentUser.Unit_Kerja}</p>
          </div>
        </div>
      </div>

      <div class="px-4 -mt-2">
        <div class="card-maroon rounded-3xl p-5 shadow-2xl animate-slide-up-bounce">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-white/80 text-xs font-medium">Status Hari Ini</p>
              <p class="text-white font-header font-bold text-lg" id="tanggalHariIni">${formatTanggal(new Date())}</p>
            </div>
            <div id="statusAbsenHariIni" class="px-3 py-1 rounded-full glass text-white text-xs font-bold">
              <i class="ri-loader-4-line animate-spin"></i>
            </div>
          </div>

          <div class="text-center my-6">
            <div class="inline-block">
              <div class="text-white font-header font-black text-5xl tabular-nums tracking-tight" id="jamDigital">00:00:00</div>
              <div class="text-white/60 text-xs mt-1 font-medium">WIB - Asia/Jakarta</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="glass rounded-2xl p-3">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <i class="ri-login-box-line text-green-400"></i>
                </div>
                <span class="text-white/80 text-xs font-medium">Masuk</span>
              </div>
              <p class="text-white font-bold text-lg tabular-nums" id="jamMasukToday">-</p>
            </div>
            <div class="glass rounded-2xl p-3">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <i class="ri-logout-box-line text-red-400"></i>
                </div>
                <span class="text-white/80 text-xs font-medium">Pulang</span>
              </div>
              <p class="text-white font-bold text-lg tabular-nums" id="jamPulangToday">-</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <button onclick="renderAbsen('IN')" class="ripple bg-[#f5e6d3] text-red-900 rounded-2xl py-4 font-bold shadow-lg active:scale-95 transition-all">
              <i class="ri-login-box-line text-2xl block mb-1"></i>
              <p class="text-sm">Masuk</p>
            </button>
            <button onclick="renderAbsen('OUT')" class="ripple bg-[#f5e6d3] text-red-900 rounded-2xl py-4 font-bold shadow-lg active:scale-95 transition-all">
              <i class="ri-logout-box-line text-2xl block mb-1"></i>
              <p class="text-sm">Pulang</p>
            </button>
          </div>
        </div>
      </div>

      <div class="px-4 mt-6">
        <div class="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-xl">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-header font-bold text-gray-900 dark:text-white">Statistik Bulan Ini</h3>
            <button onclick="renderRekap()" class="text-xs font-semibold text-red-800 dark:text-[var(--accent-primary)]">
              Lihat Detail <i class="ri-arrow-right-line"></i>
            </button>
          </div>

          <div class="grid grid-cols-3 gap-3 mb-4">
            <div class="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl">
              <div class="w-10 h-10 rounded-xl bg-green-500 mx-auto mb-2 flex items-center justify-center">
                <i class="ri-checkbox-circle-fill text-white text-xl"></i>
              </div>
              <p class="text-2xl font-black text-gray-900 dark:text-white tabular-nums" id="statHadirHome">0</p>
              <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">Hadir</p>
            </div>
            <div class="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl">
              <div class="w-10 h-10 rounded-xl bg-yellow-500 mx-auto mb-2 flex items-center justify-center">
                <i class="ri-file-list-3-fill text-white text-xl"></i>
              </div>
              <p class="text-2xl font-black text-gray-900 dark:text-white tabular-nums" id="statIzinHome">0</p>
              <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">Izin</p>
            </div>
            <div class="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl">
              <div class="w-10 h-10 rounded-xl bg-red-500 mx-auto mb-2 flex items-center justify-center">
                <i class="ri-close-circle-fill text-white text-xl"></i>
              </div>
              <p class="text-2xl font-black text-gray-900 dark:text-white tabular-nums" id="statAlpaHome">0</p>
              <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">Alpa</p>
            </div>
          </div>

          <div class="relative">
            <svg class="w-full" viewBox="0 0 100 50">
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style="stop-color:#800000;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#a00000;stop-opacity:1" />
                </linearGradient>
              </defs>
              <path d="M 10 40 A 40 40 0 0 1 90 40" fill="none" stroke="#e5e7eb" stroke-width="8" class="dark:stroke-gray-700"/>
              <path id="progressRing" d="M 10 40 A 40 40 0 0 1 90 40" fill="none" stroke="url(#progressGradient)" stroke-width="8" stroke-linecap="round" stroke-dasharray="239" stroke-dashoffset="239" style="transition: stroke-dashoffset 1s ease-out"/>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center pt-4">
              <p class="text-3xl font-black text-gray-900 dark:text-white tabular-nums" id="persenHadir">0%</p>
              <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">Kehadiran</p>
            </div>
          </div>
        </div>
      </div>

      <div class="px-4 mt-6">
        <div class="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-xl">
          <h3 class="font-header font-bold text-gray-900 dark:text-white mb-4">Aktivitas Terakhir</h3>
          <div id="aktivitasTerakhir" class="space-y-3">
            <div class="flex items-center justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-800 dark:border-[var(--accent-primary)]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderBottomNav('home')}
  `;
  document.getElementById('app').innerHTML = html;
  updateWaktu();
  loadHomeData();
}

async function loadHomeData() {
  const res = await apiCall('get_dashboard', { nama: currentUser.Nama.trim() });
  const rekapRes = await apiCall('get_rekap_user', { nama: currentUser.Nama.trim(), bulan: new Date().toISOString().slice(0, 7) });

  if (rekapRes.status === 'success' && rekapRes.statistik) {
    const { hadir = 0, izin = 0, alpa = 0 } = rekapRes.statistik;
    const total = hadir + izin + alpa;
    const persen = total > 0? Math.round(hadir / total * 100) : 0;

    animateNumber('statHadirHome', hadir);
    animateNumber('statIzinHome', izin);
    animateNumber('statAlpaHome', alpa);
    animateNumber('persenHadir', persen, '%');

    const offset = 239 - (239 * persen / 100);
    setTimeout(() => {
      const ring = document.getElementById('progressRing');
      if (ring) ring.style.strokeDashoffset = offset;
    }, 300);
  }

  if (res.status === 'success') {
    const statusEl = document.getElementById('statusAbsenHariIni');
    if (statusEl) {
      if (res.sudahAbsenMasuk && res.sudahAbsenPulang) {
        statusEl.innerHTML = '<i class="ri-checkbox-circle-fill"></i> Lengkap';
        statusEl.className = 'px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold';
      } else if (res.sudahAbsenMasuk) {
        statusEl.innerHTML = '<i class="ri-time-fill"></i> Masuk';
        statusEl.className = 'px-3 py-1 rounded-full bg-yellow-500 text-white text-xs font-bold';
      } else {
        statusEl.innerHTML = '<i class="ri-close-circle-fill"></i> Belum';
        statusEl.className = 'px-3 py-1 rounded-full glass text-white text-xs font-bold';
      }
    }

    const formatJam = (jam) => {
      if (!jam || jam === '') return '-';
      if (typeof jam === 'string' && jam.includes('T')) {
        return jam.split('T')[1].substring(0, 8);
      }
      return jam;
    };

    document.getElementById('jamMasukToday').innerText = formatJam(res.jamMasuk);
    document.getElementById('jamPulangToday').innerText = formatJam(res.jamPulang);

    const aktivitas = document.getElementById('aktivitasTerakhir');
    if (res.aktivitasTerakhir && res.aktivitasTerakhir.length > 0) {
      aktivitas.innerHTML = res.aktivitasTerakhir.map((a) => `
        <div class="flex items-center gap-3 p-2 glass rounded-lg">
          <i class="${a.icon} text-xl" style="color: var(--accent-primary)"></i>
          <div class="flex-1">
            <p class="text-sm font-semibold text-gray-800 dark:text-white">${a.label}</p>
            <p class="text-xs text-gray-500">${a.waktu}</p>
          </div>
        </div>
      `).join('');
    } else {
      aktivitas.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Belum ada aktivitas</p>';
    }
  }
}

function animateNumber(id, end, suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1000;
  const step = (timestamp, startTime) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    el.innerText = Math.floor(easeOut * end) + suffix;
    if (progress < 1) requestAnimationFrame((t) => step(t, startTime));
  };
  requestAnimationFrame(step);
}

// === ABSEN ===
async function renderAbsen(tipeDefault = 'IN') {
  stopAllStreams();
  absenTipe = tipeDefault;
  absenFoto = null;

  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center gap-3 sticky top-0 z-50">
    <button onclick="renderHome()"><i class="ri-arrow-left-s-line text-2xl text-gray-900 dark:text-white"></i></button>
    <h1 class="text-xl font-bold text-gray-900 dark:text-white">Absen ${absenTipe === 'IN'? 'Masuk' : 'Pulang'}</h1>
  </div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="bg-gradient-to-br from-[#800000] to-[#a00000] text-white rounded-2xl p-5 shadow-xl mb-4">
      <div class="flex items-center gap-3 mb-3">
        <i class="ri-${absenTipe === 'IN'? 'login' : 'logout'}-circle-line text-4xl"></i>
        <div>
          <p class="font-bold text-lg">Absen ${absenTipe === 'IN'? 'Masuk' : 'Pulang'}</p>
          <p id="jamAbsen" class="text-sm opacity-80">Loading...</p>
        </div>
      </div>
      <div id="lokasiAbsen" class="text-sm bg-white/20 backdrop-blur-sm rounded-lg p-2">
        <i class="ri-map-pin-line"></i> Mendeteksi lokasi...
      </div>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-4">
      <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Foto Selfie</label>
      <div class="relative w-full h-64 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
        <video id="cameraAbsen" class="w-full h-full object-cover hidden" autoplay playsinline></video>
        <img id="previewAbsen" class="w-full h-full object-cover hidden" />
        <button onclick="startCameraAbsen()" id="btnBukaKamera" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <i class="ri-camera-line text-4xl"></i>
          <p class="text-sm font-semibold">Tap untuk buka kamera</p>
        </button>
        <button onclick="ambilFotoAbsen()" id="btnCapture" class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 px-6 py-2 rounded-full font-bold text-gray-800 shadow-lg hidden">
          <i class="ri-camera-fill"></i> Ambil Foto
        </button>
      </div>
      <button onclick="switchAbsenTipe()" class="w-full mt-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-xl font-bold">
        Ganti ke Absen ${absenTipe === 'IN'? 'Pulang' : 'Masuk'}
      </button>
    </div>
    <button onclick="submitAbsen()" id="btnSubmitAbsen" class="w-full bg-gradient-to-r from-[#800000] to-[#a00000] text-white p-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled>
      <i class="ri-check-line"></i> Submit Absen ${absenTipe === 'IN'? 'Masuk' : 'Pulang'}
    </button>
  </div>
  ${renderBottomNav('home')}
  `;
  applyDarkMode();
  updateJamAbsen();
  setInterval(updateJamAbsen, 1000);

  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    currentLokasi = { lat: latitude, lon: longitude };
    document.getElementById('lokasiAbsen').innerHTML = `<i class="ri-map-pin-line"></i> Lokasi: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }, () => {
    document.getElementById('lokasiAbsen').innerHTML = `<i class="ri-error-warning-line"></i> Gagal dapat lokasi`;
    showToast('GPS tidak aktif', 'error');
  });
}

function updateJamAbsen() {
  const now = new Date();
  const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const el = document.getElementById('jamAbsen');
  if (el) el.innerText = jam;
}

function switchAbsenTipe() {
  absenTipe = absenTipe === 'IN'? 'OUT' : 'IN';
  renderAbsen(absenTipe);
}

async function startCameraAbsen() {
  try {
    absenStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    const video = document.getElementById('cameraAbsen');
    video.srcObject = absenStream;
    video.classList.remove('hidden');
    document.getElementById('btnBukaKamera').classList.add('hidden');
    document.getElementById('btnCapture').classList.remove('hidden');
  } catch (err) {
    showToast('Kamera error: ' + err.message, 'error');
  }
}

function ambilFotoAbsen() {
  const video = document.getElementById('cameraAbsen');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const maxSize = 800;
  let width = video.videoWidth;
  let height = video.videoHeight;
  if (width > height) {
    if (width > maxSize) {
      height = height * (maxSize / width);
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width = width * (maxSize / height);
      height = maxSize;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(video, 0, 0, width, height);

  absenFoto = canvas.toDataURL('image/jpeg', 0.6);

  const preview = document.getElementById('previewAbsen');
  preview.src = absenFoto;
  preview.classList.remove('hidden');
  video.classList.add('hidden');
  document.getElementById('btnCapture').classList.add('hidden');
  document.getElementById('btnSubmitAbsen').disabled = false;

  if (absenStream) {
    absenStream.getTracks().forEach(track => track.stop());
    absenStream = null;
  }
  showToast('Foto siap!', 'success');
}

async function submitAbsen() {
  if (!absenFoto) {
    showToast('Ambil foto dulu!', 'error');
    return;
  }
  const btn = document.getElementById('btnSubmitAbsen');
  btn.disabled = true;
  btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Mengirim...';

  let lat = null, lon = null;
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
    });
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
  } catch (e) {}

  const res = await apiCall('absen', {
    nama: currentUser.Nama.trim(),
    tipe: absenTipe,
    foto: absenFoto,
    latitude: lat,
    longitude: lon,
    lokasi: lat? `${lat}, ${lon}` : '',
    unit_kerja: currentUser.Unit_Kerja,
    tanggal: new Date().toLocaleDateString('sv-SE')
  });

  if (res.status === 'success') {
    showToast(res.msg, 'success');
    setTimeout(() => renderHome(), 800);
  } else {
    btn.disabled = false;
    btn.innerHTML = '<i class="ri-check-line"></i> Submit Absen ' + (absenTipe === 'IN'? 'Masuk' : 'Pulang');
    showToast(res.msg, 'error');
  }
}

// === REKAP ===
async function renderRekap() {
  stopAllStreams();
  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-3 flex items-center gap-3 sticky top-0 z-50">
    <button onclick="renderHome()" class="text-2xl text-gray-600 dark:text-gray-300"><i class="ri-arrow-left-line"></i></button>
    <p class="font-bold text-lg text-gray-900 dark:text-white">Riwayat Absensi</p>
  </div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="mb-4">
      <select id="filterBulan" onchange="loadRekapBulan()" class="w-full p-3 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl font-bold focus:border-[#800000] focus:outline-none">
        ${generateBulanOptions()}
      </select>
    </div>
    <div id="rekapContent">
      <div class="space-y-3 animate-pulse">
        <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        <div class="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>
    </div>
  </div>
  ${renderBottomNav('home')}`;
  applyDarkMode();
  loadRekapBulan();
}

function generateBulanOptions() {
  const now = new Date();
  let html = '';
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    html += `<option value="${val}" ${i === 0? 'selected' : ''}>${label}</option>`;
  }
  return html;
}

async function loadRekapBulan() {
  const bulan = document.getElementById('filterBulan').value;
  const content = document.getElementById('rekapContent');
  if (!bulan) return;

  content.innerHTML = `
    <div class="space-y-3 animate-pulse">
      <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      <div class="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
    </div>`;

  const res = await apiCall('get_rekap_user', { nama: currentUser.Nama.trim(), bulan: bulan });
  if (res.status!== 'success') {
    content.innerHTML = `<p class="text-red-500 text-center py-8">Gagal load: ${res.msg}</p>`;
    return;
  }

  const [year, month] = bulan.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const dataMap = {};

  res.data.forEach((r, idx) => {
    if (r.TanggalRaw && r.TanggalRaw.startsWith(`${year}-${String(month).padStart(2,'0')}`)) {
      const day = parseInt(r.TanggalRaw.split('-')[2]);
      dataMap[day] = {...r, _idx: idx };
    }
  });

  window.rekapDataBulanIni = Object.values(dataMap);
  const totalHadir = res.statistik.hadir || 0;
  const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  let html = `
    <div class="bg-gradient-to-r from-[#800000] to-[#a00000] text-white rounded-xl p-4 mb-4 shadow-lg">
      <div class="flex justify-between items-center">
        <div>
          <p class="text-xs opacity-80">Kehadiran ${namaBulan[month-1]} ${year}</p>
          <p class="text-3xl font-bold">${totalHadir}/${daysInMonth}</p>
          <p class="text-xs opacity-80 mt-1">hari</p>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold">${Math.round(totalHadir/daysInMonth*100)}%</div>
          <p class="text-xs opacity-80">Tingkat hadir</p>
        </div>
      </div>
    </div>

   <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-4">
      <div class="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
        <div>M</div><div>S</div><div>R</div><div>K</div><div>J</div><div>S</div><div>M</div>
      </div>
      <div class="grid grid-cols-7 gap-2">`;

  for(let i=0; i<firstDay; i++){
    html += `<div></div>`;
  }

  for(let day=1; day<=daysInMonth; day++){
    const r = dataMap[day];
    let bg = 'bg-gray-100 dark:bg-gray-700';
    let text = 'text-gray-400';
    let status = 'alpa';
    let idx = -1;

    if(r){
      idx = r._idx;
      if(r.Status === 'Hadir'){
        bg = 'bg-green-500';
        status = 'hadir';
        text = 'text-white';
      } else if(r.Status === 'Terlambat'){
        bg = 'bg-orange-500';
        status = 'terlambat';
        text = 'text-white';
      } else if(r.Status === 'Izin'){
        bg = 'bg-blue-500';
        status = 'izin';
        text = 'text-white';
      } else {
        bg = 'bg-red-500';
        text = 'text-white';
      }
    }

    const today = new Date();
    const isToday = day === today.getDate() && month === today.getMonth()+1 && year === today.getFullYear();
    const ring = isToday? 'ring-2 ring-[#800000] dark:ring-[var(--accent-primary)] ring-offset-2 dark:ring-offset-gray-800' : '';

    html += `
      <button onclick="showDetailTanggal(${day}, '${status}', ${idx})"
              class="${bg} ${text} ${ring} aspect-square rounded-lg flex items-center justify-center font-bold text-sm active:scale-90 transition">
        ${day}
      </button>`;
  }

  html += `
      </div>
      <div class="flex justify-center gap-3 mt-4 text-xs flex-wrap">
        <div class="flex items-center gap-1"><div class="w-3 h-3 bg-green-500 rounded"></div>Hadir</div>
        <div class="flex items-center gap-1"><div class="w-3 h-3 bg-orange-500 rounded"></div>Telat</div>
        <div class="flex items-center gap-1"><div class="w-3 h-3 bg-blue-500 rounded"></div>Izin</div>
        <div class="flex items-center gap-1"><div class="w-3 h-3 bg-red-500 rounded"></div>Alpa</div>
      </div>
    </div>

    <div id="detailTanggal" class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hidden">
      <p class="text-center text-gray-400 text-sm">Klik tanggal untuk lihat detail</p>
    </div>
  `;

  content.innerHTML = html;
}

function showDetailTanggal(day, status, idx) {
  const el = document.getElementById('detailTanggal');
  const r = idx >= 0? window.rekapDataBulanIni.find(d => d._idx === idx) : null;

  if (!r || status === 'alpa') {
    el.innerHTML = `
      <div class="text-center py-4">
        <i class="ri-close-circle-line text-4xl text-red-500 mb-2"></i>
        <p class="font-bold text-gray-800 dark:text-white">Tanggal ${day}</p>
        <p class="text-sm text-red-500">Tidak Ada Data Absensi</p>
      </div>`;
    el.classList.remove('hidden');
    return;
  }

  const masuk = r['Jam Masuk'] || '-';
  const pulang = r['Jam Pulang'] || '-';
  const durasi = r.Durasi || '-';
  const lokasi = r.Lokasi || '-';
  const lat = r.Latitude || '';
  const lon = r.Longitude || '';
  let warnaStatus = 'text-green-600';
  let iconStatus = 'ri-checkbox-circle-line';
  let labelStatus = 'Hadir Tepat Waktu';

  if(status === 'terlambat') {
    warnaStatus = 'text-orange-600';
    iconStatus = 'ri-time-line';
    labelStatus = 'Terlambat';
  } else if(status === 'izin') {
    warnaStatus = 'text-blue-600';
    iconStatus = 'ri-mail-line';
    labelStatus = 'Izin';
  }

  el.innerHTML = `
    <div class="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
      <i class="${iconStatus} text-3xl ${warnaStatus}"></i>
      <div>
        <p class="font-bold text-lg text-gray-800 dark:text-white">Tanggal ${day}</p>
        <p class="text-xs ${warnaStatus} font-semibold">${labelStatus}</p>
      </div>
    </div>
    <div class="grid grid-cols-3 gap-3 text-center mb-3">
      <div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Masuk</p>
        <p class="font-bold text-sm text-gray-800 dark:text-white">${masuk}</p>
      </div>
      <div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Pulang</p>
        <p class="font-bold text-sm text-gray-800 dark:text-white">${pulang}</p>
      </div>
      <div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Durasi</p>
        <p class="font-bold text-sm text-[#800000] dark:text-[var(--accent-primary)]">${durasi}</p>
      </div>
    ${lokasi!== '-'? `
    <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
      <div class="flex items-start gap-2">
        <i class="ri-map-pin-line text-gray-500 dark:text-gray-400 mt-0.5"></i>
        <div class="flex-1">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Lokasi</p>
          <p class="text-sm text-gray-800 dark:text-white mb-2">${lokasi}</p>
          ${lat && lon? `
          <button onclick="window.open('https://www.google.com/maps?q=${lat},${lon}', '_blank')"
                  class="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition">
            <i class="ri-map-2-line"></i> Buka Maps
          </button>
          ` : ''}
        </div>
      </div>
    </div>` : ''}
  `;
  el.classList.remove('hidden');
  el.scrollIntoView({behavior: 'smooth', block: 'nearest'});
}

// === ACCOUNT ===
async function renderAccount() {
  stopAllStreams();
  const foto = currentUser.URL_Logo || 'https://placehold.co/100x100/FFFFFF/800000?text=U';

  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center justify-between sticky top-0 z-50">
    <h1 class="text-xl font-bold text-gray-900 dark:text-white">Profil Saya</h1>
    <button onclick="logout()" class="text-red-500 font-semibold active:scale-90"><i class="ri-logout-box-r-line"></i> Logout</button>
  </div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-4 text-center">
      <img src="${foto}" class="w-24 h-24 rounded-full mx-auto mb-3 object-cover border-4 border-[#800000] dark:border-[var(--accent-primary)] shadow-lg">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white">${currentUser.Nama}</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">${currentUser.Jabatan || 'Karyawan'}</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">${currentUser.Unit_Kerja || 'Keamanan'}</p>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      <h3 class="font-bold text-gray-900 dark:text-white mb-3">Informasi Akun</h3>
      <div class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">NIP</span>
          <span class="font-semibold text-gray-900 dark:text-white">${currentUser.NIP || '-'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">Username</span>
          <span class="font-semibold text-gray-900 dark:text-white">${currentUser.Username}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">Role</span>
          <span class="font-semibold text-gray-900 dark:text-white">${currentUser.Role}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">No HP</span>
          <span class="font-semibold text-gray-900 dark:text-white">${currentUser.No_HP || '-'}</span>
        </div>
      </div>
    </div>
  </div>
  ${renderBottomNav('account')}`;
  applyDarkMode();
}

// === INIT ===
(function init() {
  applyDarkMode();
  currentUser? renderHome() : renderLogin();
})();
