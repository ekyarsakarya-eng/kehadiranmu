const API_URL = 'https://script.google.com/macros/s/AKfycbykNYbs54O1BSmAn7qcjqBpYfaGekM9WLaQ505JkJsLtJ-kU3InUrwHIP-ikWiDU_7x/exec';
const app = document.getElementById('app');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let alamat = 'Mengambil lokasi...';
let jamRealTime;

function startClock() {
  clearInterval(jamRealTime);
  jamRealTime = setInterval(() => {
    const el = document.getElementById('jam');
    if(el) el.innerText = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }, 1000);
}

async function getAlamat(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const data = await res.json();
    alamat = data.display_name || `${lat}, ${lon}`;
  } catch { alamat = `${lat}, ${lon}`; }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2000);
}

function renderLogin() {
  app.innerHTML = `
  <div class="flex items-center justify-center h-screen bg-blue-600">
    <div class="bg-white p-8 rounded-xl shadow-lg w-11/12 max-w-sm">
      <div class="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
        <i class="ri-building-2-fill text-4xl text-blue-600"></i>
      </div>
      <h1 class="text-xl font-bold text-center mb-6">Sistem Absensi</h1>
      <input id="username" type="text" placeholder="Username" class="w-full border p-3 rounded-lg mb-3">
      <input id="password" type="password" placeholder="Password" class="w-full border p-3 rounded-lg mb-3">
      <button onclick="login()" class="w-full bg-blue-600 text-white p-3 rounded-lg font-bold">Login</button>
      <p id="err" class="text-red-500 text-sm mt-2 text-center"></p>
    </div>
  </div>`;
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('err');
  errEl.innerText = 'Login...';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ action: 'login', username, password }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    
    const data = await res.json();
    if (data.status === 'success') {
      user = data.data;
      localStorage.setItem('user', JSON.stringify(user));
      renderDashboard();
    } else {
      errEl.innerText = data.msg || 'Login gagal';
    }
  } catch (e) {
    console.error(e);
    errEl.innerText = 'Gagal konek ke server. Cek API_URL.';
  }
}

async function renderDashboard() {
  const res = await fetch(API_URL, { 
    method: 'POST', 
    redirect: 'follow',
    body: JSON.stringify({ action: 'get_dashboard', nama: user.nama }),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  });
  const data = await res.json();
  
  const logo = user.logo_url 
    ? `<img src="${user.logo_url}" class="w-10 h-10 object-contain" alt="logo" onerror="this.src='icon-192.png'">` 
    : `<i class="ri-building-2-fill text-3xl text-blue-600"></i>`;

  app.innerHTML = `
  <div class="bg-white pb-24 min-h-screen">
    <div class="p-4 flex justify-between items-center">
      <div class="flex items-center gap-3">
        ${logo}
        <span class="font-bold text-lg">${user.company_name}</span>
      </div>
      <div class="flex gap-5 text-2xl text-gray-500">
        <i class="ri-notification-3-line"></i>
        <i class="ri-menu-line"></i>
      </div>
    </div>
    
    <div class="px-4 text-gray-800 text-base flex items-center gap-1 mb-3">
      <i class="ri-map-pin-line"></i>
      <span class="uppercase font-semibold">${user.lokasi} - 50132</span>
    </div>

    <div class="mx-4 bg-blue-600 text-white p-4 rounded-2xl shadow-lg">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center">
          <i class="ri-user-fill text-blue-600 text-3xl"></i>
        </div>
        <div class="flex-1">
          <p class="font-bold text-lg leading-tight">${user.nama}</p>
          <p class="text-sm opacity-90">${user.nip} &nbsp;&nbsp; ${user.jabatan}</p>
        </div>
      </div>
      
      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="flex items-center gap-2 justify-start">
          <div class="bg-green-500 p-1.5 rounded-lg"><i class="ri-file-list-3-fill text-xl"></i></div>
          <div class="text-left">
            <p class="text-xs opacity-80">Shift</p>
            <p class="font-bold">N/A</p>
          </div>
        </div>
        <div class="flex items-center gap-2 justify-center">
          <div class="bg-teal-400 p-1.5 rounded-lg"><i class="ri-time-fill text-xl"></i></div>
          <div class="text-left">
            <p class="text-xs opacity-80">Masuk</p>
            <p class="font-bold">${data.jamMasuk}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 justify-end">
          <div class="bg-yellow-400 p-1.5 rounded-lg"><i class="ri-timer-fill text-xl"></i></div>
          <div class="text-left">
            <p class="text-xs opacity-80">Pulang</p>
            <p class="font-bold">${data.jamPulang}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="px-6 mt-8 menu-grid text-sm text-gray-700 font-medium">
      <div class="menu-item" onclick="renderAbsen()">
        <div class="icon-box text-blue-600"><i class="ri-calendar-check-fill"></i></div>
        <span>Absensi</span>
      </div>
      <div class="menu-item" onclick="showToast('Fitur Izin Coming Soon')">
        <div class="icon-box text-orange-500"><i class="ri-mail-add-fill"></i></div>
        <span>Izin</span>
      </div>
      <div class="menu-item" onclick="showToast('Fitur Cuti Coming Soon')">
        <div class="icon-box text-blue-500"><i class="ri-briefcase-4-fill"></i></div>
        <span>Cuti</span>
      </div>
      <div class="menu-item" onclick="showToast('Fitur Lembur Coming Soon')">
        <div class="icon-box text-gray-800"><i class="ri-time-fill"></i></div>
        <span>Lembur</span>
      </div>
      <div class="menu-item" onclick="showToast('Fitur Shift Coming Soon')">
        <div class="icon-box text-purple-600"><i class="ri-exchange-fill"></i></div>
        <span>Shift</span>
      </div>
      <div class="menu-item" onclick="renderRekap()">
        <div class="icon-box text-teal-500"><i class="ri-file-list-2-fill"></i></div>
        <span>Lihat Absen</span>
      </div>
      <div class="menu-item" onclick="showToast('Fitur Patroli Coming Soon')">
        <div class="icon-box text-gray-900"><i class="ri-shield-star-fill"></i></div>
        <span>Patroli</span>
      </div>
      <div class="menu-item" onclick="showToast('Fitur Slip Gaji Coming Soon')">
        <div class="icon-box text-orange-400"><i class="ri-sun-fill"></i></div>
        <span>Slip Gaji</span>
      </div>
      <div class="menu-item" onclick="showToast('Fitur Dinas Coming Soon')">
        <div class="icon-box text-blue-500"><i class="ri-bus-2-fill"></i></div>
        <span>Dinas</span>
      </div>
      <div class="menu-item" onclick="showToast('Fitur Performance Coming Soon')">
        <div class="icon-box text-teal-600"><i class="ri-bar-chart-2-fill"></i></div>
        <span>Performance</span>
      </div>
    </div>

    <div class="fixed bottom-0 w-full bg-white border-t flex justify-around py-2 text-gray-500 text-xs">
      <div class="text-blue-600 text-center"><i class="ri-home-5-fill text-2xl"></i><p>Home</p></div>
      <div class="text-center" onclick="showToast('Coming Soon')"><i class="ri-building-2-line text-2xl"></i><p>Company</p></div>
      <div class="text-center" onclick="showToast('Coming Soon')"><i class="ri-information-line text-2xl"></i><p>About</p></div>
      <div class="text-center" onclick="logout()"><i class="ri-user-line text-2xl"></i><p>Account</p></div>
    </div>
  </div>`;
}

function renderAbsen() {
  navigator.geolocation.getCurrentPosition(pos => {
    getAlamat(pos.coords.latitude, pos.coords.longitude);
    showAbsenScreen(pos.coords.latitude, pos.coords.longitude);
  }, () => alert('Aktifkan GPS untuk absen'));
}

function showAbsenScreen(lat, lon) {
  app.innerHTML = `
  <div class="bg-white h-screen">
    <div class="p-4 flex items-center gap-4 border-b">
      <i class="ri-arrow-left-s-line text-2xl" onclick="renderDashboard()"></i><h1 class="text-lg font-bold">Absen</h1>
    </div>
    <div class="p-6 text-center">
      <p class="text-sm text-gray-600">${alamat}</p>
      <p id="jam" class="text-5xl font-bold my-2">00:00</p>
      <p class="text-gray-600">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
      <div class="my-8">
        <label for="fotoInput">
          <div id="preview" class="w-48 h-48 mx-auto bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
            <i class="ri-camera-add-line text-6xl text-gray-400"></i>
          </div>
        </label>
        <input type="file" id="fotoInput" accept="image/*" capture="user" class="hidden">
      </div>
      <div class="flex w-40 mx-auto rounded-lg overflow-hidden border border-blue-500">
        <button id="btnIn" class="flex-1 py-2 bg-blue-600 text-white" onclick="setTipe('IN')">IN</button>
        <button id="btnOut" class="flex-1 py-2" onclick="setTipe('OUT')">OUT</button>
      </div>
      <button onclick="submitAbsen(${lat}, ${lon})" class="w-full bg-blue-600 text-white p-4 rounded-xl mt-8 font-bold text-lg">Submit</button>
      <p id="status" class="mt-4 font-bold"></p>
    </div>
  </div>`;

  startClock();
  let tipe = 'IN';
  window.setTipe = (t) => {
    tipe = t;
    document.getElementById('btnIn').className = t==='IN'? 'flex-1 py-2 bg-blue-600 text-white' : 'flex-1 py-2';
    document.getElementById('btnOut').className = t==='OUT'? 'flex-1 py-2 bg-blue-600 text-white' : 'flex-1 py-2';
  };
  document.getElementById('fotoInput').onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('preview').innerHTML = `<img src="${reader.result}" class="w-48 h-48 rounded-full object-cover">`;
      window.fotoBase64 = reader.result;
    };
    reader.readAsDataURL(file);
  };
  window.submitAbsen = async (lat, lon) => {
    const status = document.getElementById('status');
    if (!window.fotoBase64) return status.innerText = 'Foto selfie wajib!', status.className='text-red-500';
    status.innerText = 'Mengirim...'; status.className='text-blue-500';
    const res = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
      body: JSON.stringify({ action: 'absen', nama: user.nama, lokasiWajib: user.lokasi, lat, lon, foto: window.fotoBase64, tipe }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const data = await res.json();
    status.innerText = data.msg;
    status.className = data.status === 'success'? 'text-green-600' : 'text-red-600';
    if(data.status === 'success') setTimeout(renderDashboard, 2000);
  };
}

async function renderRekap() {
  const res = await fetch(API_URL, { 
    method: 'POST', 
    redirect: 'follow',
    body: JSON.stringify({ action: 'get_rekap', nama: user.nama }),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  });
  const data = await res.json();
  let html = `<div class="bg-white min-h-screen pb-20"><div class="p-4 flex items-center gap-4 border-b sticky top-0 bg-white">
    <i class="ri-arrow-left-s-line text-2xl" onclick="renderDashboard()"></i><h1 class="text-lg font-bold">Rekap Absen</h1></div><div class="p-4">`;
  data.data.slice(0, 30).forEach(r => {
    html += `<div class="border-b py-3 text-sm">
      <div class="flex justify-between"><b>${r.tanggal}</b><span class="text-gray-500">${r.durasi || '-'}</span></div>
      <div class="text-gray-600 mt-1">Masuk: ${r.masuk} | Pulang: ${r.pulang || '-'} | ${r.lokasi}</div>
    </div>`;
  });
  app.innerHTML = html + '</div></div>';
}

function logout() {
  localStorage.removeItem('user');
  user = null;
  renderLogin();
}

user ? renderDashboard() : renderLogin();
