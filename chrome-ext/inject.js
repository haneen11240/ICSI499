(async function () {
  if (!window.location.href.includes("meet.google.com")) return;

  const uid = localStorage.getItem("ora_uid");
  const sessionId = new URL(window.location.href).pathname.replace(/\//g, "-");
  if (!uid) {
    console.warn("UID not found — aborting Ora inject.");
    return;
  }

  console.log("Ora script injected. Waiting for launch trigger...");

  const options = { mimeType: "audio/webm;codecs=opus" };
  let stream = null;
  let isListening = false;
  let audioCtx, analyser, dataArray;

  async function setupStream() {
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      createAudioMeter();
    }
  }

  function createAudioMeter() {
    if (document.getElementById("ora-meter")) return;

    const meter = document.createElement("div");
    meter.id = "ora-meter";
    meter.style.position = "fixed";
    meter.style.bottom = "80px";
    meter.style.right = "20px";
    meter.style.width = "100px";
    meter.style.height = "10px";
    meter.style.border = "1px solid #ccc";
    meter.style.background = "#222";
    meter.style.zIndex = 999999;
    document.body.appendChild(meter);

    const level = document.createElement("div");
    level.id = "ora-meter-level";
    level.style.height = "100%";
    level.style.background = "#4caf50";
    level.style.width = "0%";
    meter.appendChild(level);

    function updateMeter() {
      if (!analyser || !dataArray) return;
      analyser.getByteTimeDomainData(dataArray);
      const rms = Math.sqrt(dataArray.reduce((sum, val) => sum + (val - 128) ** 2, 0) / dataArray.length);
      const percent = Math.min((rms / 128) * 100, 100);
      level.style.width = `${percent}%`;
      requestAnimationFrame(updateMeter);
    }

    updateMeter();
  }

  async function startRecordingLoop() {
    if (!isListening) return;

    const mediaRecorder = new MediaRecorder(stream, options);
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      if (!isListening) return;

      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "chunk.webm");
      formData.append("uid", uid);
      formData.append("sessionId", sessionId);
      try {
        const response = await fetch("https://icsi499.onrender.com/speech-to-text", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        console.log("Server response:", result);

        if (result.triggered && result.response) {
          const utterance = new SpeechSynthesisUtterance(result.response);
          utterance.lang = "en-US";
          playTTS(result.response);
        }
      } catch (e) {
        console.error("Error sending audio:", e);
      }

      // Schedule next chunk
      if (isListening) setTimeout(startRecordingLoop, 2000);
    };

    mediaRecorder.start();
    console.log("Recording started");
    setTimeout(() => {
      mediaRecorder.stop();
      console.log("Recording stopped");
    }, 5000);
  }

  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;

    if (event.data.type === "ORA_START") {
      await setupStream();
      if (!isListening) {
        isListening = true;
        console.log("Ora listening started");
        startRecordingLoop();
      }
    }

    if (event.data.type === "ORA_STOP") {
      isListening = false;
      console.log("Ora listening stopped");

      // Send full session save request
      try {
        const saveResp = await fetch("https://icsi499.onrender.com/end-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid }),
        });

        const saveResult = await saveResp.json();
        console.log("Session saved:", saveResult);
      } catch (e) {
        console.error("Error saving session log:", e);
      }
    }
  });
})();

function playTTS(text) {
  fetch("https://icsi499.onrender.com/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  })
  .then(res => res.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  })
  .catch(err => console.error("TTS error:", err));
}