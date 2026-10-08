/*
 * Service Worker AkunJiBeNet — Tracking Personel Web-Native (tanpa build Android/iOS).
 *
 * Cara kerja:
 * - Saat aplikasi terbuka, posisi GPS dikirim langsung oleh halaman (App.tsx).
 * - Bila koneksi offline, titik GPS disimpan ke antrian IndexedDB (store 'antrian').
 * - Begitu koneksi kembali, Chrome membangunkan Service Worker ini lewat
 *   Background Sync (event 'sync') untuk mengunggah seluruh antrian ke server,
 *   WALAUPUN tab aplikasi sudah ditutup (selama browser masih berjalan).
 * - Periodic Background Sync (Chrome, bila situs dipasang ke layar utama / izin
 *   diberikan) membuat flush antrian juga berjalan berkala.
 *
 * Catatan: Service Worker tidak bisa membaca localStorage, sehingga antrian dan
 * konfigurasi (token + urlapi) disimpan di IndexedDB yang bisa diakses keduanya.
 */
const NAMA_DB = 'jibe-tracking';
const TAG_SYNC = 'sync-lokasi-personel';
const TAG_PERIODIK = 'sync-lokasi-personel-periodik';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function bukaDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NAMA_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('antrian')) {
        db.createObjectStore('antrian', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('konfig')) {
        db.createObjectStore('konfig', { keyPath: 'kunci' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function jalankan(store, mode, fn) {
  return bukaDb().then((db) => new Promise((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function ambilSemuaAntrian() {
  return jalankan('antrian', 'readonly', (s) => s.getAll());
}

function hapusTitik(id) {
  return jalankan('antrian', 'readwrite', (s) => s.delete(id));
}

function ambilKonfig(kunci) {
  return jalankan('konfig', 'readonly', (s) => s.get(kunci)).then((r) => (r ? r.nilai : ''));
}

function simpanKonfig(kunci, nilai) {
  return jalankan('konfig', 'readwrite', (s) => s.put({ kunci: kunci, nilai: nilai }));
}

function kirimTitik(urlapi, token, titik) {
  const data = new FormData();
  data.append('latitude', String(titik.latitude));
  data.append('longitude', String(titik.longitude));
  data.append('akurasi', String(titik.akurasi || 0));
  if (titik.waktu) {
    data.append('waktu', titik.waktu); // titik offline diunggah dengan waktu aslinya
  }
  return fetch(urlapi + 'index.php?metode=kirim-lokasi-personel&token=' + encodeURIComponent(token), {
    method: 'POST',
    body: data
  }).then((res) => res.json()).then((json) => json && json.status == '1');
}

async function flushAntrian() {
  const token = await ambilKonfig('token');
  const urlapi = await ambilKonfig('urlapi');
  if (!token || !urlapi) {
    return;
  }
  const antrian = await ambilSemuaAntrian();
  for (const titik of antrian) {
    try {
      const ok = await kirimTitik(urlapi, token, titik);
      if (!ok) {
        break; // token ditolak/dll — sisanya dicoba lagi pada sync berikutnya
      }
      await hapusTitik(titik.id);
    } catch (e) {
      break; // masih offline — sisanya dicoba lagi pada sync berikutnya
    }
  }
}

// Background Sync (Chrome): dipicu saat koneksi kembali, walau tab sudah ditutup
self.addEventListener('sync', (event) => {
  if (event.tag === TAG_SYNC) {
    event.waitUntil(flushAntrian());
  }
});

// Periodic Background Sync (Chrome, situs terpasang): flush antrian berkala
self.addEventListener('periodicsync', (event) => {
  if (event.tag === TAG_PERIODIK) {
    event.waitUntil(flushAntrian());
  }
});

// Pesan dari halaman: update konfigurasi (token/urlapi) atau minta flush segera
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.tipe === 'konfig') {
    event.waitUntil(
      simpanKonfig('token', msg.token || '').then(() => simpanKonfig('urlapi', msg.urlapi || ''))
    );
  } else if (msg.tipe === 'flush') {
    event.waitUntil(flushAntrian());
  }
});
