// dash.js
import { loginWithGoogle, loginWithEmail, signUpWithEmail, logout, onUserStateChange } from './auth.js';
import { db } from './firebase_config.js';
import { collection, query, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

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

async function saveUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    email: user.email,
    createdAt: serverTimestamp()
  }, { merge: true });
}

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
        <p>${data.date} – ${data.time}</p>
      `;
      transcripts.appendChild(div);
    });
  });
}

// Optional: Setup modal for Ora audio
function showOraSetupModal() {
  const modal = document.getElementById("oraSetupModal");
  modal.style.display = "block";
}

function hideOraSetupModal() {
  const modal = document.getElementById("oraSetupModal");
  modal.style.display = "none";
  localStorage.setItem("ora_setup_complete", "true");
}

function downloadDriver() {
  window.open(getDriverLink(), "_blank");
}

async function runOraTest() {
  await navigator.mediaDevices.getUserMedia({ audio: true });
  const devices = await navigator.mediaDevices.enumerateDevices();

  const hasCable = devices.some(d =>
    d.label.toLowerCase().includes("cable") ||
    d.label.toLowerCase().includes("voice") ||
    d.label.toLowerCase().includes("voicemeeter")
  );

  const msg = new SpeechSynthesisUtterance("Hello! This is Ora. Can you hear me?");
  speechSynthesis.speak(msg);

  setTimeout(() => {
    if (hasCable) {
      alert("✅ Virtual mic and/or VoiceMeeter detected. You're ready!");
    } else {
      const downloadConfirm = confirm("⚠️ No VB-Cable or VoiceMeeter detected. Do you want to download and install the audio setup?");
      if (downloadConfirm) {
        window.open("OraAudioSetup.exe", "_blank"); // This assumes the file is in your public directory
      }
    }
  }, 4000);
}

// Button listeners
document.getElementById("oraInstallBtn").addEventListener("click", runOraTest);
document.getElementById("oraTestBtn").addEventListener("click", runOraTest);
document.getElementById("oraDoneBtn").addEventListener("click", hideOraSetupModal);

// Show on first login
if (localStorage.getItem("ora_setup_complete") !== "true") {
  setTimeout(showOraSetupModal, 1000);
}