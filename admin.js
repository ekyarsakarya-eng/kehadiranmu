const API_URL = 'https://script.google.com/macros/s/AKfycbykNYbs54O1BSmAn7qcjqBpYfaGekM9WLaQ505JkJsLtJ-kU3InUrwHIP-ikWiDU_7x/exec';
const app = document.getElementById('app');
let allUsers = [];
let editingUser = null;

const USER_FIELDS = ['Username', 'Password', 'Nama', 'NIP', 'Jabatan', 'Lokasi', 'Perusahaan', 'URL_Logo'];

async function apiCall(action, payload = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({ action,...payload }),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  });
  return await res.json();
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

async function loadUsers() {
  app.innerHTML = `<div class="p-8 text-center">Loading...</div>`;
  const res = await apiCall('admin_get_all_users');
  if (res.status === 'success') {
    allUsers = res.data;
    renderAdminTable();
  } else {
    app.innerHTML = `<div class="p-8 text-center text-red-500">Gagal load data: ${res.msg}</div>`;
  }
}

function renderAdminTable() {
  let tableRows = allUsers.map(u => `
    <tr class="border-b hover:bg-gray-50">
      <td class="p-3">${u.Nama}</td>
      <td class="p-3">${u.NIP}</td>
      <td class="p-3">${u.Jabatan}</td>
      <td class="p-3">${u.Lokasi}</td>
      <td class="p-3 text-center">
        <button onclick='showEditUser(${JSON.stringify(u)})' class="text-blue-600 mr-3"><i class="ri-edit-line"></i></button>
        <button onclick="deleteUser('${u.NIP}')" class="text-red-600"><i class="ri-delete-bin-line"></i></button>
      </td>
    </tr>
  `).join('');

  app.innerHTML = `
  <div class="bg-blue-600 text-white p-4 shadow-md">
    <h1 class="text-2xl font-bold">Admin Panel Absensi</h1>
    <p class="text-sm opacity-80">Kelola data karyawan</p>
  </div>
  <div class="p-4 md:p-6">
    <div class="bg-white rounded-lg shadow-md p-4">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Daftar Karyawan</h2>
        <button onclick="showAddUser()" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
          <i class="ri-add-line"></i> Tambah Karyawan
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-gray-100 text-gray-600">
            <tr>
              <th class="p-3">Nama</th>
              <th class="p-3">NIP</th>
              <th class="p-3">Jabatan</th>
              <th class="p-3">Lokasi</th>
              <th class="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function showAddUser() {
  editingUser = null;
  const formFields = USER_FIELDS.map(f => `
    <div class="mb-3">
      <label class="block text-sm font-medium text-gray-700">${f}</label>
      <input id="form_${f}" type="${f === 'Password'? 'password' : 'text'}" class="w-full border p-2 rounded-lg mt-1">
    </div>
  `).join('');

  openModal(`
    <h2 class="text-xl font-bold mb-4">Tambah Karyawan Baru</h2>
    <div id="form-fields">${formFields}</div>
    <div class="flex gap-3 mt-6">
      <button onclick="closeModal()" class="flex-1 bg-gray-300 p-2 rounded-lg">Batal</button>
      <button onclick="saveUser()" class="flex-1 bg-blue-600 text-white p-2 rounded-lg font-bold">Simpan</button>
    </div>
  `);
}

function showEditUser(user) {
  editingUser = user;
  const formFields = USER_FIELDS.map(f => `
    <div class="mb-3">
      <label class="block text-sm font-medium text-gray-700">${f}</label>
      <input id="form_${f}" type="${f === 'Password'? 'text' : 'text'}" value="${user[f] || ''}" ${f === 'NIP'? 'disabled' : ''} class="w-full border p-2 rounded-lg mt-1 ${f === 'NIP'? 'bg-gray-100' : ''}">
    </div>
  `).join('');

  openModal(`
    <h2 class="text-xl font-bold mb-4">Edit Karyawan: ${user.Nama}</h2>
    <div id="form-fields">${formFields}</div>
    <div class="flex gap-3 mt-6">
      <button onclick="closeModal()" class="flex-1 bg-gray-300 p-2 rounded-lg">Batal</button>
      <button onclick="saveUser()" class="flex-1 bg-blue-600 text-white p-2 rounded-lg font-bold">Update</button>
    </div>
  `);
}

async function saveUser() {
  const userData = {};
  USER_FIELDS.forEach(f => {
    userData[f] = document.getElementById(`form_${f}`).value;
  });

  if (!userData.NIP ||!userData.Nama ||!userData.Username) {
    alert('NIP, Nama, dan Username wajib diisi!');
    return;
  }

  const action = editingUser? 'admin_update_user' : 'admin_add_user';
  const res = await apiCall(action, { user: userData });

  alert(res.msg);
  if (res.status === 'success') {
    closeModal();
    loadUsers();
  }
}

async function deleteUser(nip) {
  if (!confirm(`Yakin hapus karyawan dengan NIP ${nip}? Data absen tidak ikut terhapus.`)) return;

  const res = await apiCall('admin_delete_user', { nip });
  alert(res.msg);
  if (res.status === 'success') loadUsers();
}

// Init
loadUsers();
