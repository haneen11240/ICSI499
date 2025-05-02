window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data.type === "ORA_TRIGGER_LAUNCH") {
    try {
      chrome.runtime.sendMessage({
        type: "triggerOra",
        meetUrl: window.location.href,
        platform: "Google Meet"
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Failed to send message:", chrome.runtime.lastError.message);
        } else {
          console.log("Message sent successfully:", response);
        }
      });
    } catch (err) {
      console.error("Error sending message to background:", err);
    }
  }
});

(function () {
  if (!window.location.href.includes("meet.google.com")) return;

  console.log("✅ Ora Listener injected into Meet.");

  if ('webkitSpeechRecognition' in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim();
          console.log("🎤 You said:", transcript);

          // Detect trigger phrase
          if (transcript.toLowerCase().includes("ora what do you think")) {
            console.log("🛎️ Trigger phrase detected!");

            fetch('http://localhost:5000/get-ai-response', {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ prompt: transcript })
            })
            .then(response => response.json())
            .then(data => {
              console.log("🤖 Ora says:", data.response);

              const utterance = new SpeechSynthesisUtterance(data.response);
              utterance.lang = 'en-US';
              utterance.rate = 1;
              speechSynthesis.speak(utterance);
            })
            .catch(err => {
              console.error("❌ Error fetching AI response:", err);
            });
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.start();
    console.log("🎧 Ora is now listening...");
  } else {
    console.log("❌ Speech Recognition not supported in this browser.");
  }
})();
