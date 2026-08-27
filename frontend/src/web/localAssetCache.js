// Local asset cache backed by IndexedDB.
//
// Persists the (large, ~13 MB) SQLite database bytes on the user's device so the
// app boots from local storage on every subsequent launch — fully offline, with
// no re-download and no 13 MB re-deserialization. Keys are the FULL
// content-hashed asset URL, so a new dictionary release (new hash) naturally
// misses this store and is re-fetched once, then re-persisted. This is what
// makes "load once, work offline forever" true in practice.
//
// Multi-tab safe: plain IndexedDB (no OPFS per-origin locks), which complements
// the in-memory SQLite VFS shim (src/web/accessHandlePoolVfsShim.js).

const DB_NAME = 'tuidien-local-cache';
const STORE = 'assets';
const VERSION = 1;

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
  return _dbPromise;
}

async function store(mode) {
  const db = await openDB();
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function getAssetBytes(key) {
  try {
    const st = await store('readonly');
    return await new Promise((resolve, reject) => {
      const req = st.get(key);
      req.onsuccess = () => {
        const val = req.result;
        if (val && val.bytes) resolve(new Uint8Array(val.bytes));
        else resolve(null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

export async function setAssetBytes(key, bytes) {
  try {
    const copy = bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes);
    const st = await store('readwrite');
    return await new Promise((resolve, reject) => {
      const req = st.put({ bytes: copy.buffer, ts: Date.now() }, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    /* best-effort persistence; failing here just means a re-download later */
  }
}

export async function deleteAsset(key) {
  try {
    const st = await store('readwrite');
    return await new Promise((resolve) => {
      const req = st.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (e) {
    /* ignore */
  }
}
