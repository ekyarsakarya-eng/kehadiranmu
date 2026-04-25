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
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">Lokasi</label><input id="Lokasi" value="${currentUser.Lokasi || ''}" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">Perusahaan</label><input id="Perusahaan" value="${currentUser.Perusahaan || ''}" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">Alamat</label><input id="Alamat" value="${currentUser.Alamat || ''}" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">No. Telpon</label><input id="No_Tlpn" value="${currentUser.No_Tlpn || ''}" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">Email</label><input id="Email" value="${currentUser.Email || ''}" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
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
    <div class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-[#800000]"></div>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-3">Memuat data...</p>
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
      <div class="text-center py-12 text-gray-400 dark:text-gray-600">
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
        const lokasi = r.Lokasi || '-';
        const lat = r.Latitude || '';
        const lon = r.Longitude || '';

        return `
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md active:scale-[0.98]"
             onclick="toggleDetail(${idx})">
          <div class="p-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-lg ${isAlpha? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'} flex items-center justify-center flex-shrink-0">
                <i class="ri-${isAlpha? 'close' : 'check'}-line text-2xl ${isAlpha? 'text-red-600' : 'text-green-600'}"></i>
              </div>
              <div>
                <p class="font-bold text-gray-800 dark:text-white">${formatTanggal(r.Tanggal)}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${isAlpha? 'Tidak Hadir' : 'Hadir'}</p>
              </div>
            </div>
            <i id="arrow-${idx}" class="ri-arrow-down-s-line text-2xl text-gray-400 transition-transform"></i>
          </div>

          <div id="detail-${idx}" class="hidden bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 px-4 py-3">
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
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Lokasi Absen</p>
                  <p class="text-sm text-gray-800 dark:text-white mb-2">${lokasi}</p>
                  ${lat && lon? `
                  <button onclick="event.stopPropagation(); window.open('https://www.google.com/maps?q=${lat},${lon}', '_blank')"
                          class="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition">
                    <i class="ri-map-2-line"></i> Buka di Maps
                  </button>
                  ` : ''}
                </div>
              </div>
            </div>
            ` : ''}
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
  applyDarkMode();
  currentUser? renderHome() : renderLogin();
})();
