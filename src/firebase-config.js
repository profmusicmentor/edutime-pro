/**
 * Credenziali del progetto Firebase usato per la modalità cloud.
 *
 * Sono chiavi pubbliche lato client (compaiono comunque nel bundle del
 * browser): la protezione dei dati dipende dalle regole di sicurezza
 * Firestore, non dalla segretezza di questi valori.
 *
 * Per usare un proprio progetto Firebase basta sostituire i valori qui sotto,
 * oppure definire le variabili d'ambiente VITE_FIREBASE_* in fase di build.
 */
const env = import.meta.env || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDrCg4khzeGmZtLmWjPZjMhCWDs4gJp3V4',
  authDomain:
    env.VITE_FIREBASE_AUTH_DOMAIN || 'orario-scolastico-67c92.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'orario-scolastico-67c92',
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET ||
    'orario-scolastico-67c92.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_SENDER_ID || '962956626285',
  appId: env.VITE_FIREBASE_APP_ID || '1:962956626285:web:d773ce4785efc8e5067264',
};
