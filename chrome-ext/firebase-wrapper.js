// firebase-wrapper.js
import { initializeApp } from "./node_modules/firebase/app/dist/index.esm.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "./node_modules/firebase/auth/dist/index.esm.js";

export {
  initializeApp,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};