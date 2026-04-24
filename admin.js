const API_URL = 'https://script.google.com/macros/s/AKfycbzi_WID_nzGf3R83quzpSxCiJcDbh-jW_oQv4HgMUFh8CdQqLTWxZFTNzZYDN4VC3V-/exec'; 
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
      return { status: 'error', msg: 'Server error: ' + text.slice(0, 100) };
    }
  } catch (e) {
    console.error('Fetch Error:', e);
    return { status: 'error', msg: 'Gagal konek ke server. Cek API_URL & Deploy Apps Script' };
  }
}

function renderError(msg) {
  app.innerHTML = `
  <div class="flex items-center justify-center h-screen bg-red-50">
    <div class="bg-white p-8 rounded-xl shadow-lg w-11/12 max-w-md text-center">
      <i class="ri-error-warning-fill text-5xl text-red-500"></i>
      <h1 class="text-xl font-bold mt-4 mb-2">Gagal Konek ke Server</h1>
      <p class="text-sm text-gray-600 mb-4">${msg}</p>
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
        <button onclick="renderDashboard('users')" class="p-4 font-bold ${tab === 'users'? 'border-b-2 border-gray-800' : 'text-gray-500'}">Kelola Karyawan</button>
        <button onclick="renderDashboard('rekap')" class="p-4 font-bold ${tab === 'rekap'? 'border-b-2 border-gray-800' : 'text-gray-500'}">Rekap Absensi</button>
      </div>
      <div id="tab-content" class="p-4">Loading...</div>
    </div>
  </div>`;
  if (tab === 'users') await renderTabUsers();
  if (tab === 'rekap') await renderTabRekap();
}

async function renderTabUsers() {
  const content = document.getElementById('tab-content');
  content.innerHTML = 'Loading data karyawan...';
  const res = await apiCall('admin_get_all_users');
  if (res.status!== 'success') {
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

async function renderTabRekap() {
  const content = document.getElementById('tab-content');
  content.innerHTML = 'Loading rekap...';
  const res = await apiCall('admin_get_all_rekap');
  if (res.status!== 'success') {
    content.innerHTML = `<p class="text-red-500">Gagal load: ${res.msg}</p>`;
    return;
  }
  allRekap = res.data;
  let tableRows = allRekap.map(r => `
    <tr class="border-b hover:bg-gray-50">
      <td class="p-3">${r.Nama}</td>
      <td class="p-3">${r.Tanggal}</td>
      <td class="p-3">${r['Jam Masuk']}</td>
      <td class="p-3">${r['Jam Pulang']}</td>
      <td class="p-3">${r.Durasi}</td>
      <td class="p-3">${r.Lokasi}</td>
    </tr>
  `).join('');
  content.innerHTML = `
    <h2 class="text-xl font-bold mb-4">Rekap Absensi Semua Karyawan</h2>
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="bg-gray-100 text-gray-600">
          <tr><th class="p-3">Nama</th><th class="p-3">Tanggal</th><th class="p-3">Masuk</th><th class="p-3">Pulang</th><th class="p-3">Durasi</th><th class="p-3">Lokasi</th></tr>
        </thead>
        <tbody>${tableRows || '<tr><td colspan="6" class="p-3 text-center">Belum ada data</td></tr>'}</tbody>
      </table>
    </div>`;
}

function showAddUser() {
  editingUser = null;
  renderUserForm();
}

function showEditUser(user) {
  editingUser = user;
  renderUserForm();
}

function renderUserForm() {
  const isEdit = editingUser!== null;
  const user = editingUser || {};
  const fields = USER_FIELDS.map(f => `
    <div>
      <label class="text-sm text-gray-600">${f}</label>
      <input id="form_${f}" type="${f === 'Password'? 'password' : 'text'}" value="${user[f] || ''}" ${f === 'NIP' && isEdit? 'disabled' : ''} class="w-full border p-2 rounded-lg mt-1 ${f === 'NIP' && isEdit? 'bg-gray-100' : ''}">
    </div>
  `).join('');
  app.innerHTML = `
  <div class="bg-gray-800 text-white p-4 shadow-md">
    <button onclick="renderDashboard()" class="font-bold"><i class="ri-arrow-left-line"></i> Kembali</button>
    <h1 class="text-2xl font-bold mt-2">${isEdit? 'Edit' : 'Tambah'} Karyawan</h1>
  </div>
  <div class="p-4">
    <div class="bg-white p-6 rounded-lg shadow-md space-y-4">
      ${fields}
      <button onclick="saveUser()" class="w-full bg-blue-600 text-white p-3 rounded-lg font-bold">Simpan</button>
    </div>
  </div>`;
}

async function saveUser() {
  const userData = {};
  USER_FIELDS.forEach(f => {
    const el = document.getElementById(`form_${f}`);
    if (el) userData[f] = el.value;
  });
  if (!userData.NIP ||!userData.Username ||!userData.Password ||!userData.Nama) {
    alert('NIP, Username, Password, dan Nama wajib diisi!');
    return;
  }
  const action = editingUser? 'admin_update_user' : 'admin_add_user';
  const res = await apiCall(action, { user: userData });
  alert(res.msg);
  if (res.status === 'success') renderDashboard();
}

async function deleteUser(nip) {
  if (!confirm(`Yakin hapus karyawan NIP ${nip}?`)) return;
  const res = await apiCall('admin_delete_user', { nip });
  alert(res.msg);
  if (res.status === 'success') renderTabUsers();
}

// Init
(async function init() {
  const test = await apiCall('admin_login', { username: 'test', password: 'test' });
  if (test.msg && test.msg.includes('Gagal konek')) {
    renderError(test.msg);
  } else {
    admin? renderDashboard() : renderLogin();
  }
})();
