chrome.runtime.onInstalled.addListener(() => {
    console.log("✅ Extension installed");
  });
  
  chrome.runtime.onStartup.addListener(() => {
    console.log("✅ Chrome started");
  });
  
  chrome.alarms.create('keepAlive', { periodInMinutes: 5 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    console.log("⏰ Alarm triggered:", alarm.name);
  });
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "triggerOra") {
      console.log("Received triggerOra message:", message);
        
      if (!message.userId) {
        console.log("❌ No user ID detected. Prompting login.");
  
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
              alert("⚠️ You must sign in to Ora first. Please click the extension icon and log in.");
            }
          });
        });
  
        // Also open the extension popup immediately
        chrome.action.openPopup();
  
        sendResponse({ success: false, message: "No user signed in. Popup opened." });
        return;
      }

      const oraLaunchEndpoint = "http://localhost:5000/start-bot";
    
      const payload = {
        meetUrl: message.meetUrl,
        platform: message.platform,
        userId: message.userId // ✅ coming from popup.js
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
        const data = await response.json();
        console.log("✅ Launch response:", data);
        sendResponse({ success: true, message: "Ora launched successfully!" });
      })
      .catch((error) => {
        console.error("❌ Error launching Ora:", error);
        sendResponse({ success: false, message: "Failed to launch Ora." });
      });
  
      return true; 
    }
  });
  