const CACHE_NAME = 'absensi-v2';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './logo.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  // Jangan cache Google Script API
  if (e.request.url.includes('script.google.com')) return;
  
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => {
      if (e.request.mode === 'navigate') return caches.match('./index.html');
    }))
  );
});

self.addEventListener('sync', e => {
  if (e.tag === 'sync-absen') e.waitUntil(syncAbsenData());
});

async function syncAbsenData() {
  const db = await openDB();
  const tx = db.transaction('absen_queue', 'readonly');
  const allData = await tx.objectStore('absen_queue').getAll();
  
  for (const data of allData) {
    try {
      const res = await fetch('https://script.google.com/macros/s/AKfycbwhx18lwhm5pfx_NQXwMUn8Jp5wUwiCIUdQsaM5keeJvJDpmef927M45ToDDm5vpsN1/exec', {
        method: 'POST',
        body: JSON.stringify(data.payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      const result = await res.json();
      if (result.status === 'success') {
        const delTx = db.transaction('absen_queue', 'readwrite');
        await delTx.objectStore('absen_queue').delete(data.id);
        
        // Cek permission dulu sebelum show notif
        const permission = await self.registration.pushManager.permissionState({userVisibleOnly: true});
        if (permission === 'granted') {
          self.registration.showNotification('Data Terkirim', { 
            body: `Absen ${data.payload.nama} berhasil sync`, 
            icon: './logo.png' 
          }).catch(()=>{});
        }
      }
    } catch (e) { console.log('Sync error:', e); }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('AbsensiDB', 1);
    r.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('absen_queue')) {
        db.createObjectStore('absen_queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    r.onsuccess = e => resolve(e.target.result);
    r.onerror = e => reject(e.target.error);
  });
}
