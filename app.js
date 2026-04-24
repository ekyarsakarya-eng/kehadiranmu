const API_URL = 'https://script.google.com/macros/s/AKfycbzWH1CzT2wV8IQ1bJJMZcEK5jC_PJPisrjCFW2voJBeLCupdjp5RSMti1Rcgh3REdcN/exec';
const app = document.getElementById('app');
let currentUser = JSON.parse(sessionStorage.getItem('user') || 'null');
let appSetting = JSON.parse(sessionStorage.getItem('setting') || '{}');

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
  // Paksa ambil setting terbaru dari server, jangan pake cache
  const res = await apiCall('get_setting');
  if (res.status === 'success') {
    appSetting = res.data;
    sessionStorage.setItem('setting', JSON.stringify(appSetting));
  }
  
  const logoUrl = appSetting.Logo_Login || 'https://placehold.co/100x100/800000/FFFFFF?text=Logo';
  const namaPT = appSetting.Nama_Perusahaan || 'Login Absensi';
  
  app.innerHTML = `
  <div class="flex items-center justify-center h-screen bg-gray-100">
    <div class="bg-white p-8 rounded-xl shadow-lg w-11/12 max-w-sm">
      <img src="${logoUrl}" class="w-20 h-20 rounded-full mx-auto mb-4 object-cover" onerror="this.src='https://placehold.co/100x100/800000/FFFFFF?text=Logo'">
      <h1 class="text-xl font-bold text-center mb-6">${namaPT}</h1>
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
  if (!username || !password) {
    errEl.innerText = 'Username & Password wajib diisi';
    return;
  }
  errEl.innerText = 'Login...';
  const res = await apiCall('login', { username, password });
  if (res.status === 'success') {
    currentUser = res.data;
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
  const res = await apiCall('get_dashboard', { nama: currentUser.Nama });
  const foto = currentUser.URL_Logo || 'https://placehold.co/100x100/FFFFFF/800000?text=U';
  const logoPT = appSetting.Logo_Login || foto;
  const namaPT = appSetting.Nama_Perusahaan || currentUser.Perusahaan || 'Nama Perusahaan';
  
  app.innerHTML = `
  <div class="bg-white shadow-sm p-3 flex justify-between items-center">
    <div class="flex items-center gap-3 min-w-0 flex-1">
      <img src="${logoPT}" class="w-10 h-10 rounded-full object-cover flex-shrink-0" onerror="this.src='${foto}'">
      <div class="min-w-0 flex-1">
        <p class="font-bold text-lg text-gray-800 truncate">${namaPT}</p>
      </div>
    </div>
    <div class="flex gap-4 text-xl text-gray-600 flex-shrink-0">
      <i class="ri-notification-3-line"></i>
      <i class="ri-menu-line"></i>
    </div>
  </div>
  <div class="p-4 pb-24">
    <div class="text-white rounded-2xl p-4 shadow-lg" style="background-color:#800000">
      <div class="flex items-center gap-3 mb-4">
        <img src="${foto}" class="w-12 h-12 rounded-full object-cover bg-white p-1" onerror="this.src='https://placehold.co/48x48/FFFFFF/800000?text=U'">
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

  // Ambil lokasi
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

  // Nyalain kamera
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
  // Matikan kamera setelah foto
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

  alert(res.msg);
  if (res.status === 'success') {
    renderHome();
  } else {
    btn.disabled = false;
    btn.innerText = 'Submit';
    statusEl.innerText = res.msg;
  }
}

function comingSoon() {
  alert('Fitur ini segera hadir!');
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
  const foto = currentUser.URL_Logo || 'https://placehold.co/100x100/800000/FFFFFF?text=U';
  app.innerHTML = `
  <div class="bg-white shadow-sm p-4 text-center"><h1 class="text-xl font-bold">Account</h1></div>
  <div class="p-4 pb-24">
    <div class="bg-white rounded-lg shadow p-4 text-center mb-4">
      <img id="previewFoto" src="${foto}" class="w-24 h-24 rounded-full mx-auto mb-3 object-cover" onerror="this.src='https://placehold.co/96x96/800000/FFFFFF?text=U'">
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
  if (fotoInput.files[0]) {
    newUser.Foto_Profil = document.getElementById('previewFoto').src;
  }
  const res = await apiCall('update_user', { user: newUser });
  alert(res.msg);
  if (res.status === 'success') {
    currentUser = res.data;
    sessionStorage.setItem('user', JSON.stringify(currentUser));
    renderHome();
  }
}

async function renderRekap() {
  app.innerHTML = `<div class="p-4"><p>Fitur Rekap...</p></div>${renderBottomNav('home')}`;
}

(function init() {
  console.log('Init user, API_URL:', API_URL);
  currentUser? renderHome() : renderLogin();
})();
