/**
 * Ora: AI Technical Consultant for Google Meet
 * 
 * File: auth.js
 * Purpose: Firebase Authentication utility functions.
 * 
 * Description:
 * Wraps Google and email/password sign-in, registration, logout, and provides real-time auth state change listener.
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

// Google popup login
export function loginWithGoogle() {
  return signInWithPopup(auth, provider);
}

// Email login
export function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Email signup
export function signUpWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function onUserStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// Save profile to firestore
async function saveUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    email: user.email,
    createdAt: serverTimestamp()
  }, { merge: true }); // don't overwrite existing data
}