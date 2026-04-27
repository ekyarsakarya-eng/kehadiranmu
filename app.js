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
let currentCard = 0;
let startX = 0;
let currentX = 0;
let isDragging = false;
let globalJamPulang = '-';
let patroliFoto = null;
let kejadianFoto = null;
let urgensiKejadian = 'Rendah';
let daftarPos = [];
let posDipilih = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });
}
if ('Notification' in window) Notification.requestPermission();

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

function showLoading(show) {
  document.getElementById('modalLoading').classList.toggle('hidden',!show);
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
  if (h >= 4 && h < 11) return { text: 'Selamat Pagi', icon: 'ri-sun-line', color: 'text-yellow-500' };
  if (h >= 11 && h < 15) return { text: 'Selamat Siang', icon: 'ri-sun-cloudy-line', color: 'text-orange-500' };
  if (h >= 15 && h < 18) return { text: 'Selamat Sore', icon: 'ri-sun-foggy-line', color: 'text-orange-600' };
  return { text: 'Selamat Malam', icon: 'ri-moon-clear-line', color: 'text-indigo-400' };
}

function renderBottomNav(active) {
  return `
  <div class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex justify-around text-xs py-3 shadow-2xl">
    <button onclick="renderHome()" class="flex flex-col items-center gap-1 ${active === 'home'? 'text-[#800000]' : 'text-gray-500 dark:text-gray-400'} active:scale-90 transition">
      <i class="ri-home-5-fill text-2xl"></i>
      <p class="font-semibold">Home</p>
    </button>
    <button onclick="renderAccount()" class="flex flex-col items-center gap-1 ${active === 'account'? 'text-[#800000]' : 'text-gray-500 dark:text-gray-400'} active:scale-90 transition">
      <i class="ri-user-3-fill text-2xl"></i>
      <p class="font-semibold">Account</p>
    </button>
  </div>`;
}

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
    <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-11/12 max-w-sm">
      <img src="${LOGO_APP}" class="w-20 h-20 rounded-full mx-auto mb-4 object-cover shadow-lg">
      <h1 class="font-header font-extrabold text-center mb-6 text-gray-900 dark:text-white" style="font-size: clamp(16px, 4vw, 20px);">${APP_NAME}</h1>
      <input id="username" type="text" placeholder="Username" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mb-3 focus:border-[#800000] focus:outline-none transition">
      <input id="password" type="password" placeholder="Password" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mb-3 focus:border-[#800000] focus:outline-none transition">
      <button onclick="login()" class="w-full text-white p-3 rounded-xl font-bold bg-gradient-to-r from-[#800000] to-[#a00000] shadow-lg active:scale-95 transition">Login</button>
      <p id="err" class="text-red-500 text-sm mt-2 text-center"></p>
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
  showLoading(true);
  const res = await apiCall('login', { username, password });
  showLoading(false);
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

function cekStatusShift(dashboardRes) {
  const jamPulang = dashboardRes.jamPulang || '-';
  if (jamPulang === '-' || jamPulang === '00:00') return { bisaMasuk: true, info: '' };
  const now = new Date();
  const [jamP, menitP, detikP = 0] = jamPulang.split(':');
  const waktuPulang = new Date();
  waktuPulang.setHours(parseInt(jamP), parseInt(menitP), parseInt(detikP));
  if (waktuPulang > now) waktuPulang.setDate(waktuPulang.getDate() - 1);
  const bisaMasukLagi = new Date(waktuPulang.getTime() + 12 * 60 * 60 * 1000);
  const selisihMs = bisaMasukLagi - now;
  if (selisihMs <= 0) return { bisaMasuk: true, info: 'Siap untuk shift berikutnya!' };
  const sisaJam = Math.floor(selisihMs / 3600000);
  const sisaMenit = Math.floor((selisihMs % 3600000) / 60000);
  const jamBuka = bisaMasukLagi.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return { bisaMasuk: false, info: `Shift berikutnya: ${jamBuka}`, countdown: `${sisaJam}j ${sisaMenit}m`, jamPulang: jamPulang };
}

function initSwipeGesture() {
  const wrapper = document.getElementById('swipeWrapper');
  if (!wrapper) return;
  wrapper.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });
  wrapper.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
  }, { passive: true });
  wrapper.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = startX - currentX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentCard === 0) swipeCard(1);
      else if (diff < 0 && currentCard === 1) swipeCard(0);
    }
  }, { passive: true });
}

function swipeCard(idx) {
  currentCard = idx;
  const container = document.getElementById('swipeContainer');
  if (container) container.style.transform = `translateX(-${idx * 100}%)`;
  document.getElementById('dot-0').className = idx === 0? 'w-2 h-2 rounded-full bg-[#800000] transition' : 'w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 transition';
  document.getElementById('dot-1').className = idx === 1? 'w-2 h-2 rounded-full bg-[#800000] transition' : 'w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 transition';
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

async function renderHome() {
  stopAllStreams();
  const [dashboardRes, rekapRes] = await Promise.all([
    apiCall('get_dashboard', { nama: currentUser.Nama.trim() }),
    apiCall('get_rekap_user', { nama: currentUser.Nama.trim() })
  ]);
  let fotoUser = currentUser.URL_Logo || 'https://placehold.co/100x100/FFFFFF/800000?text=U';
  fotoUser = fotoUser.replace(/\s/g, '');
  if (fotoUser.includes('uc?export=view&id=')) {
    const fileId = fotoUser.split('id=')[1].split('&')[0];
    fotoUser = `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
  }
  if (fotoUser.includes('drive.google.com')) {
    fotoUser += (fotoUser.includes('?')? '&' : '?') + 'v=' + Date.now();
  }
  const jamMasuk = dashboardRes.jamMasuk || '00:00';
  const jamPulang = dashboardRes.jamPulang || '00:00';
  globalJamPulang = jamPulang;
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
  let totalIzin = 0;
  let totalAlpa = 0;
  if (rekapRes.status === 'success' && rekapRes.statistik) {
    totalHadir = rekapRes.statistik.hadir || 0;
    totalAlpa = rekapRes.statistik.alpa || 0;
    totalIzin = rekapRes.statistik.izin || 0;
  }
  const greeting = getGreeting();
  const darkIcon = isDarkMode? 'ri-moon-fill text-indigo-400' : 'ri-sun-fill text-yellow-500';

  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-3 flex justify-between items-center sticky top-0 z-50">
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <img src="${LOGO_APP}" class="w-9 h-9 rounded-full object-cover flex-shrink-0">
      <div class="min-w-0 flex-1 overflow-hidden">
        <p class="font-header font-extrabold text-gray-900 dark:text-white tracking-tight whitespace-nowrap" style="font-size: clamp(11px, 3.5vw, 16px);">${APP_NAME}</p>
      </div>
    </div>
    <div class="flex gap-3 text-xl text-gray-600 dark:text-gray-300 flex-shrink-0 pl-2">
      <i class="ri-notification-3-line"></i>
      <i class="ri-menu-line"></i>
    </div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="mb-4">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          <i class="${greeting.icon} text-2xl ${greeting.color}"></i>
          <p class="text-lg font-bold text-gray-800 dark:text-white">${greeting.text}, ${currentUser.Nama.split(' ')[0]}!</p>
        </div>
        <button onclick="toggleDarkMode()" class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center active:scale-90 transition">
          <i class="${darkIcon} text-xl"></i>
        </button>
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
    </div>
    <div class="relative overflow-hidden rounded-2xl mb-4" id="swipeWrapper">
      <div id="swipeContainer" class="flex transition-transform duration-300 touch-pan-y" style="transform: translateX(0%);">
        <div class="w-full flex-shrink-0">
          <div class="bg-gradient-to-br from-[#800000] to-[#a00000] text-white rounded-2xl p-5 shadow-xl">
            <div class="flex items-center gap-3 mb-4">
              <img src="${fotoUser}" class="w-14 h-14 rounded-full object-cover bg-white p-1 shadow-lg flex-shrink-0">
              <div class="min-w-0">
                <p class="font-bold text-lg truncate">${currentUser.Nama}</p>
                <p class="text-xs opacity-80">${currentUser.Jabatan || 'Satpam'} | ${currentUser.Unit_Kerja || '-'}</p>
              </div>
            <div class="grid grid-cols-2 gap-3 mb-4">
              <button onclick="quickAbsen('IN')" class="bg-white/20 backdrop-blur-sm rounded-xl p-4 active:scale-95 transition flex flex-col items-center">
                <i class="ri-login-circle-line text-3xl mb-1"></i>
                <p class="font-bold text-sm">Absen Masuk</p>
              </button>
              <button onclick="quickAbsen('OUT')" class="bg-white/20 backdrop-blur-sm rounded-xl p-4 active:scale-95 transition flex flex-col items-center">
                <i class="ri-logout-circle-line text-3xl mb-1"></i>
                <p class="font-bold text-sm">Absen Pulang</p>
              </button>
            </div>
            <button onclick="renderAbsen()" class="w-full bg-white text-[#800000] py-3 rounded-xl font-bold active:scale-95 transition">Buka Kamera Absen</button>
          </div>
        </div>
        <div class="w-full flex-shrink-0">
          <div class="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-2xl p-5 shadow-xl">
            <p class="font-bold text-lg mb-4">Statistik Bulan Ini</p>
            <div class="grid grid-cols-3 gap-3 text-center mb-4">
              <div class="bg-white dark:bg-gray-600 rounded-xl p-3 shadow">
                <p class="text-3xl font-bold text-green-600 dark:text-green-400">${totalHadir}</p>
                <p class="text-xs opacity-90 mt-1">Hadir</p>
              </div>
              <div class="bg-white dark:bg-gray-600 rounded-xl p-3 shadow">
                <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">${totalIzin}</p>
                <p class="text-xs opacity-90 mt-1">Izin</p>
              </div>
              <div class="bg-white dark:bg-gray-600 rounded-xl p-3 shadow">
                <p class="text-3xl font-bold text-red-600 dark:text-red-400">${totalAlpa}</p>
                <p class="text-xs opacity-90 mt-1">Alpha</p>
              </div>
            </div>
            <button onclick="renderRekap()" class="w-full bg-[#800000] text-white py-3 rounded-xl font-bold active:scale-95 transition">Lihat Detail Rekap</button>
          </div>
        </div>
      </div>
      <div class="flex justify-center gap-2 mt-3">
        <button onclick="swipeCard(0)" id="dot-0" class="w-2 h-2 rounded-full bg-[#800000] transition"></button>
        <button onclick="swipeCard(1)" id="dot-1" class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 transition"></button>
      </div>
      <p class="text-center text-xs text-gray-400 dark:text-gray-500 mt-2"><i class="ri-drag-move-line"></i> Geser untuk lihat statistik</p>
    </div>
    <div class="mt-6">
      <p class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Menu Tugas</p>
      <div class="grid grid-cols-4 gap-3">
        <button onclick="renderPatroli()" class="flex flex-col items-center gap-2 active:scale-90 transition group">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center shadow-lg group-active:scale-110 transition">
            <i class="ri-shield-user-line text-3xl text-white"></i>
          </div>
          <p class="text-xs font-bold text-gray-700 dark:text-gray-300">Patroli</p>
        </button>
        <button onclick="comingSoon()" class="flex flex-col items-center gap-2 active:scale-90 transition group">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg group-active:scale-110 transition">
            <i class="ri-mail-send-line text-3xl text-white"></i>
          </div>
          <p class="text-xs font-bold text-gray-700 dark:text-gray-300">Izin</p>
        </button>
        <button onclick="comingSoon()" class="flex flex-col items-center gap-2 active:scale-90 transition group">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg group-active:scale-110 transition">
            <i class="ri-alarm-warning-line text-3xl text-white"></i>
          </div>
          <p class="text-xs font-bold text-gray-700 dark:text-gray-300">Darurat</p>
        </button>
        <button onclick="logout()" class="flex flex-col items-center gap-2 active:scale-90 transition group">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg group-active:scale-110 transition">
            <i class="ri-logout-box-r-line text-3xl text-white"></i>
          </div>
          <p class="text-xs font-bold text-gray-700 dark:text-gray-300">Keluar</p>
        </button>
      </div>
    </div>
  </div>
  ${renderBottomNav('home')}
  `;
  applyDarkMode();
  startLiveClock();
  initSwipeGesture();
}

async function quickAbsen(tipe) {
  absenTipe = tipe;
  await absenProses();
}

async function absenProses() {
  try {
    if (!currentUser ||!currentUser.Nama) {
      showToast('Login dulu', 'error');
      return;
    }

    showToast('Buka kamera...', 'info');
    const foto = await takePhoto();
    if (!foto) {
      showToast('Foto wajib. Absen dibatalkan', 'error');
      return;
    }

    showToast('Mendeteksi lokasi...', 'info');
    const lokasi = await getLocation();
    if (!lokasi.lat ||!lokasi.lon) {
      showToast('GPS wajib aktif. Nyalain lokasi HP', 'error');
      return;
    }

    showLoading(true);
    const res = await apiCall('absen', {
      tipe: absenTipe,
      nama: currentUser.Nama,
      foto: foto,
      latitude: lokasi.lat,
      longitude: lokasi.lon,
      lokasi: lokasi.alamat || 'Lokasi tidak terdeteksi'
    });
    showLoading(false);

    if (res.status === 'success') {
      showToast(res.msg, 'success');
      stopCamera();
      renderHome();
    } else {
      showToast(res.msg, 'error');
    }

  } catch (e) {
    showLoading(false);
    stopCamera();
    showToast('Gagal absen: ' + e.message, 'error');
  }
}

async function takePhoto() {
  return new Promise(async (resolve) => {
    const modal = document.getElementById('modalKamera');
    const video = document.getElementById('video');
    modal.classList.remove('hidden');

    try {
      absenStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      video.srcObject = absenStream;

      document.getElementById('btnCapture').onclick = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        const fotoBase64 = canvas.toDataURL('image/jpeg', 0.7);
        stopCamera();
        resolve(fotoBase64);
      };

      document.getElementById('btnCloseKamera').onclick = () => {
        stopCamera();
        resolve(null);
      };

    } catch (e) {
      showToast('Izin kamera ditolak. Aktifkan di setting browser', 'error');
      stopCamera();
      resolve(null);
    }
  });
}

function stopCamera() {
  if (absenStream) {
    absenStream.getTracks().forEach(track => track.stop());
    absenStream = null;
  }
  document.getElementById('modalKamera').classList.add('hidden');
}

async function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: null, lon: null, alamat: 'GPS tidak support' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude.toFixed(6),
          lon: pos.coords.longitude.toFixed(6),
          alamat: 'Lokasi terdeteksi'
        });
      },
      (err) => {
        console.error(err);
        showToast('Gagal ambil lokasi. Aktifkan GPS', 'error');
        resolve({ lat: null, lon: null, alamat: 'Gagal ambil lokasi' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

function renderAbsen() {
  absenTipe = 'IN';
  absenProses();
}

function renderAccount() {
  stopAllStreams();
  let foto = currentUser.URL_Logo || 'https://placehold.co/100x100/800000/FFFFFF?text=U';
  foto = foto.replace(/\s/g, '');
  if (foto.includes('uc?export=view&id=')) {
    const fileId = foto.split('id=')[1].split('&')[0];
    foto = `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
  }
  if (foto.includes('drive.google.com')) {
    foto += (foto.includes('?')? '&' : '?') + 'v=' + Date.now();
  }
  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-4 text-center sticky top-0 z-50"><h1 class="text-xl font-bold text-gray-900 dark:text-white">Account</h1></div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="bg-gradient-to-br from-[#800000] to-[#a00000] rounded-2xl shadow-xl p-6 text-center mb-4 text-white">
      <img id="previewFoto" src="${foto}" class="w-24 h-24 rounded-full mx-auto mb-3 object-cover bg-white p-1 shadow-lg"
           onerror="this.src='https://placehold.co/96x96/800000/FFFFFF?text=U'">
      <input type="file" id="fotoInput" accept="image/*" class="hidden" onchange="previewFoto(event)">
      <button onclick="document.getElementById('fotoInput').click()" class="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg font-bold text-sm active:scale-95 transition">Ganti Foto</button>
      <p class="font-bold text-lg mt-3">${currentUser.Nama}</p>
      <p class="text-xs opacity-80">${currentUser.Jabatan || 'Karyawan'} | ${currentUser.NIP || '-'}</p>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 space-y-3">
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">Nama</label><input id="Nama" value="${currentUser.Nama || ''}" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">NIP</label><input id="NIP" value="${currentUser.NIP || ''}" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 bg-gray-100 dark:bg-gray-900" disabled></div>
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">Jabatan</label><input id="Jabatan" value="${currentUser.Jabatan || ''}" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">Unit Kerja</label><input id="Unit_Kerja" value="${currentUser.Unit_Kerja || ''}" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">Password Baru</label><input id="Password" type="password" placeholder="Kosongkan jika tidak ganti" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <button onclick="saveAccount()" class="w-full text-white p-3 rounded-xl font-bold mt-2 bg-gradient-to-r from-[#800000] to-[#a00000] shadow-lg active:scale-95 transition">Simpan Perubahan</button>
      <button onclick="logout()" class="w-full bg-red-600 text-white p-3 rounded-xl font-bold shadow-lg active:scale-95 transition">Logout</button>
    </div>
  ${renderBottomNav('account')}
  `;
  applyDarkMode();
}

function previewFoto(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => document.getElementById('previewFoto').src = e.target.result;
    reader.readAsDataURL(file);
  }
}

async function saveAccount() {
  const newUser = {...currentUser };
  ['Nama', 'Jabatan', 'Unit_Kerja', 'Password'].forEach(f => {
    const el = document.getElementById(f);
    if (el && el.value) newUser[f] = el.value;
  });
  const fotoInput = document.getElementById('fotoInput');
  const previewImg = document.getElementById('previewFoto');
  if (fotoInput.files[0]) {
    previewImg.style.opacity = '0.5';
    newUser.Foto_Profil = previewImg.src;
  }
  showLoading(true);
  const res = await apiCall('update_user', { user: newUser });
  showLoading(false);
  if (res.status === 'success') {
    currentUser = res.data;
    sessionStorage.setItem('user', JSON.stringify(currentUser));
    showToast('Profil berhasil diupdate!', 'success');
    setTimeout(() => renderHome(), 1000);
  } else {
    previewImg.style.opacity = '1';
    showToast(res.msg, 'error');
  }
}

// --- PATROLI FULL ---
async function renderPatroli() {
  stopAllStreams();
  patroliFoto = null;
  showLoading(true);
  const resPos = await apiCall('get_daftar_pos');
  daftarPos = resPos.data || [];
  showLoading(false);
  
  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center gap-3 sticky top-0 z-50">
    <button onclick="renderHome()"><i class="ri-arrow-left-s-line text-2xl text-gray-900 dark:text-white"></i></button>
    <h1 class="text-xl font-bold text-gray-900 dark:text-white">Patroli Satpam</h1>
  </div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="bg-gradient-to-br from-green-600 to-green-800 text-white rounded-2xl p-5 shadow-xl mb-4">
      <div class="flex items-center gap-3 mb-3">
        <i class="ri-shield-check-line text-4xl"></i>
        <div>
          <p class="font-bold text-lg">Checklist Patroli</p>
          <p class="text-xs opacity-80">Pilih pos & upload bukti foto</p>
        </div>
      </div>
      <div id="lokasiPatroli" class="text-sm mb-3 bg-white/20 backdrop-blur-sm rounded-lg p-2">
        <i class="ri-map-pin-line"></i> Mendeteksi lokasi...
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-4">
      <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">1. Pilih Pos Patroli</label>
      <select id="selectPos" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-lg font-semibold focus:border-green-600 focus:outline-none mb-4">
        <option value="">-- Pilih Pos --</option>
        ${daftarPos.map(p => `<option value="${p.ID_Pos}" data-lat="${p.Latitude}" data-lon="${p.Longitude}">${p.Nama_Pos}</option>`).join('')}
      </select>

      <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">2. Ambil Foto Bukti</label>
      <div class="relative w-full h-48 mb-3 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
        <video id="cameraPatroli" class="w-full h-full object-cover hidden" autoplay playsinline></video>
        <img id="previewPatroli" class="w-full h-full object-cover hidden" />
        <button onclick="startCameraPatroli()" id="btnBukaKamera" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <i class="ri-camera-line text-4xl"></i>
          <p class="text-sm font-semibold">Tap untuk buka kamera</p>
        </button>
        <button onclick="ambilFotoPatroli()" id="btnCapturePatroli" class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 px-6 py-2 rounded-full font-bold text-gray-800 shadow-lg hidden">
          <i class="ri-camera-fill"></i> Ambil Foto
        </button>
      </div>

      <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">3. Keterangan</label>
      <textarea id="ketPatroli" placeholder="Contoh: Kondisi aman, pintu terkunci" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-lg focus:border-green-600 focus:outline-none mb-4" rows="2"></textarea>

      <button onclick="submitPatroli()" id="btnSubmitPatroli" class="w-full bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled>
        <i class="ri-check-line"></i> Submit Check-in Pos
      </button>
    </div>

    <button onclick="renderLaporKejadian()" class="w-full bg-orange-500 text-white p-4 rounded-xl font-bold shadow-lg active:scale-95 transition flex items-center justify-center gap-2">
      <i class="ri-alarm-warning-line text-xl"></i> Lapor Kejadian Darurat
    </button>
  </div>
  ${renderBottomNav('home')}
  `;
  applyDarkMode();

  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    document.getElementById('lokasiPatroli').innerHTML = `<i class="ri-map-pin-line"></i> Lokasi: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }, () => {
    document.getElementById('lokasiPatroli').innerHTML = `<i class="ri-error-warning-line"></i> Gagal dapat lokasi`;
    showToast('GPS tidak aktif', 'error');
  });
}

async function startCameraPatroli() {
  try {
    absenStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const video = document.getElementById('cameraPatroli');
    video.srcObject = absenStream;
    video.classList.remove('hidden');
    document.getElementById('btnBukaKamera').classList.add('hidden');
    document.getElementById('btnCapturePatroli').classList.remove('hidden');
  } catch (err) {
    showToast('Kamera error: ' + err.message, 'error');
  }
}

function ambilFotoPatroli() {
  const video = document.getElementById('cameraPatroli');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  patroliFoto = canvas.toDataURL('image/jpeg', 0.8);
  const preview = document.getElementById('previewPatroli');
  preview.src = patroliFoto;
  preview.classList.remove('hidden');
  video.classList.add('hidden');
  document.getElementById('btnCapturePatroli').classList.add('hidden');
  document.getElementById('btnSubmitPatroli').disabled = false;
  if (absenStream) {
    absenStream.getTracks().forEach(track => track.stop());
    absenStream = null;
  }
  showToast('Foto berhasil diambil!', 'success');
}

async function submitPatroli() {
  const selectPos = document.getElementById('selectPos');
  const posId = selectPos.value;
  const posNama = selectPos.options[selectPos.selectedIndex].text;
  const ket = document.getElementById('ketPatroli').value;
  const btn = document.getElementById('btnSubmitPatroli');

  if (!posId) {
    showToast('Pilih pos patroli dulu!', 'error');
    return;
  }
  if (!patroliFoto) {
    showToast('Ambil foto bukti dulu!', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Mengirim...';
  showLoading(true);

  let lat = null, lon = null;
  await new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(pos => {
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
      resolve();
    }, () => resolve());
  });

  const res = await apiCall('cek_patroli', {
    nama: currentUser.Nama.trim(),
    id_pos: posId,
    foto: patroliFoto,
    latitude: lat,
    longitude: lon,
    keterangan: ket
  });
  showLoading(false);

  if (res.status === 'success') {
    showToast(res.msg, 'success');
    setTimeout(() => renderPatroli(), 1000);
  } else {
    btn.disabled = false;
    btn.innerText = 'Submit Check-in Pos';
    showToast(res.msg, 'error');
  }
}

// --- IZIN ---
async function renderIzin() {
  stopAllStreams();
  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center gap-3 sticky top-0 z-50">
    <button onclick="renderHome()"><i class="ri-arrow-left-s-line text-2xl text-gray-900 dark:text-white"></i></button>
    <h1 class="text-xl font-bold text-gray-900 dark:text-white">Pengajuan Izin</h1>
  </div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-2xl p-5 shadow-xl mb-4">
      <div class="flex items-center gap-3">
        <i class="ri-mail-send-line text-4xl"></i>
        <div>
          <p class="font-bold text-lg">Form Izin</p>
          <p class="text-xs opacity-80">Sakit, Cuti, atau Izin Lainnya</p>
        </div>
      </div>
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4">
      <div>
        <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Jenis Izin</label>
        <select id="jenisIzin" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-lg font-semibold focus:border-purple-500 focus:outline-none">
          <option value="Sakit">Sakit</option>
          <option value="Cuti">Cuti</option>
          <option value="Izin">Izin Lainnya</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Tanggal Izin</label>
        <input id="tglIzin" type="date" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-lg focus:border-purple-500 focus:outline-none">
      </div>
      <div>
        <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Alasan</label>
        <textarea id="alasanIzin" placeholder="Tulis alasan izin..." class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-lg focus:border-purple-500 focus:outline-none" rows="4"></textarea>
      </div>
      <button onclick="kirimIzin()" class="w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition">
        <i class="ri-send-plane-fill"></i> Kirim Pengajuan
      </button>
    </div>
  </div>
  ${renderBottomNav('home')}
  `;
  applyDarkMode();
  document.getElementById('tglIzin').valueAsDate = new Date();
}

async function kirimIzin() {
  const jenis = document.getElementById('jenisIzin').value;
  const tgl = document.getElementById('tglIzin').value;
  const alasan = document.getElementById('alasanIzin').value.trim();
  
  if (!tgl || !alasan) {
    showToast('Tanggal & alasan wajib diisi', 'error');
    return;
  }
  
  showLoading(true);
  const res = await apiCall('ajukan_izin', {
    nama: currentUser.Nama.trim(),
    jenis: jenis,
    tanggal: tgl,
    alasan: alasan
  });
  showLoading(false);
  
  if (res.status === 'success') {
    showToast(res.msg, 'success');
    setTimeout(() => renderHome(), 1000);
  } else {
    showToast(res.msg, 'error');
  }
}

// --- LAPOR KEJADIAN ---
async function renderLaporKejadian() {
  stopAllStreams();
  kejadianFoto = null;
  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center gap-3 sticky top-0 z-50">
    <button onclick="renderPatroli()"><i class="ri-arrow-left-s-line text-2xl text-gray-900 dark:text-white"></i></button>
    <h1 class="text-xl font-bold text-gray-900 dark:text-white">Lapor Kejadian</h1>
  </div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-2xl p-5 shadow-xl mb-4">
      <div class="flex items-center gap-3">
        <i class="ri-alarm-warning-line text-4xl"></i>
        <div>
          <p class="font-bold text-lg">Laporan Darurat</p>
          <p class="text-xs opacity-80">Laporkan kejadian mencurigakan</p>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4">
      <div>
        <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Jenis Kejadian</label>
        <select id="jenisKejadian" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-lg font-semibold focus:border-orange-500 focus:outline-none">
          <option value="">-- Pilih Jenis --</option>
          <option value="Tamu Mencurigakan">Tamu Mencurigakan</option>
          <option value="Kerusakan Fasilitas">Kerusakan Fasilitas</option>
          <option value="Kebakaran">Kebakaran</option>
          <option value="Pencurian">Pencurian</option>
          <option value="Keributan">Keributan</option>
          <option value="Lainnya">Lainnya</option>
        </select>
      </div>

      <div>
        <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Tingkat Urgensi</label>
        <div class="grid grid-cols-3 gap-2">
          <button onclick="setUrgensi('Rendah')" id="urgensiRendah" class="p-3 rounded-lg border-2 border-green-500 bg-green-500 text-white font-bold active:scale-95 transition">Rendah</button>
          <button onclick="setUrgensi('Sedang')" id="urgensiSedang" class="p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold active:scale-95 transition">Sedang</button>
          <button onclick="setUrgensi('Tinggi')" id="urgensiTinggi" class="p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold active:scale-95 transition">Tinggi</button>
        </div>
      </div>

      <div>
        <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Deskripsi Kejadian</label>
        <textarea id="deskripsiKejadian" placeholder="Jelaskan kronologi kejadian..." class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-lg focus:border-orange-500 focus:outline-none" rows="4"></textarea>
      </div>

      <div>
        <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Foto Bukti</label>
        <div class="relative w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
          <video id="cameraKejadian" class="w-full h-full object-cover hidden" autoplay playsinline></video>
          <img id="previewKejadian" class="w-full h-full object-cover hidden" />
          <button onclick="startCameraKejadian()" id="btnBukaKameraKejadian" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
            <i class="ri-camera-line text-4xl"></i>
            <p class="text-sm font-semibold">Tap untuk buka kamera</p>
          </button>
          <button onclick="ambilFotoKejadian()" id="btnCaptureKejadian" class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 px-6 py-2 rounded-full font-bold text-gray-800 shadow-lg hidden">
            <i class="ri-camera-fill"></i> Ambil Foto
          </button>
        </div>
      </div>

      <button onclick="submitKejadian()" id="btnSubmitKejadian" class="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition">
        <i class="ri-send-plane-fill"></i> Kirim Laporan
      </button>
    </div>
  </div>
  ${renderBottomNav('home')}
  `;
  applyDarkMode();
  urgensiKejadian = 'Rendah';
}

function setUrgensi(level) {
  urgensiKejadian = level;
  document.getElementById('urgensiRendah').className = level === 'Rendah'?
    'p-3 rounded-lg border-2 border-green-500 bg-green-500 text-white font-bold active:scale-95 transition' :
    'p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold active:scale-95 transition';
  document.getElementById('urgensiSedang').className = level === 'Sedang'?
    'p-3 rounded-lg border-2 border-yellow-500 bg-yellow-500 text-white font-bold active:scale-95 transition' :
    'p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold active:scale-95 transition';
  document.getElementById('urgensiTinggi').className = level === 'Tinggi'?
    'p-3 rounded-lg border-2 border-red-500 bg-red-500 text-white font-bold active:scale-95 transition' :
    'p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold active:scale-95 transition';
}

async function startCameraKejadian() {
  try {
    absenStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const video = document.getElementById('cameraKejadian');
    video.srcObject = absenStream;
    video.classList.remove('hidden');
    document.getElementById('btnBukaKameraKejadian').classList.add('hidden');
    document.getElementById('btnCaptureKejadian').classList.remove('hidden');
  } catch (err) {
    showToast('Kamera error: ' + err.message, 'error');
  }
}

function ambilFotoKejadian() {
  const video = document.getElementById('cameraKejadian');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  kejadianFoto = canvas.toDataURL('image/jpeg', 0.8);
  const preview = document.getElementById('previewKejadian');
  preview.src = kejadianFoto;
  preview.classList.remove('hidden');
  video.classList.add('hidden');
  document.getElementById('btnCaptureKejadian').classList.add('hidden');
  if (absenStream) {
    absenStream.getTracks().forEach(track => track.stop());
    absenStream = null;
  }
  showToast('Foto berhasil diambil!', 'success');
}

async function submitKejadian() {
  const jenis = document.getElementById('jenisKejadian').value;
  const deskripsi = document.getElementById('deskripsiKejadian').value.trim();
  const btn = document.getElementById('btnSubmitKejadian');

  if (!jenis) {
    showToast('Pilih jenis kejadian dulu!', 'error');
    return;
  }
  if (!deskripsi) {
    showToast('Isi deskripsi kejadian!', 'error');
    return;
  }
  if (!kejadianFoto) {
    showToast('Ambil foto bukti dulu!', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Mengirim...';
  showLoading(true);

  let lat = null, lon = null;
  await new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(pos => {
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
      resolve();
    }, () => resolve());
  });

  const res = await apiCall('lapor_kejadian', {
    nama: currentUser.Nama.trim(),
    jenis: jenis,
    deskripsi: deskripsi,
    urgensi: urgensiKejadian,
    foto: kejadianFoto,
    latitude: lat,
    longitude: lon
  });
  showLoading(false);

  if (res.status === 'success') {
    showToast(res.msg, 'success');
    setTimeout(() => renderPatroli(), 1000);
  } else {
    btn.disabled = false;
    btn.innerHTML = '<i class="ri-send-plane-fill"></i> Kirim Laporan';
    showToast(res.msg, 'error');
  }
}

// --- REKAP ---
async function renderRekap() {
  stopAllStreams();
  showLoading(true);
  const res = await apiCall('get_riwayat_absen', { nama: currentUser.Nama.trim() });
  showLoading(false);
  const data = res.data || [];
  
  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center gap-3 sticky top-0 z-50">
    <button onclick="renderHome()"><i class="ri-arrow-left-s-line text-2xl text-gray-900 dark:text-white"></i></button>
    <h1 class="text-xl font-bold text-gray-900 dark:text-white">Riwayat Absen</h1>
  </div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="space-y-3">
      ${data.length === 0? `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl text-center text-gray-400 dark:text-gray-600">
          <i class="ri-file-list-line text-5xl mb-3"></i>
          <p>Belum ada riwayat absen</p>
        </div>
      ` : data.map(r => `
        <div class="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <div class="flex justify-between items-start mb-2">
            <p class="font-bold text-gray-800 dark:text-white">${r.Tanggal}</p>
            <span class="px-3 py-1 rounded-full text-xs font-bold ${r.Status==='Hadir'?'bg-green-100 text-green-700':r.Status==='Terlambat'?'bg-orange-100 text-orange-700':'bg-red-100 text-red-700'}">
              ${r.Status}
            </span>
          </div>
          <div class="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p class="text-gray-500 dark:text-gray-400 text-xs">Masuk</p>
              <p class="font-semibold text-gray-800 dark:text-white">${r['Jam Masuk'] || '-'}</p>
            </div>
            <div>
              <p class="text-gray-500 dark:text-gray-400 text-xs">Pulang</p>
              <p class="font-semibold text-gray-800 dark:text-white">${r['Jam Pulang'] || '-'}</p>
            </div>
            <div>
              <p class="text-gray-500 dark:text-gray-400 text-xs">Durasi</p>
              <p class="font-semibold text-[#800000]">${r.Durasi || '-'}</p>
            </div>
          ${r.Lokasi? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-2"><i class="ri-map-pin-line"></i> ${r.Lokasi}</p>` : ''}
        </div>
      `).join('')}
    </div>
  </div>
  ${renderBottomNav('home')}
  `;
  applyDarkMode();
}

function comingSoon() {
  showToast('Fitur segera hadir', 'warning');
}

// Splash screen
function showSplashScreen() {
  app.innerHTML = `
  <div class="fixed inset-0 bg-gradient-to-br from-[#800000] to-[#a00000] z-[500] flex items-center justify-center">
    <div class="relative w-64 h-64">
      <svg viewBox="0 0 200 200" class="w-full h-full">
        <style>
       .satpam { animation: lari 1.2s ease-in-out, hormat 0.8s ease-in-out 1.2s forwards; }
       .kaki1 { animation: langkah 0.25s infinite; transform-origin: 95px 140px; }
       .kaki2 { animation: langkah 0.25s infinite 0.125s; transform-origin: 105px 140px; }
       .tangan { animation: hormat-tangan 0.8s ease-in-out 1.2s forwards; transform-origin: 110px 100px; }
       .bg-gerak { animation: bg-slide 1.2s linear; }
          @keyframes lari { 0% { transform: translateX(-150px); } 100% { transform: translateX(0); } }
          @keyframes langkah { 0%,100% { transform: rotate(-25deg); } 50% { transform: rotate(25deg); } }
          @keyframes hormat { 0% { transform: translateX(0); } 100% { transform: translateX(0) scale(1.15); } }
          @keyframes hormat-tangan { 0% { transform: rotate(0); } 100% { transform: rotate(-140deg); } }
          @keyframes bg-slide { 0% { transform: translateX(50px); } 100% { transform: translateX(0); } }
        </style>
        <rect x="0" y="150" width="200" height="4" fill="white" opacity="0.3" class="bg-gerak"/>
        <rect x="0" y="160" width="200" height="2" fill="white" opacity="0.2" class="bg-gerak"/>
        <g class="satpam">
          <rect x="85" y="40" width="30" height="8" rx="4" fill="#fff"/>
          <rect x="90" y="35" width="20" height="10" fill="#fbbf24"/>
          <text x="100" y="43" font-size="6" text-anchor="middle" fill="#800000">SATPAM</text>
          <circle cx="100" cy="60" r="15" fill="#ffdbac"/>
          <rect x="88" y="75" width="24" height="35" rx="5" fill="#1e40af"/>
          <polygon points="100,80 95,95 105,95" fill="#800000"/>
          <rect x="75" y="85" width="13" height="25" rx="6" fill="#ffdbac"/>
          <rect x="112" y="85" width="13" height="25" rx="6" fill="#ffdbac" class="tangan"/>
          <rect x="90" y="110" width="10" height="30" rx="5" fill="#1e3a8a" class="kaki1"/>
          <rect x="100" y="110" width="10" height="30" rx="5" fill="#1e3a8a" class="kaki2"/>
          <ellipse cx="95" cy="142" rx="8" ry="4" fill="#000"/>
          <ellipse cx="105" cy="142" rx="8" ry="4" fill="#000"/>
          <circle cx="100" cy="90" r="4" fill="#fbbf24"/>
          <text x="100" y="92" font-size="4" text-anchor="middle" fill="#800000">★</text>
        </g>
      </svg>
      <p class="text-white font-header font-extrabold text-center mt-4 text-xl animate-pulse">SIAP MELAYANI!</p>
    </div>
  </div>
  `;
  
  setTimeout(() => {
    const splash = document.getElementById('app').firstElementChild;
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 0.5s';
    setTimeout(() => renderLogin(), 500);
  }, 2200);
}

// Init
(function init() {
  applyDarkMode();
  if (currentUser) {
    renderHome();
  } else {
    showSplashScreen();
  }
})();
