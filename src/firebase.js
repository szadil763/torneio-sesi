import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, remove } from 'firebase/database';

// Configuração gerada em console.firebase.google.com
// Projeto → Configurações → Seus apps → SDK Firebase
const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI",
  databaseURL: "COLE_AQUI",
  projectId: "COLE_AQUI",
  storageBucket: "COLE_AQUI",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI",
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
