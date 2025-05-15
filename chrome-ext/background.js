/**
 * Ora: AI Technical Consultant for Google Meet
 * 
 * File: background.js
 * Purpose: Background service worker for the Ora Chrome Extension
 * 
 * Description:
 * This file listens for Chrome extension events and runtime messages. It handles
 * user authentication state, manages keep-alive timers, and sends a launch request
 * to the backend API when the user initiates Ora in a Google Meet.
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
  
  //sign up/in logic and authentication
  chrome.runtime.onMessage.addListener((message, sendResponse) => {
    if (message.type === "triggerOra") {
        
      if (!message.userId) {
  
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              alert("You must sign in to Ora first. Please click the extension icon and log in.");
            }
          });
        });
  
        // open the extension popup
        chrome.action.openPopup();
  
        sendResponse({ success: false, message: "No user signed in" });
        return;
      }

      const oraLaunchEndpoint = "http://localhost:5000/start-bot";
    
      const payload = {
        meetUrl: message.meetUrl,
        platform: message.platform,
        userId: message.userId // from popup.js
      };

      fetch(oraLaunchEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        sendResponse({ success: true, message: "Ora launched successfully!" });
      })
      .catch((error) => {
        sendResponse({ success: false, message: "Failed to launch: ", error });
      });
  
      return true; 
    }
  });
  