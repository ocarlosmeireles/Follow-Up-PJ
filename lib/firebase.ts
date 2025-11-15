import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Replace the following with your app's Firebase project configuration.
// You can find this in your Firebase project console under Project settings.
const firebaseConfig = {
  apiKey: "AIzaSyDWFSGVAFkdEJtKNLywDPgPdI2Kydbuo1M",
  authDomain: "followup-afac2.firebaseapp.com",
  projectId: "followup-afac2",
  storageBucket: "followup-afac2.firebasestorage.app",
  messagingSenderId: "1036240210333",
  appId: "1:1036240210333:web:e68da5d71e28f75cc80774",
  measurementId: "G-PW2QCCXXR4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase Authentication
export const auth = getAuth(app);

// Initialize and export Cloud Firestore
export const db = getFirestore(app);
