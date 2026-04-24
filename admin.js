const API_URL = 'https://script.google.com/macros/s/AKfycbxdF8BrgjDPA3jMBj_HyKz01LXOXIGVzS5S0PcXSVGXuYquhhoUVb84EVLjwvdRXlEw/exec'; 
const app = document.getElementById('app');
let admin = JSON.parse(sessionStorage.getItem('admin') || 'null');
let allUsers = [];
let allRekap = [];
let editingUser = null;

const USER_FIELDS = ['Username', 'Password', 'Nama', 'NIP', 'Jabatan', 'Lokasi', 'Perusahaan', 'URL_Logo'];

async function apiCall(action, payload = {}) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ action,...payload }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Response bukan JSON:', text);
      return { status: 'error', msg: 'Server error. Cek Deploy Apps Script. Response: ' + text.slice(0, 100) };
    }
  } catch (e) {
    console.error('Fetch Error:', e);
    return { status: 'error', msg: 'Gagal konek ke server. 1. Cek API_URL 2. Deploy ulang Apps Script set Anyone' };
  }
}

function renderError(msg) {
  app.innerHTML = `
  <div class="flex items-center justify-center h-screen bg-red-50">
    <div class="bg-white p-8 rounded-xl shadow-lg w-11/12 max-w-md text-center">
      <i class="ri-error-warning-fill text-5xl text-red-500"></i>
      <h1 class="text-xl font-bold mt-4 mb-2">Gagal Konek ke Server</h1>
      <p class="text-sm text-gray-600 mb-4">${msg}</p>
      <div class="text-left bg-gray-100 p-3 rounded-lg text-xs">
        <p class="font-bold">Checklist:</p>
        <p>1. API_URL di admin.js udah URL terbaru?</p>
        <p>2. Apps Script Deploy > Who has access: Anyone?</p>
        <p>3. Buka F12 > Console buat detail error</p>
      </div>
    </div>
  </div>`;
}

function renderLogin() {
  app.innerHTML = `
  <div class="flex items-center justify-center h-screen bg-gray-800">
    <div class="bg-white p-8 rounded-xl shadow-lg w-11/12 max-w-sm">
      <div class="w-20 h-20 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
        <i class="ri-admin-fill text-4xl text-white"></i>
      </div>
      <h1 class="text-xl font-bold text-center mb-6">Admin Panel Login</h1>
      <input id="username" type="text" placeholder="Username Admin" class="w-full border p-3 rounded-lg mb-3">
      <input id="password" type="password" placeholder="Password Admin" class="w-full border p-3 rounded-lg mb-3">
      <button onclick="loginAdmin()" class="w-full bg-gray-800 text-white p-3 rounded-lg font-bold">Login</button>
      <p id="err" class="text-red-500 text-sm mt-2 text-center"></p>
    </div>
  </div>`;
}

async function loginAdmin() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('err');
  errEl.innerText = 'Login...';
  const res = await apiCall('admin_login', { username, password });
  if (res.status === 'success') {
    admin = res.data;
    sessionStorage.setItem('admin', JSON.stringify(admin));
    renderDashboard();
  } else {
    errEl.innerText = res.msg;
  }
}

function logout() {
  sessionStorage.removeItem('admin');
  admin = null;
  renderLogin();
}

async function renderDashboard(tab = 'users') {
  app.innerHTML = `
  <div class="bg-gray-800 text-white p-4 shadow-md flex justify-between items-center">
    <div>
      <h1 class="text-2xl font-bold">Admin Panel Absensi</h1>
      <p class="text-sm opacity-80">Selamat datang, ${admin.nama}</p>
    </div>
    <button onclick="logout()" class="bg-red-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
      <i class="ri-logout-box-r-line"></i> Logout
    </button>
  </div>
  <div class="p-4 md:p-6">
    <div class="bg-white rounded-lg shadow-md">
      <div class="flex border-b">
        <button onclick="renderDashboard('users')" class="p-4 font-bold ${tab === 'users'? 'tab-active' : 'text-gray-500'}">Kelola Karyawan</button>
        <button onclick="renderDashboard('rekap')" class="p-4 font-bold ${tab === 'rekap'? 'tab-active' : 'text-gray-500'}">Rekap Absensi</button>
      </div>
      <div id="tab-content" class="p-4">Loading...</div>
    </div>
  </div>`;
  if (tab === 'users') await renderTabUsers();
  if (tab === 'rekap') await renderTabRekap();
}

// ... sisa fungsi renderTabUsers, renderTabRekap, dll sama kayak sebelumnya ...
async function renderTabUsers() {
  const content = document.getElementById('tab-content');
  content.innerHTML = 'Loading data karyawan...';
  const res = await apiCall('admin_get_all_users');
  if (res.status !== 'success') {
    content.innerHTML = `<p class="text-red-500">Gagal load: ${res.msg}</p>`;
    return;
  }
  allUsers = res.data;
  let tableRows = allUsers.map(u => `
    <tr class="border-b hover:bg-gray-50">
      <td class="p-3">${u.Nama || '-'}</td>
      <td class="p-3">${u.NIP || '-'}</td>
      <td class="p-3">${u.Username || '-'}</td>
      <td class="p-3">${u.Jabatan || '-'}</td>
      <td class="p-3">${u.Lokasi || '-'}</td>
      <td class="p-3 text-center">
        <button onclick='showEditUser(${JSON.stringify(u).replace(/'/g, "&apos;")})' class="text-blue-600 mr-3"><i class="ri-edit-line"></i></button>
        <button onclick="deleteUser('${u.NIP}')" class="text-red-600"><i class="ri-delete-bin-line"></i></button>
      </td>
    </tr>
  `).join('');
  content.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Daftar Karyawan</h2>
      <button onclick="showAddUser()" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
        <i class="ri-add-line"></i> Tambah Karyawan
      </button>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="bg-gray-100 text-gray-600">
          <tr><th class="p-3">Nama</th><th class="p-3">NIP</th><th class="p-3">Username</th><th class="p-3">Jabatan</th><th class="p-3">Lokasi</th><th class="p-3 text-center">Aksi</th></tr>
        </thead>
        <tbody>${tableRows || '<tr><td colspan="6" class="p-3 text-center">Belum ada data</td></tr>'}</tbody>
      </table>
    </div>`;
}

// Init - cek koneksi dulu sebelum render login
(async function init() {
  const test = await apiCall('admin_login', { username: 'test', password: 'test' });
  if (test.msg && test.msg.includes('Gagal konek')) {
    renderError(test.msg);
  } else {
    admin? renderDashboard() : renderLogin();
  }
})();
