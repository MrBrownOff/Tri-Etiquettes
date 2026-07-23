import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAytFBF_2mzhG0r03nuyBh00zhD9cRaSZY',
  authDomain: 'interbois-1996.firebaseapp.com',
  projectId: 'interbois-1996',
  storageBucket: 'interbois-1996.firebasestorage.app',
  messagingSenderId: '570751408148',
  appId: '1:570751408148:web:78ff766b63a3636906af01',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Bascule vers les émulateurs locaux uniquement si explicitement demandé
// (jamais activé en production : la variable n'est définie que localement).
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
