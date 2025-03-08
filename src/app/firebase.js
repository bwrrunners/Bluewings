import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyA4edSmGgL8uPZZsazdjUWGgUScwhGaAHI",
    authDomain: "bluewings-7ba4e.firebaseapp.com",
    projectId: "bluewings-7ba4e",
    storageBucket: "bluewings-7ba4e.firebasestorage.app",
    messagingSenderId: "537966519649",
    appId: "1:537966519649:web:cd952ab82dcf1d2b921120",
    measurementId: "G-0MN2F0CEV2"
  };
  

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
