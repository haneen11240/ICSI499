/**
 * Ora: AI Technical Consultant for Google Meet
 * 
 * File: relay.js
 * Purpose: Debugging logic 
 * 
 * Description: File used only for console log debugging
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

let recognition = null;

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type === "ORA_START_RELAY") {
    if (recognition) {
      // console.log("Relay already active.");
      return;
    }

    if (!("webkitSpeechRecognition" in window)) {
      // console.warn("Speech recognition not supported.");
      return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim();
          // console.log("user:", transcript);
        }
      }
    };

    recognition.onerror = (event) => {
      // console.error("Speech recognition error: ", event.error);
    };

    recognition.start();
    // console.log("Relay started.");
  }

  if (event.data.type === "ORA_STOP_RELAY") {
    if (recognition) {
      recognition.stop();
      recognition = null;
      // console.log("Relay stopped.");
    }
  }
});