import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB4Z2xoYedpMmH49RGFVN00WR_gn4R5LSI",
  authDomain: "torneio-sesi-20de0.firebaseapp.com",
  databaseURL: "https://torneio-sesi-20de0-default-rtdb.firebaseio.com",
  projectId: "torneio-sesi-20de0",
  storageBucket: "torneio-sesi-20de0.firebasestorage.app",
  messagingSenderId: "440964283604",
  appId: "1:440964283604:web:6650e9da0e88ef32484f41",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Detecta se está rodando no servidor local (porta 3000)
const IS_LOCAL = typeof window !== 'undefined' && window.location.port === '3000';
const LOCAL_BASE = IS_LOCAL
  ? `${window.location.protocol}//${window.location.hostname}:3000`
  : '';

async function localGet(key) {
  try {
    const r = await fetch(`${LOCAL_BASE}/db/${encodeURIComponent(key)}.json`);
    if (!r.ok) return null;
    const v = await r.json();
    return v === null ? null : v;
  } catch { return null; }
}

async function localSet(key, value) {
  try {
    await fetch(`${LOCAL_BASE}/db/${encodeURIComponent(key)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    return true;
  } catch { return false; }
}

async function localDelete(key) {
  try {
    await fetch(`${LOCAL_BASE}/db/${encodeURIComponent(key)}.json`, { method: 'DELETE' });
  } catch {}
}

export async function safeGet(key) {
  if (IS_LOCAL) return localGet(key);
  try {
    const snapshot = await get(ref(db, key));
    if (!snapshot.exists()) return null;
    return snapshot.val();
  } catch { return null; }
}

export async function safeSet(key, value) {
  if (IS_LOCAL) return localSet(key, value);
  try {
    await set(ref(db, key), value);
    return true;
  } catch { return false; }
}

export async function safeDelete(key) {
  if (IS_LOCAL) { await localDelete(key); return; }
  try {
    await remove(ref(db, key));
  } catch {}
}

// Exporta flag para o app mostrar badge offline
export const isLocalMode = IS_LOCAL;

// ── Funções específicas do Kahoot — suportam forceLocal ───────────
// Quando forceLocal=true, sempre usa localhost:3000 mesmo se o app
// está hospedado no Firebase (para ginásio sem internet).
const KAHOOT_LOCAL_BASE = 'http://localhost:3000';

function kahootBase(forceLocal) {
  if (IS_LOCAL) return LOCAL_BASE;
  if (forceLocal) return KAHOOT_LOCAL_BASE;
  return null;
}

export async function kahootGet(key, forceLocal = false) {
  const base = kahootBase(forceLocal);
  if (base) {
    try {
      const r = await fetch(`${base}/db/${encodeURIComponent(key)}.json`);
      if (!r.ok) return null;
      const v = await r.json();
      return v === null ? null : v;
    } catch { return null; }
  }
  try {
    const snapshot = await get(ref(db, key));
    if (!snapshot.exists()) return null;
    return snapshot.val();
  } catch { return null; }
}

export async function kahootSet(key, value, forceLocal = false) {
  const base = kahootBase(forceLocal);
  if (base) {
    try {
      await fetch(`${base}/db/${encodeURIComponent(key)}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      return true;
    } catch { return false; }
  }
  try {
    await set(ref(db, key), value);
    return true;
  } catch { return false; }
}

export async function kahootDelete(key, forceLocal = false) {
  const base = kahootBase(forceLocal);
  if (base) {
    try { await fetch(`${base}/db/${encodeURIComponent(key)}.json`, { method: 'DELETE' }); } catch {}
    return;
  }
  try { await remove(ref(db, key)); } catch {}
}
