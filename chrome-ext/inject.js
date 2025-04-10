(function() { 
  console.log("inject.js loaded");

  const existingButton = document.getElementById("add-button");
  if (existingButton) return;

  const addButton = document.createElement("button");
  const removeButton = document.createElement("button");

  addButton.id = "add-button";
  addButton.innerText = "Add Ora";
  addButton.style.position = "fixed";
  addButton.style.bottom = "20px";
  addButton.style.right = "20px";
  addButton.style.zIndex = "10000";
  addButton.style.padding = "10px 15px";
  addButton.style.backgroundColor = "#1a73e8";
  addButton.style.color = "white";
  addButton.style.border = "none";
  addButton.style.borderRadius = "5px";
  addButton.style.cursor = "pointer";
  
  removeButton.id = "remove-button";
  removeButton.innerText = "Remove Ora";
  removeButton.style.position = "fixed";
  removeButton.style.bottom = "70px";
  removeButton.style.right = "20px";
  removeButton.style.zIndex = "10000";
  removeButton.style.padding = "10px 15px";
  removeButton.style.backgroundColor = "#d9534f";
  removeButton.style.color = "white";
  removeButton.style.border = "none";
  removeButton.style.borderRadius = "5px";
  removeButton.style.cursor = "pointer";

  // Button click logic
  addButton.onclick = () => {
      console.log("Sending POST to localhost:8080/join");

      fetch("http://localhost:8080/join", {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify({ url: window.location.href })
      })
      .then(res => {
          if (res.ok) {
              alert("Ora is joining your Meet!");
          } else {
              alert("Failed to connect to Ora.");
          }
      })
      .catch((err) => {
          console.error("Failed to fetch: ", err);
          alert("Error: Could not reach local server.");
      });
  };

  removeButton.onclick = () => {
    console.log("Removing Ora from the Meet");

    // Send a request to backend to remove Ora
    fetch("http://localhost:8080/remove", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: window.location.href })
    })
    .then(res => {
        if (res.ok) {
            alert("Ora has left the meeting!");
        } else {
            alert("Failed to remove Ora.");
        }
    })
    .catch((err) => {
        console.error("Failed to fetch: ", err);
        alert("Error: Could not reach the server.");
    });
};

  // Make the button draggable
  const makeDraggable = (element) => {
      let isDragging = false;
      let offsetX, offsetY;

      const dragHandle = document.createElement("div");
      dragHandle.style.width = "100%";
      dragHandle.style.height = "10px";
      dragHandle.style.backgroundColor = "transparent";
      dragHandle.style.cursor = "move";
      element.appendChild(dragHandle); // Add drag handle

      dragHandle.addEventListener('mousedown', (e) => {
          isDragging = true;
          offsetX = e.clientX - parseInt(window.getComputedStyle(element).left);
          offsetY = e.clientY - parseInt(window.getComputedStyle(element).top);
          document.addEventListener('mousemove', dragMove);
      });

      document.addEventListener('mouseup', () => {
          isDragging = false;
          document.removeEventListener('mousemove', dragMove);
      });

      function dragMove(e) {
          if (isDragging) {
              element.style.left = `${e.clientX - offsetX}px`;
              element.style.top = `${e.clientY - offsetY}px`;
          }
      }
  };

  // Apply drag logic to buttons
  makeDraggable(addButton);
  makeDraggable(removeButton);

  // Prevent overlap with Meet controls
  const preventOverlap = () => {
      const meetControls = document.querySelector('[aria-label="Controls"]');
      if (meetControls) {
          const controlsRect = meetControls.getBoundingClientRect();
          addButton.style.bottom = `${controlsRect.bottom + 20}px`;
          removeButton.style.bottom = `${controlsRect.bottom + 70}px`;
      }
  };

  preventOverlap();
  window.addEventListener("resize", preventOverlap);

  // Append buttons to the document body
  document.body.appendChild(addButton);
  document.body.appendChild(removeButton);
})();