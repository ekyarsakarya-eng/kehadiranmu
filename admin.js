// === BAGIAN 1: INIT, LOGIN, UTILS ===
const API_URL = 'https://script.google.com/macros/s/AKfycbwhx18lwhm5pfx_NQXwMUn8Jp5wUwiCIUdQsaM5keeJvJDpmef927M45ToDDm5vpsN1/exec';
const app = document.getElementById('app');
let currentAdmin = JSON.parse(sessionStorage.getItem('admin') || 'null');
let isSuper = false;
let allUser = [];
let rekapData = [];

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

async function apiCall(action, payload = {}) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action,...payload }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    return await res.json();
  } catch (e) {
    alert('Gagal konek: ' + e.message);
    return { status: 'error' };
  }
}

function showToast(msg, type = 'success') {
  const bg = type === 'success'? 'bg-green-500' : 'bg-red-500';
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 ${bg} text-white px-6 py-3 rounded-lg shadow-xl z-50`;
  toast.innerText = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function renderLoginAdmin() {
  app.innerHTML = `
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#800000] to-[#a00000]">
    <div class="bg-white p-8 rounded-2xl shadow-2xl w-96">
      <div class="text-center mb-6">
        <i class="ri-shield-user-fill text-6xl text-[#800000]"></i>
        <h1 class="font-header font-extrabold text-2xl mt-2">Admin Dashboard</h1>
        <p class="text-sm text-gray-500">Login sebagai Admin/Super Admin</p>
      </div>
      <input id="username" type="text" placeholder="Username" class="w-full border-2 border-gray-200 p-3 rounded-lg mb-3 focus:border-[#800000] focus:outline-none">
      <input id="password" type="password" placeholder="Password" class="w-full border-2 border-gray-200 p-3 rounded-lg mb-3 focus:border-[#800000] focus:outline-none">
      <button onclick="loginAdmin()" class="w-full bg-[#800000] text-white p-3 rounded-lg font-bold hover:bg-[#a00000] transition">Login</button>
      <p id="err" class="text-red-500 text-sm mt-2 text-center"></p>
    </div>
  </div>`;
}

async function loginAdmin() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const err = document.getElementById('err');
  err.innerText = 'Login...';
  const res = await apiCall('login', { username, password });
  if (res.status === 'success' && (res.data.Role === 'Admin' || res.data.Role === 'Super Admin')) {
    currentAdmin = res.data;
    isSuper = res.data.Role === 'Super Admin';
    sessionStorage.setItem('admin', JSON.stringify(currentAdmin));
    renderDashboard();
  } else {
    err.innerText = 'Akses ditolak. Bukan Admin';
  }
}

function getSidebar(active) {
  return `
  <div class="w-64 bg-[#800000] text-white p-4 flex flex-col">
    <div class="mb-8">
      <h1 class="font-header font-extrabold text-xl">${isSuper? 'SUPER ADMIN' : 'ADMIN'}</h1>
      <p class="text-xs opacity-80">${isSuper? 'Semua Unit' : escapeHtml(currentAdmin.Unit_Kerja)}</p>
    </div>
    <nav class="flex-1 space-y-2">
      <button onclick="renderDashboard()" class="w-full text-left p-3 rounded-lg ${active==='dashboard'?'bg-white/20 font-semibold':'hover:bg-white/10'} flex items-center gap-3">
        <i class="ri-dashboard-line text-xl"></i> Dashboard
      </button>
      <button onclick="renderDataAbsensi()" class="w-full text-left p-3 rounded-lg ${active==='absensi'?'bg-white/20 font-semibold':'hover:bg-white/10'} flex items-center gap-3">
        <i class="ri-file-list-3-line text-xl"></i> Data Absensi
      </button>
      <button onclick="renderKelolaUser()" class="w-full text-left p-3 rounded-lg ${active==='user'?'bg-white/20 font-semibold':'hover:bg-white/10'} flex items-center gap-3">
        <i class="ri-team-line text-xl"></i> Kelola User
      </button>
      ${isSuper? `
      <button onclick="renderKelolaPos()" class="w-full text-left p-3 rounded-lg ${active==='pos'?'bg-white/20 font-semibold':'hover:bg-white/10'} flex items-center gap-3">
        <i class="ri-building-line text-xl"></i> Kelola Pos
      </button>
      <button onclick="renderSetting()" class="w-full text-left p-3 rounded-lg ${active==='setting'?'bg-white/20 font-semibold':'hover:bg-white/10'} flex items-center gap-3">
        <i class="ri-settings-3-line text-xl"></i> Setting
      </button>
      ` : ''}
    </nav>
    <button onclick="logoutAdmin()" class="p-3 rounded-lg bg-red-600 hover:bg-red-700 flex items-center gap-3">
      <i class="ri-logout-box-line text-xl"></i> Logout
    </button>
  </div>`;
}

function logoutAdmin() {
  sessionStorage.removeItem('admin');
  currentAdmin = null;
  renderLoginAdmin();
}
// === AKHIR BAGIAN 1 ===
// === BAGIAN 2: DASHBOARD & DATA ABSENSI ===
async function renderDashboard() {
  const stats = await apiCall('get_admin_stats', { unit: isSuper? 'all' : currentAdmin.Unit_Kerja });
  app.innerHTML = `
  <div class="flex h-screen">
    ${getSidebar('dashboard')}
    <div class="flex-1 p-8 overflow-auto">
      <div class="mb-6">
        <h2 class="font-header font-bold text-3xl text-gray-800 dark:text-white">Dashboard</h2>
        <p class="text-gray-500">Ringkasan data hari ini</p>
      </div>
      <div class="grid grid-cols-4 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div class="flex items-center justify-between mb-2">
            <p class="text-gray-500 text-sm">Hadir</p>
            <i class="ri-user-follow-line text-2xl text-green-500"></i>
          </div>
          <p class="text-3xl font-bold text-gray-800 dark:text-white">${stats.hadir || 0}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div class="flex items-center justify-between mb-2">
            <p class="text-gray-500 text-sm">Terlambat</p>
            <i class="ri-time-line text-2xl text-orange-500"></i>
          </div>
          <p class="text-3xl font-bold text-gray-800 dark:text-white">${stats.terlambat || 0}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div class="flex items-center justify-between mb-2">
            <p class="text-gray-500 text-sm">Patroli</p>
            <i class="ri-shield-check-line text-2xl text-blue-500"></i>
          </div>
          <p class="text-3xl font-bold text-gray-800 dark:text-white">${stats.patroli || 0}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div class="flex items-center justify-between mb-2">
            <p class="text-gray-500 text-sm">Kejadian</p>
            <i class="ri-alarm-warning-line text-2xl text-red-500"></i>
          </div>
          <p class="text-3xl font-bold text-gray-800 dark:text-white">${stats.kejadian || 0}</p>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <h3 class="font-bold text-lg mb-4 text-gray-800 dark:text-white">Grafik Kehadiran 7 Hari Terakhir</h3>
        <canvas id="chartHadir" height="80"></canvas>
      </div>
    </div>
  </div>
  `;
  loadChart();
}

async function loadChart() {
  const res = await apiCall('get_chart_hadir', { unit: isSuper? 'all' : currentAdmin.Unit_Kerja });
  const ctx = document.getElementById('chartHadir');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: res.labels || [],
      datasets: [{
        label: 'Hadir',
        data: res.data || [],
        borderColor: '#800000',
        backgroundColor: 'rgba(128,0,0,0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: { responsive: true, maintainAspectRatio: true }
  });
}

async function renderDataAbsensi() {
  const today = new Date().toISOString().split('T')[0];
  const res = await apiCall('get_rekap_admin', { unit: isSuper? 'all' : currentAdmin.Unit_Kerja, bulan: today.substring(0,7) });
  rekapData = res.data || [];
  app.innerHTML = `
  <div class="flex h-screen">
    ${getSidebar('absensi')}
    <div class="flex-1 p-8 overflow-auto">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="font-header font-bold text-3xl text-gray-800">Data Absensi</h2>
          <p class="text-gray-500">Kelola & export data kehadiran</p>
        </div>
        <button onclick="exportExcel()" class="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2">
          <i class="ri-file-excel-2-line"></i> Export Excel
        </button>
      </div>
      <div class="bg-white p-4 rounded-xl shadow mb-6 flex gap-4">
        <input type="date" id="filterTgl" value="${today}" class="border-2 border-gray-200 p-2 rounded-lg">
        <select id="filterUnit" class="border-2 border-gray-200 p-2 rounded-lg ${isSuper? '' : 'hidden'}">
          <option value="all">Semua Unit</option>
        </select>
        <button onclick="loadRekapFilter()" class="bg-[#800000] text-white px-6 py-2 rounded-lg font-bold">Filter</button>
      </div>
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="p-4 text-left text-sm font-bold text-gray-600">Tanggal</th>
              <th class="p-4 text-left text-sm font-bold text-gray-600">Nama</th>
              <th class="p-4 text-left text-sm font-bold text-gray-600">Unit</th>
              <th class="p-4 text-left text-sm font-bold text-gray-600">Masuk</th>
              <th class="p-4 text-left text-sm font-bold text-gray-600">Pulang</th>
              <th class="p-4 text-left text-sm font-bold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody id="tabelRekap">
            ${renderTabelRekap(rekapData)}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  `;
}

function renderTabelRekap(data) {
  if (data.length === 0) return '<tr><td colspan="6" class="p-8 text-center text-gray-400">Tidak ada data</td></tr>';
  return data.map(r => `
    <tr class="border-b hover:bg-gray-50">
      <td class="p-4 text-sm">${escapeHtml(r.Tanggal)}</td>
      <td class="p-4 font-semibold">${escapeHtml(r.Nama)}</td>
      <td class="p-4 text-sm">${escapeHtml(r.Unit_Kerja || '-')}</td>
      <td class="p-4 text-sm">${escapeHtml(r['Jam Masuk'] || '-')}</td>
      <td class="p-4 text-sm">${escapeHtml(r['Jam Pulang'] || '-')}</td>
      <td class="p-4">
        <span class="px-3 py-1 rounded-full text-xs font-bold ${r.Status === 'Hadir'? 'bg-green-100 text-green-700' : r.Status === 'Terlambat'? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}">
          ${escapeHtml(r.Status)}
        </span>
      </td>
    </tr>
  `).join('');
}

async function loadRekapFilter() {
  const tgl = document.getElementById('filterTgl').value;
  const unit = document.getElementById('filterUnit')? document.getElementById('filterUnit').value : 'all';
  const res = await apiCall('get_rekap_admin', { unit: isSuper? unit : currentAdmin.Unit_Kerja, bulan: tgl.substring(0,7) });
  rekapData = res.data || [];
  document.getElementById('tabelRekap').innerHTML = renderTabelRekap(rekapData);
}

function exportExcel() {
  const ws = XLSX.utils.json_to_sheet(rekapData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi');
  XLSX.writeFile(wb, `Rekap_Absensi_${new Date().toISOString().split('T')[0]}.xlsx`);
  showToast('Excel berhasil didownload!', 'success');
}
// === AKHIR BAGIAN 2 ===
// === BAGIAN 3: KELOLA USER & INIT ===
async function renderKelolaUser() {
  const res = await apiCall('get_all_user', { unit: isSuper? 'all' : currentAdmin.Unit_Kerja });
  allUser = res.data || [];
  app.innerHTML = `
  <div class="flex h-screen">
    ${getSidebar('user')}
    <div class="flex-1 p-8 overflow-auto">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="font-header font-bold text-3xl text-gray-800">Kelola User</h2>
          <p class="text-gray-500">Tambah, edit, hapus karyawan</p>
        </div>
        <button onclick="showModalUser()" class="bg-[#800000] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#a00000] flex items-center gap-2">
          <i class="ri-user-add-line"></i> Tambah User
        </button>
      </div>
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="p-4 text-left text-sm font-bold text-gray-600">NIP</th>
              <th class="p-4 text-left text-sm font-bold text-gray-600">Nama</th>
              <th class="p-4 text-left text-sm font-bold text-gray-600">Jabatan</th>
              <th class="p-4 text-left text-sm font-bold text-gray-600">Unit</th>
              <th class="p-4 text-left text-sm font-bold text-gray-600">Role</th>
              <th class="p-4 text-center text-sm font-bold text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${allUser.map(u => `
              <tr class="border-b hover:bg-gray-50">
                <td class="p-4 text-sm">${escapeHtml(u.NIP || '-')}</td>
                <td class="p-4 font-semibold">${escapeHtml(u.Nama)}</td>
                <td class="p-4 text-sm">${escapeHtml(u.Jabatan || '-')}</td>
                <td class="p-4 text-sm">${escapeHtml(u.Unit_Kerja || '-')}</td>
                <td class="p-4"><span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">${escapeHtml(u.Role || 'Satpam')}</span></td>
                <td class="p-4 text-center">
                  <button onclick="editUser('${u.NIP}')" class="text-blue-600 hover:text-blue-800 mr-3"><i class="ri-edit-line text-xl"></i></button>
                  <button onclick="hapusUser('${u.NIP}')" class="text-red-600 hover:text-red-800"><i class="ri-delete-bin-line text-xl"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <div id="modalUser" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-6 w-full max-w-md">
      <h3 class="font-header font-bold text-xl mb-4" id="modalTitle">Tambah User</h3>
      <input type="hidden" id="editNIP">
      <input id="inputNIP" type="text" placeholder="NIP" class="w-full border-2 border-gray-200 p-3 rounded-lg mb-3">
      <input id="inputNama" type="text" placeholder="Nama Lengkap" class="w-full border-2 border-gray-200 p-3 rounded-lg mb-3">
      <input id="inputUsername" type="text" placeholder="Username" class="w-full border-2 border-gray-200 p-3 rounded-lg mb-3">
      <input id="inputPassword" type="password" placeholder="Password" class="w-full border-2 border-gray-200 p-3 rounded-lg mb-3">
      <input id="inputJabatan" type="text" placeholder="Jabatan" class="w-full border-2 border-gray-200 p-3 rounded-lg mb-3">
      <input id="inputUnit" type="text" placeholder="Unit Kerja" class="w-full border-2 border-gray-200 p-3 rounded-lg mb-3">
      <select id="inputRole" class="w-full border-2 border-gray-200 p-3 rounded-lg mb-4">
        <option value="Satpam">Satpam</option>
        <option value="Admin">Admin</option>
        ${isSuper? '<option value="Super Admin">Super Admin</option>' : ''}
      </select>
      <div class="flex gap-3">
        <button onclick="closeModalUser()" class="flex-1 bg-gray-200 text-gray-700 p-3 rounded-lg font-bold">Batal</button>
        <button onclick="saveUser()" class="flex-1 bg-[#800000] text-white p-3 rounded-lg font-bold">Simpan</button>
      </div>
    </div>
  </div>
  `;
}

function showModalUser(user = null) {
  document.getElementById('modalUser').classList.remove('hidden');
  if (user) {
    document.getElementById('modalTitle').innerText = 'Edit User';
    document.getElementById('editNIP').value = user.NIP;
    document.getElementById('inputNIP').value = user.NIP;
    document.getElementById('inputNama').value = user.Nama;
    document.getElementById('inputUsername').value = user.Username;
    document.getElementById('inputJabatan').value = user.Jabatan;
    document.getElementById('inputUnit').value = user.Unit_Kerja;
    document.getElementById('inputRole').value = user.Role;
  } else {
    document.getElementById('modalTitle').innerText = 'Tambah User';
  }
}

function closeModalUser() {
  document.getElementById('modalUser').classList.add('hidden');
  document.querySelectorAll('#modalUser input').forEach(i => i.value = '');
}

async function saveUser() {
  const data = {
    NIP: document.getElementById('inputNIP').value,
    Nama: document.getElementById('inputNama').value,
    Username: document.getElementById('inputUsername').value,
    Password: document.getElementById('inputPassword').value,
    Jabatan: document.getElementById('inputJabatan').value,
    Unit_Kerja: document.getElementById('inputUnit').value,
    Role: document.getElementById('inputRole').value
  };
  if (!data.Nama ||!data.Username) {
    showToast('Nama & Username wajib diisi', 'error');
    return;
  }
  const action = document.getElementById('editNIP').value? 'update_user_admin' : 'add_user';
  const res = await apiCall(action, { user: data });
  if (res.status === 'success') {
    showToast('User berhasil disimpan!', 'success');
    closeModalUser();
    renderKelolaUser();
  } else {
    showToast(res.msg, 'error');
  }
}

async function hapusUser(nip) {
  if (!confirm('Yakin hapus user ini?')) return;
  const res = await apiCall('delete_user', { nip });
  if (res.status === 'success') {
    showToast('User dihapus', 'success');
    renderKelolaUser();
  }
}

function editUser(nip) {
  const user = allUser.find(u => u.NIP === nip);
  showModalUser(user);
}

function renderKelolaPos() { showToast('Fitur Kelola Pos segera hadir', 'warning'); }
function renderSetting() { showToast('Fitur Setting segera hadir', 'warning'); }

(function init() {
  if (currentAdmin) renderDashboard();
  else renderLoginAdmin();
})();
// === AKHIR BAGIAN 3 ===
