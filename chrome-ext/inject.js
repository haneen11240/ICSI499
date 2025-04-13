(function () {
    if (!window.location.href.includes("meet.google.com")) return;
  
    const existingButton = document.getElementById("ora-launch-button");
    if (existingButton) return;
  
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.bottom = "80px";
    container.style.right = "40px";
    container.style.zIndex = 9999;
    container.style.padding = "10px";
    container.style.backgroundColor = "#ffffff";
    container.style.border = "1px solid #ccc";
    container.style.borderRadius = "6px";
    container.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  
    const launchBtn = document.createElement("button");
    launchBtn.id = "ora-launch-button";
    launchBtn.innerText = "Launch Ora";
    launchBtn.style.padding = "6px 12px";
    launchBtn.style.marginBottom = "5px";
  
    // ✅ Just post a message — no extension API here
    launchBtn.onclick = () => {
      window.postMessage({ type: "ORA_TRIGGER_LAUNCH" }, "*");
    };
  
    container.appendChild(launchBtn);
    document.body.appendChild(container);
  })();  