// firebase_config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC_E91yz5ARm3vbq_55JfHjfYr0FJ3oB_o",
    authDomain: "ora-tech-79eae.firebaseapp.com",
    projectId: "ora-tech-79eae",
    storageBucket: "ora-tech-79eae.firebasestorage.app",
    messagingSenderId: "62701837639",
    appId: "1:62701837639:web:42c9ec787844fa4de9c062",
    measurementId: "G-DSE8BTDQQH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };