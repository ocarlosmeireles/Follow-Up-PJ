// lib/firebase.ts

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Explicitly import modules for their side-effects to prevent race conditions
import "firebase/firestore";
import "firebase/auth";
import "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWFSGVAFkdEJtKNLywDPgPdI2Kydbuo1M",
  authDomain: "followup-afac2.firebaseapp.com",
  projectId: "followup-afac2",
  storageBucket: "followup-afac2.firebasestorage.app",
  messagingSenderId: "1036240210333",
  appId: "1:1036240210333:web:e68da5d71e28f75cc80774",
  measurementId: "G-PW2QCCXXR4"
};

// Initialize Firebase App
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Enable Firestore persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open.');
    } else if (err.code == 'unimplemented') {
        console.warn('Firestore persistence not supported in this browser.');
    } else {
        console.error("Failed to enable Firestore persistence:", err);
    }
});

export { app, db, auth, storage };