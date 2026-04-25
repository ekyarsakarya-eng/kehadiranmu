const API_URL = 'https://script.google.com/macros/s/AKfycbyMxCBHwzIKwQ6504TdbvuPC2BkZsyl7yhVYJF_JQuSy4_BQ3jFD-4xM8yc59gmnYk/exec';
const LOGO_APP = 'logo.png'; // LOGO SATPAM BUAT APP AJA
const app = document.getElementById('app');
let currentUser = JSON.parse(sessionStorage.getItem('user') || 'null');
let appSetting = JSON.parse(sessionStorage.getItem('setting') || '{}');

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
    app.innerHTML = `<div class="p-8 text-center text-red-600"><h1 class="font-bold">Gagal Konek Server</h1><p class="text-sm mt-2">${e.message}</p></div>`;
    return { status: 'error', msg: 'Gagal konek ke server: ' + e.message };
  }
}

async function renderLogin() {
  sessionStorage.clear();
  currentUser = null;
  
  const res = await apiCall('get_setting');
  if (res.status === 'success') {
    appSetting = res.data;
    sessionStorage.setItem('setting', JSON.stringify(appSetting));
  }
  
  // LOGIN PAKE LOGO SATPAM
  app.innerHTML = `
  <div class="flex items-center justify-center h-screen bg-gray-100">
    <div class="bg-white p-8 rounded-xl shadow-lg w-11/12 max-w-sm">
      <img src="${LOGO_APP}" class="w-20 h-20 rounded-full mx-auto mb-4 object-cover">
      <h1 class="font-header font-extrabold text-center mb-6 text-gray-900" style="font-size: clamp(16px, 4vw, 20px);">ABSENSI KEHADIRAN TERPADU</h1>
      <input id="username" type="text" placeholder="Username" class="w-full border p-3 rounded-lg mb-3">
      <input id="password" type="password" placeholder="Password" class="w-full border p-3 rounded-lg mb-3">
      <button onclick="login()" class="w-full text-white p-3 rounded-lg font-bold" style="background-color:#800000">Login</button>
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
    errEl.innerText = 'Username & Password wajib diisi';
    return;
  }
  errEl.innerText = 'Login...';
  const res = await apiCall('login', { username, password });
  if (res.status === 'success') {
    currentUser = res.data;
    console.log('[LOGIN] Data user:', currentUser);
    appSetting = res.setting || {};
    sessionStorage.setItem('user', JSON.stringify(currentUser));
    sessionStorage.setItem('setting', JSON.stringify(appSetting));
    renderHome();
  } else {
    errEl.innerText = res.msg;
  }
}

function logout() {
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

  console.log('[HOME] URL_Logo:', currentUser.URL_Logo);
  const res = await apiCall('get_dashboard', { nama: currentUser.Nama });

  // FOTO USER TETAP DARI DATABASE - USER BISA GANTI
  let fotoUser = currentUser.URL_Logo || 'https://placehold.co/100x100/FFFFFF/800000?text=U';
  fotoUser = fotoUser.replace(/\s/g, '');
  if (fotoUser.includes('uc?export=view&id=')) {
    const fileId = fotoUser.split('id=')[1].split('&')[0];
    fotoUser = `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
  }
  if (fotoUser.includes('drive.google.com')) {
    fotoUser += (fotoUser.includes('?')? '&' : '?') + 'v=' + Date.now();
  }
  console.log('[HOME] Final foto URL:', fotoUser);
  
  app.innerHTML = `
  <div class="bg-white shadow-sm p-3 flex justify-between items-center">
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <!-- LOGO APP PAKE SATPAM -->
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
    <div class="text-white rounded-2xl p-4 shadow-lg" style="background-color:#800000">
      <div class="flex items-center gap-3 mb-4">
        <!-- FOTO USER TETAP FOTO USER -->
        <img src="${fotoUser}" id="fotoHome" class="w-12 h-12 rounded-full object-cover bg-white p-1"
             onerror="console.log('FOTO HOME ERROR:', this.src); this.src='https://placehold.co/48x48/FFFFFF/800000?text=U'">
        <div>
          <p class="font-bold">${currentUser.Nama || '-'}</p>
          <p class="text-xs opacity-80">${currentUser.Jabatan || 'Karyawan'} | ${currentUser.NIP || '-'}</p>
        </div>
      </div>
      <div class="flex justify-between text-center bg-black bg-opacity-20 p-3 rounded-lg">
        <div><p class="text-xs opacity-80">Masuk</p><p class="font-bold text-lg">${res.jamMasuk || '00:00'}</p></div>
        <div><p class="text-xs opacity-80">Pulang</p><p class="font-bold text-lg">${res.jamPulang || '00:00'}</p></div>
        <div><p class="text-xs opacity-80">Shift</p><p class="font-bold text-lg">N/A</p></div>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4 text-center mt-6 text-xs">
      <button onclick="renderAbsen()" class="flex flex-col items-center gap-1"><i class="ri-fingerprint-line text-3xl text-blue-600"></i>Absensi</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1"><i class="ri-mail-send-line text-3xl text-orange-500"></i>Izin</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1"><i class="ri-suitcase-line text-3xl text-sky-600"></i>Cuti</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1"><i class="ri-time-line text-3xl text-gray-700"></i>Lembur</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1"><i class="ri-calendar-todo-line text-3xl text-purple-600"></i>Shift</button>
      <button onclick="renderRekap()" class="flex flex-col items-center gap-1"><i class="ri-file-list-3-line text-3xl text-green-600"></i>Lihat Absen</button>
      <button onclick="comingSoon()" class="flex flex-col items-center gap-1"><i class="ri-walk-line text-3xl text-red-600"></i>Patroli</button>
      <button onclick="logout()" class="flex flex-col items-center gap-1"><i class="ri-logout-box-r-line text-3xl text-black"></i>Keluar</button>
    </div>
  </div>
  ${renderBottomNav('home')}
  `;
}

let absenFoto = null;
let absenTipe = 'IN';

async function renderAbsen() {
  let alamat = 'Mendeteksi lokasi...';
  let jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  let tanggal = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  app.innerHTML = `
  <div class="bg-white shadow-sm p-4 flex items-center gap-3">
    <button onclick="renderHome()"><i class="ri-arrow-left-s-line text-2xl"></i></button>
    <h1 class="text-xl font-bold">Absen</h1>
  </div>
  <div class="p-4 pb-24 text-center">
    <p id="alamatText" class="text-sm text-gray-600 mb-4">${alamat}</p>
    <p class="text-5xl font-bold">${jam}</p>
    <p class="text-lg text-gray-700 mb-6">${tanggal}</p>
    
    <div class="relative w-64 h-64 mx-auto mb-6">
      <video id="camera" class="w-full h-full object-cover rounded-full bg-gray-200" autoplay playsinline></video>
      <img id="previewAbsen" class="w-full h-full object-cover rounded-full bg-gray-200 hidden" />
      <button onclick="ambilFoto()" class="absolute inset-0 flex items-center justify-center">
        <div id="iconKamera" class="w-20 h-20 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
          <i class="ri-camera-add-line text-4xl text-gray-600"></i>
        </div>
      </button>
    </div>
    <canvas id="canvas" class="hidden"></canvas>

    <div class="flex justify-center mb-6">
      <button id="btnIn" onclick="setTipe('IN')" class="px-6 py-2 rounded-l-lg font-bold text-white" style="background-color:#3b82f6">IN</button>
      <button id="btnOut" onclick="setTipe('OUT')" class="px-6 py-2 rounded-r-lg font-bold bg-gray-300 text-gray-600">OUT</button>
    </div>

    <button onclick="submitAbsen()" id="btnSubmit" class="w-full text-white p-4 rounded-xl font-bold text-lg" style="background-color:#1d4ed8" disabled>Submit</button>
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
  });

  startCamera();
}

function setTipe(tipe) {
  absenTipe = tipe;
  document.getElementById('btnIn').style.backgroundColor = tipe === 'IN'? '#3b82f6' : '#d1d5db';
  document.getElementById('btnIn').style.color = tipe === 'IN'? 'white' : '#4b5563';
  document.getElementById('btnOut').style.backgroundColor = tipe === 'OUT'? '#3b82f6' : '#d1d5db';
  document.getElementById('btnOut').style.color = tipe === 'OUT'? 'white' : '#4b5563';
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    document.getElementById('camera').srcObject = stream;
  } catch (err) {
    document.getElementById('statusAbsen').innerText = 'Kamera error: ' + err.message;
  }
}

function ambilFoto() {
  const video = document.getElementById('camera');
  const canvas = document.getElementById('canvas');
  const preview = document.getElementById('previewAbsen');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  absenFoto = canvas.toDataURL('image/jpeg', 0.7);
  preview.src = absenFoto;
  preview.classList.remove('hidden');
  video.classList.add('hidden');
  document.getElementById('iconKamera').classList.add('hidden');
  document.getElementById('btnSubmit').disabled = false;
  video.srcObject.getTracks().forEach(track => track.stop());
}

async function submitAbsen() {
  const btn = document.getElementById('btnSubmit');
  const statusEl = document.getElementById('statusAbsen');
  if (!absenFoto) {
    statusEl.innerText = 'Ambil foto dulu!';
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

  showModal(res.msg);
  if (res.status === 'success') {
    setTimeout(() => renderHome(), 1500);
  } else {
    btn.disabled = false;
    btn.innerText = 'Submit';
    statusEl.innerText = res.msg;
  }
}

function comingSoon() {
  showModal('Fitur ini segera hadir!');
}

function renderBottomNav(active) {
  return `
  <div class="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around text-xs py-2">
    <button onclick="renderHome()" style="color:${active === 'home'? '#800000' : '#6b7280'}">
      <i class="ri-home-5-fill text-xl"></i><p>Home</p>
    </button>
    <button class="text-gray-500"><i class="ri-building-4-line text-xl"></i><p>Company</p></button>
    <button class="text-gray-500"><i class="ri-information-line text-xl"></i><p>About</p></button>
    <button onclick="renderAccount()" style="color:${active === 'account'? '#800000' : '#6b7280'}">
      <i class="ri-user-3-line text-xl"></i><p>Account</p>
    </button>
  </div>`;
}

function renderAccount() {
  // FOTO USER TETAP DARI DATABASE - BISA DIGANTI
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
  <div class="bg-white shadow-sm p-4 text-center"><h1 class="text-xl font-bold">Account</h1></div>
  <div class="p-4 pb-24">
    <div class="bg-white rounded-lg shadow p-4 text-center mb-4">
      <img id="previewFoto" src="${foto}" class="w-24 h-24 rounded-full mx-auto mb-3 object-cover" 
           onerror="console.log('PREVIEW ERROR:', this.src); this.src='https://placehold.co/96x96/800000/FFFFFF?text=U'">
      <input type="file" id="fotoInput" accept="image/*" class="hidden" onchange="previewFoto(event)">
      <button onclick="document.getElementById('fotoInput').click()" class="text-sm font-bold" style="color:#800000">Ganti Foto</button>
    </div>
    <div class="bg-white rounded-lg shadow p-4 space-y-3">
      <div><label class="text-xs text-gray-500">Nama</label><input id="Nama" value="${currentUser.Nama || ''}" class="w-full border p-2 rounded-lg"></div>
      <div><label class="text-xs text-gray-500">NIP</label><input id="NIP" value="${currentUser.NIP || ''}" class="w-full border p-2 rounded-lg bg-gray-100" disabled></div>
      <div><label class="text-xs text-gray-500">Jabatan</label><input id="Jabatan" value="${currentUser.Jabatan || ''}" class="w-full border p-2 rounded-lg"></div>
      <div><label class="text-xs text-gray-500">Lokasi</label><input id="Lokasi" value="${currentUser.Lokasi || ''}" class="w-full border p-2 rounded-lg"></div>
      <div><label class="text-xs text-gray-500">Perusahaan</label><input id="Perusahaan" value="${currentUser.Perusahaan || ''}" class="w-full border p-2 rounded-lg"></div>
      <div><label class="text-xs text-gray-500">Alamat</label><input id="Alamat" value="${currentUser.Alamat || ''}" class="w-full border p-2 rounded-lg"></div>
      <div><label class="text-xs text-gray-500">No. Telpon</label><input id="No_Tlpn" value="${currentUser.No_Tlpn || ''}" class="w-full border p-2 rounded-lg"></div>
      <div><label class="text-xs text-gray-500">Email</label><input id="Email" value="${currentUser.Email || ''}" class="w-full border p-2 rounded-lg"></div>
      <div><label class="text-xs text-gray-500">Password Baru</label><input id="Password" type="password" placeholder="Kosongkan jika tidak ganti" class="w-full border p-2 rounded-lg"></div>
      <button onclick="saveAccount()" class="w-full text-white p-3 rounded-lg font-bold mt-2" style="background-color:#800000">Simpan Perubahan</button>
      <button onclick="logout()" class="w-full bg-red-600 text-white p-3 rounded-lg font-bold">Logout</button>
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
  showModal(res.msg);
  
  if (res.status === 'success') {
    currentUser = res.data;
    console.log('[SAVE] currentUser baru:', currentUser);
    sessionStorage.setItem('user', JSON.stringify(currentUser));
    setTimeout(() => {
      renderHome();
    }, 1500);
  } else {
    previewImg.style.opacity = '1';
  }
}

async function renderRekap() {
  app.innerHTML = `
  <div class="bg-white shadow-sm p-4 flex items-center gap-3">
    <button onclick="renderHome()"><i class="ri-arrow-left-s-line text-2xl"></i></button>
    <h1 class="text-xl font-bold">Riwayat Absensi</h1>
  </div>
  <div class="p-4 pb-24">
    <!-- PILIH BULAN -->
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
  
  // GENERATE LIST BULAN 12 BULAN TERAKHIR
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
  
  // AUTO PILIH BULAN INI
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
  
  if (res.status !== 'success') {
    content.innerHTML = `<p class="text-red-500 text-center py-8">Gagal load: ${res.msg}</p>`;
    return;
  }
  
  // FILTER DATA BERDASARKAN BULAN
  const [year, month] = bulan.split('-');
  const data = res.data.filter(r => {
    if (!r.Tanggal) return false;
    // Format tanggal di Sheet: dd/mm/yyyy atau yyyy-mm-dd
    const tgl = r.Tanggal.includes('/') ? r.Tanggal.split('/').reverse().join('-') : r.Tanggal;
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
  
  // HITUNG TOTAL
  let totalHadir = data.filter(r => r['Jam Masuk'] && r['Jam Masuk'] !== '-').length;
  
  content.innerHTML = `
    <!-- SUMMARY CARD -->
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
    
    <!-- LIST DATA -->
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
              <div class="w-12 h-12 rounded-lg ${isAlpha ? 'bg-red-100' : 'bg-green-100'} flex items-center justify-center flex-shrink-0">
                <i class="ri-${isAlpha ? 'close' : 'check'}-line text-2xl ${isAlpha ? 'text-red-600' : 'text-green-600'}"></i>
              </div>
              <div>
                <p class="font-bold text-gray-800">${formatTanggal(r.Tanggal)}</p>
                <p class="text-xs text-gray-500">${isAlpha ? 'Tidak Hadir' : 'Hadir'}</p>
              </div>
            </div>
            <i id="arrow-${idx}" class="ri-arrow-down-s-line text-2xl text-gray-400 transition-transform"></i>
          </div>
          
          <!-- DETAIL EXPAND -->
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
  // Convert dd/mm/yyyy atau yyyy-mm-dd ke format bagus
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
