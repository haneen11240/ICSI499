// popup.js
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "./firebase-wrapper.js";

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
const provider = new GoogleAuthProvider();

// DOM
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const googleBtn = document.getElementById("googleBtn");
const launchBtn = document.getElementById("launchBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authSection = document.getElementById("auth-section");
const mainSection = document.getElementById("main-section");
const userSpan = document.getElementById("user-email");

// Auth handlers
loginBtn.addEventListener("click", () => {
  const email = emailInput.value;
  const password = passInput.value;
  signInWithEmailAndPassword(auth, email, password).catch(err =>
    alert("Login failed: " + err.message)
  );
});

signupBtn.addEventListener("click", () => {
  const email = emailInput.value;
  const password = passInput.value;
  createUserWithEmailAndPassword(auth, email, password).catch(err =>
    alert("Signup failed: " + err.message)
  );
});

googleBtn.addEventListener("click", () => {
  signInWithPopup(auth, provider).catch(err =>
    alert("Google login failed: " + err.message)
  );
});

logoutBtn.addEventListener("click", () => {
  signOut(auth);
});

// Listen to auth state
onAuthStateChanged(auth, user => {
  if (user) {
    authSection.style.display = "none";
    mainSection.style.display = "block";
    userSpan.textContent = user.email;
  } else {
    authSection.style.display = "block";
    mainSection.style.display = "none";
  }
});

// Launch Ora
launchBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const meetUrl = tabs[0].url;
    const user = auth.currentUser;

    if (!user) {
      alert("Please sign in first.");
      return;
    }

    if (!meetUrl.includes("meet.google.com")) {
      alert("This is not a Google Meet tab.");
      return;
    }

    fetch("http://localhost:5000/start-bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetUrl,
        userId: user.uid,
        platform: "Google Meet"
      })
    })
      .then(res => res.json())
      .then(data => alert("Ora launched!"))
      .catch(err => alert("Failed to launch Ora: " + err.message));
  });
});