+ err.message, 'error');
  }
}

function ambilFotoKejadian() {
  const video = document.getElementById('cameraKejadian');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const maxSize = 800;
  let width = video.videoWidth;
  let height = video.videoHeight;
  if (width > height) {
    if (width > maxSize) {
      height = height * (maxSize / width);
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width = width * (maxSize / height);
      height = maxSize;
    }
  }
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(video, 0, 0, width, height);
  kejadianFoto = canvas.toDataURL('image/jpeg', 0.6);
  const preview = document.getElementById('previewKejadian');
  preview.src = kejadianFoto;
  preview.classList.remove('hidden');
  video.classList.add('hidden');
  document.getElementById('btnCaptureKejadian').classList.add('hidden');
  document.getElementById('btnSubmitKejadian').disabled = false;
  if (absenStream) {
    absenStream.getTracks().forEach(track => track.stop());
    absenStream = null;
  }
  showToast('Foto siap!', 'success');
}

async function submitKejadian() {
  if (!kejadianFoto) {
    showToast('Ambil foto dulu!', 'error');
    return;
  }
  const jenis = document.getElementById('jenisKejadian').value;
  const deskripsi = document.getElementById('deskripsiKejadian').value;
  if (!deskripsi) {
    showToast('Deskripsi wajib diisi!', 'error');
    return;
  }
  const btn = document.getElementById('btnSubmitKejadian');
  btn.disabled = true;
  btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Mengirim...';

  let lat = null, lon = null;
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
    });
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
  } catch (e) {}

  const res = await apiCall('lapor_kejadian', {
    nama: currentUser.Nama.trim(),
    jenis: jenis,
    deskripsi: deskripsi,
    urgensi: urgensiKejadian,
    foto: kejadianFoto,
    latitude: lat,
    longitude: lon,
    unit_kerja: currentUser.Unit_Kerja
  });

  if (res.status === 'success') {
    showToast(res.msg, 'success');
    setTimeout(() => renderHome(), 800);
  } else {
    btn.disabled = false;
    btn.innerHTML = '<i class="ri-alarm-warning-line"></i> Kirim Laporan Darurat';
    showToast(res.msg, 'error');
  }
}

// === INIT ===
(function init() {
  applyDarkMode();
  currentUser? renderHome() : renderLogin();
})();
