/**
 * Ora: AI Technical Consultant for Google Meet
 * 
 * File: popup.js
 * Purpose: Popup UI logic for the Chrome extension.
 * 
 * Description:
 * Handles user login (Google/email), logout, and launches Ora bot in active Google Meet tabs via message passing.
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

// Firebase INIT
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC_E91yz5ARm3vbq_55JfHjfYr0FJ3oB_o",
  authDomain: "ora-tech-79eae.firebaseapp.com",
  projectId: "ora-tech-79eae",
  storageBucket: "ora-tech-79eae.firebasestorage.app",
  messagingSenderId: "62701837639",
  appId: "1:62701837639:web:42c9ec787844fa4de9c062",
  measurementId: "G-DSE8BTDQQH",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// User status (in/out)
onAuthStateChanged(auth, (user) => {
  // Signed in
  if (user) {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("main-section").style.display = "block";
    document.getElementById("user-email").innerText = user.email;
  } else { // Signed out
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("main-section").style.display = "none";
  }
});

// Login logic
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Logged in successfully!");
  } catch (error) {
    alert("Login failed: " + error.message);
  }
});

// Signup logic
document.getElementById("signupBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Account created successfully!");
  } catch (error) {
    alert("Signup failed: " + error.message);
  }
});

// Logout logic
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  alert("Logged out successfully!");
});

// Launch Ora
document.getElementById("launchBtn").addEventListener("click", async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const meetUrl = tabs[0].url;

    // Ensure meet is open
    if (!meetUrl.includes("https://meet.google.com")) {
      alert("Please open a Google Meet tab first.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("Sign in first!");
      return;
    }

    const idToken = await user.getIdToken();

    try { // Ora server request
      const response = await fetch("http://localhost:5000/start-bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          meetUrl: meetUrl,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }

      // Inject UID into the meet
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id }, // Select active meet tab (assuming many can be open)
          func: (uid) => {
            localStorage.setItem("ora_uid", uid);
          },
          args: [user.uid],
        },
        () => {
          // Inject inject.js
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["inject.js"], // Clientside listener for audio logic
          });
        }
      );

      alert("Ora is now active on your Meet!");
    } catch (error) {
      alert("Failed to launch Ora. Please try again.");
    }
  });
});