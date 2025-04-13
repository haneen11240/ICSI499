// dashboard.js
import { loginWithGoogle, loginWithEmail, signUpWithEmail, logout, onUserStateChange } from './auth.js';
import { db } from './firebase_config.js';
import { collection, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

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
  const q = query(collection(db, "transcripts"), where("userId", "==", userId));
  onSnapshot(q, snapshot => {
    transcripts.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.className = 'transcript';
      div.innerHTML = `<strong>Date:</strong> ${data.date} <br>
                       <strong>Time:</strong> ${data.time} <br>
                       <strong>Platform:</strong> ${data.platform} <br>
                       <strong>Transcript:</strong> ${data.transcript}`;
      transcripts.appendChild(div);
    });
  });
}