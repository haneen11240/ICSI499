// dashboard.js
import { loginWithGoogle, loginWithEmail, signUpWithEmail, logout, onUserStateChange } from './auth.js';
import { db } from './firebase_config.js';
import { collection, query, where, onSnapshot, getDocs } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const authSection = document.getElementById('auth-section');
const dashboard = document.getElementById('dashboard');
const userEmail = document.getElementById('user-email');
const transcripts = document.getElementById('transcripts');

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

onUserStateChange(user => {
  if (user) {
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

function loadTranscripts(userId) {
  const q = query(collection(db, `users/${userId}/logs`));
  onSnapshot(q, snapshot => {
    transcripts.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.className = 'session-item';
      div.onclick = () => openSession(doc.id);
      div.innerHTML = `<img src="ORA.png" alt="Session Image"/><p>${data.logName || doc.id}</p>`;
      transcripts.appendChild(div);
    });
  });
}

function showOraSetupModal() {
  const modal = document.getElementById("oraSetupModal");
  modal.style.display = "block";
}

function hideOraSetupModal() {
  const modal = document.getElementById("oraSetupModal");
  modal.style.display = "none";
  localStorage.setItem("ora_setup_complete", "true");
}

function getDriverLink() {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("win")) return "https://vb-audio.com/Cable/VBCABLE_Driver_Pack43.zip";
  if (platform.includes("mac")) return "https://existential.audio/blackhole/";
  return "https://wiki.archlinux.org/title/PipeWire#Loopback_module";
}

function downloadDriver() {
  window.open(getDriverLink(), "_blank");
}

async function runOraTest() {
  await navigator.mediaDevices.getUserMedia({ audio: true });
  const devices = await navigator.mediaDevices.enumerateDevices();
  const hasCable = devices.some(d =>
    d.label.toLowerCase().includes("cable") || d.label.toLowerCase().includes("blackhole")
  );

  const msg = new SpeechSynthesisUtterance("Hello! This is Ora. Can you hear me?");
  speechSynthesis.speak(msg);

  setTimeout(() => {
    if (hasCable) {
      alert("✅ Virtual mic detected. Ask someone in the Meet if they heard Ora.");
    } else {
      alert("⚠️ No virtual mic detected. Please install the audio driver before using Ora.");
    }
  }, 4000);
}

// Button listeners
document.getElementById("oraInstallBtn").addEventListener("click", downloadDriver);
document.getElementById("oraTestBtn").addEventListener("click", runOraTest);
document.getElementById("oraDoneBtn").addEventListener("click", hideOraSetupModal);

// Show on first login
if (localStorage.getItem("ora_setup_complete") !== "true") {
  setTimeout(showOraSetupModal, 1000);
}