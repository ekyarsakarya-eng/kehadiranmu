    </div>
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-4">
      <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">1. Pilih Pos Patroli</label>
      <select id="selectPos" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-lg font-semibold focus:border-green-600 focus:outline-none mb-4">
        <option value="">Loading pos...</option>
      </select>
      <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">2. Ambil Foto Bukti</label>
      <div class="relative w-full h-48 mb-3 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
        <video id="cameraPatroli" class="w-full h-full object-cover hidden" autoplay playsinline></video>
        <img id="previewPatroli" class="w-full h-full object-cover hidden" />
        <button onclick="startCameraPatroli()" id="btnBukaKamera" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <i class="ri-camera-line text-4xl"></i>
          <p class="text-sm font-semibold">Tap untuk buka kamera</p>
        </button>
        <button onclick="ambilFotoPatroli()" id="btnCapturePatroli" class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 px-6 py-2 rounded-full font-bold text-gray-800 shadow-lg hidden">
          <i class="ri-camera-fill"></i> Ambil Foto
        </button>
      </div>
      <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">3. Keterangan (Opsional)</label>
      <textarea id="ketPatroli" placeholder="Contoh: Kondisi aman, pintu terkunci" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-lg focus:border-green-600 focus:outline-none mb-4" rows="2"></textarea>
      <button onclick="submitPatroli()" id="btnSubmitPatroli" class="w-full bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed" disabled>
        <i class="ri-check-line"></i> Submit Check-in Pos
      </button>
    </div>
    <button onclick="renderLaporKejadian()" class="w-full bg-orange-500 text-white p-4 rounded-xl font-bold shadow-lg active:scale-95 transition flex items-center justify-center gap-2">
      <i class="ri-alarm-warning-line text-xl"></i> Lapor Kejadian Darurat
    </button>
  </div>
  ${renderBottomNav('home')}
  `;
  applyDarkMode();
  const resPos = await apiCall('get_pos_patroli');
  const selectPos = document.getElementById('selectPos');
  if (resPos.status === 'success' && resPos.data.length > 0) {
    selectPos.innerHTML = '<option value="">-- Pilih Pos --</option>';
    resPos.data.forEach(pos => {
      selectPos.innerHTML += `<option value="${pos.id}" data-lat="${pos.lat}" data-lon="${pos.lon}">${pos.nama}</option>`;
    });
  } else {
    selectPos.innerHTML = '<option value="">Tidak ada pos aktif</option>';
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    document.getElementById('lokasiPatroli').innerHTML = `<i class="ri-map-pin-line"></i> Lokasi: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }, () => {
    document.getElementById('lokasiPatroli').innerHTML = `<i class="ri-error-warning-line"></i> Gagal dapat lokasi`;
    showToast('GPS tidak aktif', 'error');
  });
}

async function startCameraPatroli() {
  try {
    absenStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const video = document.getElementById('cameraPatroli');
    video.srcObject = absenStream;
    video.classList.remove('hidden');
    document.getElementById('btnBukaKamera').classList.add('hidden');
    document.getElementById('btnCapturePatroli').classList.remove('hidden');
  } catch (err) {
    showToast('Kamera error: ' + err.message, 'error');
  }
}

function ambilFotoPatroli() {
  const video = document.getElementById('cameraPatroli');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  patroliFoto = canvas.toDataURL('image/jpeg', 0.8);
  const preview = document.getElementById('previewPatroli');
  preview.src = patroliFoto;
  preview.classList.remove('hidden');
  video.classList.add('hidden');
  document.getElementById('btnCapturePatroli').classList.add('hidden');
  document.getElementById('btnSubmitPatroli').disabled = false;
  if (absenStream) {
    absenStream.getTracks().forEach(track => track.stop());
    absenStream = null;
  }
  showToast('Foto berhasil diambil!', 'success');
}

async function submitPatroli() {
  const selectPos = document.getElementById('selectPos');
  const posId = selectPos.value;
  const posNama = selectPos.options[selectPos.selectedIndex].text;
  const ket = document.getElementById('ketPatroli').value;
  const btn = document.getElementById('btnSubmitPatroli');
  if (!posId) {
    showToast('Pilih pos patroli dulu!', 'error');
    return;
  }
  if (!patroliFoto) {
    showToast('Ambil foto bukti dulu!', 'error');
    return;
  }
  btn.disabled = true;
  btn.innerText = 'Mengirim...';
  let lat = null, lon = null;
  await new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(pos => {
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
      resolve();
    }, () => resolve());
  });
  const res = await apiCall('submit_patroli', {
    nama: currentUser.Nama.trim(),
    pos: posNama,
    foto: patroliFoto,
    latitude: lat,
    longitude: lon,
    keterangan: ket
  });
  if (res.status === 'success') {
    showToast(res.msg, 'success');
    setTimeout(() => renderPatroli(), 1000);
  } else {
    btn.disabled = false;
    btn.innerText = 'Submit Check-in Pos';
    showToast(res.msg, 'error');
  }
}

async function renderLaporKejadian() {
  stopAllStreams();
  kejadianFoto = null;
  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center gap-3 sticky top-0 z-50">
    <button onclick="renderPatroli()"><i class="ri-arrow-left-s-line text-2xl text-gray-900 dark:text-white"></i></button>
    <h1 class="text-xl font-bold text-gray-900 dark:text-white">Lapor Kejadian</h1>
  </div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-2xl p-5 shadow-xl mb-4">
      <div class="flex items-center gap-3 mb-2">
        <i class="ri-alarm-warning-line text-4xl"></i>
        <div>
          <p class="font-bold text-lg">Laporan Darurat</p>
          <p class="text-xs opacity-80">Laporkan kejadian mencurigakan</p>
        </div>
      </div>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4">
      <div>
        <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Jenis Kejadian</label>
        <select id="jenisKejadian" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-lg font-semibold focus:border-orange-500 focus:outline-none">
          <option value="">-- Pilih Jenis --</option>
          <option value="Tamu Mencurigakan">Tamu Mencurigakan</option>
          <option value="Kerusakan Fasilitas">Kerusakan Fasilitas</option>
          <option value="Kebakaran">Kebakaran</option>
          <option value="Pencurian">Pencurian</option>
          <option value="Keributan">Keributan</option>
          <option value="Lainnya">Lainnya</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Tingkat Urgensi</label>
        <div class="grid grid-cols-3 gap-2">
          <button onclick="setUrgensi('Rendah')" id="urgensiRendah" class="p-3 rounded-lg border-2 border-green-500 bg-green-500 text-white font-bold active:scale-95 transition">Rendah</button>
          <button onclick="setUrgensi('Sedang')" id="urgensiSedang" class="p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold active:scale-95 transition">Sedang</button>
          <button onclick="setUrgensi('Tinggi')" id="urgensiTinggi" class="p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold active:scale-95 transition">Tinggi</button>
        </div>
      </div>
      <div>
        <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Deskripsi Kejadian</label>
        <textarea id="deskripsiKejadian" placeholder="Jelaskan kronologi kejadian..." class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-lg focus:border-orange-500 focus:outline-none" rows="4"></textarea>
      </div>
      <div>
        <label class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Foto Bukti</label>
        <div class="relative w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
          <video id="cameraKejadian" class="w-full h-full object-cover hidden" autoplay playsinline></video>
          <img id="previewKejadian" class="w-full h-full object-cover hidden" />
          <button onclick="startCameraKejadian()" id="btnBukaKameraKejadian" class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
            <i class="ri-camera-line text-4xl"></i>
            <p class="text-sm font-semibold">Tap untuk buka kamera</p>
          </button>
          <button onclick="ambilFotoKejadian()" id="btnCaptureKejadian" class="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 px-6 py-2 rounded-full font-bold text-gray-800 shadow-lg hidden">
            <i class="ri-camera-fill"></i> Ambil Foto
          </button>
        </div>
      </div>
      <button onclick="submitKejadian()" id="btnSubmitKejadian" class="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition">
        <i class="ri-send-plane-fill"></i> Kirim Laporan
      </button>
    </div>
  </div>
  ${renderBottomNav('home')}
  `;
  applyDarkMode();
  window.urgensiKejadian = 'Rendah';
}

function setUrgensi(level) {
  urgensiKejadian = level;
  document.getElementById('urgensiRendah').className = level === 'Rendah'?
    'p-3 rounded-lg border-2 border-green-500 bg-green-500 text-white font-bold active:scale-95 transition' :
    'p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold active:scale-95 transition';
  document.getElementById('urgensiSedang').className = level === 'Sedang'?
    'p-3 rounded-lg border-2 border-yellow-500 bg-yellow-500 text-white font-bold active:scale-95 transition' :
    'p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold active:scale-95 transition';
  document.getElementById('urgensiTinggi').className = level === 'Tinggi'?
    'p-3 rounded-lg border-2 border-red-500 bg-red-500 text-white font-bold active:scale-95 transition' :
    'p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold active:scale-95 transition';
}

async function startCameraKejadian() {
  try {
    absenStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const video = document.getElementById('cameraKejadian');
    video.srcObject = absenStream;
    video.classList.remove('hidden');
    document.getElementById('btnBukaKameraKejadian').classList.add('hidden');
    document.getElementById('btnCaptureKejadian').classList.remove('hidden');
  } catch (err) {
    showToast('Kamera error: ' + err.message, 'error');
  }
}

function ambilFotoKejadian() {
  const video = document.getElementById('cameraKejadian');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  kejadianFoto = canvas.toDataURL('image/jpeg', 0.8);
  const preview = document.getElementById('previewKejadian');
  preview.src = kejadianFoto;
  preview.classList.remove('hidden');
  video.classList.add('hidden');
  document.getElementById('btnCaptureKejadian').classList.add('hidden');
  if (absenStream) {
    absenStream.getTracks().forEach(track => track.stop());
    absenStream = null;
  }
  showToast('Foto berhasil diambil!', 'success');
}

async function submitKejadian() {
  const jenis = document.getElementById('jenisKejadian').value;
  const deskripsi = document.getElementById('deskripsiKejadian').value;
  const btn = document.getElementById('btnSubmitKejadian');
  if (!jenis) {
    showToast('Pilih jenis kejadian dulu!', 'error');
    return;
  }
  if (!deskripsi) {
    showToast('Isi deskripsi kejadian!', 'error');
    return;
  }
  if (!kejadianFoto) {
    showToast('Ambil foto bukti dulu!', 'error');
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Mengirim...';
  let lat = null, lon = null;
  await new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(pos => {
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
      resolve();
    }, () => resolve());
  });
  const res = await apiCall('lapor_kejadian', {
    nama: currentUser.Nama.trim(),
    jenis: jenis,
    deskripsi: deskripsi,
    urgensi: urgensiKejadian,
    foto: kejadianFoto,
    latitude: lat,
    longitude: lon
  });
  if (res.status === 'success') {
    showToast(res.msg, 'success');
    setTimeout(() => renderPatroli(), 1000);
  } else {
    btn.disabled = false;
    btn.innerHTML = '<i class="ri-send-plane-fill"></i> Kirim Laporan';
    showToast(res.msg, 'error');
  }
}
// === AKHIR BAGIAN 3 ===
// === BAGIAN 4: REKAP, ACCOUNT, DARURAT & INIT ===
let rekapDataCache = [];
let rekapPage = 0;
const REKAP_PER_PAGE = 10;

async function renderRekap() {
  stopAllStreams();
  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-3 flex items-center gap-3 sticky top-0 z-50">
    <button onclick="renderHome()" class="text-2xl text-gray-600 dark:text-gray-300"><i class="ri-arrow-left-line"></i></button>
    <p class="font-bold text-lg text-gray-900 dark:text-white">Riwayat Absensi</p>
  </div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="mb-4">
      <select id="filterBulan" onchange="loadRekapData()" class="w-full p-3 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl font-bold">
        ${generateBulanOptions()}
      </select>
    </div>
    <div id="rekapContent">
      <div class="animate-pulse space-y-3">
        <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        <div class="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>
    </div>
  </div>
  ${renderBottomNav('home')}`;
  applyDarkMode();
  loadRekapData();
}

function generateBulanOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    options.push(`<option value="${val}" ${i===0?'selected':''}>${label}</option>`);
  }
  return options.join('');
}

async function loadRekapData() {
  const bulan = document.getElementById('filterBulan').value;
  const container = document.getElementById('rekapContent');
  container.innerHTML = `<div class="animate-pulse space-y-3">
    <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
    <div class="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
  </div>`;
  const res = await apiCall('get_rekap_user', { nama: currentUser.Nama.trim(), bulan });
  rekapDataCache = res.data || [];
  rekapPage = 0;
  renderRekapPage(true);
}

function renderRekapPage(reset = false) {
  const container = document.getElementById('rekapContent');
  const start = rekapPage * REKAP_PER_PAGE;
  const end = start + REKAP_PER_PAGE;
  const pageData = rekapDataCache.slice(start, end);
  if (reset) {
    if (rekapDataCache.length === 0) {
      container.innerHTML = `<div class="text-center py-10 text-gray-500 dark:text-gray-400">
        <i class="ri-file-list-3-line text-5xl mb-2"></i>
        <p>Belum ada data absensi bulan ini</p>
      </div>`;
      return;
    }
    container.innerHTML = `<div id="rekapList" class="space-y-3"></div>
      <div id="rekapLoadMore" class="text-center mt-4"></div>`;
  }
  const list = document.getElementById('rekapList');
  pageData.forEach(r => {
    const statusColor = r.Status === 'Hadir'? 'green' : r.Status === 'Terlambat'? 'yellow' : r.Status === 'Izin'? 'blue' : 'red';
    const statusIcon = r.Status === 'Hadir'? 'ri-checkbox-circle-fill' : r.Status === 'Terlambat'? 'ri-time-fill' : r.Status === 'Izin'? 'ri-mail-fill' : 'ri-close-circle-fill';
    list.innerHTML += `
    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <div class="flex justify-between items-start mb-2">
        <div>
          <p class="font-bold text-gray-900 dark:text-white">${r.Tanggal}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">${r.Durasi}</p>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-${statusColor}-100 dark:bg-${statusColor}-900 text-${statusColor}-700 dark:text-${statusColor}-300">
          <i class="${statusIcon}"></i> ${r.Status}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><p class="text-gray-500 dark:text-gray-400 text-xs">Masuk</p><p class="font-bold text-gray-900 dark:text-white">${r['Jam Masuk']}</p></div>
        <div><p class="text-gray-500 dark:text-gray-400 text-xs">Pulang</p><p class="font-bold text-gray-900 dark:text-white">${r['Jam Pulang']}</p></div>
      </div>
      ${r.Foto_IN? `<img src="${r.Foto_IN}" loading="lazy" class="w-full h-32 object-cover rounded-lg mt-2" />` : ''}
    </div>`;
  });
  const loadMore = document.getElementById('rekapLoadMore');
  if (end < rekapDataCache.length) {
    loadMore.innerHTML = `<button onclick="loadMoreRekap()" class="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold active:scale-95">Muat Lainnya</button>`;
  } else {
    loadMore.innerHTML = `<p class="text-xs text-gray-400">Semua data ditampilkan</p>`;
  }
}

function loadMoreRekap() {
  rekapPage++;
  renderRekapPage(false);
}

function renderAccount() {
  stopAllStreams();
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
  <div class="bg-white dark:bg-gray-800 shadow-sm p-4 text-center sticky top-0 z-50"><h1 class="text-xl font-bold text-gray-900 dark:text-white">Account</h1></div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="bg-gradient-to-br from-[#800000] to-[#a00000] rounded-2xl shadow-xl p-6 text-center mb-4 text-white">
      <img id="previewFoto" src="${foto}" class="w-24 h-24 rounded-full mx-auto mb-3 object-cover bg-white p-1 shadow-lg"
           onerror="this.src='https://placehold.co/96x96/800000/FFFFFF?text=U'">
      <input type="file" id="fotoInput" accept="image/*" class="hidden" onchange="previewFoto(event)">
      <button onclick="document.getElementById('fotoInput').click()" class="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg font-bold text-sm active:scale-95 transition">Ganti Foto</button>
      <p class="font-bold text-lg mt-3">${currentUser.Nama}</p>
      <p class="text-xs opacity-80">${currentUser.Jabatan || 'Karyawan'} | ${currentUser.NIP || '-'}</p>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 space-y-3">
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">Nama</label><input id="Nama" value="${currentUser.Nama || ''}" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">NIP</label><input id="NIP" value="${currentUser.NIP || ''}" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 bg-gray-100 dark:bg-gray-900" disabled></div>
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">Jabatan</label><input id="Jabatan" value="${currentUser.Jabatan || ''}" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
      <div><label class="text-xs text-gray-500 dark:text-gray-400 font-semibold">Unit Kerja</label><input id="Unit_Kerja" value="${currentUser.Unit_Kerja || ''}" class="w-full border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-xl mt-1 focus:border-[#800000] focus:outline-none"></div>
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
  ['Nama', 'Jabatan', 'Unit_Kerja', 'Password'].forEach(f => {
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

async function renderDarurat() {
  stopAllStreams();
  app.innerHTML = `
  <div class="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center gap-3 sticky top-0 z-50">
    <button onclick="renderHome()"><i class="ri-arrow-left-s-line text-2xl text-gray-900 dark:text-white"></i></button>
    <h1 class="text-xl font-bold text-gray-900 dark:text-white">Kontak Darurat</h1>
  </div>
  <div class="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
    <div class="bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl p-5 shadow-xl mb-4">
      <div class="flex items-center gap-3">
        <i class="ri-alarm-warning-line text-4xl"></i>
        <div>
          <p class="font-bold text-lg">Hubungi Anggota</p>
          <p class="text-xs opacity-80">Telpon atau WA langsung</p>
        </div>
      </div>
    </div>
    <div id="listDarurat" class="space-y-3">
      <div class="text-center py-8 text-gray-400">
        <i class="ri-loader-4-line animate-spin text-3xl"></i>
        <p class="text-sm mt-2">Memuat kontak...</p>
      </div>
    </div>
  </div>
  ${renderBottomNav('home')}
  `;
  applyDarkMode();
  const res = await apiCall('get_kontak_darurat', { unit: currentUser.Unit_Kerja });
  const listEl = document.getElementById('listDarurat');
  if (res.status === 'success' && res.data.length > 0) {
    listEl.innerHTML = res.data.map(k => `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <div>
            <p class="font-bold text-gray-900 dark:text-white">${k.nama}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${k.jabatan} | ${k.unit}</p>
          </div>
          <div class="text-xs font-bold text-gray-500 dark:text-gray-400">${k.no_hp}</div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <a href="tel:${k.no_hp}" class="bg-blue-500 text-white p-3 rounded-lg font-bold text-center active:scale-95 transition">
            <i class="ri-phone-fill"></i> Telpon
          </a>
          <a href="https://wa.me/62${k.no_hp.startsWith('0')? k.no_hp.slice(1) : k.no_hp}" target="_blank" class="bg-green-500 text-white p-3 rounded-lg font-bold text-center active:scale-95 transition">
            <i class="ri-whatsapp-fill"></i> WhatsApp
          </a>
        </div>
      </div>
    `).join('');
  } else {
    listEl.innerHTML = `<p class="text-center py-8 text-gray-400">Tidak ada kontak darurat</p>`;
  }
}

function comingSoon() {
  showToast('Fitur Izin segera hadir', 'warning');
}

// INIT
(function init() {
  applyDarkMode();
  currentUser? renderHome() : renderLogin();
})();
// === AKHIR BAGIAN 4 ===
