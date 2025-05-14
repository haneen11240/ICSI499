(async function () {
  if (!window.location.href.includes("meet.google.com")) return;

  const uid = localStorage.getItem("ora_uid");
  if (!uid) {
    console.warn("UID not found — aborting Ora inject.");
    return;
  }

  const sessionId = new URL(window.location.href).pathname.replace(/\//g, "-");
  console.log("Ora script injected. Waiting for launch trigger...");

  const options = { mimeType: "audio/webm;codecs=opus" };
  let stream = null;
  let isListening = false;
  let audioCtx, analyser, dataArray;
  let transcriptCache = [];
  let fullTranscript = "";
  let isResponding = false;

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
    const existing = document.getElementById("ora-meter");
    if (existing) return;

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
      const rms = Math.sqrt(
        dataArray.reduce((sum, val) => sum + (val - 128) ** 2, 0) / dataArray.length
      );
      const percent = Math.min((rms / 128) * 100, 100);
      level.style.width = `${percent}%`;
      requestAnimationFrame(updateMeter);
    }

    updateMeter();
  }

  async function startRecordingLoop() {
    if (!isListening || isResponding) return;

    const mediaRecorder = new MediaRecorder(stream, options);
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      if (!isListening || isResponding) return;

      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "chunk.webm");
      formData.append("uid", uid);
      formData.append("sessionId", sessionId);

      try {
        const transcriptRes = await fetch("https://icsi499.onrender.com/local-transcript", {
          method: "POST",
          body: formData,
        });

        const transcriptData = await transcriptRes.json();
        const transcript = transcriptData.transcript?.trim();

        if (transcript) {
          transcriptCache.push(transcript);
          fullTranscript += `User said: ${transcript}\n`;
          console.log("Transcript:", transcript);
        }

        if (transcriptData.triggered && transcript) {
          isResponding = true;

          const aiRes = await fetch("https://icsi499.onrender.com/speech-to-text", {
            method: "POST",
            body: formData,
          });

          const aiData = await aiRes.json();
          const reply = aiData.response;

          if (reply) {
            fullTranscript += `Ora said: ${reply}\n\n`;
            console.log("Ora reply:", reply);

            const ttsRes = await fetch("https://icsi499.onrender.com/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: reply }),
            });

            if (ttsRes.ok) {
              const audioBlob = await ttsRes.blob();
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);

              try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                devices
                  .filter(d => d.kind === "audiooutput")
                  .forEach(d => console.log(`🔊 OUTPUT: ${d.label} — ${d.deviceId}`));

                // Force match the correct one
                const vbDevice = devices.find(d =>
                  d.label.toLowerCase().includes("voicemeeter input") && !d.label.toLowerCase().includes("aux")
                );

                if (vbDevice && audio.setSinkId) {
                  await audio.setSinkId(vbDevice.deviceId);
                  console.log("🔁 Ora routed to:", vbDevice.label);
                } else {
                  console.warn("⚠️ Could not find exact Voicemeeter Input — fallback to default");
                }

                audio.onended = () => {
                  isResponding = false;
                  startRecordingLoop();
                };
                console.log("audio playing:?");
                audio.play();
                audio.onplay = () => console.log("✅ Ora audio playback started");
                audio.onended = () => console.log("✅ Ora audio playback finished");
              } catch (err) {
                console.error("Failed to set VB-Cable as output device:", err);
                audio.play();
                audio.onended = () => {
                  isResponding = false;
                  startRecordingLoop();
                };
              }
            }
          } else {
            isResponding = false;
            startRecordingLoop();
          }
        } else {
          setTimeout(startRecordingLoop, 1000);
        }
      } catch (e) {
        console.error("Error sending audio:", e);
        setTimeout(startRecordingLoop, 1000);
      }
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

      try {
        const res = await fetch("https://icsi499.onrender.com/end-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, fullTranscript }),
        });

        const data = await res.json();
        if (data.success) {
          console.log("✅ Session saved to Firebase.");
        } else {
          console.warn("⚠️ Error saving session:", data.message);
        }
      } catch (err) {
        console.error("❌ Failed to send full transcript:", err);
      }
    }
  });
})();