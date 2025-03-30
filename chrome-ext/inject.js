(function() {
    console.log("✅ inject.js loaded");

    alert("TechBot extension is active!");

    const existingButton = document.getElementById("techbot-button");
    if (existingButton) return;
  
    const button = document.createElement("button");
    button.id = "techbot-button";
    button.innerText = "Add TechBot";
    button.style.position = "fixed";
    button.style.bottom = "20px";
    button.style.right = "20px";
    button.style.zIndex = "10000";
    button.style.padding = "10px 15px";
    button.style.backgroundColor = "#1a73e8";
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "5px";
    button.style.cursor = "pointer";
  
    button.onclick = () => {
      console.log("Sending POST to localhost:8080/join")

      fetch("http://localhost:8080/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: window.location.href })
      })
      .then(res => {
        console.log("Server responded: ", res.status);
        if (res.ok) alert("TechBot is joining your Meet!");
        else alert("Failed to connect to TechBot.");
      })
      .catch((err) =>{
        console.error("failed fetch: ", err);
        alert("Error: Could not reach local TechBot server.");
      }
      )};
  
    document.body.appendChild(button);
  })();  