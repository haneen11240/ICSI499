/**
 * Ora: AI Technical Consultant for Google Meet
 * 
 * File: dash.js
 * Purpose: Logic for dashboard html file
 * 
 * Description:
 * Displays login/auth UI, fetches and renders meeting transcripts from Firestore, and checks for audio routing tools like VB-Cable or VoiceMeeter.
 * 
 * Authors:
 * - Enea Zguro
 * - Ilyas Tahari
 * - Elissa Jagroop
 * - Haneen Qasem
 * 
 * Institution: SUNY University at Albany  
 * Course: ICSI499 Capstone Project, Spring 2025  
 * Instructor: Dr. Pradeep Atrey
 */

// Firebase imports
import { loginWithGoogle, loginWithEmail, signUpWithEmail, logout, onUserStateChange } from './auth.js';
import { db } from './firebase_config.js';
import { collection, query, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { getFirestore, setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const authSection = document.getElementById('auth-section');
const dashboard = document.getElementById('dashboard');
const userEmail = document.getElementById('user-email');
const transcripts = document.getElementById('transcripts');

// Login/signup button logic for dashboard html
window.signInGoogle = async () => {
  try { await loginWithGoogle(); } catch (err) { alert(err.message); }
};

window.signInEmail = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try { await loginWithEmail(email, password); } catch (err) { alert(err.message); }
};

window.signUpEmail = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try { await signUpWithEmail(email, password); } catch (err) { alert(err.message); }
};

window.logoutUser = async () => {
  try { await logout(); } catch (err) { alert(err.message); }
};

async function saveUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    email: user.email,
    createdAt: serverTimestamp()
  }, { merge: true });
}

// Update dashboard UI
onUserStateChange(user => {
  if (user) {
    saveUserProfile(user);
    authSection.style.display = 'none';
    dashboard.style.display = 'block';
    userEmail.innerText = user.email;
    loadTranscripts(user.uid);
  } else {
    authSection.style.display = 'block';
    dashboard.style.display = 'none';
    userEmail.innerText = '';
    transcripts.innerHTML = '';
  }
});

// Load user transcripts
function loadTranscripts(userId) {
  const q = query(collection(db, `users/${userId}/meetings`), orderBy("createdAt", "desc"));

  onSnapshot(q, snapshot => {
    transcripts.innerHTML = '';

    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.className = 'session-item';
      div.onclick = () => {
        localStorage.setItem("selectedSession", doc.id);
        localStorage.setItem("selectedSessionDate", data.date);
        localStorage.setItem("selectedSessionTime", data.time);
        window.location.href = "session.html";
      };
      div.innerHTML = `
        <img src="ORA.png" alt="Session Image"/>
        <p>${data.sessionName || `${data.date} – ${data.time}`}</p>
      `;
      transcripts.appendChild(div);
    });
  });
}

// Ora modal prompt for installation display/hide
function showOraSetupModal() {
  const modal = document.getElementById("oraSetupModal");
  modal.style.display = "block";
}

function hideOraSetupModal() {
  const modal = document.getElementById("oraSetupModal");
  modal.style.display = "none";
  localStorage.setItem("ora_setup_complete", "true");
}

// Ora test for voice drivers
async function runOraTest() {
  await navigator.mediaDevices.getUserMedia({ audio: true });
  const devices = await navigator.mediaDevices.enumerateDevices();

  // Look for drivers
  const hasCable = devices.some(d =>
    d.label.toLowerCase().includes("cable") ||
    d.label.toLowerCase().includes("voice") ||
    d.label.toLowerCase().includes("voicemeeter")
  );

  const msg = new SpeechSynthesisUtterance("Hello! This is Ora. Can you hear me?");
  speechSynthesis.speak(msg);

  setTimeout(() => {
    if (hasCable) {
      alert("Drivers detected!");
    } else {
      const downloadConfirm = confirm("Missing drivers. Do you want to download and install the audio setup?");
      if (downloadConfirm) {
        window.open("OraAudioSetup.exe", "_blank");
      }
    }
  }, 4000);
}

// Button listeners
document.getElementById("oraTestBtn").addEventListener("click", runOraTest);
document.getElementById("oraDoneBtn").addEventListener("click", hideOraSetupModal);

// Show on first login
if (localStorage.getItem("ora_setup_complete") !== "true") {
  setTimeout(showOraSetupModal, 1000);
}