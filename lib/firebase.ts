// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration.
// These values are sourced from environment variables for security and flexibility.
// Ensure you have these variables set in your deployment environment.
const firebaseConfig = {
  apiKey: "AIzaSyDWFSGVAFkdEJtKNLywDPgPdI2Kydbuo1M",
  authDomain: "followup-afac2.firebaseapp.com",
  projectId: "followup-afac2",
  storageBucket: "followup-afac2.firebasestorage.app",
  messagingSenderId: "1036240210333",
  appId: "1:1036240210333:web:e68da5d71e28f75cc80774",
  measurementId: "G-PW2QCCXXR4"
};

const app = initializeApp(firebaseConfig);

let db;

// Initialize Firestore with the new recommended offline persistence API.
// This allows the app to work even when the user is offline by caching data.
// It uses multi-tab persistence to sync state across open tabs.
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (err: any) {
    console.warn('Firestore persistence with multi-tab support failed, falling back to in-memory cache.', err);
    // This can happen if the browser doesn't support IndexedDB or other features.
    // We fall back to in-memory cache to ensure the app still works.
    db = initializeFirestore(app, {
        localCache: memoryLocalCache()
    });
}

export { db };
export const auth = getAuth(app);
export const storage = getStorage(app);