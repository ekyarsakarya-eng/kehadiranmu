const API_URL = 'https://script.google.com/macros/s/AKfycbxdF8BrgjDPA3jMBj_HyKz01LXOXIGVzS5S0PcXSVGXuYquhhoUVb84EVLjwvdRXlEw/exec'; 
const app = document.getElementById('app');
let admin = JSON.parse(sessionStorage.getItem('admin') || 'null');
let allUsers = [];'
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
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('API Error:', e);
    return { status: 'error', msg: 'Gagal konek ke server. Cek: 1. API_URL benar? 2. Deploy ulang Apps Script? 3. Buka Console F12 untuk detail' };
  }
}

function openModal(content) {
  document.getElementById('modal-content').innerHTML = content;
  document.getElementById('modal').style.display = 'block';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  editingUser = null;
}

window.onclick = (e) => {
  if (e.target == document.getElementById('modal')) closeModal();
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

async function renderTabRekap() {
  const content = document.getElementById('tab-content');
  content.innerHTML = 'Loading data rekap...';
  const res = await apiCall('admin_get_all_rekap');
  if (res.status !== 'success') {
    content.innerHTML = `<p class="text-red-500">Gagal load: ${res.msg}</p>`;
    return;
  }
  allRekap = res.data;
  let tableRows = allRekap.slice(0, 100).map(r => `
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
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Rekap Absensi Semua Karyawan</h2>
      <button onclick="exportToExcel()" class="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
        <i class="ri-file-excel-2-line"></i> Export ke Excel
      </button>
    </div>
    <div class="overflow-x-auto max-h-96">
      <table class="w-full text-sm text-left">
        <thead class="bg-gray-100 text-gray-600 sticky top-0">
          <tr><th class="p-3">Nama</th><th class="p-3">Tanggal</th><th class="p-3">Masuk</th><th class="p-3">Pulang</th><th class="p-3">Durasi</th><th class="p-3">Lokasi</th></tr>
        </thead>
        <tbody>${tableRows || '<tr><td colspan="6" class="p-3 text-center">Belum ada data</td></tr>'}</tbody>
      </table>
    </div>
    <p class="text-xs text-gray-500 mt-2">Menampilkan 100 data terbaru. Export Excel akan mengambil semua data.</p>`;
}

function exportToExcel() {
  if (!allRekap.length) return alert('Tidak ada data untuk diexport');
  const ws = XLSX.utils.json_to_sheet(allRekap);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
  XLSX.writeFile(wb, `Rekap_Absensi_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function showAddUser() {
  editingUser = null;
  const formFields = USER_FIELDS.map(f => `
    <div class="mb-3">
      <label class="block text-sm font-medium text-gray-700">${f}</label>
      <input id="form_${f}" type="${f === 'Password'? 'password' : 'text'}" class="w-full border p-2 rounded-lg mt-1">
    </div>
  `).join('');
  openModal(`<h2 class="text-xl font-bold mb-4">Tambah Karyawan Baru</h2><div>${formFields}</div><div class="flex gap-3 mt-6"><button onclick="closeModal()" class="flex-1 bg-gray-300 p-2 rounded-lg">Batal</button><button onclick="saveUser()" class="flex-1 bg-blue-600 text-white p-2 rounded-lg font-bold">Simpan</button></div>`);
}

function showEditUser(user) {
  editingUser = user;
  const formFields = USER_FIELDS.map(f => `
    <div class="mb-3">
      <label class="block text-sm font-medium text-gray-700">${f}</label>
      <input id="form_${f}" type="text" value="${user[f] || ''}" ${f === 'NIP'? 'disabled' : ''} class="w-full border p-2 rounded-lg mt-1 ${f === 'NIP'? 'bg-gray-100' : ''}">
    </div>
  `).join('');
  openModal(`<h2 class="text-xl font-bold mb-4">Edit Karyawan: ${user.Nama}</h2><div>${formFields}</div><div class="flex gap-3 mt-6"><button onclick="closeModal()" class="flex-1 bg-gray-300 p-2 rounded-lg">Batal</button><button onclick="saveUser()" class="flex-1 bg-blue-600 text-white p-2 rounded-lg font-bold">Update</button></div>`);
}

async function saveUser() {
  const userData = {};
  USER_FIELDS.forEach(f => userData[f] = document.getElementById(`form_${f}`).value);
  if (!userData.NIP ||!userData.Nama ||!userData.Username) return alert('NIP, Nama, dan Username wajib diisi!');
  const action = editingUser? 'admin_update_user' : 'admin_add_user';
  const res = await apiCall(action, { user: userData });
  alert(res.msg);
  if (res.status === 'success') {
    closeModal();
    renderDashboard('users');
  }
}

async function deleteUser(nip) {
  if (!confirm(`Yakin hapus karyawan dengan NIP ${nip}?`)) return;
  const res = await apiCall('admin_delete_user', { nip });
  alert(res.msg);
  if (res.status === 'success') renderDashboard('users');
}

// Init
admin? renderDashboard() : renderLogin();
