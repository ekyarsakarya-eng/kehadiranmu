const API_URL = 'https://script.google.com/macros/s/GANTI_DENGAN_URL_KAMU/exec';
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
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', username, password }) });
  const data = await res.json();
  if (data.status === 'success') {
    user = data.data;
    localStorage.setItem('user', JSON.stringify(user));
    renderDashboard();
  } else {
    document.getElementById('err').innerText = data.msg;
  }
}

async function renderDashboard() {
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_dashboard', nama: user.nama }) });
  const data = await res.json();
  const logo = user.logo_url? `<img src="${user.logo_url}" class="w-10 h-10 object-contain" alt="logo">` : `<i class="ri-building-2-fill text-2xl text-blue-600"></i>`;

  app.innerHTML = `
  <div class="bg-white pb-20">
    <div class="p-4 flex justify-between items-center">
      <div class="flex items-center gap-2">${logo}<span class="font-bold text-sm">${user.company_name}</span></div>
      <div class="flex gap-4 text-xl text-gray-600"><i class="ri-notification-3-line"></i><i class="ri-menu-line"></i></div>
    </div>
    <div class="px-4 text-gray-600 text-sm flex items-center gap-1"><i class="ri-map-pin-line"></i><span>${user.lokasi} - 50132</span></div>
    <div class="m-4 bg-blue-600 text-white p-4 rounded-2xl">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center"><i class="ri-user-fill text-blue-600 text-2xl"></i></div>
        <div class="flex-1"><p class="font-bold text-sm">${user.nama}</p><p class="text-xs opacity-80">${user.nip} &nbsp;&nbsp; ${user.jabatan}</p></div>
      </div>
      <div class="flex justify-between mt-4 text-center text-xs">
        <div><i class="ri-file-list-3-line text-xl"></i><p>Shift</p><p>N/A</p></div>
        <div><i class="ri-time-line text-xl"></i><p>Masuk</p><p>${data.jamMasuk}</p></div>
        <div><i class="ri-timer-line text-xl text-yellow-300"></i><p>Pulang</p><p>${data.jamPulang}</p></div>
      </div>
    <div class="px-4 menu-grid text-xs text-gray-700">
      <div class="menu-item" onclick="renderAbsen()"><i class="ri-calendar-check-line text-blue-600"></i><span>Absensi</span></div>
      <div class="menu-item"><i class="ri-mail-add-line text-orange-500"></i><span>Izin</span></div>
      <div class="menu-item"><i class="ri-briefcase-line text-blue-500"></i><span>Cuti</span></div>
      <div class="menu-item"><i class="ri-time-line text-purple-800"></i><span>Lembur</span></div>
      <div class="menu-item"><i class="ri-exchange-line text-purple-600"></i><span>Shift</span></div>
      <div class="menu-item" onclick="renderRekap()"><i class="ri-file-list-2-line text-teal-500"></i><span>Lihat Absen</span></div>
      <div class="menu-item"><i class="ri-shield-star-line"></i><span>Patroli</span></div>
      <div class="menu-item"><i class="ri-wallet-3-line text-orange-400"></i><span>Slip Gaji</span></div>
      <div class="menu-item"><i class="ri-bus-line text-blue-500"></i><span>Dinas</span></div>
      <div class="menu-item"><i class="ri-bar-chart-line text-teal-600"></i><span>Performance</span></div>
    </div>
    <div class="fixed bottom-0 w-full bg-white border-t flex justify-around py-2 text-gray-500 text-xs">
      <div class="text-blue-600 text-center"><i class="ri-home-5-fill text-xl"></i><p>Home</p></div>
      <div class="text-center"><i class="ri-building-2-line text-xl"></i><p>Company</p></div>
      <div class="text-center"><i class="ri-information-line text-xl"></i><p>About</p></div>
      <div class="text-center" onclick="logout()"><i class="ri-user-line text-xl"></i><p>Account</p></div>
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
        <button id="btnIn" class="flex-1 py-2 toggle-in" onclick="setTipe('IN')">IN</button>
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
    document.getElementById('btnIn').className = t==='IN'? 'flex-1 py-2 toggle-in' : 'flex-1 py-2';
    document.getElementById('btnOut').className = t==='OUT'? 'flex-1 py-2 toggle-in' : 'flex-1 py-2';
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
      body: JSON.stringify({ action: 'absen', nama: user.nama, lokasiWajib: user.lokasi, lat, lon, foto: window.fotoBase64, tipe })
    });
    const data = await res.json();
    status.innerText = data.msg;
    status.className = data.status === 'success'? 'text-green-600' : 'text-red-600';
    if(data.status === 'success') setTimeout(renderDashboard, 2000);
  };
}

async function renderRekap() {
  const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'get_rekap', nama: user.nama }) });
  const data = await res.json();
  let html = `<div class="bg-white h-screen"><div class="p-4 flex items-center gap-4 border-b">
    <i class="ri-arrow-left-s-line text-2xl" onclick="renderDashboard()"></i><h1 class="text-lg font-bold">Rekap Absen</h1></div><div class="p-4">`;
  data.data.slice(0, 20).forEach(r => {
    html += `<div class="border-b py-3 text-sm">
      <b>${r.tanggal}</b><br>Masuk: ${r.masuk} | Pulang: ${r.pulang || '-'}<br>Durasi: ${r.durasi || '-'} | ${r.lokasi}
    </div>`;
  });
  app.innerHTML = html + '</div></div>';
}

function logout() {
  localStorage.removeItem('user');
  user = null;
  renderLogin();
}

user? renderDashboard() : renderLogin();
