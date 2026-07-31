import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Get user configured keys, fallback env vars, or default project config
const getFirebaseConfig = () => {
  const customConfigStr = localStorage.getItem("filmlibrary_firebase_config");
  if (customConfigStr) {
    try {
      return JSON.parse(customConfigStr);
    } catch (e) {
      console.warn("Invalid stored firebase config:", e);
    }
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAgQnjBwEEZ8f1LQH3evM8E0P3zszN3rfA",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "film-library-7b94d.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "film-library-7b94d",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "film-library-7b94d.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "253114033974",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:253114033974:web:d943a87eb3977b0a783597"
  };
};

const firebaseConfig = getFirebaseConfig();

export const isFirebaseConfigured = () => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    console.log("[Firebase] Initialized with remote backend:", firebaseConfig.projectId);
  } catch (err) {
    console.error("[Firebase Init Error]:", err);
  }
} else {
  console.log("[Firebase] Not fully configured. Operating in local storage mode.");
}

export { app, auth, db, googleProvider };
