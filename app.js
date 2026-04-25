const API_URL = 'https://script.google.com/macros/s/AKfycbyMxCBHwzIKwQ6504TdbvuPC2BkZsyl7yhVYJF_JQuSy4_BQ3jFD-4xM8yc59gmnYk/exec';
const LOGO_APP = 'logo.png';
const app = document.getElementById('app');
let currentUser = JSON.parse(sessionStorage.getItem('user') || 'null');
let appSetting = JSON.parse(sessionStorage.getItem('setting') || '{}');
let liveClockInterval = null;
let absenStream = null;

// TOAST NOTIF + HAPTIC
function showToast(msg, type = 'success') {
  if (navigator.vibrate) navigator.vibrate(type === 'success'? 50 : [50, 50, 50]);
  
  const toast = document.createElement('div');
  const bg = type === 'success'? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success'? 'ri-check-line' : 'ri-close-line';
  
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
  
  const res = await apiCall('get_setting');
  if (res.status === 'success') {
    appSetting = res.data;
    sessionStorage.setItem('setting', JSON.stringify(appSetting));
  }
  
  app.innerHTML = `
  <div class="flex items-center justify-center h-screen bg-gradient-to-br from-gray-100 to-gray-200">
    <div class="bg-white p-8 rounded-2xl shadow-2xl w-11/12 max-w-sm">
      <img src="${LOGO_APP}" class="w-20 h-20 rounded-full mx-auto mb-4 object-cover shadow-lg">
      <h1 class="font-header font-extrabold text-center mb-6 text-gray-900" style="font-size: clamp(16px, 4vw, 20px);">ABSENSI KEHADIRAN TERPADU</h1>
      <input id="username" type="text" placeholder="Username" class="w-full border-2 border-gray-200 p-3 rounded-xl mb-3 focus:border-[#800000] focus:outline-none transition">
      <input id="password" type="password" placeholder="Password" class="w-full border-2 border-gray-200 p-3 rounded-xl mb-3 focus:border-[#800000] focus:outline-none transition">
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
  <div class="bg-white shadow-sm p-3 flex justify-between items-center sticky top-0 z-50">
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <img src="${LOGO_APP}" class="w-9 h-9 rounded-full object-cover flex-shrink-0">
      <div class="min-w-0 flex-1 overflow-hidden">
        <p class="font-header font-extrabold text-gray-900 tracking-tight whitespace-nowrap" 
           style="font-size: clamp(11px, 3.5vw, 16px);">
           ABSENSI KEHADIRAN TERPADU
        </p>
      </div>
    </div>
    <div class="flex gap-3 text-xl text-gray-600 flex-shrink-0 pl-2">
      <i class="ri-notification-3-line"></i>
      <i class="ri-menu-line"></i>
    </div>
  </div>
  
  <div class="p-4 pb-24">
    <div class="mb-4">
      <div class="flex items-center gap-2 mb-1">
        <i class="${greeting.icon} text-2xl ${greeting.color}"></i>
        <p class="text-lg font-bold text-gray-800">${greeting.text}, ${currentUser.Nama.split(' ')[0]}!</p>
      </div>
      <p id="liveClock" class="text-4xl font-extrabold text-gray-900 font-header"></p>
      <p id="liveDate" class="text-sm text-gray-500"></p>
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
        <button onclick="swipeCard(1)" id="dot-1" class="w-2 h-2 rounded-full bg-gray-300 transition"></button>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4 text-center mt-6 text-xs">
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition"><i class="ri-mail-send-line text-3xl text-orange-500"></i>Izin</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition"><i class="ri-suitcase-line text-3xl text-sky-600"></i>Cuti</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition"><i class="ri-time-line text-3xl text-gray-700"></i>Lembur</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition"><i class="ri-calendar-todo-line text-3xl text-purple-600"></i>Shift</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition"><i class="ri-walk-line text-3xl text-red-600"></i>Patroli</button>
      <button onclick="renderAccount()" class="flex flex-col items-center gap-1 active:scale-90 transition"><i class="ri-user-3-line text-3xl text-indigo-600"></i>Account</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1 active:scale-90 transition"><i class="ri-information-line text-3xl text-gray-500"></i>Info</button>
      <button onclick="logout()" class="flex flex-col items-center gap-1 active:scale-90 transition"><i class="ri-logout-box-r-line text-3xl text-black"></i>Keluar</button>
    </div>
  </div>
  ${renderBottomNav('home')}
  `;
  
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
  
  document.getElementById('dot-0').className = idx === 0? 'w-2 h-2 rounded-full bg-[#800000] transition' : 'w-2 h-2 rounded-full bg-gray-300 transition';
  document.getElementById('dot-1').className = idx === 1? 'w-2 h-2 rounded-full bg-[#800000] transition' : 'w-2 h-2 rounded-full bg-gray-300 transition';
}

async function quickAbsen(tipe) {
  showToast(`Membuka kamera untuk Absen ${tipe}...`, 'success');
  setTimeout(() => renderAbsen(), 300);
}

let absenFoto = null;
let absenTipe = 'IN';

async function renderAbsen() {
  if (absenStream) {
    absenStream.getTracks().forEach(t => t.stop());
    absenStream = null;
  }
  
  let alamat = 'Mendeteksi lokasi...';
  let jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  let tanggal = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  app.innerHTML = `
  <div class="bg-white shadow-sm p-4 flex items-center gap-3 sticky top-0 z-50">
    <button onclick="renderHome()"><i class="ri-arrow-left-s-line text-2xl"></i></button>
    <h1 class="text-xl font-bold">Absen</h1>
  </div>
  <div class="p-4 pb-24 text-center">
    <p id="alamatText" class="text-sm text-gray-600 mb-4">${alamat}</p>
    <p class="text-5xl font-bold font-header">${jam}</p>
    <p class="text-lg text-gray-700 mb-6">${tanggal}</p>
    
    <div class="relative w-64 h-64 mx-auto mb-6">
      <video id="camera" class="w-full h-full object-cover rounded-full bg-gray-200" autoplay playsinline></video>
      <img id="previewAbsen" class="w-full h-full object-cover rounded-full bg-gray-200 hidden" />
      
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

    <div class="flex justify-center mb-6 bg-gray-100 rounded-xl p-1">
      <button id="btnIn" onclick="setTipe('IN')" class="flex-1 px-6 py-3 rounded-lg font-bold text-white bg-blue-500 shadow-md transition">IN</button>
      <button id="btnOut" onclick="setTipe('OUT')" class="flex-1 px-6 py-3 rounded-lg font-bold bg-transparent text-gray-600 transition">OUT</button>
    </div>

    <button onclick="submitAbsen()" id="btnSubmit" class="w-full text-white p-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled>Submit Absen</button>
    <p id="statusAbsen" class="text-sm text-red-500 mt-2"></p>
  </div>
  ${renderBottomNav('home')}
  `;

  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
.then(res => res.json())
.then(data => {
        document.getElementById('alamatText').innerText = data.display_name || `${latitude}, ${longitude}`;
      }).catch(() => {
        document.getElementById('alamatText').innerText = `${latitude}, ${longitude}`;
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
    btnOut.className = 'flex-1 px-6 py-3 rounded-lg font-bold bg-transparent text-gray-600 transition';
  } else {
    btnOut.className = 'flex-1 px-6 py-3 rounded-lg font-bold text-white bg-blue-500 shadow-md transition';
    btnIn.className = 'flex-1 px-6 py-3 rounded-lg font-bold bg-transparent text-gray-600 transition';
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

  const alamat = document.getElementById('alamatText').innerText;
  const res = await apiCall('absen', {
    nama: currentUser.Nama,
    lokasiWajib: alamat,
    foto: absenFoto,
    tipe: absenTipe
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
  showToast('Fitur ini segera hadir!', 'success');
}

function renderBottomNav(active) {
  return `
  <div class="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around text-xs py-2 shadow-lg">
    <button onclick="renderHome()" class="flex flex-col items-center gap-1 ${active === 'home'? 'text-[#800000]' : 'text-gray-500'}">
      <i class="ri-home-5-fill text-xl"></i><p>Home</p>
    </button>
    <button class="flex flex-col items-center gap-1 text-gray-500"><i class="ri-building-4-line text-xl"></i><p>Company</p></button>
    <button class="flex flex-col items-center gap-1 text-gray-500"><i class="ri-information-line text-xl"></i><p>About</p></button>
    <button onclick="renderAccount()" class="flex flex-col items-center gap-1 ${active === 'account'? 'text-[#800000]' : 'text-gray-500'}">
      <i class="ri-user-3-line text-xl"></i><p>Account</p>
    </button>
  </div>`;
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
  <div class="bg-white shadow-sm p-4 text-center sticky top-0 z-50"><h1 class="text-xl font-bold">Account</h1></div>
  <div class="p-4 pb-24">
    <div class="bg-gradient-to-br from-[#800000] to-[#a00000] rounded-2xl shadow-xl p-6 text-center mb-4 text-white">
      <img id="previewFoto" src="${foto}" class="w-24 h-24 rounded-full mx-auto mb-3 object-cover bg-white p-1 shadow-lg" 
           onerror="this.src='https://placehold.co/96x96/800000/FFFFFF?text=U'">
      <input type="file" id="fotoInput" accept="image/*" class="hidden" onchange="previewFoto(event)">
      <button onclick="document.getElementById('fotoInput').click()" class="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg font-bold text-sm active:scale-95 transition">Ganti Foto</button>
      <p class="font-bold text-lg mt-3">${currentUser.Nama}</p>
      <p class="text-xs opacity-80">${currentUser.Jabatan || 'Karyawan'} | ${currentUser.NIP || '-'}</p>
    </div>
    <div class="bg-white rounded-2xl shadow-lg p-4 space-y-3">
      <div><label class="text-xs text-gray-500 font-semibold">Nama</label><input id="Nama" value="${currentUser.Nama || ''}" class="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 font-semibold">NIP</label><input id="NIP" value="${currentUser.NIP || ''}" class="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 bg-gray-100" disabled></div>
      <div><label class="text-xs text-gray-500 font-semibold">Jabatan</label><input id="Jabatan" value="${currentUser.Jabatan || ''}" class="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 font-semibold">Lokasi</label><input id="Lokasi" value="${currentUser.Lokasi || ''}" class="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 font-semibold">Perusahaan</label><input id="Perusahaan" value="${currentUser.Perusahaan || ''}" class="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 font-semibold">Alamat</label><input id="Alamat" value="${currentUser.Alamat || ''}" class="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 font-semibold">No. Telpon</label><input id="No_Tlpn" value="${currentUser.No_Tlpn || ''}" class="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 font-semibold">Email</label><input id="Email" value="${currentUser.Email || ''}" class="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 font-semibold">Password Baru</label><input id="Password" type="password" placeholder="Kosongkan jika tidak ganti" class="w-full border-2 border-gray-200 p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <button onclick="saveAccount()" class="w-full text-white p-3 rounded-xl font-bold mt-2 bg-gradient-to-r from-[#800000] to-[#a00000] shadow-lg active:scale-95 transition">Simpan Perubahan</button>
      <button onclick="logout()" class="w-full bg-red-600 text-white p-3 rounded-xl font-bold shadow-lg active:scale-95 transition">Logout</button>
    </div>
  </div>
  ${renderBottomNav('account')}
  `;
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
  ['Nama', 'Jabatan', 'Lokasi', 'Perusahaan', 'Alamat', 'No_Tlpn', 'Email', 'Password'].forEach(f => {
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
  console.log('[SAVE] update_user response:', res);
  
  if (res.status === 'success') {
    currentUser = res.data;
    console.log('[SAVE] currentUser baru:', currentUser);
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
  <div class="bg-white shadow-sm p-4 flex items-center gap-3 sticky top-0 z-50">
    <button onclick="renderHome()"><i class="ri-arrow-left-s-line text-2xl"></i></button>
    <h1 class="text-xl font-bold">Riwayat Absensi</h1>
  </div>
  <div class="p-4 pb-24">
    <div class="bg-white rounded-xl shadow p-4 mb-4">
      <label class="text-sm font-semibold text-gray-700 mb-2 block">Pilih Bulan</label>
      <select id="bulanRekap" onchange="loadRekapBulan()" class="w-full border-2 border-gray-200 p-3 rounded-lg font-semibold text-gray-800 focus:border-[#800000] focus:outline-none">
        <option value="">-- Pilih Bulan --</option>
      </select>
    </div>
    <div id="rekapContent">
      <div class="text-center py-12 text-gray-400">
        <i class="ri-calendar-todo-line text-5xl mb-3"></i>
        <p class="text-sm">Pilih bulan untuk melihat riwayat absensi</p>
      </div>
    </div>
  </div>
  ${renderBottomNav('home')}
  `;
  
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
      <div class="text-center py-12 text-gray-400">
        <i class="ri-calendar-todo-line text-5xl mb-3"></i>
        <p class="text-sm">Pilih bulan untuk melihat riwayat absensi</p>
      </div>`;
    return;
  }
  
  content.innerHTML = `
    <div class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-[#800000]"></div>
      <p class="text-sm text-gray-500 mt-3">Memuat data...</p>
    </div>`;
  
  const res = await apiCall('get_rekap_user', { nama: currentUser.Nama });
  
  if (res.status!== 'success') {
    content.innerHTML = `<p class="text-red-500 text-center py-8">Gagal load: ${res.msg}</p>`;
    return;
  }
  
  const [year, month] = bulan.split('-');
  const data = res.data.filter(r => {
    if (!r.Tanggal) return false;
    const tgl = r.Tanggal.includes('/')? r.Tanggal.split('/').reverse().join('-') : r.Tanggal;
    return tgl.startsWith(`${year}-${month}`);
  }).reverse();
  
  if (data.length === 0) {
    content.innerHTML = `
      <div class="text-center py-12 text-gray-400">
        <i class="ri-file-list-3-line text-5xl mb-3"></i>
        <p class="text-sm font-semibold">Tidak ada data absensi</p>
        <p class="text-xs mt-1">Bulan ${document.getElementById('bulanRekap').selectedOptions[0].text}</p>
      </div>`;
    return;
  }
  
  let totalHadir = data.filter(r => r['Jam Masuk'] && r['Jam Masuk']!== '-').length;
  
  content.innerHTML = `
    <div class="bg-gradient-to-r from-[#800000] to-[#a00000] text-white rounded-xl p-4 mb-4 shadow-lg">
      <div class="flex justify-between items-center">
        <div>
          <p class="text-xs opacity-80">Total Kehadiran</p>
          <p class="text-3xl font-bold">${totalHadir}</p>
          <p class="text-xs opacity-80 mt-1">hari</p>
        </div>
        <div class="text-right">
          <i class="ri-calendar-check-line text-5xl opacity-50"></i>
        </div>
      </div>
    </div>
    
    <div class="space-y-2">
      ${data.map((r, idx) => {
        const masuk = r['Jam Masuk'] || '-';
        const pulang = r['Jam Pulang'] || '-';
        const durasi = r.Durasi || '-';
        const isAlpha = masuk === '-' && pulang === '-';
        
        return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md active:scale-[0.98]" 
             onclick="toggleDetail(${idx})">
          <div class="p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-lg ${isAlpha? 'bg-red-100' : 'bg-green-100'} flex items-center justify-center flex-shrink-0">
                <i class="ri-${isAlpha? 'close' : 'check'}-line text-2xl ${isAlpha? 'text-red-600' : 'text-green-600'}"></i>
              </div>
              <div>
                <p class="font-bold text-gray-800">${formatTanggal(r.Tanggal)}</p>
                <p class="text-xs text-gray-500">${isAlpha? 'Tidak Hadir' : 'Hadir'}</p>
              </div>
            </div>
            <i id="arrow-${idx}" class="ri-arrow-down-s-line text-2xl text-gray-400 transition-transform"></i>
          </div>
          
          <div id="detail-${idx}" class="hidden bg-gray-50 border-t border-gray-100 px-4 py-3">
            <div class="grid grid-cols-3 gap-3 text-center">
              <div>
                <p class="text-xs text-gray-500 mb-1">Masuk</p>
                <p class="font-bold text-sm text-gray-800">${masuk}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Pulang</p>
                <p class="font-bold text-sm text-gray-800">${pulang}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Durasi</p>
                <p class="font-bold text-sm text-[#800000]">${durasi}</p>
              </div>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function toggleDetail(idx) {
  const detail = document.getElementById(`detail-${idx}`);
  const arrow = document.getElementById(`arrow-${idx}`);
  if (detail.classList.contains('hidden')) {
    detail.classList.remove('hidden');
    arrow.style.transform = 'rotate(180deg)';
  } else {
    detail.classList.add('hidden');
    arrow.style.transform = 'rotate(0deg)';
  }
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

(function init() {
  console.log('Init user, API_URL:', API_URL);
  currentUser? renderHome() : renderLogin();
})();
