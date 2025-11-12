// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// COLE A SUA CONFIGURAÇÃO DO FIREBASE AQUI
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
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Enable Firestore offline persistence
// This allows the app to work even when the user is offline by caching data.
// It helps mitigate "client is offline" errors caused by network issues.
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // This can happen if multiple tabs are open, as persistence can only be
      // enabled in one tab at a time.
      console.warn('Firestore persistence failed: can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the features required for persistence.
      console.warn('Firestore persistence is not available in this browser.');
    }
  });
