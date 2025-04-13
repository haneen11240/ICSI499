window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data.type === "ORA_TRIGGER_LAUNCH") {
      chrome.runtime.sendMessage({
        type: "triggerOra",
        meetUrl: window.location.href,
        platform: "Google Meet"
      });
    }
  });  