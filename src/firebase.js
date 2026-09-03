import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, remove } from 'firebase/database';

// Configuração gerada em console.firebase.google.com
// Projeto → Configurações → Seus apps → SDK Firebase
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

export async function safeGet(key) {
  try {
    const snapshot = await get(ref(db, key));
    if (!snapshot.exists()) return null;
    return snapshot.val();
  } catch (e) {
    return null;
  }
}

export async function safeSet(key, value) {
  try {
    await set(ref(db, key), value);
    return true;
  } catch (e) {
    return false;
  }
}

export async function safeDelete(key) {
  try {
    await remove(ref(db, key));
  } catch (e) {}
}
