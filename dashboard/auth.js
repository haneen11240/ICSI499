// auth.js
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { auth } from './firebase_config.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

export function loginWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signUpWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function onUserStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}
async function saveUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    email: user.email,
    createdAt: serverTimestamp()
  }, { merge: true }); // don't overwrite existing data
}