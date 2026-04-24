const API_URL = 'https://script.google.com/macros/s/AKfycbzi_WID_nzGf3R83quzpSxCiJcDbh-jW_oQv4HgMUFh8CdQqLTWxZFTNzZYDN4VC3V-/exec';
const app = document.getElementById('app');
let currentUser = JSON.parse(sessionStorage.getItem('user') || 'null');
let appSetting = JSON.parse(sessionStorage.getItem('setting') || '{}');

const USER_FIELDS = ['Username', 'Password', 'Nama', 'NIP', 'Jabatan', 'Lokasi', 'Perusahaan', 'URL_Logo', 'Alamat', 'No_Tlpn', 'Email'];

async function apiCall(action, payload = {}) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ action,...payload }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    return await res.json();
  } catch (e) {
    console.error('API Error:', e);
    return { status: 'error', msg: 'Gagal konek ke server' };
  }
}

async function renderLogin() {
  if (Object.keys(appSetting).length === 0) {
    const res = await apiCall('get_setting');
    if (res.status === 'success') {
      appSetting = res.data;
      sessionStorage.setItem('setting', JSON.stringify(appSetting));
    }
  }
  const logoUrl = appSetting.Logo_Login || 'https://placehold.co/100x100/800000/FFFFFF?text=Logo';
  app.innerHTML = `
  <div class="flex items-center justify-center h-screen bg-gray-100">
    <div class="bg-white p-8 rounded-xl shadow-lg w-11/12 max-w-sm">
      <img src="${logoUrl}" class="w-20 h-20 rounded-full mx-auto mb-4 object-cover" onerror="this.src='https://placehold.co/100x100/800000/FFFFFF?text=Logo'">
      <h1 class="text-xl font-bold text-center mb-6">Login Absensi</h1>
      <input id="username" type="text" placeholder="Username" class="w-full border p-3 rounded-lg mb-3">
      <input id="password" type="password" placeholder="Password" class="w-full border p-3 rounded-lg mb-3">
      <button onclick="login()" class="w-full text-white p-3 rounded-lg font-bold" style="background-color:#800000">Login</button>
      <p id="err" class="text-red-500 text-sm mt-2 text-center"></p>
    </div>
  </div>`;
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('err');
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
  const foto = currentUser.URL_Logo || 'https://placehold.co/100x100/FFFFFF/800000?text=User';
  const namaPerusahaan = appSetting.Nama_Perusahaan || currentUser.Perusahaan || '-';
  
  app.innerHTML = `
  <div class="bg-white shadow-sm p-4 flex justify-between items-center">
    <div class="flex items-center gap-3">
      <img src="${foto}" class="w-10 h-10 rounded-full object-cover" onerror="this.src='https://placehold.co/40x40/FFFFFF/800000?text=U'">
      <div>
        <p class="font-bold text-sm">${currentUser.Nama || '-'}</p>
        <p class="text-xs text-gray-500">${currentUser.Jabatan || '-'} - ${currentUser.NIP || '-'}</p>
      </div>
    </div>
    <div class="flex gap-4 text-xl text-gray-600">
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
          <p class="text-xs opacity-80">${currentUser.Jabatan || 'Karyawan'} | ${namaPerusahaan}</p>
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

function comingSoon() {
  alert('Fitur ini segera hadir!');
}

function renderBottomNav(active) {
  return `
  <div class="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around text-xs py-2">
    <button onclick="renderHome()" class="${active === 'home'? 'text-maroon-700' : 'text-gray-500'}" style="color:${active === 'home'? '#800000' : ''}">
      <i class="ri-home-5-fill text-xl"></i><p>Home</p>
    </button>
    <button class="text-gray-500"><i class="ri-building-4-line text-xl"></i><p>Company</p></button>
    <button class="text-gray-500"><i class="ri-information-line text-xl"></i><p>About</p></button>
    <button onclick="renderAccount()" class="${active === 'account'? 'text-maroon-700' : 'text-gray-500'}" style="color:${active === 'account'? '#800000' : ''}">
      <i class="ri-user-3-line text-xl"></i><p>Account</p>
    </button>
  </div>`;
}

function renderAccount() {
  const foto = currentUser.URL_Logo || 'https://placehold.co/100x100/800000/FFFFFF?text=User';
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
    renderAccount(); // Refresh halaman account
  }
}

async function renderAbsen() {
  app.innerHTML = `<div class="p-4"><p>Fitur Absen Kamera...</p></div>${renderBottomNav('home')}`;
}

async function renderRekap() {
  app.innerHTML = `<div class="p-4"><p>Fitur Rekap...</p></div>${renderBottomNav('home')}`;
}

// Init
(async function init() {
  if (currentUser) {
    renderHome();
  } else {
    await renderLogin();
  }
})();
