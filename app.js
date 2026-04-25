const API_URL = 'https://script.google.com/macros/s/AKfycbzvggk-r3j4Njzhjkf8_G3EtIsdzjp3vbNtCIbVI3kerscbyRUBbl1OLOX04tQsRxQ9/exec';
const LOGO_APP = 'logo.png';
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
  renderAccount();
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
    console.log('API CALL:', action, payload);
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ action,...payload }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const text = await res.text();
    const result = JSON.parse(text);
    console.log('API RESPONSE:', result);
    return result;
  } catch (e) {
    console.error('API ERROR:', e);
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

function formatTanggal(tgl) {
  if (!tgl) return '-';
  let d, m, y;
  if (tgl.includes('/')) {
    [d, m, y] = tgl.split('/');
  } else if (tgl.includes('-')) {
    [y, m, d] = tgl.split('-');
  } else {
    return tgl;
  }
  const namaBulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const date = new Date(y, m - 1, d);
  const hari = namaHari[date.getDay()];
  return `${hari}, ${parseInt(d)} ${namaBulan[m - 1]} ${y}`;
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
    console.log('LOGIN SUCCESS, USER:', currentUser);
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
      if (diff > 0 && currentCard === 0) {
        swipeCard(1);
      } else if (diff < 0 && currentCard === 1) {
        swipeCard(0);
      }
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

async function renderHome() {
  console.log('RENDER HOME, USER:', currentUser);
  
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
    console.log('STATISTIK DARI SERVER:', rekapRes.statistik);
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

    <div class="relative overflow-hidden rounded-2xl" id="swipeWrapper">
      <div id="swipeContainer" class="flex transition-transform duration-300 touch-pan-y" style="transform: translateX(0%);">
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
                <p class="text-3xl font-bold">${totalIzin}</p>
                <p class="text-xs opacity-90 mt-1">Izin</p>
              </div>
              <div class="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <p class="text-3xl font-bold">${totalAlpa}</p>
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
      <p class="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
        <i class="ri-drag-move-line"></i> Geser untuk lihat statistik
      </p>
    </div>

    <div class="mt-6">
      <p class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Menu Cepat</p>
      <div class="grid grid-cols-4 gap-3">
        ${[
          {icon:'ri-calendar-check-line', label:'Rekap', color:'from-blue-500 to-blue-600', click:'renderRekap()'},
          {icon:'ri-mail-send-line', label:'Izin', color:'from-orange-500 to-orange-600', click:'comingSoon()'},
          {icon:'ri-time-line', label:'Lembur', color:'from-purple-500 to-purple-600', click:'comingSoon()'},
          {icon:'ri-logout-box-r-line', label:'Keluar', color:'from-red-500 to-red-600', click:'logout()'}
        ].map(m => `
          <button onclick="${m.click}" class="flex flex-col items-center gap-2 active:scale-90 transition group">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-lg group-active:scale-110 transition">
              <i class="${m.icon} text-2xl text-white"></i>
            </div>
            <p class="text-xs font-semibold text-gray-700 dark:text-gray-300">${m.label}</p>
          </button>
        `).join('')}
      </div>
    </div>
  </div>
  ${renderBottomNav('home')}
  `;

  applyDarkMode();
  startLiveClock();
  updateCountdown(sudahMasuk, sudahPulang);
  initSwipeGesture();
}

async function quickAbsen(tipe) {
  showToast(`Membuka kamera untuk Absen ${tipe}...`, 'success');
  setTimeout(() => renderAbsen(), 300);
}

async function renderAbsen() {
  if (absenStream) {
    absenStream.getTracks().forEach(t => t.stop());
    absenStream = null;
  }

  let alamat = 'Mendeteksi lokasi...';
  let jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  let tanggal = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center gap-3 sticky top-0 z-50">
    <button onclick="renderHome()"><i class="ri-arrow-left-s-line text-2xl text-gray-900 dark:text-white"></i></button>
    <h1 class="text-xl font-bold text-gray-900 dark:text-white">Absen</h1>
  </div>
  <div class="p-4 pb-24 text-center bg-gray-50 dark:bg-gray-900 min-h-screen">
    <p id="alamatText" class="text-sm text-gray-600 dark:text-gray-400 mb-4">${alamat}</p>
    <p class="text-5xl font-bold font-header text-gray-900 dark:text-white">${jam}</p>
    <p class="text-lg text-gray-700 dark:text-gray-300 mb-6">${tanggal}</p>

    <div class="relative w-64 h-64 mx-auto mb-6">
      <video id="camera" class="w-full h-full object-cover rounded-full bg-gray-200 dark:bg-gray-700" autoplay playsinline></video>
      <img id="previewAbsen" class="w-full h-full object-cover rounded-full bg-gray-200 dark:bg-gray-700 hidden" />

      <div id="faceFrame" class="absolute inset-0 pointer-events-none">
        <svg class="w-full h-full" viewBox="0 0 256 256">
          <circle cx="128" cy="128" r="110" fill="none" stroke="#3b82f6" stroke-width="3" stroke-dasharray="10 5" opacity="0.6">
            <animate attributeName="stroke-dashoffset" from="0" to="15" dur="1s" repeatCount="indefinite"/>
          </circle>
          <circle cx="128" cy="128" r="100" fill="none" stroke="#3b82f6" stroke-width="2" opacity="0.3"/>
        </svg>
        <div id="faceStatus" class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-xs font-semibold">
          Posisikan wajah di tengah
        </div>
      </div>

      <button onclick="ambilFoto()" id="btnCapture" class="absolute inset-0 flex items-center justify-center">
        <div id="iconKamera" class="w-20 h-20 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-xl">
          <i class="ri-camera-line text-4xl text-gray-700"></i>
        </div>
      </button>
    </div>
    <canvas id="canvas" class="hidden"></canvas>

    <div class="flex justify-center mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
      <button id="btnIn" onclick="setTipe('IN')" class="flex-1 px-6 py-3 rounded-lg font-bold text-white bg-blue-500 shadow-md transition">IN</button>
      <button id="btnOut" onclick="setTipe('OUT')" class="flex-1 px-6 py-3 rounded-lg font-bold bg-transparent text-gray-600 dark:text-gray-300 transition">OUT</button>
    </div>

    <button onclick="submitAbsen()" id="btnSubmit" class="w-full text-white p-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled>Submit Absen</button>
    <p id="statusAbsen" class="text-sm text-red-500 mt-2"></p>
  </div>
  ${renderBottomNav('home')}
  `;

  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    currentLokasi = { lat: latitude, lon: longitude };
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
.then(res => res.json())
.then(data => {
        currentLokasi.alamat = data.display_name || `${latitude}, ${longitude}`;
        document.getElementById('alamatText').innerHTML = `<i class="ri-map-pin-line"></i> ${currentLokasi.alamat}`;
      }).catch(() => {
        currentLokasi.alamat = `${latitude}, ${longitude}`;
        document.getElementById('alamatText').innerText = currentLokasi.alamat;
      });
  }, () => {
    document.getElementById('alamatText').innerText = 'Gagal dapat lokasi. Aktifkan GPS.';
    showToast('GPS tidak aktif', 'error');
  });

  startCamera();
}

function setTipe(tipe) {
  absenTipe = tipe;
  const btnIn = document.getElementById('btnIn');
  const btnOut = document.getElementById('btnOut');
  if (tipe === 'IN') {
    btnIn.className = 'flex-1 px-6 py-3 rounded-lg font-bold text-white bg-blue-500 shadow-md transition';
    btnOut.className = 'flex-1 px-6 py-3 rounded-lg font-bold bg-transparent text-gray-600 dark:text-gray-300 transition';
  } else {
    btnOut.className = 'flex-1 px-6 py-3 rounded-lg font-bold text-white bg-blue-500 shadow-md transition';
    btnIn.className = 'flex-1 px-6 py-3 rounded-lg font-bold bg-transparent text-gray-600 dark:text-gray-300 transition';
  }
}

async function startCamera() {
  try {
    absenStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    document.getElementById('camera').srcObject = absenStream;
    setTimeout(() => {
      const status = document.getElementById('faceStatus');
      if (status) {
        status.innerHTML = '<i class="ri-check-line"></i> Wajah terdeteksi';
        status.className = 'absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-500/90 text-white px-4 py-2 rounded-full text-xs font-semibold';
      }
    }, 2000);
  } catch (err) {
    document.getElementById('statusAbsen').innerText = 'Kamera error: ' + err.message;
    showToast('Kamera error', 'error');
  }
}

function ambilFoto() {
  const video = document.getElementById('camera');
  const canvas = document.getElementById('canvas');
  const preview = document.getElementById('previewAbsen');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  absenFoto = canvas.toDataURL('image/jpeg', 0.8);
  preview.src = absenFoto;
  preview.classList.remove('hidden');
  video.classList.add('hidden');
  document.getElementById('faceFrame').classList.add('hidden');
  document.getElementById('iconKamera').classList.add('hidden');
  document.getElementById('btnSubmit').disabled = false;
  if (absenStream) {
    absenStream.getTracks().forEach(track => track.stop());
    absenStream = null;
  }
  showToast('Foto berhasil diambil!', 'success');
}

async function submitAbsen() {
  const btn = document.getElementById('btnSubmit');
  const statusEl = document.getElementById('statusAbsen');
  if (!absenFoto) {
    showToast('Ambil foto dulu!', 'error');
    return;
  }
  btn.disabled = true;
  btn.innerText = 'Mengirim...';
  statusEl.innerText = '';
  const alamat = currentLokasi? currentLokasi.alamat : document.getElementById('alamatText').innerText;
  const res = await apiCall('absen', {
    nama: currentUser.Nama.trim(),
    lokasiWajib: alamat,
    foto: absenFoto,
    tipe: absenTipe,
    latitude: currentLokasi? currentLokasi.lat : null,
    longitude: currentLokasi? currentLokasi.lon : null
  });
  if (res.status === 'success') {
    showToast(`Absen ${absenTipe} berhasil!`, 'success');
    setTimeout(() => renderHome(), 1000);
  } else {
    btn.disabled = false;
    btn.innerText = 'Submit Absen';
    showToast(res.msg, 'error');
  }
}

function comingSoon() {
  showToast('Fitur ini segera hadir!', 'warning');
}

function renderAccount() {
  if (liveClockInterval) clearInterval(liveClockInterval);
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

    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 mb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <i class="ri-moon-clear-line text-2xl text-indigo-500"></i>
          <div>
            <p class="font-bold text-gray-900 dark:text-white">Dark Mode</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Mode gelap untuk mata</p>
          </div>
        </div>
        <button onclick="toggleDarkMode()" class="relative w-14 h-8 rounded-full transition ${isDarkMode? 'bg-[#800000]' : 'bg-gray-300'}">
          <div class="absolute top-1 ${isDarkMode? 'right-1' : 'left-1'} w-6 h-6 bg-white rounded-full transition shadow-md"></div>
        </button>
      </div>
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

  const res = await apiCall('update_user', { user: newUser });
  if (res.status === 'success') {
    currentUser = res.data;
    sessionStorage.setItem('user', JSON.stringify(currentUser));
    showToast('Profil berhasil diupdate!', 'success');
    setTimeout(() => {
      renderHome();
    }, 1000);
  } else {
    previewImg.style.opacity = '1';
    showToast(res.msg, 'error');
  }
}

async function renderRekap() {
  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center gap-3 sticky top-0 z-50">
    <button onclick="renderHome()"><i class="ri-arrow-left-s-line text-2xl text-gray-900 dark:text-white"></i></button>
    <h1 class="text-xl font-bold text-gray-900 dark:text-white">Riwayat Absensi</h1>
  </div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4">
      <label class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Pilih Bulan</label>
      <select id="bulanRekap" onchange="loadRekapBulan()" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-lg font-semibold focus:border-[#800000] focus:outline-none">
        <option value="">-- Pilih Bulan --</option>
      </select>
    </div>
    <div id="rekapContent">
      <div class="text-center py-12 text-gray-400 dark:text-gray-600">
        <i class="ri-calendar-todo-line text-5xl mb-3"></i>
        <p class="text-sm">Pilih bulan untuk melihat riwayat absensi</p>
      </div>
    </div>
  </div>
  ${renderBottomNav('home')}
  `;

  applyDarkMode();

  const bulanSelect = document.getElementById('bulanRekap');
  const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const value = `${year}-${month}`;
    const label = `${namaBulan[d.getMonth()]} ${year}`;
    bulanSelect.innerHTML += `<option value="${value}">${label}</option>`;
  }

  const bulanIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  bulanSelect.value = bulanIni;
  loadRekapBulan();
}

async function loadRekapBulan() {
  const bulan = document.getElementById('bulanRekap').value;
  const content = document.getElementById('rekapContent');

  if (!bulan) {
    content.innerHTML = `
      <div class="text-center py-12 text-gray-400 dark:text-gray-600">
        <i class="ri-calendar-todo-line text-5xl mb-3"></i>
        <p class="text-sm">Pilih bulan untuk melihat riwayat absensi</p>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="space-y-3 animate-pulse">
      <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      <div class="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
    </div>`;

  const res = await apiCall('get_rekap_user', { nama: currentUser.Nama.trim() });

  if (res.status!== 'success') {
    content.innerHTML = `<p class="text-red-500 text-center py-8">Gagal load: ${res.msg}</p>`;
    return;
  }

  const [year, month] = bulan.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const dataMap = {};
  
  res.data.forEach(r => {
    if (r.TanggalRaw && r.TanggalRaw.startsWith(`${year}-${String(month).padStart(2,'0')}`)) {
      const day = parseInt(r.TanggalRaw.split('-')[2]);
      dataMap[day] = r;
    }
  });

  const totalHadir = Object.values(dataMap).filter(r => r['Jam Masuk'] && r['Jam Masuk']!== '-').length;
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
        <div>M</div><div>S</div><div>S</div><div>R</div><div>K</div><div>J</div><div>S</div>
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
    
    if(r){
      if(r['Jam Masuk'] && r['Jam Masuk']!== '-'){
        if(r.Status === 'Terlambat'){
          bg = 'bg-orange-500';
          status = 'terlambat';
        } else {
          bg = 'bg-green-500';
          status = 'hadir';
        }
        text = 'text-white';
      } else {
        bg = 'bg-red-500';
        text = 'text-white';
      }
    }
    
    const today = new Date();
    const isToday = day === today.getDate() && month === today.getMonth()+1 && year === today.getFullYear();
    const ring = isToday? 'ring-2 ring-[#800000] ring-offset-2 dark:ring-offset-gray-800' : '';
    
    html += `
      <button onclick='showDetailTanggal(${day}, "${status}", ${JSON.stringify(r).replace(/"/g, '&quot;')})' 
              class="${bg} ${text} ${ring} aspect-square rounded-lg flex items-center justify-center font-bold text-sm active:scale-90 transition">
        ${day}
      </button>`;
  }
  
  html += `
      </div>
      <div class="flex justify-center gap-4 mt-4 text-xs">
        <div class="flex items-center gap-1"><div class="w-3 h-3 bg-green-500 rounded"></div>Hadir</div>
        <div class="flex items-center gap-1"><div class="w-3 h-3 bg-orange-500 rounded"></div>Terlambat</div>
        <div class="flex items-center gap-1"><div class="w-3 h-3 bg-red-500 rounded"></div>Alpa</div>
      </div>
    </div>

    <div id="detailTanggal" class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hidden">
      <p class="text-center text-gray-400 text-sm">Klik tanggal untuk lihat detail</p>
    </div>
  `;
  
  content.innerHTML = html;
}

function showDetailTanggal(day, status, r) {
  const el = document.getElementById('detailTanggal');
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
  const warnaStatus = status === 'hadir'? 'text-green-600' : 'text-orange-600';
  const iconStatus = status === 'hadir'? 'ri-checkbox-circle-line' : 'ri-time-line';
  
  el.innerHTML = `
    <div class="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
      <i class="${iconStatus} text-3xl ${warnaStatus}"></i>
      <div>
        <p class="font-bold text-lg text-gray-800 dark:text-white">Tanggal ${day}</p>
        <p class="text-xs ${warnaStatus} font-semibold">${status === 'hadir'? 'Hadir Tepat Waktu' : 'Terlambat'}</p>
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
        <p class="font-bold text-sm text-[#800000]">${durasi}</p>
      </div>
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
    </div>
    ` : ''}
  `;
  el.classList.remove('hidden');
  el.scrollIntoView({behavior: 'smooth', block: 'nearest'});
}

// --- INIT PALING AKHIR ---
(function init() {
  applyDarkMode();
  currentUser? renderHome() : renderLogin();
})();
