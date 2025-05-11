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

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("main-section").style.display = "block";
    document.getElementById("user-email").innerText = user.email;
  } else {
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("main-section").style.display = "none";
  }
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("✅ Logged in successfully.");
  } catch (error) {
    console.error(error);
    alert("❌ Login failed: " + error.message);
  }
});

document.getElementById("signupBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("✅ Account created successfully.");
  } catch (error) {
    console.error(error);
    alert("❌ Signup failed: " + error.message);
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  alert("✅ Logged out successfully.");
});

document.getElementById("closeBtn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        window.postMessage({ type: "ORA_STOP" }, "*");
        console.log("Sent ORA_STOP");
      },
    });
  });
});

document.getElementById("launchBtn").addEventListener("click", async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const meetUrl = tabs[0].url;

    if (!meetUrl.includes("https://meet.google.com")) {
      alert("⚠️ Please open a Google Meet tab first.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("⚠️ Please sign in first!");
      return;
    }

    const idToken = await user.getIdToken();

    try {
      const response = await fetch('https://icsi499.onrender.com/start-bot', {
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

      console.log("Launch Ora backend responded successfully.");

      // ✅ Inject UID into the Meet tab first
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: (uid) => {
            localStorage.setItem("ora_uid", uid);
            console.log("Injected UID into localStorage:", uid);
          },
          args: [user.uid],
        },
        () => {
          // inject inject.js
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              window.postMessage({ type: "ORA_START" }, "*");
            }
          });
        }
      );

      alert("✅ Ora is now active on your Meet!");
    } catch (error) {
      console.error("❌ Failed to launch Ora:", error);
      alert("Failed to launch Ora. Please try again.");
    }
  });
});